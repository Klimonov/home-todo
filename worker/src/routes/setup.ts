import { randomUUID } from 'node:crypto'
import { hashPassword, createToken } from '../lib/auth'
import { ApiError, json, readString } from '../lib/http'
import type { Env } from '../types'

export async function handleSetup(request: Request, env: Env): Promise<Response> {
  if (request.headers.get('Authorization') !== `Bearer ${env.ADMIN_SETUP_TOKEN}`) {
    throw new ApiError(401, 'Unauthorized.')
  }

  const body = await request.json() as { users?: Array<{ login?: unknown; password?: unknown; displayName?: unknown }> }
  const users = body.users ?? []
  if (!users.length) throw new ApiError(400, 'users are required.')

  const created = []
  for (const user of users) {
    const login = readString(user.login, 'login').toLowerCase()
    const password = readString(user.password, 'password')
    const displayName = readString(user.displayName, 'displayName')
    const { hash, salt } = hashPassword(password)
    const id = randomUUID()

    await env.DB.prepare(`
      insert into profiles (id, login, display_name, password_hash, password_salt)
      values (?, ?, ?, ?, ?)
      on conflict(login) do update set
        display_name = excluded.display_name,
        password_hash = excluded.password_hash,
        password_salt = excluded.password_salt
    `).bind(id, login, displayName, hash, salt).run()

    const row = await env.DB
      .prepare('select id, login, display_name, created_at from profiles where login = ?')
      .bind(login)
      .first()
    created.push(row)
  }

  const firstId = created[0]?.id
  return json({
    users: created,
    token: firstId ? createToken(String(firstId), env.AUTH_SECRET) : null,
  })
}
