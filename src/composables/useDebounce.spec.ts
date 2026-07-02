import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { ref, nextTick } from 'vue'
import { useDebounce } from './useDebounce'

describe('useDebounce', () => {
  beforeEach(() => vi.useFakeTimers())
  afterEach(() => vi.useRealTimers())

  it('延遲後才更新到最新值', async () => {
    const source = ref('a')
    const debounced = useDebounce(source, 300)
    expect(debounced.value).toBe('a')

    source.value = 'ab'
    await nextTick()
    expect(debounced.value).toBe('a') // 尚未到時間

    await vi.advanceTimersByTimeAsync(300)
    expect(debounced.value).toBe('ab')
  })

  it('連續變更只在停止後觸發一次（去抖）', async () => {
    const source = ref('')
    const debounced = useDebounce(source, 300)

    source.value = 'w'
    await nextTick()
    await vi.advanceTimersByTimeAsync(100)
    source.value = 'wa'
    await nextTick()
    await vi.advanceTimersByTimeAsync(100)
    source.value = 'wan'
    await nextTick()

    // 中途都還沒到 300ms，維持初始值
    expect(debounced.value).toBe('')

    await vi.advanceTimersByTimeAsync(300)
    expect(debounced.value).toBe('wan') // 只跳到最後結果
  })
})
