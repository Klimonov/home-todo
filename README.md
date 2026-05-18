# Home Todo

Mobile-first PWA for two family members: shared backlog, personal tasks, recurring tasks, push notifications, and app badge support.

## Stack

- **Frontend:** Nuxt 3 + Vue 3 + TypeScript + Vuetify → GitHub Pages
- **Backend:** Cloudflare Workers (Node.js compat) → free tier, works in Russia
- **Database:** Cloudflare D1 (SQLite) → free tier
- **Push:** Web Push (VAPID) via service worker
- **Cron:** GitHub Actions (daily run for recurring tasks)

## Local Development

```bash
npm install
cp .env.example .env
# Fill NUXT_PUBLIC_API_URL with the deployed worker URL
npm run dev
```

## Deploy: Cloudflare Worker (backend)

### 1. Install wrangler and log in

```bash
cd worker
npm install
npx wrangler login
```

### 2. Create D1 database

```bash
npx wrangler d1 create home-todo
```

Copy the `database_id` from the output into `worker/wrangler.toml`.

### 3. Apply schema

```bash
npx wrangler d1 execute home-todo --file=../worker/schema.sql
```

### 4. Generate VAPID keys

```bash
npx web-push generate-vapid-keys
```

### 5. Set worker secrets

```bash
npx wrangler secret put AUTH_SECRET          # random string, min 32 chars
npx wrangler secret put VAPID_PUBLIC_KEY
npx wrangler secret put VAPID_PRIVATE_KEY
npx wrangler secret put VAPID_SUBJECT        # mailto:you@example.com
npx wrangler secret put ADMIN_SETUP_TOKEN    # random string for one-time setup
npx wrangler secret put CRON_SECRET          # random string for GitHub Actions cron
```

### 6. Deploy

```bash
npx wrangler deploy
```

The worker URL will be `https://home-todo-api.<your-subdomain>.workers.dev`.

### 7. Create users (one-time)

```bash
curl -X POST https://home-todo-api.<subdomain>.workers.dev/setup \
  -H "Authorization: Bearer <ADMIN_SETUP_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{
    "users": [
      { "login": "husband", "password": "...", "displayName": "Муж" },
      { "login": "wife", "password": "...", "displayName": "Жена" }
    ]
  }'
```

## Deploy: GitHub Pages (frontend)

### 1. Push repository to GitHub

### 2. Settings → Pages → Source: GitHub Actions

### 3. Add repository secrets (Settings → Secrets → Actions)

```
NUXT_PUBLIC_API_URL=https://home-todo-api.<subdomain>.workers.dev
NUXT_PUBLIC_VAPID_PUBLIC_KEY=<your VAPID public key>
CRON_SECRET=<same value as worker secret>
```

### 4. Push to `main` — deploy runs automatically

GitHub Pages URL: `https://<github-user>.github.io/home-todo/`

If the repository name differs, update `NUXT_APP_BASE_URL` in `.github/workflows/deploy.yml`.

## Recurring tasks cron

`.github/workflows/run-recurring.yml` runs daily at 05:00 UTC and calls `POST /cron/run-recurring` on the worker.

## Verification

```bash
npm run typecheck
cd worker && npx tsc --noEmit
```
