import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import {
  ApiError,
  createShift,
  createStaff,
  deleteShift,
  deleteStaff,
  fetchShifts,
  fetchStaff,
  updateStaff,
} from '../api/orderApi'
import type { Assignment, ShiftSlot, Staff, WeekDay } from '../types/schedule'

/**
 * 師傅排班：名單、週班表、指派／移除（樂觀更新），
 * 以及衝突規則——同人同班別不可重複、同人單日連多班給警示。
 */
export const useScheduleStore = defineStore('schedule', () => {
  const staff = ref<Staff[]>([])
  const assignments = ref<Assignment[]>([])
  const isLoading = ref(false)
  const error = ref<string | null>(null)
  const hasLoaded = ref(false)
  // 指派中的格子 key（staffId-day-slot），防止連點同格同人發出多個 POST
  const assigningKeys = ref<Set<string>>(new Set())

  async function loadAll(force = false) {
    if (hasLoaded.value && !force) return
    isLoading.value = true
    error.value = null
    try {
      const [staffRes, shiftsRes] = await Promise.all([
        fetchStaff(),
        fetchShifts(),
      ])
      staff.value = staffRes
      assignments.value = shiftsRes
      hasLoaded.value = true
    } catch (e) {
      error.value = e instanceof Error ? e.message : '載入排班失敗'
    } finally {
      isLoading.value = false
    }
  }

  const staffById = computed(
    () => new Map(staff.value.map((s) => [s.id, s])),
  )

  /** 以「day-slot」為 key 的格子索引，週曆渲染 O(1) 查找 */
  const cellMap = computed(() => {
    const map = new Map<string, Assignment[]>()
    for (const a of assignments.value) {
      const key = `${a.day}-${a.slot}`
      const list = map.get(key) ?? []
      list.push(a)
      map.set(key, list)
    }
    return map
  })

  /** 各師傅單日班數：>1 即為連班，需給警示 */
  const dayCount = computed(() => {
    const map = new Map<string, number>()
    for (const a of assignments.value) {
      const key = `${a.staffId}-${a.day}`
      map.set(key, (map.get(key) ?? 0) + 1)
    }
    return map
  })

  /** 各師傅本週總班數（負載概況） */
  const weekCount = computed(() => {
    const map = new Map<string, number>()
    for (const a of assignments.value) {
      map.set(a.staffId, (map.get(a.staffId) ?? 0) + 1)
    }
    return map
  })

  function cellOf(day: WeekDay, slot: ShiftSlot): Assignment[] {
    return cellMap.value.get(`${day}-${slot}`) ?? []
  }

  /** 同人單日是否連多班（含此格）。用於 UI 標警示 */
  function isOverworked(staffId: string, day: WeekDay): boolean {
    return (dayCount.value.get(`${staffId}-${day}`) ?? 0) > 1
  }

  /**
   * 指派班別。前端先做衝突檢查（同人同格重複→擋下），
   * 後端仍會再驗一次（409），雙層防護。
   */
  async function assign(staffId: string, day: WeekDay, slot: ShiftSlot) {
    error.value = null
    const key = `${staffId}-${day}-${slot}`
    // 同格同人已在指派中（前一個 POST 尚未回來）→ 直接忽略，避免連點送兩次
    if (assigningKeys.value.has(key)) return
    if (cellOf(day, slot).some((a) => a.staffId === staffId)) {
      error.value = '該師傅已在此班別，不可重複指派'
      return
    }
    assigningKeys.value = new Set(assigningKeys.value).add(key)
    try {
      const created = await createShift({ staffId, day, slot })
      assignments.value.push(created)
    } catch (e) {
      error.value = e instanceof Error ? e.message : '指派失敗'
    } finally {
      const next = new Set(assigningKeys.value)
      next.delete(key)
      assigningKeys.value = next
    }
  }

  function isAssigning(staffId: string, day: WeekDay, slot: ShiftSlot): boolean {
    return assigningKeys.value.has(`${staffId}-${day}-${slot}`)
  }

  // ---- 師傅管理 CRUD ----
  const isSavingStaff = ref(false)

  /** 新增師傅（伺服器配發 id 後加入名單） */
  async function addStaff(payload: Omit<Staff, 'id'>) {
    if (!payload.name.trim()) {
      error.value = '師傅姓名不可空白'
      return false
    }
    isSavingStaff.value = true
    error.value = null
    try {
      const created = await createStaff(payload)
      staff.value.push(created)
      return true
    } catch (e) {
      error.value = e instanceof Error ? e.message : '新增師傅失敗'
      return false
    } finally {
      isSavingStaff.value = false
    }
  }

  /** 編輯師傅：以伺服器回應為準更新名單 */
  async function editStaff(id: string, patch: Partial<Omit<Staff, 'id'>>) {
    isSavingStaff.value = true
    error.value = null
    try {
      const updated = await updateStaff(id, patch)
      const idx = staff.value.findIndex((s) => s.id === id)
      if (idx !== -1) staff.value[idx] = updated
      return true
    } catch (e) {
      error.value = e instanceof Error ? e.message : '編輯師傅失敗'
      return false
    } finally {
      isSavingStaff.value = false
    }
  }

  /**
   * 刪除師傅。前端先檢查是否仍有排班（後端也會再擋 409，雙層防護）——
   * 排班表不能出現查不到的人，這是資料完整性的守衛。
   */
  async function removeStaff(id: string) {
    error.value = null
    if ((weekCount.value.get(id) ?? 0) > 0) {
      error.value = '該師傅仍有排班，請先移除其所有班別再刪除'
      return false
    }
    const target = staff.value.find((s) => s.id === id)
    if (!target) return false
    staff.value = staff.value.filter((s) => s.id !== id) // 樂觀移除
    try {
      await deleteStaff(id)
      return true
    } catch (e) {
      if (e instanceof ApiError && e.status === 404) return true // 已不存在
      // 回滾以「重新加回」處理，不用舊索引
      if (!staff.value.some((s) => s.id === id)) {
        staff.value = [...staff.value, target]
      }
      error.value = e instanceof Error ? e.message : '刪除師傅失敗'
      return false
    }
  }

  /** 移除班別：樂觀移除，失敗還原（404 例外——資料本就不存在，等同刪除成功） */
  async function remove(id: string) {
    const target = assignments.value.find((a) => a.id === id)
    if (!target) return
    assignments.value = assignments.value.filter((a) => a.id !== id)
    error.value = null
    try {
      await deleteShift(id)
    } catch (e) {
      if (e instanceof ApiError && e.status === 404) return // 已不存在，不回滾
      // 回滾以「重新加回」處理，不用 await 前的舊索引（併發下索引已失效）；
      // 同格顯示順序不影響正確性（cellMap 以 day-slot 分組）
      if (!assignments.value.some((a) => a.id === id)) {
        assignments.value = [...assignments.value, target]
      }
      error.value = e instanceof Error ? e.message : '移除失敗'
    }
  }

  return {
    staff,
    assignments,
    isLoading,
    error,
    isAssigning,
    isSavingStaff,
    addStaff,
    editStaff,
    removeStaff,
    staffById,
    weekCount,
    loadAll,
    cellOf,
    isOverworked,
    assign,
    remove,
  }
})
