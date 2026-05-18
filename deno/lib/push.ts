import { randomUUID } from 'node:crypto'
// deno-lint-ignore-file no-explicit-any
import webpush from 'npm:web-push@3.6.7'
import { query, batchWrite } from './db.ts'

type PushPayload = {
  type: string
  taskId?: string
  title: string
  body: string
  url?: string
  excludeUserId?: string
}

export async function sendPushToUsers(payload: PushPayload) {
  const recipients = await query('select id from profiles')
  const recipientIds = recipients
    .map((row) => row.id as string)
    .filter((id) => id !== payload.excludeUserId)

  if (!recipientIds.length) return

  await batchWrite(
    recipientIds.map((userId) => ({
      sql: 'insert into notifications (id, user_id, task_id, type) values (?, ?, ?, ?)',
      args: [randomUUID(), userId, payload.taskId ?? null, payload.type],
    })),
  )

  const vapidPublic = Deno.env.get('VAPID_PUBLIC_KEY')
  const vapidPrivate = Deno.env.get('VAPID_PRIVATE_KEY')
  if (!vapidPublic || !vapidPrivate) return

  ;(webpush as any).setVapidDetails(
    Deno.env.get('VAPID_SUBJECT') || 'mailto:admin@example.com',
    vapidPublic,
    vapidPrivate,
  )

  const placeholders = recipientIds.map(() => '?').join(',')
  const subs = await query(
    `select endpoint, p256dh, auth from push_subscriptions where user_id in (${placeholders})`,
    recipientIds,
  )

  const message = JSON.stringify({ title: payload.title, body: payload.body, url: payload.url ?? '/' })

  await Promise.allSettled(
    subs.map((sub) =>
      (webpush as any).sendNotification(
        { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
        message,
      )
    ),
  )
}
