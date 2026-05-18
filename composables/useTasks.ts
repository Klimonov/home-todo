import { isBefore, isToday, parseISO, startOfToday } from 'date-fns'
import type { RealtimeChannel } from '@supabase/supabase-js'
import type { Task } from '~/types/database'

const tasks = ref<Task[]>([])
const tasksLoading = ref(false)
let channel: RealtimeChannel | null = null

export function useTasks() {
  const supabase = useHomeSupabase()
  const { profile } = useAuth()
  const { countBadgeTasks, setBadge } = useBadge()

  const todayIso = computed(() => new Date().toISOString().slice(0, 10))

  const backlogTasks = computed(() => tasks.value.filter((task) => {
    if (task.status !== 'backlog') {
      return false
    }

    if (!task.visible_from) {
      return true
    }

    return task.visible_from <= todayIso.value
  }))

  const myTasks = computed(() => tasks.value.filter((task) => (
    task.status === 'assigned' && task.assignee_id === profile.value?.id
  )))

  const overdueTasks = computed(() => myTasks.value.filter((task) => {
    if (!task.scheduled_for) {
      return false
    }

    return isBefore(parseISO(task.scheduled_for), startOfToday())
  }))

  const todayTasks = computed(() => myTasks.value.filter((task) => (
    task.scheduled_for ? isToday(parseISO(task.scheduled_for)) : false
  )))

  const unscheduledTasks = computed(() => myTasks.value.filter((task) => !task.scheduled_for))

  async function refreshTasks() {
    tasksLoading.value = true

    try {
      const { data, error } = await supabase
        .from('tasks')
        .select('*')
        .neq('status', 'done')
        .order('created_at', { ascending: false })

      if (error) {
        throw error
      }

      tasks.value = (data ?? []) as Task[]
      await setBadge(countBadgeTasks(myTasks.value))
    } finally {
      tasksLoading.value = false
    }
  }

  async function createTask(payload: { title: string; description?: string; scheduled_for?: string | null }) {
    if (!profile.value) {
      throw new Error('User is not authenticated.')
    }

    const scheduledFor = payload.scheduled_for || null
    const { data, error } = await supabase.from('tasks').insert({
      title: payload.title.trim(),
      description: payload.description?.trim() || null,
      status: 'backlog',
      creator_id: profile.value.id,
      scheduled_for: scheduledFor,
      visible_from: scheduledFor,
    }).select('*').single()

    if (error) {
      throw error
    }

    await supabase.functions.invoke('send-push', {
      body: {
        type: 'task_created',
        taskId: data.id,
        title: 'Новая задача',
        body: payload.title.trim(),
        url: '/',
        excludeUserId: profile.value.id,
      },
    })

    await refreshTasks()
  }

  async function assignTask(task: Task) {
    if (!profile.value) {
      throw new Error('User is not authenticated.')
    }

    const { error } = await supabase
      .from('tasks')
      .update({
        status: 'assigned',
        assignee_id: profile.value.id,
        updated_at: new Date().toISOString(),
      })
      .eq('id', task.id)
      .eq('status', 'backlog')

    if (error) {
      throw error
    }

    await supabase.functions.invoke('send-push', {
      body: {
        type: 'task_assigned',
        taskId: task.id,
        title: 'Задачу забрали',
        body: task.title,
        url: '/my',
        excludeUserId: profile.value.id,
      },
    })

    await refreshTasks()
  }

  async function completeTask(task: Task) {
    const { error } = await supabase
      .from('tasks')
      .update({
        status: 'done',
        completed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', task.id)

    if (error) {
      throw error
    }

    await refreshTasks()
  }

  async function deleteTask(task: Task) {
    const { error } = await supabase
      .from('tasks')
      .delete()
      .eq('id', task.id)

    if (error) {
      throw error
    }

    await refreshTasks()
  }

  function subscribeTasks() {
    if (channel) {
      return
    }

    channel = supabase
      .channel('tasks')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tasks' }, async () => {
        await refreshTasks()
      })
      .subscribe()
  }

  async function unsubscribeTasks() {
    if (!channel) {
      return
    }

    await supabase.removeChannel(channel)
    channel = null
  }

  return {
    tasks: readonly(tasks),
    tasksLoading: readonly(tasksLoading),
    backlogTasks,
    myTasks,
    overdueTasks,
    todayTasks,
    unscheduledTasks,
    refreshTasks,
    createTask,
    assignTask,
    completeTask,
    deleteTask,
    subscribeTasks,
    unsubscribeTasks,
  }
}
