import type { Assignment, Staff } from '../types/schedule'

/** 師傅名單假資料 */
export const seedStaff: Staff[] = [
  { id: 'S01', name: '阿龍師傅', specialty: '鍋物', icon: '🧑‍🍳' },
  { id: 'S02', name: '美玲師傅', specialty: '煎台', icon: '👩‍🍳' },
  { id: 'S03', name: '志明師傅', specialty: '炸台', icon: '🧑‍🍳' },
  { id: 'S04', name: '春嬌師傅', specialty: '冷盤飲品', icon: '👩‍🍳' },
  { id: 'S05', name: '小李師傅', specialty: '備料', icon: '🧑‍🍳' },
]

/** 預設排班：一週部分班表 */
export const seedAssignments: Assignment[] = [
  { id: 'AS01', staffId: 'S01', day: 0, slot: 'morning' },
  { id: 'AS02', staffId: 'S02', day: 0, slot: 'evening' },
  { id: 'AS03', staffId: 'S03', day: 1, slot: 'afternoon' },
  { id: 'AS04', staffId: 'S01', day: 2, slot: 'morning' },
  { id: 'AS05', staffId: 'S04', day: 3, slot: 'evening' },
  { id: 'AS06', staffId: 'S05', day: 4, slot: 'morning' },
  { id: 'AS07', staffId: 'S02', day: 5, slot: 'afternoon' },
]
