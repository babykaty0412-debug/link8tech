import { createApp } from 'vue'
import { createPinia } from 'pinia'
import './style.css'
import App from './App.vue'
import router from './router'

async function bootstrap() {
  // 啟用 MSW 攔截 API：本專案為前端展示作品，用 mock 後端提供資料。
  // 換成真後端時，移除此段並將 api 的 BASE_URL 指向後端即可。
  const { worker } = await import('./mocks/browser')
  await worker.start({
    onUnhandledRequest: 'bypass',
    // 支援部署在子路徑（如 GitHub Pages）時正確載入 service worker
    serviceWorker: { url: `${import.meta.env.BASE_URL}mockServiceWorker.js` },
  })

  createApp(App).use(createPinia()).use(router).mount('#app')
}

bootstrap()
