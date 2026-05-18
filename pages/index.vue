<script setup lang="ts">
definePageMeta({ middleware: 'auth' })

const {
  backlogTasks,
  tasksLoading,
  createTask,
  assignTask,
} = useTasks()

const dialogOpen = ref(false)
const errorMessage = ref('')

async function handleCreate(payload: { title: string; description?: string; scheduled_for?: string | null }) {
  errorMessage.value = ''

  try {
    await createTask(payload)
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : 'Не удалось создать задачу'
  }
}

async function handleAssign(taskId: Parameters<typeof assignTask>[0]) {
  errorMessage.value = ''

  try {
    await assignTask(taskId)
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : 'Не удалось забрать задачу'
  }
}
</script>

<template>
  <div class="mobile-page">
    <div class="d-flex align-center mb-4">
      <div>
        <h1 class="screen-title">Backlog</h1>
        <div class="text-body-2 text-medium-emphasis">Общие задачи, которые можно забрать себе</div>
      </div>
      <v-spacer />
      <v-btn color="primary" icon="mdi-plus" @click="dialogOpen = true" />
    </div>

    <v-alert v-if="errorMessage" class="mb-4" color="error" variant="tonal">
      {{ errorMessage }}
    </v-alert>

    <v-progress-linear v-if="tasksLoading" class="mb-4" color="primary" indeterminate />

    <div v-if="backlogTasks.length" class="d-flex flex-column ga-3">
      <TaskCard
        v-for="task in backlogTasks"
        :key="task.id"
        :task="task"
        mode="backlog"
        @assign="handleAssign"
      />
    </div>
    <div v-else class="empty-state">
      В backlog пока нет задач
    </div>

    <TaskFormDialog v-model="dialogOpen" @submit="handleCreate" />
  </div>
</template>
