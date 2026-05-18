import type { FrequencyType, RecurringTask } from '~/types/database'

const recurringTasks = ref<RecurringTask[]>([])
const recurringLoading = ref(false)
let pollingTimer: ReturnType<typeof setInterval> | null = null

export function useRecurringTasks() {
  const api = useApiClient()

  async function refreshRecurringTasks() {
    recurringLoading.value = true
    try {
      const data = await api.request<{ recurringTasks: RecurringTask[] }>('/recurring-tasks')
      recurringTasks.value = data.recurringTasks
    } finally {
      recurringLoading.value = false
    }
  }

  async function createRecurringTask(payload: {
    title: string
    description?: string
    frequency_type: FrequencyType
    interval_value?: number | null
    weekdays?: number[] | null
    day_of_month?: number | null
    month?: number | null
    next_run_at: string
  }) {
    await api.request('/recurring-tasks', {
      method: 'POST',
      body: {
        title: payload.title.trim(),
        description: payload.description?.trim() || null,
        frequency_type: payload.frequency_type,
        interval_value: payload.interval_value ?? null,
        weekdays: payload.weekdays ?? null,
        day_of_month: payload.day_of_month ?? null,
        month: payload.month ?? null,
        next_run_at: payload.next_run_at,
      },
    })
    await refreshRecurringTasks()
  }

  async function toggleRecurringTask(task: RecurringTask) {
    await api.request(`/recurring-tasks/${task.id}`, { method: 'PATCH' })
    await refreshRecurringTasks()
  }

  async function deleteRecurringTask(task: RecurringTask) {
    await api.request(`/recurring-tasks/${task.id}`, { method: 'DELETE' })
    await refreshRecurringTasks()
  }

  function subscribeRecurringTasks() {
    if (pollingTimer) return
    pollingTimer = setInterval(() => void refreshRecurringTasks(), 10_000)
  }

  return {
    recurringTasks: readonly(recurringTasks),
    recurringLoading: readonly(recurringLoading),
    refreshRecurringTasks,
    createRecurringTask,
    toggleRecurringTask,
    deleteRecurringTask,
    subscribeRecurringTasks,
  }
}
