import { createClient } from 'npm:@supabase/supabase-js@2'
import webpush from 'npm:web-push@3.6.7'

type PushBody = {
  type: string
  taskId?: string
  title: string
  body: string
  url?: string
  recipientUserId?: string
  excludeUserId?: string
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
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

  if (!supabaseUrl || !serviceRoleKey || !vapidPublicKey || !vapidPrivateKey) {
    return Response.json({ error: 'Function is not configured.' }, { status: 500, headers: corsHeaders })
  }

  const authHeader = request.headers.get('Authorization') ?? ''
  const admin = createClient(supabaseUrl, serviceRoleKey)
  const userClient = createClient(supabaseUrl, Deno.env.get('SUPABASE_ANON_KEY') ?? '', {
    global: { headers: { Authorization: authHeader } },
  })

  const { data: authData, error: authError } = await userClient.auth.getUser()

  if (authError || !authData.user) {
    return Response.json({ error: 'Unauthorized.' }, { status: 401, headers: corsHeaders })
  }

  const payload = await request.json() as PushBody

  webpush.setVapidDetails(vapidSubject, vapidPublicKey, vapidPrivateKey)

  let recipientsQuery = admin
    .from('profiles')
    .select('id')

  if (payload.recipientUserId) {
    recipientsQuery = recipientsQuery.eq('id', payload.recipientUserId)
  }

  const { data: recipients, error: recipientsError } = await recipientsQuery

  if (recipientsError) {
    return Response.json({ error: recipientsError.message }, { status: 500, headers: corsHeaders })
  }

  const recipientIds = (recipients ?? [])
    .map((recipient) => recipient.id as string)
    .filter((id) => id !== payload.excludeUserId)

  if (!recipientIds.length) {
    return Response.json({ sent: 0 }, { headers: corsHeaders })
  }

  await admin.from('notifications').insert(recipientIds.map((userId) => ({
    user_id: userId,
    task_id: payload.taskId ?? null,
    type: payload.type,
  })))

  const { data: subscriptions, error: subscriptionsError } = await admin
    .from('push_subscriptions')
    .select('*')
    .in('user_id', recipientIds)

  if (subscriptionsError) {
    return Response.json({ error: subscriptionsError.message }, { status: 500, headers: corsHeaders })
  }

  const message = JSON.stringify({
    title: payload.title,
    body: payload.body,
    url: payload.url ?? '/',
  })

  const results = await Promise.allSettled((subscriptions ?? []).map((subscription) => (
    webpush.sendNotification({
      endpoint: subscription.endpoint,
      keys: {
        p256dh: subscription.p256dh,
        auth: subscription.auth,
      },
    }, message)
  )))

  return Response.json({
    sent: results.filter((result) => result.status === 'fulfilled').length,
    failed: results.filter((result) => result.status === 'rejected').length,
  }, { headers: corsHeaders })
})
