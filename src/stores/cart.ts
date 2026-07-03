import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import { createOrder, fetchMenu } from '../api/orderApi'
import type { CartLine, CreateOrderPayload, MenuCategory, MenuItem } from '../types/menu'
import type { Order } from '../types/order'
import { useOrdersStore } from './orders'

const QUEUE_KEY = 'link8tech-offline-queue'
const DEAD_KEY = 'link8tech-offline-deadletter'
/** 單筆訂單補送失敗上限，超過移入死信匣不再無限重試 */
const MAX_ATTEMPTS = 5

/** 佇列中的離線訂單：附唯一 id（識別、去重）與已重試次數 */
export interface QueuedOrder extends CreateOrderPayload {
  queueId: string
  attempts: number
}

/** 讀取離線佇列：驗證形狀，壞資料直接淘汰，不讓損壞的 localStorage 弄掛整個 app */
function loadQueue(): QueuedOrder[] {
  try {
    const parsed = JSON.parse(localStorage.getItem(QUEUE_KEY) ?? '[]')
    if (!Array.isArray(parsed)) return []
    return parsed.filter(
      (p): p is QueuedOrder =>
        !!p && typeof p.queueId === 'string' && Array.isArray(p.items),
    )
  } catch {
    return []
  }
}

function saveQueue(queue: QueuedOrder[]) {
  localStorage.setItem(QUEUE_KEY, JSON.stringify(queue))
}

/** 從佇列移除指定一筆：每次重讀當前狀態再過濾，不整包覆寫（併發安全） */
function removeFromQueue(queueId: string) {
  saveQueue(loadQueue().filter((p) => p.queueId !== queueId))
}

/** 移入死信匣：保留現場供人工處理，不再自動重試 */
function moveToDeadLetter(item: QueuedOrder) {
  try {
    const dead = JSON.parse(localStorage.getItem(DEAD_KEY) ?? '[]')
    localStorage.setItem(
      DEAD_KEY,
      JSON.stringify(Array.isArray(dead) ? [...dead, item] : [item]),
    )
  } catch {
    localStorage.setItem(DEAD_KEY, JSON.stringify([item]))
  }
  removeFromQueue(item.queueId)
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

  function buildQueued(): QueuedOrder {
    return {
      queueId: `Q${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      attempts: 0,
      customerName: customerName.value,
      items: lines.value.map((l) => ({
        name: l.item.name,
        qty: l.qty,
        price: l.item.price,
      })),
    }
  }

  function enqueue(item: QueuedOrder) {
    const queue = loadQueue()
    queue.push(item)
    saveQueue(queue)
    queuedCount.value = queue.length
    clear()
  }

  /**
   * 送單：線上直接送；離線（或請求因網路中斷失敗）存入佇列，恢復後自動補送。
   * 開頭防重入：快速連點不會造成重複下單。
   */
  async function submit(): Promise<'sent' | 'queued'> {
    if (isSubmitting.value) return 'sent' // 防連點：前一筆還在送
    if (!lines.value.length) throw new Error('購物車是空的')
    const payload = buildQueued()
    submitError.value = null

    if (!navigator.onLine) {
      enqueue(payload)
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
      // fetch 網路層失敗（TypeError）＝實際斷網但 onLine 誤報 true → 一樣入佇列，不遺失
      if (e instanceof TypeError) {
        enqueue(payload)
        return 'queued'
      }
      submitError.value = e instanceof Error ? e.message : '送單失敗'
      throw e
    } finally {
      isSubmitting.value = false
    }
  }

  /** 補送進行中旗標：防止同分頁多個觸發點併發補送 */
  let isFlushing = false

  async function doFlush() {
    if (isFlushing) return
    isFlushing = true
    try {
      // 逐筆處理：成功一筆就立刻從「當前佇列」移除那一筆，
      // 不整包覆寫（中途新入佇的訂單不會被吃掉；中途關頁也不會整批重送）
      for (const item of loadQueue()) {
        try {
          const order = await createOrder(item)
          useOrdersStore().appendOrder(order)
          removeFromQueue(item.queueId)
        } catch (e) {
          if (e instanceof TypeError) break // 還是沒網路，整批留著下次再試
          // 伺服器拒絕（4xx/5xx）：累計重試次數，超過上限移入死信匣
          const queue = loadQueue()
          const target = queue.find((q) => q.queueId === item.queueId)
          if (target) {
            target.attempts += 1
            if (target.attempts >= MAX_ATTEMPTS) moveToDeadLetter(target)
            else saveQueue(queue)
          }
        }
      }
      queuedCount.value = loadQueue().length
    } finally {
      isFlushing = false
    }
  }

  /** 恢復連線時補送佇列。以 Web Locks 做跨分頁互斥，避免多分頁重複送單 */
  async function flushQueue() {
    if (typeof navigator !== 'undefined' && navigator.locks) {
      await navigator.locks.request(
        'link8tech-flush',
        { ifAvailable: true },
        async (lock) => {
          if (lock) await doFlush()
        },
      )
    } else {
      await doFlush()
    }
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
