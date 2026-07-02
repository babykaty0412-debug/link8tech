import { http, HttpResponse, delay } from 'msw'
import type { Order, OrderStatus } from '../types/order'
import { seedOrders } from './data'

/** mock 後端記憶體資料，深拷貝避免污染 seed */
let db: Order[] = structuredClone(seedOrders)

/** 測試可重置狀態 */
export function resetDb() {
  db = structuredClone(seedOrders)
}

export const handlers = [
  // 取得訂單列表
  http.get('/api/orders', async () => {
    await delay(400)
    return HttpResponse.json(db)
  }),

  // 更新訂單狀態
  http.patch('/api/orders/:id/status', async ({ params, request }) => {
    await delay(400)
    const { status } = (await request.json()) as { status: OrderStatus }
    const order = db.find((o) => o.id === params.id)
    if (!order) {
      return HttpResponse.json({ message: '找不到訂單' }, { status: 404 })
    }
    order.status = status
    return HttpResponse.json(order)
  }),
]
