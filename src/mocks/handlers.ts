import { http, HttpResponse, delay } from 'msw'
import type { Order, OrderStatus } from '../types/order'
import type { CreateOrderPayload } from '../types/menu'
import type { Assignment } from '../types/schedule'
import { seedOrders } from './data'
import { seedMenu } from './menuData'
import { seedAssignments, seedStaff } from './scheduleData'

/** mock 後端記憶體資料，深拷貝避免污染 seed */
let db: Order[] = structuredClone(seedOrders)
let shiftsDb: Assignment[] = structuredClone(seedAssignments)
let shiftSeq = seedAssignments.length

/** 測試可重置狀態 */
export function resetDb() {
  db = structuredClone(seedOrders)
  shiftsDb = structuredClone(seedAssignments)
  shiftSeq = seedAssignments.length
}

/** 產生新訂單編號：A + 年月日 + 三位流水號 */
function nextOrderId(): string {
  const today = new Date()
  const ymd = [
    today.getFullYear(),
    String(today.getMonth() + 1).padStart(2, '0'),
    String(today.getDate()).padStart(2, '0'),
  ].join('')
  const seq = String(db.length + 1).padStart(3, '0')
  return `A${ymd}${seq}`
}

export const handlers = [
  // 取得菜單
  http.get('/api/menu', async () => {
    await delay(300)
    return HttpResponse.json(seedMenu)
  }),

  // 取得訂單列表
  http.get('/api/orders', async () => {
    await delay(400)
    return HttpResponse.json(db)
  }),

  // 建立訂單（顧客點餐送單）
  http.post('/api/orders', async ({ request }) => {
    await delay(400)
    const payload = (await request.json()) as CreateOrderPayload
    if (!payload.items?.length) {
      return HttpResponse.json({ message: '訂單至少需要一個品項' }, { status: 400 })
    }
    const order: Order = {
      id: nextOrderId(),
      customerName: payload.customerName.trim() || '現場顧客',
      source: 'web',
      status: 'pending',
      amount: payload.items.reduce((sum, i) => sum + i.price * i.qty, 0),
      createdAt: new Date().toISOString(),
      items: payload.items,
    }
    db = [order, ...db]
    return HttpResponse.json(order, { status: 201 })
  }),

  // ---- 排班 ----
  // 師傅名單
  http.get('/api/staff', async () => {
    await delay(300)
    return HttpResponse.json(seedStaff)
  }),

  // 本週排班
  http.get('/api/shifts', async () => {
    await delay(300)
    return HttpResponse.json(shiftsDb)
  }),

  // 指派班別
  http.post('/api/shifts', async ({ request }) => {
    await delay(300)
    const payload = (await request.json()) as Omit<Assignment, 'id'>
    const duplicated = shiftsDb.some(
      (a) =>
        a.staffId === payload.staffId &&
        a.day === payload.day &&
        a.slot === payload.slot,
    )
    if (duplicated) {
      return HttpResponse.json(
        { message: '該師傅已在此班別，不可重複指派' },
        { status: 409 },
      )
    }
    shiftSeq += 1
    const assignment: Assignment = {
      id: `AS${String(shiftSeq).padStart(2, '0')}`,
      ...payload,
    }
    shiftsDb.push(assignment)
    return HttpResponse.json(assignment, { status: 201 })
  }),

  // 移除班別
  http.delete('/api/shifts/:id', async ({ params }) => {
    await delay(300)
    const idx = shiftsDb.findIndex((a) => a.id === params.id)
    if (idx === -1) {
      return HttpResponse.json({ message: '找不到排班' }, { status: 404 })
    }
    shiftsDb.splice(idx, 1)
    return HttpResponse.json({ ok: true })
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
