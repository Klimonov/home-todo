<script setup lang="ts">
import type { FrequencyType } from '~/types/database'

const model = defineModel<boolean>({ required: true })
const emit = defineEmits<{
  submit: [{
    title: string
    description?: string
    frequency_type: FrequencyType
    interval_value?: number | null
    weekdays?: number[] | null
    day_of_month?: number | null
    month?: number | null
    next_run_at: string
  }]
}>()

const title = ref('')
const description = ref('')
const frequencyType = ref<FrequencyType>('daily')
const intervalValue = ref<number | null>(1)
const weekdays = ref<number[]>([])
const dayOfMonth = ref<number | null>(null)
const month = ref<number | null>(null)
const nextRunAt = ref(new Date().toISOString().slice(0, 10))

const frequencyItems = [
  { title: 'Каждый день', value: 'daily' },
  { title: 'По дням недели', value: 'weekdays' },
  { title: 'Раз в N дней', value: 'every_n_days' },
  { title: 'Раз в N недель', value: 'every_n_weeks' },
  { title: 'Раз в N месяцев', value: 'every_n_months' },
  { title: 'Ежемесячно', value: 'monthly' },
  { title: 'Ежегодно', value: 'yearly' },
]

const weekdayItems = [
  { title: 'Пн', value: 1 },
  { title: 'Вт', value: 2 },
  { title: 'Ср', value: 3 },
  { title: 'Чт', value: 4 },
  { title: 'Пт', value: 5 },
  { title: 'Сб', value: 6 },
  { title: 'Вс', value: 0 },
]

function close() {
  model.value = false
}

function save() {
  emit('submit', {
    title: title.value,
    description: description.value,
    frequency_type: frequencyType.value,
    interval_value: intervalValue.value,
    weekdays: frequencyType.value === 'weekdays' ? weekdays.value : null,
    day_of_month: dayOfMonth.value,
    month: month.value,
    next_run_at: nextRunAt.value,
  })

  title.value = ''
  description.value = ''
  frequencyType.value = 'daily'
  intervalValue.value = 1
  weekdays.value = []
  dayOfMonth.value = null
  month.value = null
  nextRunAt.value = new Date().toISOString().slice(0, 10)
  close()
}
</script>

<template>
  <v-dialog v-model="model" fullscreen transition="dialog-bottom-transition">
    <v-card>
      <v-toolbar color="background">
        <v-btn icon="mdi-close" variant="text" @click="close" />
        <v-toolbar-title>Регулярное дело</v-toolbar-title>
        <v-btn color="primary" variant="text" :disabled="!title.trim()" @click="save">
          Сохранить
        </v-btn>
      </v-toolbar>

      <div class="mobile-page">
        <v-text-field v-model="title" label="Название" autofocus />
        <v-textarea v-model="description" label="Описание" rows="3" auto-grow />
        <v-select v-model="frequencyType" :items="frequencyItems" label="Повторение" />
        <v-select
          v-if="frequencyType === 'weekdays'"
          v-model="weekdays"
          :items="weekdayItems"
          label="Дни недели"
          multiple
          chips
        />
        <v-text-field
          v-if="['every_n_days', 'every_n_weeks', 'every_n_months'].includes(frequencyType)"
          v-model.number="intervalValue"
          label="Интервал"
          type="number"
          min="1"
        />
        <v-text-field
          v-if="['monthly', 'every_n_months', 'yearly'].includes(frequencyType)"
          v-model.number="dayOfMonth"
          label="День месяца"
          type="number"
          min="1"
          max="31"
        />
        <v-text-field
          v-if="frequencyType === 'yearly'"
          v-model.number="month"
          label="Месяц"
          type="number"
          min="1"
          max="12"
        />
        <v-text-field v-model="nextRunAt" label="Следующий запуск" type="date" />
      </div>
    </v-card>
  </v-dialog>
</template>
