/** 菜單分類 */
export type MenuCategory = 'hotpot' | 'main' | 'side' | 'drink'

export interface MenuItem {
  id: string
  name: string
  price: number
  category: MenuCategory
  /** 展示用 emoji，正式環境換成圖片 URL */
  icon: string
  soldOut?: boolean
}

/** 購物車項目：菜單品項 + 數量 */
export interface CartLine {
  item: MenuItem
  qty: number
}

/** 建立訂單的請求內容 */
export interface CreateOrderPayload {
  customerName: string
  items: { name: string; qty: number; price: number }[]
}
