<script setup lang="ts">
import { format, parseISO } from 'date-fns'
import { ru } from 'date-fns/locale'
import type { Task } from '~/types/database'

const props = defineProps<{
  task: Task
  mode: 'backlog' | 'mine'
}>()

const emit = defineEmits<{
  assign: [Task]
  complete: [Task]
  remove: [Task]
}>()

const formattedDate = computed(() => {
  if (!props.task.scheduled_for) {
    return null
  }

  return format(parseISO(props.task.scheduled_for), 'd MMMM', { locale: ru })
})
</script>

<template>
  <v-card class="task-card pa-4">
    <div class="d-flex align-start ga-3">
      <v-icon
        :icon="mode === 'backlog' ? 'mdi-inbox-outline' : 'mdi-checkbox-blank-circle-outline'"
        class="mt-1"
        color="primary"
      />
      <div class="flex-grow-1">
        <div class="font-weight-medium">{{ task.title }}</div>
        <div v-if="task.description" class="text-body-2 text-medium-emphasis mt-1">
          {{ task.description }}
        </div>
        <v-chip v-if="formattedDate" class="mt-3" color="secondary" size="small" variant="tonal">
          <v-icon start icon="mdi-calendar" />
          {{ formattedDate }}
        </v-chip>
      </div>
    </div>

    <div class="d-flex ga-2 mt-4">
      <v-btn
        v-if="mode === 'backlog'"
        color="primary"
        prepend-icon="mdi-account-arrow-right-outline"
        variant="flat"
        @click="emit('assign', task)"
      >
        Забрать
      </v-btn>
      <template v-else>
        <v-btn
          color="primary"
          prepend-icon="mdi-check"
          variant="flat"
          @click="emit('complete', task)"
        >
          Готово
        </v-btn>
        <v-btn
          icon="mdi-delete-outline"
          variant="text"
          color="error"
          @click="emit('remove', task)"
        />
      </template>
    </div>
  </v-card>
</template>
