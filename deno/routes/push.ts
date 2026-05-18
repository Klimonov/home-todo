import { requireUser } from '../lib/auth.ts'
import { json, readString } from '../lib/http.ts'
import { run } from '../lib/db.ts'

export async function handleSubscribePush(request: Request): Promise<Response> {
  const profile = await requireUser(request)
  const body = await request.json() as Record<string, unknown>
  const endpoint = readString(body.endpoint, 'endpoint')
  const p256dh = readString(body.p256dh, 'p256dh')
  const auth = readString(body.auth, 'auth')
  const now = new Date().toISOString()

  await run(
    `insert into push_subscriptions (endpoint, user_id, p256dh, auth, user_agent, created_at, updated_at)
     values (?, ?, ?, ?, ?, ?, ?)
     on conflict(endpoint) do update set
       user_id = excluded.user_id,
       p256dh = excluded.p256dh,
       auth = excluded.auth,
       updated_at = excluded.updated_at`,
    [endpoint, profile.id, p256dh, auth, body.user_agent ?? null, now, now],
  )

  return json({ ok: true })
}
