import { createClient } from 'npm:@supabase/supabase-js@2'
import webpush from 'npm:web-push@3.6.7'

type RecurringTask = {
  id: string
  title: string
  description: string | null
  creator_id: string
  frequency_type: 'daily' | 'weekdays' | 'every_n_days' | 'every_n_weeks' | 'every_n_months' | 'monthly' | 'yearly'
  interval_value: number | null
  weekdays: number[] | null
  day_of_month: number | null
  month: number | null
  next_run_at: string
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

function addDays(date: Date, amount: number) {
  const next = new Date(date)
  next.setUTCDate(next.getUTCDate() + amount)
  return next
}

function addMonths(date: Date, amount: number) {
  const next = new Date(date)
  next.setUTCMonth(next.getUTCMonth() + amount)
  return next
}

function daysInUtcMonth(year: number, monthIndex: number) {
  return new Date(Date.UTC(year, monthIndex + 1, 0)).getUTCDate()
}

function dateWithDay(year: number, monthIndex: number, day: number) {
  const safeDay = Math.min(day, daysInUtcMonth(year, monthIndex))
  return new Date(Date.UTC(year, monthIndex, safeDay))
}

function toDateOnly(date: Date) {
  return date.toISOString().slice(0, 10)
}

function calculateNextRun(task: RecurringTask, fromDate: Date) {
  switch (task.frequency_type) {
    case 'daily':
      return toDateOnly(addDays(fromDate, 1))
    case 'weekdays': {
      const weekdays = task.weekdays?.length ? task.weekdays : [fromDate.getUTCDay()]
      let next = addDays(fromDate, 1)

      while (!weekdays.includes(next.getUTCDay())) {
        next = addDays(next, 1)
      }

      return toDateOnly(next)
    }
    case 'every_n_days':
      return toDateOnly(addDays(fromDate, task.interval_value ?? 1))
    case 'every_n_weeks':
      return toDateOnly(addDays(fromDate, (task.interval_value ?? 1) * 7))
    case 'every_n_months': {
      const next = addMonths(fromDate, task.interval_value ?? 1)
      return toDateOnly(dateWithDay(next.getUTCFullYear(), next.getUTCMonth(), task.day_of_month ?? next.getUTCDate()))
    }
    case 'monthly': {
      const next = addMonths(fromDate, 1)
      return toDateOnly(dateWithDay(next.getUTCFullYear(), next.getUTCMonth(), task.day_of_month ?? next.getUTCDate()))
    }
    case 'yearly': {
      const year = fromDate.getUTCFullYear() + 1
      const monthIndex = (task.month ?? fromDate.getUTCMonth() + 1) - 1
      return toDateOnly(dateWithDay(year, monthIndex, task.day_of_month ?? fromDate.getUTCDate()))
    }
    default:
      return toDateOnly(addDays(fromDate, 1))
  }
}

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  const vapidPublicKey = Deno.env.get('VAPID_PUBLIC_KEY')
  const vapidPrivateKey = Deno.env.get('VAPID_PRIVATE_KEY')
  const vapidSubject = Deno.env.get('VAPID_SUBJECT') ?? 'mailto:admin@example.com'

  if (!supabaseUrl || !serviceRoleKey) {
    return Response.json({ error: 'Function is not configured.' }, { status: 500, headers: corsHeaders })
  }

  const admin = createClient(supabaseUrl, serviceRoleKey)
  const today = toDateOnly(new Date())

  const { data: dueTasks, error } = await admin
    .from('recurring_tasks')
    .select('*')
    .eq('enabled', true)
    .lte('next_run_at', today)

  if (error) {
    return Response.json({ error: error.message }, { status: 500, headers: corsHeaders })
  }

  const createdTasks = []

  for (const recurringTask of (dueTasks ?? []) as RecurringTask[]) {
    const { data: task, error: insertError } = await admin
      .from('tasks')
      .insert({
        title: recurringTask.title,
        description: recurringTask.description,
        status: 'backlog',
        creator_id: recurringTask.creator_id,
        scheduled_for: today,
        visible_from: today,
      })
      .select('*')
      .single()

    if (insertError) {
      continue
    }

    createdTasks.push(task)

    await admin
      .from('recurring_tasks')
      .update({ next_run_at: calculateNextRun(recurringTask, new Date(`${today}T00:00:00Z`)) })
      .eq('id', recurringTask.id)
  }

  if (vapidPublicKey && vapidPrivateKey && createdTasks.length) {
    webpush.setVapidDetails(vapidSubject, vapidPublicKey, vapidPrivateKey)

    const { data: profiles } = await admin.from('profiles').select('id')
    const userIds = (profiles ?? []).map((profile) => profile.id as string)

    await admin.from('notifications').insert(userIds.flatMap((userId) => (
      createdTasks.map((task) => ({
        user_id: userId,
        task_id: task.id,
        type: 'recurring_created',
      }))
    )))

    const { data: subscriptions } = await admin
      .from('push_subscriptions')
      .select('*')
      .in('user_id', userIds)

    await Promise.allSettled((subscriptions ?? []).flatMap((subscription) => (
      createdTasks.map((task) => webpush.sendNotification({
        endpoint: subscription.endpoint,
        keys: {
          p256dh: subscription.p256dh,
          auth: subscription.auth,
        },
      }, JSON.stringify({
        title: 'Регулярная задача',
        body: task.title,
        url: '/',
      })))
    )))
  }

  return Response.json({ created: createdTasks.length }, { headers: corsHeaders })
})
