export default defineNuxtPlugin(async () => {
  const { initialize } = useAuth()
  const route = useRoute()

  try {
    await initialize()
  } catch {
    // The login screen remains usable even when Supabase env vars are missing locally.
  }

  const { profile } = useAuth()

  if (!profile.value && route.path !== '/login') {
    await navigateTo('/login')
  }
})
