/** 訂單狀態：用 union type 而非 enum，跟 JSON 資料零轉換成本 */
export type OrderStatus = 'pending' | 'paid' | 'cancelled'

/** 訂單來源通路 */
export type OrderSource = 'web' | 'app' | 'pos'

export interface OrderItem {
  name: string
  qty: number
  price: number
}

export interface Order {
  id: string
  customerName: string
  source: OrderSource
  status: OrderStatus
  amount: number
  /** ISO 8601 字串，顯示時才轉 Date */
  createdAt: string
  items: OrderItem[]
  /** 送餐人員（師傅 id），未指派為 null */
  courierId?: string | null
}

/** 列表排序欄位與方向 */
export type SortField = 'createdAt' | 'amount'
export type SortDirection = 'asc' | 'desc'

/** 統計卡片的資料形狀 */
export interface OrderStats {
  total: number
  paidAmount: number
  pendingCount: number
  cancelledCount: number
}
