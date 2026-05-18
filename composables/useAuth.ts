import type { Profile } from '~/types/database'

const profile = ref<Profile | null>(null)
const authReady = ref(false)

export function useAuth() {
  const api = useApiClient()

  async function loadProfile() {
    try {
      const data = await api.request<{ profile: Profile }>('/auth/me')
      profile.value = data.profile
    } catch {
      profile.value = null
    }
  }

  async function initialize() {
    await loadProfile()
    authReady.value = true
  }

  async function signIn(login: string, password: string) {
    const data = await api.request<{ token: string; profile: Profile }>('/auth/login', {
      method: 'POST',
      body: { login, password },
    })
    api.setToken(data.token)
    profile.value = data.profile
  }

  async function signOut() {
    api.clearToken()
    profile.value = null
    await navigateTo('/login')
  }

  return {
    authReady,
    profile: readonly(profile),
    initialize,
    signIn,
    signOut,
  }
}
