import type { Profile } from '~/types/database'

const profile = ref<Profile | null>(null)
const authReady = ref(false)

function loginToEmail(login: string) {
  return `${login.trim().toLowerCase()}@home-todo.local`
}

export function useAuth() {
  const supabase = useHomeSupabase()
  const user = useState('auth-user', () => null as Awaited<ReturnType<typeof supabase.auth.getUser>>['data']['user'])

  async function loadProfile() {
    const { data } = await supabase.auth.getUser()
    user.value = data.user

    if (!data.user) {
      profile.value = null
      return
    }

    const { data: currentProfile, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', data.user.id)
      .single()

    if (error) {
      throw error
    }

    profile.value = currentProfile as Profile
  }

  async function initialize() {
    await loadProfile()
    authReady.value = true

    supabase.auth.onAuthStateChange(async () => {
      await loadProfile()
    })
  }

  async function signIn(login: string, password: string) {
    const { error } = await supabase.auth.signInWithPassword({
      email: loginToEmail(login),
      password,
    })

    if (error) {
      throw error
    }

    await loadProfile()
  }

  async function signOut() {
    await supabase.auth.signOut()
    profile.value = null
    user.value = null
    await navigateTo('/login')
  }

  return {
    authReady,
    profile: readonly(profile),
    user: readonly(user),
    initialize,
    signIn,
    signOut,
  }
}
