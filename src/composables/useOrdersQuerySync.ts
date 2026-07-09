import { watch } from 'vue'
import { storeToRefs } from 'pinia'
import { useRoute, useRouter, type LocationQuery } from 'vue-router'
import { useOrdersStore } from '../stores/orders'
import type { OrderSource, OrderStatus, SortField } from '../types/order'

const STATUSES: OrderStatus[] = ['pending', 'paid', 'cancelled']
const SOURCES: OrderSource[] = ['web', 'app', 'pos']

/**
 * 訂單頁篩選條件 ↔ URL query 雙向同步（考題加分項）。
 * - 重新整理／分享網址，搜尋、篩選、排序條件不遺失
 * - 僅寫入非預設值，網址保持乾淨；用 replace 不塞瀏覽歷史
 * - 無效的 query 值一律回退預設，不會弄壞畫面
 */
export function useOrdersQuerySync() {
  const route = useRoute()
  const router = useRouter()
  const store = useOrdersStore()
  const { keyword, statusFilter, sourceFilter, sortField, sortDirection } =
    storeToRefs(store)

  /** URL → store：驗證每個參數，無效值回退預設 */
  function applyQuery(q: LocationQuery) {
    keyword.value = typeof q.kw === 'string' ? q.kw : ''
    statusFilter.value = STATUSES.includes(q.status as OrderStatus)
      ? (q.status as OrderStatus)
      : 'all'
    sourceFilter.value = SOURCES.includes(q.source as OrderSource)
      ? (q.source as OrderSource)
      : 'all'
    sortField.value = q.sort === 'amount' ? 'amount' : ('createdAt' as SortField)
    sortDirection.value = q.dir === 'asc' ? 'asc' : 'desc'
  }

  /** store → URL：只寫非預設值 */
  function buildQuery(): Record<string, string> {
    const q: Record<string, string> = {}
    if (keyword.value.trim()) q.kw = keyword.value.trim()
    if (statusFilter.value !== 'all') q.status = statusFilter.value
    if (sourceFilter.value !== 'all') q.source = sourceFilter.value
    if (sortField.value !== 'createdAt') q.sort = sortField.value
    if (sortDirection.value !== 'desc') q.dir = sortDirection.value
    return q
  }

  function sameQuery(a: Record<string, unknown>, b: Record<string, unknown>) {
    const keys = ['kw', 'status', 'source', 'sort', 'dir']
    return keys.every((k) => (a[k] ?? '') === (b[k] ?? ''))
  }

  // 進頁時以網址初始化條件
  applyQuery(route.query)

  // 條件變動 → 反映到網址（replace：不產生歷史紀錄）
  watch([keyword, statusFilter, sourceFilter, sortField, sortDirection], () => {
    const next = buildQuery()
    if (!sameQuery(next, route.query)) {
      router.replace({ query: next })
    }
  })

  // 瀏覽器上一頁/下一頁改變 query → 套回條件
  watch(
    () => route.query,
    (q) => {
      if (!sameQuery(buildQuery(), q)) applyQuery(q)
    },
  )
}
