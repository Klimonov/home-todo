import { createClient, type Client } from 'npm:@libsql/client@0.14'

let _client: Client | null = null

function db(): Client {
  if (!_client) {
    _client = createClient({
      url: Deno.env.get('TURSO_DATABASE_URL') ?? '',
      authToken: Deno.env.get('TURSO_AUTH_TOKEN') ?? undefined,
    })
  }
  return _client
}

type Row = Record<string, unknown>

export async function query(sql: string, args: unknown[] = []): Promise<Row[]> {
  const result = await db().execute({ sql, args })
  return result.rows as unknown as Row[]
}

export async function queryOne(sql: string, args: unknown[] = []): Promise<Row | null> {
  const rows = await query(sql, args)
  return rows[0] ?? null
}

export async function run(sql: string, args: unknown[] = []): Promise<void> {
  await db().execute({ sql, args })
}

export async function batchWrite(stmts: Array<{ sql: string; args?: unknown[] }>): Promise<void> {
  await db().batch(
    stmts.map((s) => ({ sql: s.sql, args: s.args ?? [] })),
    'write',
  )
}
