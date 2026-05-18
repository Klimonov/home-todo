<script setup lang="ts">
definePageMeta({ middleware: 'auth' })

const {
  overdueTasks,
  todayTasks,
  unscheduledTasks,
  tasksLoading,
  completeTask,
  deleteTask,
} = useTasks()

const errorMessage = ref('')

async function handleComplete(task: Parameters<typeof completeTask>[0]) {
  errorMessage.value = ''

  try {
    await completeTask(task)
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : 'Не удалось выполнить задачу'
  }
}

async function handleDelete(task: Parameters<typeof deleteTask>[0]) {
  errorMessage.value = ''

  try {
    await deleteTask(task)
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : 'Не удалось удалить задачу'
  }
}
</script>

<template>
  <div class="mobile-page">
    <div class="mb-4">
      <h1 class="screen-title">Мои задачи</h1>
      <div class="text-body-2 text-medium-emphasis">Просроченные, сегодняшние и задачи без даты</div>
    </div>

    <v-alert v-if="errorMessage" class="mb-4" color="error" variant="tonal">
      {{ errorMessage }}
    </v-alert>

    <v-progress-linear v-if="tasksLoading" class="mb-4" color="primary" indeterminate />

    <section v-if="overdueTasks.length" class="mb-5">
      <div class="text-subtitle-2 text-error mb-2">Просрочено</div>
      <div class="d-flex flex-column ga-3">
        <TaskCard
          v-for="task in overdueTasks"
          :key="task.id"
          :task="task"
          mode="mine"
          @complete="handleComplete"
          @remove="handleDelete"
        />
      </div>
    </section>

    <section v-if="todayTasks.length" class="mb-5">
      <div class="text-subtitle-2 mb-2">Сегодня</div>
      <div class="d-flex flex-column ga-3">
        <TaskCard
          v-for="task in todayTasks"
          :key="task.id"
          :task="task"
          mode="mine"
          @complete="handleComplete"
          @remove="handleDelete"
        />
      </div>
    </section>

    <section v-if="unscheduledTasks.length" class="mb-5">
      <div class="text-subtitle-2 mb-2">Без даты</div>
      <div class="d-flex flex-column ga-3">
        <TaskCard
          v-for="task in unscheduledTasks"
          :key="task.id"
          :task="task"
          mode="mine"
          @complete="handleComplete"
          @remove="handleDelete"
        />
      </div>
    </section>

    <div v-if="!overdueTasks.length && !todayTasks.length && !unscheduledTasks.length" class="empty-state">
      Личный список пуст
    </div>
  </div>
</template>
