import { createHmac, randomBytes, timingSafeEqual, pbkdf2Sync } from 'node:crypto'
import { ApiError } from './http'
import type { Env, Profile } from '../types'

type TokenPayload = { sub: string; exp: number }

const TOKEN_TTL = 60 * 60 * 24 * 30

function base64url(input: Buffer | string): string {
  return Buffer.from(input).toString('base64url')
}

function sign(input: string, secret: string): string {
  return createHmac('sha256', secret).update(input).digest('base64url')
}

export function hashPassword(password: string, salt = randomBytes(16).toString('base64url')) {
  const hash = pbkdf2Sync(password, salt, 100000, 32, 'sha256').toString('base64url')
  return { hash, salt }
}

export function verifyPassword(password: string, hash: string, salt: string): boolean {
  const current = hashPassword(password, salt).hash
  return timingSafeEqual(Buffer.from(current), Buffer.from(hash))
}

export function createToken(userId: string, secret: string): string {
  const header = base64url(JSON.stringify({ alg: 'HS256', typ: 'JWT' }))
  const payload = base64url(JSON.stringify({ sub: userId, exp: Math.floor(Date.now() / 1000) + TOKEN_TTL } satisfies TokenPayload))
  const unsigned = `${header}.${payload}`
  return `${unsigned}.${sign(unsigned, secret)}`
}

function verifyToken(token: string, secret: string): string {
  const parts = token.split('.')
  if (parts.length !== 3) throw new ApiError(401, 'Invalid token.')

  const [header, payload, signature] = parts
  const expected = sign(`${header}.${payload}`, secret)

  if (!timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) throw new ApiError(401, 'Invalid token.')

  const decoded = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')) as TokenPayload
  if (decoded.exp < Math.floor(Date.now() / 1000)) throw new ApiError(401, 'Token expired.')

  return decoded.sub
}

export async function requireUser(request: Request, env: Env): Promise<Profile> {
  const authHeader = request.headers.get('Authorization')
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null
  if (!token) throw new ApiError(401, 'Unauthorized.')

  const userId = verifyToken(token, env.AUTH_SECRET)
  const row = await env.DB
    .prepare('select id, login, display_name, created_at from profiles where id = ?')
    .bind(userId)
    .first()

  if (!row) throw new ApiError(401, 'Unauthorized.')
  return row as unknown as Profile
}
