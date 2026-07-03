import { describe, it, expect, beforeEach, vi } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { nextTick } from 'vue'
import { useOrdersStore } from './orders'
import { seedOrders } from '../mocks/data'
import type { Order } from '../types/order'

// 以 mock 取代真實 API，測試聚焦 store 邏輯而非網路
vi.mock('../api/orderApi', () => ({
  fetchOrders: vi.fn(),
  updateOrderStatus: vi.fn(),
}))

import { fetchOrders, updateOrderStatus } from '../api/orderApi'

const clone = () => structuredClone(seedOrders) as Order[]

describe('useOrdersStore', () => {
  beforeEach(async () => {
    setActivePinia(createPinia())
    vi.mocked(fetchOrders).mockClear()
    vi.mocked(fetchOrders).mockResolvedValue(clone())
    vi.mocked(updateOrderStatus).mockReset()
  })

  it('loadOrders 載入資料並結束 loading', async () => {
    const store = useOrdersStore()
    expect(store.orders).toHaveLength(0)
    await store.loadOrders()
    expect(store.orders).toHaveLength(4)
    expect(store.isLoading).toBe(false)
  })

  it('stats 以全部訂單為基準計算', async () => {
    const store = useOrdersStore()
    await store.loadOrders()
    expect(store.stats).toEqual({
      total: 4,
      paidAmount: 2340, // 760 + 1580
      pendingCount: 1,
      cancelledCount: 1,
    })
  })

  it('狀態篩選只回傳對應狀態', async () => {
    const store = useOrdersStore()
    await store.loadOrders()
    store.statusFilter = 'paid'
    expect(store.filteredOrders).toHaveLength(2)
    expect(store.filteredOrders.every((o) => o.status === 'paid')).toBe(true)
  })

  it('來源篩選正確', async () => {
    const store = useOrdersStore()
    await store.loadOrders()
    store.sourceFilter = 'web'
    expect(store.filteredOrders.map((o) => o.id)).toEqual([
      'A20260625004',
      'A20260625001',
    ])
  })

  it('金額排序（由小到大）', async () => {
    const store = useOrdersStore()
    await store.loadOrders()
    store.sortField = 'amount'
    store.sortDirection = 'asc'
    expect(store.filteredOrders.map((o) => o.amount)).toEqual([
      450, 760, 1280, 1580,
    ])
  })

  it('關鍵字搜尋（去抖後）大小寫不敏感、可查編號或姓名', async () => {
    vi.useFakeTimers()
    const store = useOrdersStore()
    await store.loadOrders()
    store.keyword = '雅婷'
    await nextTick()
    await vi.advanceTimersByTimeAsync(300)
    expect(store.filteredOrders).toHaveLength(1)
    expect(store.filteredOrders[0].customerName).toBe('李雅婷')
    vi.useRealTimers()
  })

  it('selectedOrder 由 selectedOrderId 即時查出（單一資料來源）', async () => {
    const store = useOrdersStore()
    await store.loadOrders()
    store.selectOrder('A20260625003')
    expect(store.selectedOrder?.customerName).toBe('陳柏翰')
  })

  it('changeOrderStatus 樂觀更新成功後以伺服器回應同步狀態', async () => {
    vi.mocked(updateOrderStatus).mockResolvedValue({
      id: 'A20260625001',
      status: 'paid',
    } as Order)
    const store = useOrdersStore()
    await store.loadOrders()
    await store.changeOrderStatus('A20260625001', 'paid')
    const target = store.orders.find((o) => o.id === 'A20260625001')
    expect(target?.status).toBe('paid')
    expect(store.updateError).toBeNull()
  })

  it('changeOrderStatus 失敗時回滾並記錄「綁定訂單」的錯誤', async () => {
    vi.mocked(updateOrderStatus).mockRejectedValue(new Error('伺服器錯誤'))
    const store = useOrdersStore()
    await store.loadOrders()
    await store.changeOrderStatus('A20260625001', 'cancelled')
    const target = store.orders.find((o) => o.id === 'A20260625001')
    expect(target?.status).toBe('pending') // 回滾到原狀態
    expect(store.updateError).toEqual({
      orderId: 'A20260625001',
      message: '伺服器錯誤',
    })
  })

  it('回滾以 id 重查：更新期間 orders 被整批替換也能正確回滾', async () => {
    // 模擬 PATCH 飛行中，orders 陣列被 loadOrders(force) 整包換新
    vi.mocked(updateOrderStatus).mockImplementation(async () => {
      const store = useOrdersStore()
      store.orders = structuredClone(seedOrders) // 全新物件（舊 target 成孤兒）
      throw new Error('伺服器錯誤')
    })
    const store = useOrdersStore()
    await store.loadOrders()
    await store.changeOrderStatus('A20260625001', 'paid')
    const target = store.orders.find((o) => o.id === 'A20260625001')
    expect(target?.status).toBe('pending') // 新物件上也回滾成功
  })

  it('同一筆訂單更新未完成前，第二次呼叫直接忽略（防交錯回滾）', async () => {
    let resolveFirst!: () => void
    vi.mocked(updateOrderStatus).mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveFirst = () =>
            resolve({ id: 'A20260625001', status: 'paid' } as Order)
        }),
    )
    const store = useOrdersStore()
    await store.loadOrders()
    const first = store.changeOrderStatus('A20260625001', 'paid')
    await store.changeOrderStatus('A20260625001', 'cancelled') // 應被忽略
    expect(updateOrderStatus).toHaveBeenCalledTimes(1)
    resolveFirst()
    await first
    const target = store.orders.find((o) => o.id === 'A20260625001')
    expect(target?.status).toBe('paid')
  })

  it('loadOrders 併發呼叫共用同一請求，不重複打 API', async () => {
    const store = useOrdersStore()
    await Promise.all([store.loadOrders(), store.loadOrders(), store.loadOrders()])
    expect(fetchOrders).toHaveBeenCalledTimes(1)
  })

  it('loadOrders 合併：本地剛新增的訂單不被較舊的伺服器快照吃掉', async () => {
    const store = useOrdersStore()
    await store.loadOrders()
    const newOrder = {
      ...structuredClone(seedOrders[0]),
      id: 'A20260702099',
      customerName: '新客人',
    }
    store.appendOrder(newOrder as Order)
    await store.loadOrders(true) // 伺服器快照不含新訂單
    expect(store.orders.some((o) => o.id === 'A20260702099')).toBe(true)
  })
})
