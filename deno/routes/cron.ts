import { randomUUID } from 'node:crypto'
import { ApiError, json } from '../lib/http.ts'
import { query, run } from '../lib/db.ts'
import { calculateNextRun, parseRecurringTask, toDateOnly } from '../lib/recurrence.ts'

export async function handleRunRecurring(request: Request): Promise<Response> {
  const cronSecret = Deno.env.get('CRON_SECRET')
  if (cronSecret && request.headers.get('Authorization') !== `Bearer ${cronSecret}`) {
    throw new ApiError(401, 'Unauthorized.')
  }

  const today = toDateOnly(new Date())
  const rows = await query(
    "select * from recurring_tasks where enabled = 1 and next_run_at <= ?",
    [today],
  )

  const tasks = rows.map(parseRecurringTask)
  const now = new Date().toISOString()
  let created = 0

  for (const task of tasks) {
    await run(
      `insert into tasks
         (id, title, description, status, creator_id, assignee_id, scheduled_for, visible_from, created_at, updated_at, completed_at)
       values (?, ?, ?, 'backlog', ?, null, ?, ?, ?, ?, null)`,
      [randomUUID(), task.title, task.description, task.creator_id, task.next_run_at, task.next_run_at, now, now],
    )
    await run(
      'update recurring_tasks set next_run_at = ?, updated_at = ? where id = ?',
      [calculateNextRun(task, new Date(task.next_run_at)), now, task.id],
    )
    created++
  }

  return json({ created, processed: tasks.length })
}
