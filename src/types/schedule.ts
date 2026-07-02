/** 師傅（廚房師傅／技術師傅皆適用） */
export interface Staff {
  id: string
  name: string
  /** 專長職能 */
  specialty: string
  icon: string
}

/** 班別 */
export type ShiftSlot = 'morning' | 'afternoon' | 'evening'

/** 一週 7 天，0 = 週一 */
export type WeekDay = 0 | 1 | 2 | 3 | 4 | 5 | 6

/** 排班指派 */
export interface Assignment {
  id: string
  staffId: string
  day: WeekDay
  slot: ShiftSlot
}
