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
    path: '/orders',
    name: 'orders',
    component: () => import('../views/OrdersView.vue'),
    meta: { title: '訂單管理' },
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

export default router
