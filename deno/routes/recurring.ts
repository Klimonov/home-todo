import { randomUUID } from 'node:crypto'
import { requireUser } from '../lib/auth.ts'
import { ApiError, json, readString } from '../lib/http.ts'
import { query, queryOne, run } from '../lib/db.ts'
import { calculateNextRun, parseRecurringTask, toDateOnly } from '../lib/recurrence.ts'

export async function handleGetRecurring(request: Request): Promise<Response> {
  await requireUser(request)
  const rows = await query('select * from recurring_tasks order by created_at desc')
  return json({ recurringTasks: rows.map(parseRecurringTask) })
}

export async function handleCreateRecurring(request: Request): Promise<Response> {
  const profile = await requireUser(request)
  const body = await request.json() as Record<string, unknown>
  const title = readString(body.title, 'title')
  const frequencyType = readString(body.frequency_type, 'frequency_type')
  const nextRunAt = typeof body.next_run_at === 'string' ? body.next_run_at : toDateOnly(new Date())
  const now = new Date().toISOString()

  await run(
    `insert into recurring_tasks
       (id, title, description, creator_id, frequency_type, interval_value, weekdays, day_of_month, month, next_run_at, enabled, created_at, updated_at)
     values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?)`,
    [
      randomUUID(), title,
      typeof body.description === 'string' ? body.description.trim() || null : null,
      profile.id, frequencyType,
      body.interval_value ?? null,
      body.weekdays ? JSON.stringify(body.weekdays) : null,
      body.day_of_month ?? null,
      body.month ?? null,
      nextRunAt, now, now,
    ],
  )

  return json({ ok: true }, 201)
}

export async function handleToggleRecurring(request: Request, taskId: string): Promise<Response> {
  await requireUser(request)
  const row = await queryOne('select enabled from recurring_tasks where id = ?', [taskId])
  if (!row) throw new ApiError(404, 'Recurring task not found.')

  await run('update recurring_tasks set enabled = ?, updated_at = ? where id = ?', [
    row.enabled ? 0 : 1,
    new Date().toISOString(),
    taskId,
  ])

  return json({ ok: true })
}

export async function handleDeleteRecurring(request: Request, taskId: string): Promise<Response> {
  await requireUser(request)
  await run('delete from recurring_tasks where id = ?', [taskId])
  return json({ ok: true })
}
