import { onScopeDispose, ref, watch, type Ref } from 'vue'

/**
 * 回傳一個「延遲跟隨」來源的唯讀 ref。
 * 來源快速變動時只在停止輸入 delay 毫秒後才更新，用於搜尋去抖。
 */
export function useDebounce<T>(source: Ref<T>, delay = 300): Ref<T> {
  const debounced = ref(source.value) as Ref<T>
  let timer: ReturnType<typeof setTimeout> | undefined

  watch(source, (value) => {
    clearTimeout(timer)
    timer = setTimeout(() => {
      debounced.value = value
    }, delay)
  })

  // 元件卸載時清除待觸發的計時器，避免記憶體洩漏與已卸載後寫入
  onScopeDispose(() => clearTimeout(timer))

  return debounced
}
