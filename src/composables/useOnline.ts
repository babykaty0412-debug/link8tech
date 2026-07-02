import { onMounted, onUnmounted, ref } from 'vue'

/** 監聽瀏覽器連線狀態，恢復連線時觸發 callback（用於補送離線佇列） */
export function useOnline(onReconnect?: () => void) {
  const isOnline = ref(navigator.onLine)

  function handleOnline() {
    isOnline.value = true
    onReconnect?.()
  }
  function handleOffline() {
    isOnline.value = false
  }

  onMounted(() => {
    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)
  })
  onUnmounted(() => {
    window.removeEventListener('online', handleOnline)
    window.removeEventListener('offline', handleOffline)
  })

  return { isOnline }
}
