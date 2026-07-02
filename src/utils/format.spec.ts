import { describe, it, expect } from 'vitest'
import { formatCurrency, formatDateShort, formatDateFull } from './format'

describe('formatCurrency', () => {
  it('加上千分位與 NT$ 前綴', () => {
    expect(formatCurrency(1280)).toBe('NT$ 1,280')
    expect(formatCurrency(0)).toBe('NT$ 0')
    expect(formatCurrency(1580000)).toBe('NT$ 1,580,000')
  })
})

describe('formatDateShort', () => {
  it('輸出月/日 時:分（24 小時制）', () => {
    // locale 格式化可能插入特殊空白（U+202F），正規化後再比對
    const out = formatDateShort('2026-06-25T09:15:00+08:00').replace(/\s+/g, ' ')
    expect(out).toBe('06/25 09:15')
  })
})

describe('formatDateFull', () => {
  it('包含年份與秒數', () => {
    const out = formatDateFull('2026-06-25T09:15:00+08:00')
    expect(out).toContain('2026')
    expect(out).toContain('09:15')
  })
})
