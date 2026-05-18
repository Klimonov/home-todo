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
  return new Date(Date.UTC(year, monthIndex, Math.min(day, daysInUtcMonth(year, monthIndex))))
}

export function toDateOnly(date: Date) {
  return date.toISOString().slice(0, 10)
}

export function parseRecurringTask(row: Record<string, unknown>): RecurringTask {
  return {
    ...row,
    enabled: Boolean(row.enabled),
    weekdays: typeof row.weekdays === 'string' && row.weekdays ? JSON.parse(row.weekdays) : null,
  } as unknown as RecurringTask
}

export function calculateNextRun(task: RecurringTask, fromDate: Date): string {
  switch (task.frequency_type) {
    case 'daily':
      return toDateOnly(addDays(fromDate, 1))
    case 'weekdays': {
      const weekdays = task.weekdays?.length ? [...task.weekdays] : [fromDate.getUTCDay()]
      let next = addDays(fromDate, 1)
      while (!weekdays.includes(next.getUTCDay())) next = addDays(next, 1)
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
