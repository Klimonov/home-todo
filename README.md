# Home Todo

Mobile-first PWA for two family members: shared backlog, personal tasks, recurring tasks, realtime sync, push notifications, and app badge support.

## Stack

- Nuxt 3 + Vue 3 + TypeScript
- Vuetify
- Supabase Auth, Postgres, Realtime, Edge Functions
- Web Push + custom service worker
- Netlify static hosting

## Local Setup

```bash
npm install
cp .env.example .env
npm run dev
```

Required public env vars:

```bash
NUXT_PUBLIC_SUPABASE_URL=
NUXT_PUBLIC_SUPABASE_ANON_KEY=
NUXT_PUBLIC_VAPID_PUBLIC_KEY=
```

## Supabase Setup

1. Create a Supabase project.
2. Run `supabase/migrations/001_initial_schema.sql`.
3. Create two Auth users with emails matching app logins:
   - `husband@home-todo.local`
   - `wife@home-todo.local`
4. Insert matching rows into `profiles`. Use `supabase/seed.sql` as a template.
5. Enable Realtime for `tasks` and `recurring_tasks`.
6. Deploy Edge Functions:

```bash
supabase functions deploy send-push
supabase functions deploy run-recurring
```

7. Set Edge Function secrets:

```bash
supabase secrets set SUPABASE_URL=...
supabase secrets set SUPABASE_SERVICE_ROLE_KEY=...
supabase secrets set SUPABASE_ANON_KEY=...
supabase secrets set VAPID_PUBLIC_KEY=...
supabase secrets set VAPID_PRIVATE_KEY=...
supabase secrets set VAPID_SUBJECT=mailto:you@example.com
```

8. Schedule `run-recurring` once per day in Supabase Scheduled Functions or call it from a Supabase cron job.

## Netlify Setup

Connect the GitHub repository to Netlify.

Build command:

```bash
npm run generate
```

Publish directory:

```bash
dist
```

Set these Netlify environment variables:

```bash
NUXT_PUBLIC_SUPABASE_URL=
NUXT_PUBLIC_SUPABASE_ANON_KEY=
NUXT_PUBLIC_VAPID_PUBLIC_KEY=
```

## Verification

```bash
npm run typecheck
npm run generate
```
