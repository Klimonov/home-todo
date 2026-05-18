import { randomUUID } from 'node:crypto'
import { requireUser } from '../lib/auth'
import { ApiError, json, readString } from '../lib/http'
import { sendPushToUsers } from '../lib/push'
import type { Env } from '../types'

export async function handleGetTasks(request: Request, env: Env): Promise<Response> {
  await requireUser(request, env)
  const result = await env.DB.prepare(
    "select * from tasks where status != 'done' order by created_at desc",
  ).all()
  return json({ tasks: result.results })
}

export async function handleCreateTask(request: Request, env: Env): Promise<Response> {
  const profile = await requireUser(request, env)
  const body = await request.json() as { title?: unknown; description?: unknown; scheduled_for?: unknown }
  const title = readString(body.title, 'title')
  const scheduledFor = typeof body.scheduled_for === 'string' ? body.scheduled_for : null
  const now = new Date().toISOString()
  const id = randomUUID()

  await env.DB.prepare(`
    insert into tasks
      (id, title, description, status, creator_id, assignee_id, scheduled_for, visible_from, created_at, updated_at, completed_at)
    values (?, ?, ?, 'backlog', ?, null, ?, ?, ?, ?, null)
  `).bind(
    id, title,
    typeof body.description === 'string' ? body.description.trim() || null : null,
    profile.id, scheduledFor, scheduledFor, now, now,
  ).run()

  await sendPushToUsers(env, {
    type: 'task_created',
    taskId: id,
    title: 'Новая задача',
    body: title,
    url: '/',
    excludeUserId: profile.id,
  })

  return json({ ok: true }, 201)
}

export async function handlePatchTask(request: Request, env: Env, taskId: string): Promise<Response> {
  const profile = await requireUser(request, env)
  const body = await request.json() as { action?: unknown }
  const task = await env.DB.prepare('select * from tasks where id = ?').bind(taskId).first()
  if (!task) throw new ApiError(404, 'Task not found.')

  const now = new Date().toISOString()

  if (body.action === 'assign') {
    if (task.status !== 'backlog') throw new ApiError(409, 'Task is not in backlog.')
    await env.DB.prepare(
      "update tasks set status = 'assigned', assignee_id = ?, updated_at = ? where id = ?",
    ).bind(profile.id, now, taskId).run()

    await sendPushToUsers(env, {
      type: 'task_assigned',
      taskId,
      title: 'Задачу забрали',
      body: task.title as string,
      url: '/my',
      excludeUserId: profile.id,
    })
  } else if (body.action === 'complete') {
    await env.DB.prepare(
      "update tasks set status = 'done', completed_at = ?, updated_at = ? where id = ?",
    ).bind(now, now, taskId).run()
  } else {
    throw new ApiError(400, 'Unknown action.')
  }

  return json({ ok: true })
}

export async function handleDeleteTask(request: Request, env: Env, taskId: string): Promise<Response> {
  await requireUser(request, env)
  await env.DB.prepare('delete from tasks where id = ?').bind(taskId).run()
  return json({ ok: true })
}
