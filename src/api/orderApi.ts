import type { Order, OrderStatus } from '../types/order'
import type { CreateOrderPayload, MenuItem } from '../types/menu'
import type { Assignment, Staff } from '../types/schedule'

/**
 * 資料存取層：以真正的 fetch 呼叫 REST API。
 * 開發/測試環境由 MSW 攔截並回應假資料，正式環境改打真後端即可，畫面零改動。
 */
const BASE_URL = '/api'

/** 帶 HTTP 狀態碼的 API 錯誤，讓呼叫端能區分 404／409 等語意 */
export class ApiError extends Error {
  readonly status: number

  constructor(message: string, status: number) {
    super(message)
    this.name = 'ApiError'
    this.status = status
  }
}

async function handle<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const body = await res.json().catch(() => null)
    throw new ApiError(body?.message ?? `請求失敗（${res.status}）`, res.status)
  }
  return res.json() as Promise<T>
}

/** 取得菜單 */
export async function fetchMenu(): Promise<MenuItem[]> {
  const res = await fetch(`${BASE_URL}/menu`)
  return handle<MenuItem[]>(res)
}

/** 取得訂單列表 */
export async function fetchOrders(): Promise<Order[]> {
  const res = await fetch(`${BASE_URL}/orders`)
  return handle<Order[]>(res)
}

/** 建立訂單（顧客送單） */
export async function createOrder(payload: CreateOrderPayload): Promise<Order> {
  const res = await fetch(`${BASE_URL}/orders`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  return handle<Order>(res)
}

/** 取得師傅名單 */
export async function fetchStaff(): Promise<Staff[]> {
  const res = await fetch(`${BASE_URL}/staff`)
  return handle<Staff[]>(res)
}

/** 取得本週排班 */
export async function fetchShifts(): Promise<Assignment[]> {
  const res = await fetch(`${BASE_URL}/shifts`)
  return handle<Assignment[]>(res)
}

/** 指派班別 */
export async function createShift(
  payload: Omit<Assignment, 'id'>,
): Promise<Assignment> {
  const res = await fetch(`${BASE_URL}/shifts`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  return handle<Assignment>(res)
}

/** 移除班別 */
export async function deleteShift(id: string): Promise<void> {
  const res = await fetch(`${BASE_URL}/shifts/${id}`, { method: 'DELETE' })
  await handle<{ ok: boolean }>(res)
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
