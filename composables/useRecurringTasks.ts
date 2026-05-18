import type { RealtimeChannel } from '@supabase/supabase-js'
import type { FrequencyType, RecurringTask } from '~/types/database'

const recurringTasks = ref<RecurringTask[]>([])
const recurringLoading = ref(false)
let recurringChannel: RealtimeChannel | null = null

export function useRecurringTasks() {
  const supabase = useHomeSupabase()
  const { profile } = useAuth()

  async function refreshRecurringTasks() {
    recurringLoading.value = true

    try {
      const { data, error } = await supabase
        .from('recurring_tasks')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) {
        throw error
      }

      recurringTasks.value = (data ?? []) as RecurringTask[]
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
    if (!profile.value) {
      throw new Error('User is not authenticated.')
    }

    const { error } = await supabase.from('recurring_tasks').insert({
      title: payload.title.trim(),
      description: payload.description?.trim() || null,
      creator_id: profile.value.id,
      frequency_type: payload.frequency_type,
      interval_value: payload.interval_value ?? null,
      weekdays: payload.weekdays ?? null,
      day_of_month: payload.day_of_month ?? null,
      month: payload.month ?? null,
      next_run_at: payload.next_run_at,
      enabled: true,
    })

    if (error) {
      throw error
    }

    await refreshRecurringTasks()
  }

  async function toggleRecurringTask(task: RecurringTask) {
    const { error } = await supabase
      .from('recurring_tasks')
      .update({ enabled: !task.enabled, updated_at: new Date().toISOString() })
      .eq('id', task.id)

    if (error) {
      throw error
    }

    await refreshRecurringTasks()
  }

  async function deleteRecurringTask(task: RecurringTask) {
    const { error } = await supabase
      .from('recurring_tasks')
      .delete()
      .eq('id', task.id)

    if (error) {
      throw error
    }

    await refreshRecurringTasks()
  }

  function subscribeRecurringTasks() {
    if (recurringChannel) {
      return
    }

    recurringChannel = supabase
      .channel('recurring-tasks')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'recurring_tasks' }, async () => {
        await refreshRecurringTasks()
      })
      .subscribe()
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
