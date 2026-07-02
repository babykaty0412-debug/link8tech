import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import { createOrder, fetchMenu } from '../api/orderApi'
import type { CartLine, CreateOrderPayload, MenuCategory, MenuItem } from '../types/menu'
import type { Order } from '../types/order'
import { useOrdersStore } from './orders'

const QUEUE_KEY = 'link8tech-offline-queue'

/** 讀取 localStorage 中尚未送出的離線訂單 */
function loadQueue(): CreateOrderPayload[] {
  try {
    return JSON.parse(localStorage.getItem(QUEUE_KEY) ?? '[]')
  } catch {
    return []
  }
}

function saveQueue(queue: CreateOrderPayload[]) {
  localStorage.setItem(QUEUE_KEY, JSON.stringify(queue))
}

/**
 * 顧客點餐：菜單載入、購物車、送單。
 * 內建離線佇列——斷網送單先存 localStorage，恢復連線自動補送，訂單永不遺失。
 */
export const useCartStore = defineStore('cart', () => {
  // ---- 菜單 ----
  const menu = ref<MenuItem[]>([])
  const isMenuLoading = ref(false)
  const menuError = ref<string | null>(null)
  const activeCategory = ref<MenuCategory>('hotpot')

  async function loadMenu() {
    if (menu.value.length) return
    isMenuLoading.value = true
    menuError.value = null
    try {
      menu.value = await fetchMenu()
    } catch (e) {
      menuError.value = e instanceof Error ? e.message : '載入菜單失敗'
    } finally {
      isMenuLoading.value = false
    }
  }

  const menuByCategory = computed(() =>
    menu.value.filter((m) => m.category === activeCategory.value),
  )

  // ---- 購物車 ----
  const lines = ref<CartLine[]>([])
  const customerName = ref('')

  const totalCount = computed(() =>
    lines.value.reduce((sum, l) => sum + l.qty, 0),
  )
  const totalAmount = computed(() =>
    lines.value.reduce((sum, l) => sum + l.item.price * l.qty, 0),
  )

  function add(item: MenuItem) {
    const line = lines.value.find((l) => l.item.id === item.id)
    if (line) line.qty += 1
    else lines.value.push({ item, qty: 1 })
  }

  function remove(item: MenuItem) {
    const idx = lines.value.findIndex((l) => l.item.id === item.id)
    if (idx === -1) return
    const line = lines.value[idx]
    if (line.qty > 1) line.qty -= 1
    else lines.value.splice(idx, 1)
  }

  function qtyOf(item: MenuItem): number {
    return lines.value.find((l) => l.item.id === item.id)?.qty ?? 0
  }

  function clear() {
    lines.value = []
    customerName.value = ''
  }

  // ---- 送單（含離線佇列）----
  const isSubmitting = ref(false)
  const submitError = ref<string | null>(null)
  /** 斷網時暫存的訂單數 */
  const queuedCount = ref(loadQueue().length)
  /** 最後一筆成功送出的訂單（給成功畫面顯示） */
  const lastOrder = ref<Order | null>(null)

  function buildPayload(): CreateOrderPayload {
    return {
      customerName: customerName.value,
      items: lines.value.map((l) => ({
        name: l.item.name,
        qty: l.qty,
        price: l.item.price,
      })),
    }
  }

  /** 送單：線上直接送；離線存入佇列，恢復後自動補送 */
  async function submit(): Promise<'sent' | 'queued'> {
    if (!lines.value.length) throw new Error('購物車是空的')
    const payload = buildPayload()
    submitError.value = null

    if (!navigator.onLine) {
      const queue = loadQueue()
      queue.push(payload)
      saveQueue(queue)
      queuedCount.value = queue.length
      clear()
      return 'queued'
    }

    isSubmitting.value = true
    try {
      const order = await createOrder(payload)
      lastOrder.value = order
      useOrdersStore().appendOrder(order)
      clear()
      return 'sent'
    } catch (e) {
      submitError.value = e instanceof Error ? e.message : '送單失敗'
      throw e
    } finally {
      isSubmitting.value = false
    }
  }

  /** 恢復連線時補送佇列中的訂單 */
  async function flushQueue() {
    const queue = loadQueue()
    if (!queue.length) return
    const remaining: CreateOrderPayload[] = []
    for (const payload of queue) {
      try {
        const order = await createOrder(payload)
        useOrdersStore().appendOrder(order)
      } catch {
        remaining.push(payload) // 失敗的留在佇列，下次再試
      }
    }
    saveQueue(remaining)
    queuedCount.value = remaining.length
  }

  return {
    menu,
    isMenuLoading,
    menuError,
    activeCategory,
    menuByCategory,
    lines,
    customerName,
    totalCount,
    totalAmount,
    isSubmitting,
    submitError,
    queuedCount,
    lastOrder,
    loadMenu,
    add,
    remove,
    qtyOf,
    clear,
    submit,
    flushQueue,
  }
})
