import { cors, handleError, json } from './lib/http'
import { handleLogin, handleMe } from './routes/auth'
import { handleGetTasks, handleCreateTask, handlePatchTask, handleDeleteTask } from './routes/tasks'
import { handleGetRecurring, handleCreateRecurring, handleToggleRecurring, handleDeleteRecurring } from './routes/recurring'
import { handleSubscribePush } from './routes/push'
import { handleRunRecurring } from './routes/cron'
import { handleSetup } from './routes/setup'
import type { Env } from './types'

type Handler = (request: Request, env: Env, params: Record<string, string>) => Promise<Response>
type Route = { method: string; re: RegExp; keys: string[]; handler: Handler }

function buildRouter() {
  const routes: Route[] = []

  function add(method: string, path: string, handler: Handler) {
    const keys: string[] = []
    const re = new RegExp(
      '^' + path.replace(/:([^/]+)/g, (_, key: string) => { keys.push(key); return '([^/]+)' }) + '$',
    )
    routes.push({ method, re, keys, handler })
  }

  add('POST', '/auth/login', (req, env) => handleLogin(req, env))
  add('GET', '/auth/me', (req, env) => handleMe(req, env))
  add('GET', '/tasks', (req, env) => handleGetTasks(req, env))
  add('POST', '/tasks', (req, env) => handleCreateTask(req, env))
  add('PATCH', '/tasks/:id', (req, env, p) => handlePatchTask(req, env, p.id))
  add('DELETE', '/tasks/:id', (req, env, p) => handleDeleteTask(req, env, p.id))
  add('GET', '/recurring-tasks', (req, env) => handleGetRecurring(req, env))
  add('POST', '/recurring-tasks', (req, env) => handleCreateRecurring(req, env))
  add('PATCH', '/recurring-tasks/:id', (req, env, p) => handleToggleRecurring(req, env, p.id))
  add('DELETE', '/recurring-tasks/:id', (req, env, p) => handleDeleteRecurring(req, env, p.id))
  add('POST', '/push/subscriptions', (req, env) => handleSubscribePush(req, env))
  add('POST', '/cron/run-recurring', (req, env) => handleRunRecurring(req, env))
  add('POST', '/setup', (req, env) => handleSetup(req, env))

  return {
    handle(request: Request, env: Env): Promise<Response> {
      if (request.method === 'OPTIONS') return Promise.resolve(cors())

      const { pathname } = new URL(request.url)

      for (const route of routes) {
        if (route.method !== request.method) continue
        const match = pathname.match(route.re)
        if (!match) continue

        const params: Record<string, string> = {}
        route.keys.forEach((key, i) => { params[key] = match[i + 1] })

        return route.handler(request, env, params).catch(handleError)
      }

      return Promise.resolve(json({ error: 'Not found.' }, 404))
    },
  }
}

const router = buildRouter()

export default {
  fetch(request: Request, env: Env): Promise<Response> {
    return router.handle(request, env)
  },
}
