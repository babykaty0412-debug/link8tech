import { ref } from 'vue'

export type Theme = 'light' | 'dark'

const STORAGE_KEY = 'order-dashboard-theme'

/**
 * 深色模式切換：優先讀 localStorage，其次跟隨系統偏好，
 * 選擇寫入 <html data-theme> 讓 CSS tokens 生效。
 */
export function useTheme() {
  // 初值直接讀 <html data-theme>（index.html 的行內腳本已在首屏前設好），
  // 與畫面同步，不會有 toggle 文字先顯示錯、onMounted 才修正的落差
  const initial =
    (document.documentElement.getAttribute('data-theme') as Theme | null) ??
    'light'
  const theme = ref<Theme>(initial)

  function apply(value: Theme) {
    theme.value = value
    document.documentElement.setAttribute('data-theme', value)
    localStorage.setItem(STORAGE_KEY, value)
  }

  function toggle() {
    apply(theme.value === 'light' ? 'dark' : 'light')
  }

  return { theme, toggle }
}
