<script setup lang="ts">
const route = useRoute()
const { profile, signOut } = useAuth()
const { refreshTasks, subscribeTasks } = useTasks()
const { subscribeRecurringTasks } = useRecurringTasks()
const { supported, permission, subscribe } = usePushNotifications()

const navItems = [
  { title: 'Backlog', icon: 'mdi-inbox-outline', to: '/' },
  { title: 'Мои', icon: 'mdi-checkbox-marked-circle-outline', to: '/my' },
  { title: 'Регулярные', icon: 'mdi-calendar-sync-outline', to: '/recurring' },
]

onMounted(async () => {
  await refreshTasks()
  subscribeTasks()
  subscribeRecurringTasks()
})
</script>

<template>
  <v-main class="app-shell">
    <v-app-bar color="background" elevation="0">
      <v-toolbar-title class="font-weight-bold">Home Todo</v-toolbar-title>
      <v-spacer />
      <v-btn
        v-if="supported && permission !== 'granted'"
        icon="mdi-bell-outline"
        variant="text"
        @click="subscribe"
      />
      <v-menu>
        <template #activator="{ props }">
          <v-btn v-bind="props" icon="mdi-account-circle-outline" variant="text" />
        </template>
        <v-list>
          <v-list-item :title="profile?.display_name || profile?.login" />
          <v-list-item prepend-icon="mdi-logout" title="Выйти" @click="signOut" />
        </v-list>
      </v-menu>
    </v-app-bar>

    <slot />

    <v-bottom-navigation
      :model-value="route.path"
      class="bottom-nav"
      color="primary"
      grow
      mandatory
    >
      <v-btn
        v-for="item in navItems"
        :key="item.to"
        :value="item.to"
        :to="item.to"
      >
        <v-icon :icon="item.icon" />
        <span>{{ item.title }}</span>
      </v-btn>
    </v-bottom-navigation>
  </v-main>
</template>
