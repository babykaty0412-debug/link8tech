import { describe, it, expect, beforeEach, vi } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useScheduleStore } from './schedule'
import type { Assignment, Staff } from '../types/schedule'

vi.mock('../api/orderApi', () => ({
  fetchStaff: vi.fn(),
  fetchShifts: vi.fn(),
  createShift: vi.fn(),
  deleteShift: vi.fn(),
  createStaff: vi.fn(),
  updateStaff: vi.fn(),
  deleteStaff: vi.fn(),
  fetchMenu: vi.fn(),
  createOrder: vi.fn(),
  fetchOrders: vi.fn(),
  updateOrderStatus: vi.fn(),
  ApiError: class ApiError extends Error {
    readonly status: number
    constructor(message: string, status: number) {
      super(message)
      this.name = 'ApiError'
      this.status = status
    }
  },
}))

import {
  createShift,
  createStaff,
  deleteShift,
  deleteStaff,
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

  it('移除遇 404（資料已不存在）不回滾，不產生幽靈班表', async () => {
    const { ApiError } = await import('../api/orderApi')
    vi.mocked(deleteShift).mockRejectedValue(new ApiError('找不到排班', 404))
    const store = useScheduleStore()
    await store.loadAll()
    await store.remove('AS01')
    expect(store.assignments).toHaveLength(0) // 視同刪除成功
    expect(store.error).toBeNull()
  })

  it('連點同格同人：指派中第二次呼叫被忽略，不發第二個 POST', async () => {
    let resolveCreate!: () => void
    vi.mocked(createShift).mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveCreate = () =>
            resolve({ id: 'AS99', staffId: 'S02', day: 1, slot: 'morning' })
        }),
    )
    const store = useScheduleStore()
    await store.loadAll()
    const first = store.assign('S02', 1, 'morning')
    expect(store.isAssigning('S02', 1, 'morning')).toBe(true)
    await store.assign('S02', 1, 'morning') // 應被忽略
    expect(createShift).toHaveBeenCalledTimes(1)
    resolveCreate()
    await first
    expect(store.isAssigning('S02', 1, 'morning')).toBe(false)
  })

  it('addStaff 成功後加入名單', async () => {
    vi.mocked(createStaff).mockResolvedValue({
      id: 'S99',
      name: '新來師傅',
      specialty: '甜點',
      icon: '👩‍🍳',
    })
    const store = useScheduleStore()
    await store.loadAll()
    const ok = await store.addStaff({ name: '新來師傅', specialty: '甜點', icon: '👩‍🍳' })
    expect(ok).toBe(true)
    expect(store.staff).toHaveLength(3)
  })

  it('removeStaff：仍有排班的師傅前端直接擋下，不打 API', async () => {
    const store = useScheduleStore()
    await store.loadAll() // S01 有 AS01 班別
    const ok = await store.removeStaff('S01')
    expect(ok).toBe(false)
    expect(store.error).toContain('請先移除')
    expect(deleteStaff).not.toHaveBeenCalled()
    expect(store.staff).toHaveLength(2) // 名單不變
  })

  it('removeStaff：無排班的師傅可刪除', async () => {
    vi.mocked(deleteStaff).mockResolvedValue()
    const store = useScheduleStore()
    await store.loadAll() // S02 沒有班別
    const ok = await store.removeStaff('S02')
    expect(ok).toBe(true)
    expect(store.staff.some((s) => s.id === 'S02')).toBe(false)
  })
})
