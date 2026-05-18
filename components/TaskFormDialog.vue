<script setup lang="ts">
const model = defineModel<boolean>({ required: true })
const emit = defineEmits<{
  submit: [{ title: string; description?: string; scheduled_for?: string | null }]
}>()

const title = ref('')
const description = ref('')
const scheduledFor = ref<string | null>(null)

function close() {
  model.value = false
}

function save() {
  emit('submit', {
    title: title.value,
    description: description.value,
    scheduled_for: scheduledFor.value,
  })
  title.value = ''
  description.value = ''
  scheduledFor.value = null
  close()
}
</script>

<template>
  <v-dialog v-model="model" fullscreen transition="dialog-bottom-transition">
    <v-card>
      <v-toolbar color="background">
        <v-btn icon="mdi-close" variant="text" @click="close" />
        <v-toolbar-title>Новая задача</v-toolbar-title>
        <v-btn
          color="primary"
          variant="text"
          :disabled="!title.trim()"
          @click="save"
        >
          Сохранить
        </v-btn>
      </v-toolbar>

      <div class="mobile-page">
        <v-text-field v-model="title" label="Название" autofocus />
        <v-textarea v-model="description" label="Описание" rows="4" auto-grow />
        <v-text-field
          v-model="scheduledFor"
          label="Дата"
          type="date"
          prepend-inner-icon="mdi-calendar"
        />
      </div>
    </v-card>
  </v-dialog>
</template>
