# Home Todo

Mobile-first PWA for two family members: shared backlog, personal tasks, recurring tasks, realtime sync, push notifications, and app badge support.

## Stack

- Nuxt 3 + Vue 3 + TypeScript
- Vuetify
- Supabase Auth, Postgres, Realtime, Edge Functions
- Web Push + custom service worker
- GitHub Pages static hosting

## Local Setup

```bash
npm install
cp .env.example .env
npm run dev
```

Required public env vars:

```bash
NUXT_APP_BASE_URL=/
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

## GitHub Pages Setup

The repository includes `.github/workflows/deploy.yml`. It builds the app and deploys `.output/public` to GitHub Pages.

1. Push the repository to GitHub.
2. Open repository settings:

```text
Settings -> Pages
```

3. Set source to:

```text
GitHub Actions
```

4. Add repository secrets:

```text
Settings -> Secrets and variables -> Actions -> New repository secret
```

Required secrets:

```bash
NUXT_PUBLIC_SUPABASE_URL=
NUXT_PUBLIC_SUPABASE_ANON_KEY=
NUXT_PUBLIC_VAPID_PUBLIC_KEY=
```

5. Push to `main` or run the workflow manually from:

```text
Actions -> Deploy GitHub Pages -> Run workflow
```

The default GitHub Pages URL will be:

```text
https://<github-user>.github.io/home-todo/
```

If the repository name is not `home-todo`, change this line in `.github/workflows/deploy.yml`:

```yaml
NUXT_APP_BASE_URL: /home-todo/
```

For example, for a repository named `family-tasks`:

```yaml
NUXT_APP_BASE_URL: /family-tasks/
```

## Verification

```bash
npm run typecheck
npm run generate
```

To verify the GitHub Pages base path locally:

```bash
NUXT_APP_BASE_URL=/home-todo/ npm run generate
```
