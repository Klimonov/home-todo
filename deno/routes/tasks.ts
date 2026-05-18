import { randomUUID } from 'node:crypto'
import { requireUser } from '../lib/auth.ts'
import { ApiError, json, readString } from '../lib/http.ts'
import { query, queryOne, run } from '../lib/db.ts'
import { sendPushToUsers } from '../lib/push.ts'

export async function handleGetTasks(request: Request): Promise<Response> {
  await requireUser(request)
  const tasks = await query("select * from tasks where status != 'done' order by created_at desc")
  return json({ tasks })
}

export async function handleCreateTask(request: Request): Promise<Response> {
  const profile = await requireUser(request)
  const body = await request.json() as { title?: unknown; description?: unknown; scheduled_for?: unknown }
  const title = readString(body.title, 'title')
  const scheduledFor = typeof body.scheduled_for === 'string' ? body.scheduled_for : null
  const now = new Date().toISOString()
  const id = randomUUID()

  await run(
    `insert into tasks
       (id, title, description, status, creator_id, assignee_id, scheduled_for, visible_from, created_at, updated_at, completed_at)
     values (?, ?, ?, 'backlog', ?, null, ?, ?, ?, ?, null)`,
    [
      id, title,
      typeof body.description === 'string' ? body.description.trim() || null : null,
      profile.id, scheduledFor, scheduledFor, now, now,
    ],
  )

  await sendPushToUsers({
    type: 'task_created',
    taskId: id,
    title: 'Новая задача',
    body: title,
    url: '/',
    excludeUserId: profile.id as string,
  })

  return json({ ok: true }, 201)
}

export async function handlePatchTask(request: Request, taskId: string): Promise<Response> {
  const profile = await requireUser(request)
  const body = await request.json() as { action?: unknown }
  const task = await queryOne('select * from tasks where id = ?', [taskId])
  if (!task) throw new ApiError(404, 'Task not found.')

  const now = new Date().toISOString()

  if (body.action === 'assign') {
    if (task.status !== 'backlog') throw new ApiError(409, 'Task is not in backlog.')
    await run(
      "update tasks set status = 'assigned', assignee_id = ?, updated_at = ? where id = ?",
      [profile.id, now, taskId],
    )
    await sendPushToUsers({
      type: 'task_assigned',
      taskId,
      title: 'Задачу забрали',
      body: task.title as string,
      url: '/my',
      excludeUserId: profile.id as string,
    })
  } else if (body.action === 'complete') {
    await run(
      "update tasks set status = 'done', completed_at = ?, updated_at = ? where id = ?",
      [now, now, taskId],
    )
  } else {
    throw new ApiError(400, 'Unknown action.')
  }

  return json({ ok: true })
}

export async function handleDeleteTask(request: Request, taskId: string): Promise<Response> {
  await requireUser(request)
  await run('delete from tasks where id = ?', [taskId])
  return json({ ok: true })
}
