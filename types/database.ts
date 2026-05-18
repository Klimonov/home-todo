export type TaskStatus = 'backlog' | 'assigned' | 'done'

export type FrequencyType =
  | 'daily'
  | 'weekdays'
  | 'every_n_days'
  | 'every_n_weeks'
  | 'every_n_months'
  | 'monthly'
  | 'yearly'

export interface Profile {
  id: string
  login: string
  display_name: string
  created_at: string
}

export interface Task {
  id: string
  title: string
  description: string | null
  status: TaskStatus
  creator_id: string
  assignee_id: string | null
  scheduled_for: string | null
  visible_from: string | null
  created_at: string
  updated_at: string
  completed_at: string | null
}

export interface RecurringTask {
  id: string
  title: string
  description: string | null
  creator_id: string
  frequency_type: FrequencyType
  interval_value: number | null
  weekdays: readonly number[] | null
  day_of_month: number | null
  month: number | null
  next_run_at: string
  enabled: boolean
  created_at: string
  updated_at: string
}
