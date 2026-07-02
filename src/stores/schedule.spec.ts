import { describe, it, expect, beforeEach, vi } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useScheduleStore } from './schedule'
import type { Assignment, Staff } from '../types/schedule'

vi.mock('../api/orderApi', () => ({
  fetchStaff: vi.fn(),
  fetchShifts: vi.fn(),
  createShift: vi.fn(),
  deleteShift: vi.fn(),
  fetchMenu: vi.fn(),
  createOrder: vi.fn(),
  fetchOrders: vi.fn(),
  updateOrderStatus: vi.fn(),
}))

import {
  createShift,
  deleteShift,
  fetchShifts,
  fetchStaff,
} from '../api/orderApi'

const staff: Staff[] = [
  { id: 'S01', name: '阿龍師傅', specialty: '鍋物', icon: '🧑‍🍳' },
  { id: 'S02', name: '美玲師傅', specialty: '煎台', icon: '👩‍🍳' },
]
const shifts: Assignment[] = [
  { id: 'AS01', staffId: 'S01', day: 0, slot: 'morning' },
]

describe('useScheduleStore', () => {
  beforeEach(async () => {
    setActivePinia(createPinia())
    vi.mocked(fetchStaff).mockResolvedValue(structuredClone(staff))
    vi.mocked(fetchShifts).mockResolvedValue(structuredClone(shifts))
    vi.mocked(createShift).mockReset()
    vi.mocked(deleteShift).mockReset()
  })

  it('載入師傅與班表', async () => {
    const store = useScheduleStore()
    await store.loadAll()
    expect(store.staff).toHaveLength(2)
    expect(store.cellOf(0, 'morning')).toHaveLength(1)
  })

  it('同格重複指派：前端直接擋下，不打 API', async () => {
    const store = useScheduleStore()
    await store.loadAll()
    await store.assign('S01', 0, 'morning') // S01 已在週一早班
    expect(store.error).toContain('不可重複指派')
    expect(createShift).not.toHaveBeenCalled()
  })

  it('同日連班觸發警示（isOverworked）', async () => {
    vi.mocked(createShift).mockResolvedValue({
      id: 'AS99',
      staffId: 'S01',
      day: 0,
      slot: 'evening',
    })
    const store = useScheduleStore()
    await store.loadAll()
    expect(store.isOverworked('S01', 0)).toBe(false)
    await store.assign('S01', 0, 'evening') // 週一第二個班
    expect(store.isOverworked('S01', 0)).toBe(true)
  })

  it('移除失敗時回滾，班表不遺失', async () => {
    vi.mocked(deleteShift).mockRejectedValue(new Error('伺服器錯誤'))
    const store = useScheduleStore()
    await store.loadAll()
    await store.remove('AS01')
    expect(store.assignments).toHaveLength(1) // 回滾
    expect(store.error).toBe('伺服器錯誤')
  })
})
