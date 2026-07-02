import { describe, it, expect, beforeEach, vi } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useCartStore } from './cart'
import type { MenuItem } from '../types/menu'
import type { Order } from '../types/order'

vi.mock('../api/orderApi', () => ({
  fetchMenu: vi.fn(),
  createOrder: vi.fn(),
  fetchOrders: vi.fn(),
  updateOrderStatus: vi.fn(),
  fetchStaff: vi.fn(),
  fetchShifts: vi.fn(),
  createShift: vi.fn(),
  deleteShift: vi.fn(),
}))

import { createOrder } from '../api/orderApi'

const 泡菜鍋: MenuItem = {
  id: 'M001',
  name: '韓式泡菜鍋',
  price: 180,
  category: 'hotpot',
  icon: '🍲',
}
const 柚子茶: MenuItem = {
  id: 'M010',
  name: '柚子茶',
  price: 90,
  category: 'drink',
  icon: '🍵',
}

const fakeOrder = { id: 'A001', status: 'pending' } as Order

/** 模擬連線狀態 */
function setOnline(value: boolean) {
  Object.defineProperty(navigator, 'onLine', { value, configurable: true })
}

describe('useCartStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    localStorage.clear()
    setOnline(true)
    vi.mocked(createOrder).mockReset()
  })

  it('加入與移除品項，總數與總額正確', () => {
    const cart = useCartStore()
    cart.add(泡菜鍋)
    cart.add(泡菜鍋)
    cart.add(柚子茶)
    expect(cart.totalCount).toBe(3)
    expect(cart.totalAmount).toBe(180 * 2 + 90)

    cart.remove(泡菜鍋)
    expect(cart.qtyOf(泡菜鍋)).toBe(1)
    cart.remove(柚子茶)
    expect(cart.totalCount).toBe(1)
  })

  it('線上送單成功後清空購物車', async () => {
    vi.mocked(createOrder).mockResolvedValue(fakeOrder)
    const cart = useCartStore()
    cart.add(泡菜鍋)
    const result = await cart.submit()
    expect(result).toBe('sent')
    expect(cart.totalCount).toBe(0)
    expect(createOrder).toHaveBeenCalledOnce()
  })

  it('離線送單存入佇列，不打 API', async () => {
    setOnline(false)
    const cart = useCartStore()
    cart.add(泡菜鍋)
    const result = await cart.submit()
    expect(result).toBe('queued')
    expect(createOrder).not.toHaveBeenCalled()
    expect(cart.queuedCount).toBe(1)
    expect(
      JSON.parse(localStorage.getItem('link8tech-offline-queue')!),
    ).toHaveLength(1)
  })

  it('恢復連線補送佇列並清空', async () => {
    setOnline(false)
    const cart = useCartStore()
    cart.add(泡菜鍋)
    await cart.submit()

    setOnline(true)
    vi.mocked(createOrder).mockResolvedValue(fakeOrder)
    await cart.flushQueue()
    expect(createOrder).toHaveBeenCalledOnce()
    expect(cart.queuedCount).toBe(0)
    expect(localStorage.getItem('link8tech-offline-queue')).toBe('[]')
  })

  it('補送失敗的訂單留在佇列，下次再試', async () => {
    setOnline(false)
    const cart = useCartStore()
    cart.add(泡菜鍋)
    await cart.submit()

    setOnline(true)
    vi.mocked(createOrder).mockRejectedValue(new Error('伺服器錯誤'))
    await cart.flushQueue()
    expect(cart.queuedCount).toBe(1) // 沒有遺失
  })
})
