<script setup lang="ts">
import { computed, toRef } from 'vue'
import type { OrderStats } from '../types/order'
import { useCountUp } from '../composables/useCountUp'
import { formatCurrency } from '../utils/format'

const props = defineProps<{ stats: OrderStats }>()

// 數字跳動動畫，讓統計卡片有生命力
const total = useCountUp(toRef(() => props.stats.total))
const paidAmount = useCountUp(toRef(() => props.stats.paidAmount))
const pendingCount = useCountUp(toRef(() => props.stats.pendingCount))
const cancelledCount = useCountUp(toRef(() => props.stats.cancelledCount))

const paidDisplay = computed(() => formatCurrency(paidAmount.value))
</script>

<template>
  <section class="stats" aria-label="訂單統計">
    <div class="stat-item">
      <span class="stat-icon" aria-hidden="true">📋</span>
      <span class="stat-label">總訂單數</span>
      <strong class="stat-value">{{ total }}</strong>
    </div>
    <div class="stat-item">
      <span class="stat-icon" aria-hidden="true">💰</span>
      <span class="stat-label">已付款金額</span>
      <strong class="stat-value stat-value--money">{{ paidDisplay }}</strong>
    </div>
    <div class="stat-item">
      <span class="stat-icon" aria-hidden="true">⏳</span>
      <span class="stat-label">待處理訂單</span>
      <strong class="stat-value stat-value--pending">{{ pendingCount }}</strong>
    </div>
    <div class="stat-item">
      <span class="stat-icon" aria-hidden="true">🚫</span>
      <span class="stat-label">取消訂單</span>
      <strong class="stat-value stat-value--cancelled">{{ cancelledCount }}</strong>
    </div>
  </section>
</template>

<style scoped>
.stats {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 12px;
}
.stat-item {
  background: var(--card);
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 6px;
  box-shadow: var(--shadow-sm);
  transition: transform 0.2s var(--ease), box-shadow 0.2s var(--ease);
}
.stat-item:hover {
  transform: translateY(-2px);
  box-shadow: var(--shadow-md);
}
.stat-icon {
  font-size: 20px;
  line-height: 1;
}
.stat-label {
  font-size: 13px;
  color: var(--text-muted);
}
.stat-value {
  font-size: 24px;
  color: var(--text);
}
.stat-value--money {
  color: var(--status-paid-text);
}
.stat-value--pending {
  color: var(--status-pending-text);
}
.stat-value--cancelled {
  color: var(--status-cancelled-text);
}
@media (max-width: 720px) {
  .stats {
    grid-template-columns: 1fr 1fr;
  }
}
</style>
