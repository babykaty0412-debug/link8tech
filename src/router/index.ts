import { createRouter, createWebHistory, type RouteRecordRaw } from 'vue-router'

/**
 * 路由採懶載入（動態 import），每個頁面自動 code-splitting，
 * 首屏只載入需要的 chunk，是大型專案的效能基本功。
 */
const routes: RouteRecordRaw[] = [
  {
    path: '/',
    name: 'dashboard',
    component: () => import('../views/DashboardView.vue'),
    meta: { title: '儀表板' },
  },
  {
    path: '/menu',
    name: 'menu',
    component: () => import('../views/MenuView.vue'),
    meta: { title: '顧客點餐' },
  },
  {
    path: '/orders',
    name: 'orders',
    component: () => import('../views/OrdersView.vue'),
    meta: { title: '訂單管理' },
  },
  {
    path: '/kitchen',
    name: 'kitchen',
    component: () => import('../views/KitchenView.vue'),
    meta: { title: '廚房出單' },
  },
  {
    path: '/schedule',
    name: 'schedule',
    component: () => import('../views/ScheduleView.vue'),
    meta: { title: '師傅排班' },
  },
  // 找不到的路徑導回首頁
  { path: '/:pathMatch(.*)*', redirect: '/' },
]

const router = createRouter({
  history: createWebHistory(),
  routes,
  scrollBehavior: () => ({ top: 0 }),
})

// 依路由 meta 更新頁籤標題
router.afterEach((to) => {
  const title = to.meta.title as string | undefined
  document.title = title ? `${title}｜訂單管理系統` : '訂單管理系統'
})

// 懶載入 chunk 失敗（部署更新後舊 chunk 404）：重新整理一次拿新版。
// 每個 tab session 只自動重整一次——旗標不在導覽成功時清除，
// 避免「chunk 永久壞掉」時反覆無限重整（清除旗標的動作交給整頁重新載入）。
router.onError((error) => {
  const isChunkError = /Failed to fetch dynamically imported module|Importing a module script failed/.test(
    String(error?.message ?? error),
  )
  if (isChunkError && !sessionStorage.getItem('chunk-reloaded')) {
    sessionStorage.setItem('chunk-reloaded', '1')
    window.location.reload()
  }
}) // 注：sessionStorage 於整頁 reload 後仍保留，故一個 session 至多自動重整一次

export default router
