import { randomUUID } from 'node:crypto'
import webpush from 'web-push'
import type { Env } from '../types'

type PushPayload = {
  type: string
  taskId?: string
  title: string
  body: string
  url?: string
  excludeUserId?: string
}

export async function sendPushToUsers(env: Env, payload: PushPayload) {
  const recipients = await env.DB.prepare('select id from profiles').all()
  const recipientIds = recipients.results
    .map((row) => row.id as string)
    .filter((id) => id !== payload.excludeUserId)

  if (!recipientIds.length) return

  await env.DB.batch(
    recipientIds.map((userId) =>
      env.DB.prepare('insert into notifications (id, user_id, task_id, type) values (?, ?, ?, ?)')
        .bind(randomUUID(), userId, payload.taskId ?? null, payload.type),
    ),
  )

  if (!env.VAPID_PUBLIC_KEY || !env.VAPID_PRIVATE_KEY) return

  webpush.setVapidDetails(
    env.VAPID_SUBJECT || 'mailto:admin@example.com',
    env.VAPID_PUBLIC_KEY,
    env.VAPID_PRIVATE_KEY,
  )

  const placeholders = recipientIds.map(() => '?').join(',')
  const subs = await env.DB
    .prepare(`select endpoint, p256dh, auth from push_subscriptions where user_id in (${placeholders})`)
    .bind(...recipientIds)
    .all()

  const message = JSON.stringify({ title: payload.title, body: payload.body, url: payload.url ?? '/' })

  await Promise.allSettled(
    subs.results.map((sub) =>
      webpush.sendNotification(
        { endpoint: sub.endpoint as string, keys: { p256dh: sub.p256dh as string, auth: sub.auth as string } },
        message,
      ),
    ),
  )
}
