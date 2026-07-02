import type { MenuItem } from '../types/menu'

/** 菜單假資料：沿用訂單品項並擴充，正式環境由後端提供 */
export const seedMenu: MenuItem[] = [
  { id: 'M001', name: '韓式泡菜鍋', price: 180, category: 'hotpot', icon: '🍲' },
  { id: 'M002', name: '部隊鍋', price: 220, category: 'hotpot', icon: '🥘' },
  { id: 'M003', name: '海帶豆腐鍋', price: 170, category: 'hotpot', icon: '🍜' },
  { id: 'M004', name: '石鍋拌飯', price: 160, category: 'main', icon: '🍚' },
  { id: 'M005', name: '韓式炸雞', price: 190, category: 'main', icon: '🍗' },
  { id: 'M006', name: '辣炒年糕', price: 120, category: 'main', icon: '🌶️' },
  { id: 'M007', name: '海鮮煎餅', price: 220, category: 'side', icon: '🥞' },
  { id: 'M008', name: '韓式小菜拼盤', price: 90, category: 'side', icon: '🥗' },
  { id: 'M009', name: '起司玉子燒', price: 110, category: 'side', icon: '🍳', soldOut: true },
  { id: 'M010', name: '柚子茶', price: 90, category: 'drink', icon: '🍵' },
  { id: 'M011', name: '香蕉牛奶', price: 65, category: 'drink', icon: '🥛' },
  { id: 'M012', name: '韓國麥茶', price: 50, category: 'drink', icon: '🫖' },
]
