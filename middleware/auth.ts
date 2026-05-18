export default defineNuxtRouteMiddleware((to) => {
  const { authReady, profile } = useAuth()

  if (!authReady.value) {
    return
  }

  if (!profile.value && to.path !== '/login') {
    return navigateTo('/login')
  }

  if (profile.value && to.path === '/login') {
    return navigateTo('/')
  }
})
