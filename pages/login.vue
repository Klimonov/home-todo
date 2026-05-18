<script setup lang="ts">
definePageMeta({ layout: false, middleware: 'auth' })

const { signIn } = useAuth()
const login = ref('')
const password = ref('')
const loading = ref(false)
const errorMessage = ref('')

async function submit() {
  errorMessage.value = ''
  loading.value = true

  try {
    await signIn(login.value, password.value)
    await navigateTo('/')
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : 'Не удалось войти'
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <v-main class="app-shell">
    <div class="mobile-page d-flex align-center" style="min-height: 100dvh;">
      <v-card class="pa-5 w-100 task-card">
        <div class="d-flex align-center ga-3 mb-6">
          <v-avatar color="primary" rounded="lg">
            <v-icon icon="mdi-format-list-checks" />
          </v-avatar>
          <div>
            <h1 class="screen-title">Home Todo1</h1>
            <div class="text-body-2 text-medium-emphasis">Семейный список дел</div>
          </div>
        </div>

        <v-form @submit.prevent="submit">
          <v-text-field
            v-model="login"
            label="Логин"
            autocomplete="username"
            prepend-inner-icon="mdi-account"
          />
          <v-text-field
            v-model="password"
            label="Пароль"
            type="password"
            autocomplete="current-password"
            prepend-inner-icon="mdi-lock"
          />

          <v-alert v-if="errorMessage" class="mb-4" color="error" variant="tonal">
            {{ errorMessage }}
          </v-alert>

          <v-btn
            block
            color="primary"
            size="large"
            type="submit"
            :loading="loading"
            :disabled="!login || !password"
          >
            Войти
          </v-btn>
        </v-form>
      </v-card>
    </div>
  </v-main>
</template>
