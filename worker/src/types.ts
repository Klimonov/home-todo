export interface Env {
  DB: D1Database
  AUTH_SECRET: string
  VAPID_PUBLIC_KEY: string
  VAPID_PRIVATE_KEY: string
  VAPID_SUBJECT: string
  ADMIN_SETUP_TOKEN: string
  CRON_SECRET: string
}

export interface Profile {
  id: string
  login: string
  display_name: string
  created_at: string
}

export interface RecurringTask {
  id: string
  title: string
  description: string | null
  creator_id: string
  frequency_type: string
  interval_value: number | null
  weekdays: readonly number[] | null
  day_of_month: number | null
  month: number | null
  next_run_at: string
  enabled: boolean
}
