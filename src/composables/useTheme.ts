import { onMounted, ref } from 'vue'

export type Theme = 'light' | 'dark'

const STORAGE_KEY = 'order-dashboard-theme'

/**
 * 深色模式切換：優先讀 localStorage，其次跟隨系統偏好，
 * 選擇寫入 <html data-theme> 讓 CSS tokens 生效。
 */
export function useTheme() {
  const theme = ref<Theme>('light')

  function apply(value: Theme) {
    theme.value = value
    document.documentElement.setAttribute('data-theme', value)
    localStorage.setItem(STORAGE_KEY, value)
  }

  function toggle() {
    apply(theme.value === 'light' ? 'dark' : 'light')
  }

  onMounted(() => {
    const saved = localStorage.getItem(STORAGE_KEY) as Theme | null
    const prefersDark = window.matchMedia(
      '(prefers-color-scheme: dark)',
    ).matches
    apply(saved ?? (prefersDark ? 'dark' : 'light'))
  })

  return { theme, toggle }
}
