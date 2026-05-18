import { isBefore, isToday, parseISO, startOfToday } from 'date-fns'
import type { Task } from '~/types/database'

export function useBadge() {
  function countBadgeTasks(tasks: Task[]) {
    const today = startOfToday()

    return tasks.filter((task) => {
      if (task.status !== 'assigned' || !task.scheduled_for) {
        return false
      }

      const scheduledDate = parseISO(task.scheduled_for)
      return isToday(scheduledDate) || isBefore(scheduledDate, today)
    }).length
  }

  async function setBadge(count: number) {
    if (!import.meta.client || !('navigator' in globalThis)) {
      return
    }

    const nav = navigator as Navigator & {
      setAppBadge?: (contents?: number) => Promise<void>
      clearAppBadge?: () => Promise<void>
    }

    try {
      if (count > 0 && nav.setAppBadge) {
        await nav.setAppBadge(count)
      } else if (nav.clearAppBadge) {
        await nav.clearAppBadge()
      }
    } catch {
      // Badge support depends on the platform and install state.
    }
  }

  return { countBadgeTasks, setBadge }
}
