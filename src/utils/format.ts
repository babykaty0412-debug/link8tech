/** 金額格式：NT$ 1,280 */
export const formatCurrency = (n: number) => `NT$ ${n.toLocaleString('zh-TW')}`

/** 列表用短日期：06/25 09:15 */
export const formatDateShort = (iso: string) =>
  new Date(iso).toLocaleString('zh-TW', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  })

/** 明細用完整日期：2026/6/25 09:15:00 */
export const formatDateFull = (iso: string) =>
  new Date(iso).toLocaleString('zh-TW', { hour12: false })
