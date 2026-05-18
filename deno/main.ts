import { cors, handleError, json } from './lib/http.ts'
import { handleLogin, handleMe } from './routes/auth.ts'
import { handleGetTasks, handleCreateTask, handlePatchTask, handleDeleteTask } from './routes/tasks.ts'
import { handleGetRecurring, handleCreateRecurring, handleToggleRecurring, handleDeleteRecurring } from './routes/recurring.ts'
import { handleSubscribePush } from './routes/push.ts'
import { handleRunRecurring } from './routes/cron.ts'
import { handleSetup } from './routes/setup.ts'

type Handler = (request: Request, params: Record<string, string>) => Promise<Response>
type Route = { method: string; re: RegExp; keys: string[]; handler: Handler }

function buildRouter() {
  const routes: Route[] = []

  function add(method: string, path: string, handler: Handler) {
    const keys: string[] = []
    const re = new RegExp(
      '^' + path.replace(/:([^/]+)/g, (_: string, key: string) => { keys.push(key); return '([^/]+)' }) + '$',
    )
    routes.push({ method, re, keys, handler })
  }

  add('POST', '/auth/login', (req) => handleLogin(req))
  add('GET', '/auth/me', (req) => handleMe(req))
  add('GET', '/tasks', (req) => handleGetTasks(req))
  add('POST', '/tasks', (req) => handleCreateTask(req))
  add('PATCH', '/tasks/:id', (req, p) => handlePatchTask(req, p.id))
  add('DELETE', '/tasks/:id', (req, p) => handleDeleteTask(req, p.id))
  add('GET', '/recurring-tasks', (req) => handleGetRecurring(req))
  add('POST', '/recurring-tasks', (req) => handleCreateRecurring(req))
  add('PATCH', '/recurring-tasks/:id', (req, p) => handleToggleRecurring(req, p.id))
  add('DELETE', '/recurring-tasks/:id', (req, p) => handleDeleteRecurring(req, p.id))
  add('POST', '/push/subscriptions', (req) => handleSubscribePush(req))
  add('POST', '/cron/run-recurring', (req) => handleRunRecurring(req))
  add('POST', '/setup', (req) => handleSetup(req))

  return function handle(request: Request): Promise<Response> {
    if (request.method === 'OPTIONS') return Promise.resolve(cors())

    const { pathname } = new URL(request.url)

    for (const route of routes) {
      if (route.method !== request.method) continue
      const match = pathname.match(route.re)
      if (!match) continue

      const params: Record<string, string> = {}
      route.keys.forEach((key, i) => { params[key] = match[i + 1] })

      return route.handler(request, params).catch(handleError)
    }

    return Promise.resolve(json({ error: 'Not found.' }, 404))
  }
}

const handle = buildRouter()

Deno.serve(handle)
