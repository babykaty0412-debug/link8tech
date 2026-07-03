import { onScopeDispose, ref, watch, type Ref } from 'vue'

/**
 * 數字跳動動畫：來源值變動時，於 duration 內平滑遞增到目標值。
 * 用 requestAnimationFrame + easeOutCubic，避免生硬跳動。
 */
export function useCountUp(source: Ref<number>, duration = 700): Ref<number> {
  const display = ref(source.value)
  let raf = 0
  let start = 0
  let from = source.value

  function step(timestamp: number) {
    if (!start) start = timestamp
    const progress = Math.min((timestamp - start) / duration, 1)
    const eased = 1 - Math.pow(1 - progress, 3)
    display.value = Math.round(from + (source.value - from) * eased)
    if (progress < 1) raf = requestAnimationFrame(step)
  }

  watch(source, () => {
    cancelAnimationFrame(raf)
    from = display.value
    start = 0
    raf = requestAnimationFrame(step)
  })

  // 元件卸載時取消進行中的動畫影格，避免對已卸載元件寫入
  onScopeDispose(() => cancelAnimationFrame(raf))

  return display
}
