import { randomUUID } from 'node:crypto'
import { ApiError, json } from '../lib/http'
import { calculateNextRun, parseRecurringTask, toDateOnly } from '../lib/recurrence'
import type { Env } from '../types'

export async function handleRunRecurring(request: Request, env: Env): Promise<Response> {
  if (env.CRON_SECRET && request.headers.get('Authorization') !== `Bearer ${env.CRON_SECRET}`) {
    throw new ApiError(401, 'Unauthorized.')
  }

  const today = toDateOnly(new Date())
  const result = await env.DB.prepare(
    "select * from recurring_tasks where enabled = 1 and next_run_at <= ?",
  ).bind(today).all()

  const tasks = result.results.map(parseRecurringTask)
  const now = new Date().toISOString()
  let created = 0

  for (const task of tasks) {
    const taskId = randomUUID()
    await env.DB.prepare(`
      insert into tasks
        (id, title, description, status, creator_id, assignee_id, scheduled_for, visible_from, created_at, updated_at, completed_at)
      values (?, ?, ?, 'backlog', ?, null, ?, ?, ?, ?, null)
    `).bind(taskId, task.title, task.description, task.creator_id, task.next_run_at, task.next_run_at, now, now).run()

    const nextRun = calculateNextRun(task, new Date(task.next_run_at))
    await env.DB.prepare('update recurring_tasks set next_run_at = ?, updated_at = ? where id = ?')
      .bind(nextRun, now, task.id)
      .run()

    created++
  }

  return json({ created, processed: tasks.length })
}
