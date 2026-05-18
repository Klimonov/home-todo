import vuetify, { transformAssetUrls } from 'vite-plugin-vuetify'

export default defineNuxtConfig({
  ssr: false,
  compatibilityDate: '2026-05-18',
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
      supabaseUrl: '',
      supabaseAnonKey: '',
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
      scope: '/',
      start_url: '/',
      icons: [
        {
          src: '/pwa.svg',
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
