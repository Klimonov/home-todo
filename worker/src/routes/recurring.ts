import { randomUUID } from 'node:crypto'
import { requireUser } from '../lib/auth'
import { ApiError, json, readString } from '../lib/http'
import { calculateNextRun, parseRecurringTask, toDateOnly } from '../lib/recurrence'
import type { Env } from '../types'

export async function handleGetRecurring(request: Request, env: Env): Promise<Response> {
  await requireUser(request, env)
  const result = await env.DB.prepare('select * from recurring_tasks order by created_at desc').all()
  return json({ recurringTasks: result.results.map(parseRecurringTask) })
}

export async function handleCreateRecurring(request: Request, env: Env): Promise<Response> {
  const profile = await requireUser(request, env)
  const body = await request.json() as Record<string, unknown>
  const title = readString(body.title, 'title')
  const frequencyType = readString(body.frequency_type, 'frequency_type')
  const nextRunAt = typeof body.next_run_at === 'string' ? body.next_run_at : toDateOnly(new Date())
  const now = new Date().toISOString()

  await env.DB.prepare(`
    insert into recurring_tasks
      (id, title, description, creator_id, frequency_type, interval_value, weekdays, day_of_month, month, next_run_at, enabled, created_at, updated_at)
    values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?)
  `).bind(
    randomUUID(), title,
    typeof body.description === 'string' ? body.description.trim() || null : null,
    profile.id, frequencyType,
    body.interval_value ?? null,
    body.weekdays ? JSON.stringify(body.weekdays) : null,
    body.day_of_month ?? null,
    body.month ?? null,
    nextRunAt, now, now,
  ).run()

  return json({ ok: true }, 201)
}

export async function handleToggleRecurring(request: Request, env: Env, taskId: string): Promise<Response> {
  await requireUser(request, env)
  const row = await env.DB.prepare('select enabled from recurring_tasks where id = ?').bind(taskId).first()
  if (!row) throw new ApiError(404, 'Recurring task not found.')

  await env.DB.prepare('update recurring_tasks set enabled = ?, updated_at = ? where id = ?')
    .bind(row.enabled ? 0 : 1, new Date().toISOString(), taskId)
    .run()

  return json({ ok: true })
}

export async function handleDeleteRecurring(request: Request, env: Env, taskId: string): Promise<Response> {
  await requireUser(request, env)
  await env.DB.prepare('delete from recurring_tasks where id = ?').bind(taskId).run()
  return json({ ok: true })
}
