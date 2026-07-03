import { onMounted, onUnmounted, ref } from 'vue'

/** 每秒更新的當前時間，用於顯示訂單等待時長 */
export function useNow(intervalMs = 1000) {
  const now = ref(Date.now())
  let timer: ReturnType<typeof setInterval> | undefined

  onMounted(() => {
    timer = setInterval(() => {
      now.value = Date.now()
    }, intervalMs)
  })
  onUnmounted(() => clearInterval(timer))

  return { now }
}

/** 毫秒差轉人類可讀的等待時間 */
export function formatElapsed(fromIso: string, nowMs: number): string {
  const diff = Math.max(0, nowMs - new Date(fromIso).getTime())
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return '剛剛'
  if (mins < 60) return `${mins} 分鐘`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours} 小時 ${mins % 60} 分`
  return `${Math.floor(hours / 24)} 天 ${hours % 24} 小時`
}
