import { isBefore, isToday, parseISO, startOfToday } from 'date-fns'
import type { Task } from '~/types/database'

const tasks = ref<Task[]>([])
const tasksLoading = ref(false)
let pollingTimer: ReturnType<typeof setInterval> | null = null

export function useTasks() {
  const api = useApiClient()
  const { profile } = useAuth()
  const { countBadgeTasks, setBadge } = useBadge()

  const todayIso = computed(() => new Date().toISOString().slice(0, 10))

  const backlogTasks = computed(() => tasks.value.filter((task) => {
    if (task.status !== 'backlog') return false
    if (!task.visible_from) return true
    return task.visible_from <= todayIso.value
  }))

  const myTasks = computed(() => tasks.value.filter((task) => (
    task.status === 'assigned' && task.assignee_id === profile.value?.id
  )))

  const overdueTasks = computed(() => myTasks.value.filter((task) => {
    if (!task.scheduled_for) return false
    return isBefore(parseISO(task.scheduled_for), startOfToday())
  }))

  const todayTasks = computed(() => myTasks.value.filter((task) => (
    task.scheduled_for ? isToday(parseISO(task.scheduled_for)) : false
  )))

  const unscheduledTasks = computed(() => myTasks.value.filter((task) => !task.scheduled_for))

  async function refreshTasks() {
    tasksLoading.value = true
    try {
      const data = await api.request<{ tasks: Task[] }>('/tasks')
      tasks.value = data.tasks
      await setBadge(countBadgeTasks(myTasks.value))
    } finally {
      tasksLoading.value = false
    }
  }

  async function createTask(payload: { title: string; description?: string; scheduled_for?: string | null }) {
    await api.request('/tasks', { method: 'POST', body: payload })
    await refreshTasks()
  }

  async function assignTask(task: Task) {
    await api.request(`/tasks/${task.id}`, { method: 'PATCH', body: { action: 'assign' } })
    await refreshTasks()
  }

  async function completeTask(task: Task) {
    await api.request(`/tasks/${task.id}`, { method: 'PATCH', body: { action: 'complete' } })
    await refreshTasks()
  }

  async function deleteTask(task: Task) {
    await api.request(`/tasks/${task.id}`, { method: 'DELETE' })
    await refreshTasks()
  }

  function subscribeTasks() {
    if (pollingTimer) return
    pollingTimer = setInterval(() => void refreshTasks(), 10_000)
  }

  function unsubscribeTasks() {
    if (!pollingTimer) return
    clearInterval(pollingTimer)
    pollingTimer = null
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
