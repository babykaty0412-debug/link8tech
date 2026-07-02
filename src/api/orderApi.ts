import type { Order, OrderStatus } from '../types/order'

/**
 * 資料存取層：以真正的 fetch 呼叫 REST API。
 * 開發/測試環境由 MSW 攔截並回應假資料，正式環境改打真後端即可，畫面零改動。
 */
const BASE_URL = '/api'

async function handle<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const body = await res.json().catch(() => null)
    throw new Error(body?.message ?? `請求失敗（${res.status}）`)
  }
  return res.json() as Promise<T>
}

/** 取得訂單列表 */
export async function fetchOrders(): Promise<Order[]> {
  const res = await fetch(`${BASE_URL}/orders`)
  return handle<Order[]>(res)
}

/** 更新訂單狀態，回傳更新後的訂單 */
export async function updateOrderStatus(
  id: string,
  status: OrderStatus,
): Promise<Order> {
  const res = await fetch(`${BASE_URL}/orders/${id}/status`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status }),
  })
  return handle<Order>(res)
}
