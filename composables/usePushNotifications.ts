export function usePushNotifications() {
  const supabase = useHomeSupabase()
  const config = useRuntimeConfig()
  const { profile } = useAuth()
  const permission = ref<NotificationPermission>('default')
  const supported = computed(() => import.meta.client && 'serviceWorker' in navigator && 'PushManager' in window)

  function urlBase64ToUint8Array(base64String: string) {
    const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
    const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
    const rawData = window.atob(base64)
    const outputArray = new Uint8Array(rawData.length)

    for (let i = 0; i < rawData.length; i += 1) {
      outputArray[i] = rawData.charCodeAt(i)
    }

    return outputArray
  }

  async function subscribe() {
    if (!supported.value || !profile.value) {
      return
    }

    permission.value = await Notification.requestPermission()

    if (permission.value !== 'granted') {
      return
    }

    const registration = await navigator.serviceWorker.ready
    const existing = await registration.pushManager.getSubscription()
    const subscription = existing ?? await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(config.public.vapidPublicKey),
    })

    const json = subscription.toJSON()

    const { error } = await supabase.from('push_subscriptions').upsert({
      user_id: profile.value.id,
      endpoint: json.endpoint,
      p256dh: json.keys?.p256dh,
      auth: json.keys?.auth,
      user_agent: navigator.userAgent,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'endpoint' })

    if (error) {
      throw error
    }
  }

  onMounted(() => {
    if (import.meta.client && 'Notification' in window) {
      permission.value = Notification.permission
    }
  })

  return {
    permission: readonly(permission),
    supported,
    subscribe,
  }
}
