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

/**
 * 訂單資料流的單一集中處，升級為 Pinia store 後可跨頁面共享同一份狀態。
 * 儀表板頁與訂單頁讀的是同一個 store，不需重新載入或各自持有資料。
 */
export const useOrdersStore = defineStore('orders', () => {
  // ---- 原始資料與載入狀態 ----
  const orders = ref<Order[]>([])
  const isLoading = ref(false)
  const loadError = ref<string | null>(null)
  const updateError = ref<string | null>(null)
  const updatingId = ref<string | null>(null)
  const hasLoaded = ref(false)

  // ---- 使用者操作的條件（唯一可寫入的來源）----
  const keyword = ref('')
  const statusFilter = ref<StatusFilter>('all')
  const sourceFilter = ref<SourceFilter>('all')
  const sortField = ref<SortField>('createdAt')
  const sortDirection = ref<SortDirection>('desc')
  const selectedOrderId = ref<string | null>(null)

  const debouncedKeyword = useDebounce(keyword, 300)

  /** 只在第一次真正載入，避免跨頁切換重複打 API */
  async function loadOrders(force = false) {
    if (hasLoaded.value && !force) return
    isLoading.value = true
    loadError.value = null
    try {
      orders.value = await fetchOrders()
      hasLoaded.value = true
    } catch (e) {
      loadError.value = e instanceof Error ? e.message : '載入訂單失敗'
    } finally {
      isLoading.value = false
    }
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

  // ---- Actions ----
  function selectOrder(id: string) {
    selectedOrderId.value = id
  }

  /** 新訂單進站（顧客送單後），直接併入單一資料來源，全站即時反映 */
  function appendOrder(order: Order) {
    orders.value = [order, ...orders.value]
  }

  async function changeOrderStatus(id: string, status: OrderStatus) {
    const target = orders.value.find((o) => o.id === id)
    if (!target || target.status === status) return

    const previous = target.status
    target.status = status // 樂觀更新
    updatingId.value = id
    updateError.value = null
    try {
      await updateOrderStatus(id, status)
    } catch (e) {
      target.status = previous // 回滾
      updateError.value = e instanceof Error ? e.message : '更新狀態失敗'
    } finally {
      updatingId.value = null
    }
  }

  // 篩選後若選取項被濾掉則清除，但更新中的訂單不清除
  watch(filteredOrders, (list) => {
    if (
      selectedOrderId.value &&
      selectedOrderId.value !== updatingId.value &&
      !list.some((o) => o.id === selectedOrderId.value)
    ) {
      selectedOrderId.value = null
    }
  })

  return {
    orders,
    isLoading,
    loadError,
    updateError,
    updatingId,
    keyword,
    statusFilter,
    sourceFilter,
    sortField,
    sortDirection,
    selectedOrderId,
    filteredOrders,
    stats,
    selectedOrder,
    loadOrders,
    selectOrder,
    appendOrder,
    changeOrderStatus,
  }
})
