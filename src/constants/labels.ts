import type { OrderSource, OrderStatus, SortField } from '../types/order'

/** 介面文案統一在此維護，元件不各自散落字串 */
export const STATUS_LABELS: Record<OrderStatus, string> = {
  pending: '待處理',
  paid: '已付款',
  cancelled: '已取消',
}

export const SOURCE_LABELS: Record<OrderSource, string> = {
  web: '網站',
  app: 'APP',
  pos: '門市 POS',
}

export const SORT_FIELD_LABELS: Record<SortField, string> = {
  createdAt: '建立時間',
  amount: '金額',
}
