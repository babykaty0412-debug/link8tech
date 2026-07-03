import { computed, ref, watch } from 'vue'
import { defineStore } from 'pinia'
import { fetchOrders, updateOrderStatus } from '../api/orderApi'
import { useDebounce } from '../composables/useDebounce'
import type {
  Order,
  OrderSource,
  OrderStats,
  OrderStatus,
  SortDirection,
  SortField,
} from '../types/order'

/** 篩選條件的「全部」選項 */
export type StatusFilter = OrderStatus | 'all'
export type SourceFilter = OrderSource | 'all'

/** 綁定訂單的更新錯誤：明細只顯示屬於自己那筆的錯誤 */
export interface UpdateError {
  orderId: string
  message: string
}

/**
 * 訂單資料流的單一集中處，升級為 Pinia store 後可跨頁面共享同一份狀態。
 * 儀表板頁與訂單頁讀的是同一個 store，不需重新載入或各自持有資料。
 */
export const useOrdersStore = defineStore('orders', () => {
  // ---- 原始資料與載入狀態 ----
  const orders = ref<Order[]>([])
  const isLoading = ref(false)
  // 載入清單的錯誤（會佔滿列表區）
  const loadError = ref<string | null>(null)
  // 更新狀態的錯誤：綁定訂單 id，只掛在該筆訂單上
  const updateError = ref<UpdateError | null>(null)
  // 更新中的訂單 id 集合：支援多筆併發更新，各自獨立鎖定
  const updatingIds = ref<Set<string>>(new Set())
  const hasLoaded = ref(false)

  // ---- 使用者操作的條件（唯一可寫入的來源）----
  const keyword = ref('')
  const statusFilter = ref<StatusFilter>('all')
  const sourceFilter = ref<SourceFilter>('all')
  const sortField = ref<SortField>('createdAt')
  const sortDirection = ref<SortDirection>('desc')
  const selectedOrderId = ref<string | null>(null)

  const debouncedKeyword = useDebounce(keyword, 300)

  /** 進行中的載入請求：去重，避免多頁同時 mount 發出多支互相覆寫的 GET */
  let inFlightLoad: Promise<void> | null = null

  /**
   * 載入訂單。只在第一次真正載入；併發呼叫共用同一個請求。
   * 合併策略：本地有、伺服器沒有的訂單（剛送出的新單）保留；
   * 更新中訂單的樂觀狀態不被舊快照覆蓋。
   */
  function loadOrders(force = false): Promise<void> {
    if (hasLoaded.value && !force) return Promise.resolve()
    if (inFlightLoad) return inFlightLoad

    isLoading.value = true
    loadError.value = null
    inFlightLoad = (async () => {
      try {
        const fetched = await fetchOrders()
        const fetchedIds = new Set(fetched.map((o) => o.id))
        // 保留本地才有的新訂單（如剛補送成功、伺服器快照較舊）
        const localOnly = orders.value.filter((o) => !fetchedIds.has(o.id))
        // 更新中訂單維持樂觀狀態，不被舊資料蓋回
        const merged = fetched.map((o) => {
          if (!updatingIds.value.has(o.id)) return o
          const local = orders.value.find((x) => x.id === o.id)
          return local ? { ...o, status: local.status } : o
        })
        orders.value = [...localOnly, ...merged]
        hasLoaded.value = true
      } catch (e) {
        loadError.value = e instanceof Error ? e.message : '載入訂單失敗'
      } finally {
        isLoading.value = false
        inFlightLoad = null
      }
    })()
    return inFlightLoad
  }

  // ---- Derived state ----
  const filteredOrders = computed<Order[]>(() => {
    const kw = debouncedKeyword.value.trim().toLowerCase()
    const result = orders.value.filter((order) => {
      const matchKeyword =
        !kw ||
        order.id.toLowerCase().includes(kw) ||
        order.customerName.toLowerCase().includes(kw)
      const matchStatus =
        statusFilter.value === 'all' || order.status === statusFilter.value
      const matchSource =
        sourceFilter.value === 'all' || order.source === sourceFilter.value
      return matchKeyword && matchStatus && matchSource
    })

    const dir = sortDirection.value === 'asc' ? 1 : -1
    return result.sort((a, b) => {
      if (sortField.value === 'amount') return (a.amount - b.amount) * dir
      return (
        (new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()) *
        dir
      )
    })
  })

  const stats = computed<OrderStats>(() =>
    orders.value.reduce<OrderStats>(
      (acc, order) => {
        acc.total += 1
        if (order.status === 'paid') acc.paidAmount += order.amount
        if (order.status === 'pending') acc.pendingCount += 1
        if (order.status === 'cancelled') acc.cancelledCount += 1
        return acc
      },
      { total: 0, paidAmount: 0, pendingCount: 0, cancelledCount: 0 },
    ),
  )

  const selectedOrder = computed<Order | null>(
    () => orders.value.find((o) => o.id === selectedOrderId.value) ?? null,
  )

  /** 指定訂單是否更新中（元件用） */
  function isUpdating(id: string): boolean {
    return updatingIds.value.has(id)
  }

  // ---- Actions ----
  function selectOrder(id: string) {
    selectedOrderId.value = id
    // 切換選取時清掉舊錯誤，避免 A 的失敗訊息掛在 B 的明細上
    if (updateError.value && updateError.value.orderId !== id) {
      updateError.value = null
    }
  }

  /** 新訂單進站（顧客送單後），直接併入單一資料來源，全站即時反映 */
  function appendOrder(order: Order) {
    // 防重：補送與重新載入可能讓同一筆訂單兩條路進站
    if (orders.value.some((o) => o.id === order.id)) return
    orders.value = [order, ...orders.value]
  }

  /** 選取的訂單被篩掉且不在更新中 → 清除選取，避免明細殘留 */
  function pruneSelection() {
    if (
      selectedOrderId.value &&
      !updatingIds.value.has(selectedOrderId.value) &&
      !filteredOrders.value.some((o) => o.id === selectedOrderId.value)
    ) {
      selectedOrderId.value = null
    }
  }

  /**
   * 樂觀更新：先改本地狀態讓畫面即時反應，再送 API；
   * 失敗則回滾並記錄錯誤。回滾一律以 id 重查當前物件，
   * 不使用 await 前捕捉的引用（陣列可能已被 loadOrders 整批替換）。
   */
  async function changeOrderStatus(id: string, status: OrderStatus) {
    const target = orders.value.find((o) => o.id === id)
    if (!target || target.status === status) return
    // 同一筆訂單的更新尚未完成前不接受第二次，避免交錯回滾
    if (updatingIds.value.has(id)) return

    const previous = target.status
    target.status = status // 樂觀更新
    updatingIds.value = new Set(updatingIds.value).add(id)
    if (updateError.value?.orderId === id) updateError.value = null
    try {
      const updated = await updateOrderStatus(id, status)
      // 以伺服器回應為準，並以 id 重查（期間陣列可能已被替換）
      const current = orders.value.find((o) => o.id === id)
      if (current) current.status = updated.status
    } catch (e) {
      const current = orders.value.find((o) => o.id === id)
      if (current) current.status = previous // 回滾（以 id 重查）
      updateError.value = {
        orderId: id,
        message: e instanceof Error ? e.message : '更新狀態失敗',
      }
    } finally {
      const next = new Set(updatingIds.value)
      next.delete(id)
      updatingIds.value = next
      // 更新結束後重評估選取（watch 只在 filteredOrders 重算時觸發，
      // 這裡補上「更新完成」這個時間點的檢查，避免殘留選取）
      pruneSelection()
    }
  }

  // 篩選條件變動時，若當前選取項已被濾掉，清除選取避免明細殘留
  watch(filteredOrders, pruneSelection)

  return {
    orders,
    isLoading,
    loadError,
    updateError,
    updatingIds,
    keyword,
    statusFilter,
    sourceFilter,
    sortField,
    sortDirection,
    selectedOrderId,
    filteredOrders,
    stats,
    selectedOrder,
    isUpdating,
    loadOrders,
    selectOrder,
    appendOrder,
    changeOrderStatus,
  }
})
