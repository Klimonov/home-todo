import { hashPassword, verifyPassword, createToken, requireUser } from '../lib/auth.ts'
import { ApiError, json, readString } from '../lib/http.ts'
import { queryOne } from '../lib/db.ts'

export async function handleLogin(request: Request): Promise<Response> {
  const body = await request.json() as { login?: unknown; password?: unknown }
  const login = readString(body.login, 'login').toLowerCase()
  const password = readString(body.password, 'password')

  const row = await queryOne('select * from profiles where login = ?', [login])
  if (!row || !verifyPassword(password, row.password_hash as string, row.password_salt as string)) {
    throw new ApiError(401, 'Неверный логин или пароль.')
  }

  const token = createToken(row.id as string)
  const profile = { id: row.id, login: row.login, display_name: row.display_name, created_at: row.created_at }

  return json({ token, profile })
}

export async function handleMe(request: Request): Promise<Response> {
  const profile = await requireUser(request)
  return json({ profile })
}
