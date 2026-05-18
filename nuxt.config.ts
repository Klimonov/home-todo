import vuetify, { transformAssetUrls } from 'vite-plugin-vuetify'

declare const process: {
  env: Record<string, string | undefined>
}

const baseURL = process.env.NUXT_APP_BASE_URL || '/'

export default defineNuxtConfig({
  ssr: false,
  compatibilityDate: '2026-05-18',
  app: {
    baseURL,
  },
  css: ['vuetify/styles', '@mdi/font/css/materialdesignicons.min.css', '~/assets/styles/main.css'],
  modules: [
    '@vite-pwa/nuxt',
    (_options: unknown, nuxt: { hooks: { hook: (name: 'vite:extendConfig', callback: (config: { plugins?: unknown[] }) => void) => void } }) => {
      nuxt.hooks.hook('vite:extendConfig', (config) => {
        ;(config.plugins as unknown[]).push(vuetify({ autoImport: true }))
      })
    },
  ],
  build: {
    transpile: ['vuetify'],
  },
  runtimeConfig: {
    public: {
      apiUrl: '',
      vapidPublicKey: '',
    },
  },
  vite: {
    vue: {
      template: {
        transformAssetUrls,
      },
    },
  },
  pwa: {
    strategies: 'injectManifest',
    srcDir: 'service-worker',
    filename: 'sw.ts',
    registerType: 'autoUpdate',
    manifest: {
      name: 'Home Todo',
      short_name: 'Todo',
      description: 'Family todo backlog for two people',
      theme_color: '#2f5d50',
      background_color: '#f6f7f4',
      display: 'standalone',
      orientation: 'portrait',
      scope: baseURL,
      start_url: baseURL,
      icons: [
        {
          src: `${baseURL}pwa.svg`,
          sizes: 'any',
          type: 'image/svg+xml',
          purpose: 'any maskable',
        },
      ],
    },
    injectManifest: {
      globPatterns: ['**/*.{js,css,html,svg,ico}'],
    },
    client: {
      installPrompt: true,
    },
    devOptions: {
      enabled: true,
      type: 'module',
    },
  },
})
