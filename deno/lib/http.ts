export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message)
  }
}

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, PATCH, DELETE, OPTIONS',
}

export function json(data: unknown, status = 200): Response {
  return Response.json(data, { status, headers: CORS })
}

export function cors(): Response {
  return new Response(null, { status: 204, headers: CORS })
}

export function handleError(error: unknown): Response {
  if (error instanceof ApiError) return json({ error: error.message }, error.status)
  const msg = error instanceof Error ? error.message : 'Internal server error'
  console.error(error)
  return json({ error: msg }, 500)
}

export function readString(value: unknown, field: string): string {
  if (typeof value !== 'string' || !value.trim()) throw new ApiError(400, `${field} is required.`)
  return value.trim()
}
