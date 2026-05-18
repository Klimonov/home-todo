const TOKEN_KEY = 'home-todo-token'

export function useApiClient() {
  const config = useRuntimeConfig()

  function getToken() {
    return import.meta.client ? localStorage.getItem(TOKEN_KEY) : null
  }

  function setToken(token: string) {
    if (import.meta.client) localStorage.setItem(TOKEN_KEY, token)
  }

  function clearToken() {
    if (import.meta.client) localStorage.removeItem(TOKEN_KEY)
  }

  async function request<T = unknown>(
    path: string,
    options?: { method?: string; body?: unknown },
  ): Promise<T> {
    const token = getToken()
    const res = await fetch(`${config.public.apiUrl}${path}`, {
      method: options?.method ?? 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      ...(options?.body !== undefined ? { body: JSON.stringify(options.body) } : {}),
    })

    if (res.status === 401) {
      clearToken()
      throw new Error('Unauthorized')
    }

    if (!res.ok) {
      const data = await res.json().catch(() => ({ error: 'Request failed' })) as { error?: string }
      throw new Error(data.error ?? 'Request failed')
    }

    return res.json() as Promise<T>
  }

  return { request, setToken, clearToken }
}
