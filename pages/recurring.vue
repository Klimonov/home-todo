<script setup lang="ts">
import { format, parseISO } from 'date-fns'
import { ru } from 'date-fns/locale'
import type { FrequencyType } from '~/types/database'

definePageMeta({ middleware: 'auth' })

const {
  recurringTasks,
  recurringLoading,
  refreshRecurringTasks,
  createRecurringTask,
  toggleRecurringTask,
  deleteRecurringTask,
} = useRecurringTasks()

const dialogOpen = ref(false)
const errorMessage = ref('')

const frequencyLabels: Record<FrequencyType, string> = {
  daily: 'Каждый день',
  weekdays: 'По дням недели',
  every_n_days: 'Раз в N дней',
  every_n_weeks: 'Раз в N недель',
  every_n_months: 'Раз в N месяцев',
  monthly: 'Ежемесячно',
  yearly: 'Ежегодно',
}

onMounted(refreshRecurringTasks)

function formatDate(date: string) {
  return format(parseISO(date), 'd MMMM yyyy', { locale: ru })
}

async function handleCreate(payload: Parameters<typeof createRecurringTask>[0]) {
  errorMessage.value = ''

  try {
    await createRecurringTask(payload)
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : 'Не удалось создать регулярное дело'
  }
}

async function handleToggle(task: Parameters<typeof toggleRecurringTask>[0]) {
  errorMessage.value = ''

  try {
    await toggleRecurringTask(task)
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : 'Не удалось изменить регулярное дело'
  }
}

async function handleDelete(task: Parameters<typeof deleteRecurringTask>[0]) {
  errorMessage.value = ''

  try {
    await deleteRecurringTask(task)
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : 'Не удалось удалить регулярное дело'
  }
}
</script>

<template>
  <div class="mobile-page">
    <div class="d-flex align-center mb-4">
      <div>
        <h1 class="screen-title">Регулярные</h1>
        <div class="text-body-2 text-medium-emphasis">Шаблоны задач, которые появляются в backlog</div>
      </div>
      <v-spacer />
      <v-btn color="primary" icon="mdi-plus" @click="dialogOpen = true" />
    </div>

    <v-alert v-if="errorMessage" class="mb-4" color="error" variant="tonal">
      {{ errorMessage }}
    </v-alert>

    <v-progress-linear v-if="recurringLoading" class="mb-4" color="primary" indeterminate />

    <div v-if="recurringTasks.length" class="d-flex flex-column ga-3">
      <v-card v-for="task in recurringTasks" :key="task.id" class="task-card pa-4">
        <div class="d-flex align-start ga-3">
          <v-icon icon="mdi-calendar-sync-outline" color="primary" class="mt-1" />
          <div class="flex-grow-1">
            <div class="font-weight-medium">{{ task.title }}</div>
            <div v-if="task.description" class="text-body-2 text-medium-emphasis mt-1">
              {{ task.description }}
            </div>
            <div class="d-flex flex-wrap ga-2 mt-3">
              <v-chip color="primary" size="small" variant="tonal">
                {{ frequencyLabels[task.frequency_type] }}
              </v-chip>
              <v-chip color="secondary" size="small" variant="tonal">
                {{ formatDate(task.next_run_at) }}
              </v-chip>
            </div>
          </div>
        </div>

        <div class="d-flex align-center ga-2 mt-4">
          <v-switch
            :model-value="task.enabled"
            color="primary"
            density="compact"
            hide-details
            @click="handleToggle(task)"
          />
          <v-spacer />
          <v-btn icon="mdi-delete-outline" variant="text" color="error" @click="handleDelete(task)" />
        </div>
      </v-card>
    </div>
    <div v-else class="empty-state">
      Регулярных дел пока нет
    </div>

    <RecurringFormDialog v-model="dialogOpen" @submit="handleCreate" />
  </div>
</template>
