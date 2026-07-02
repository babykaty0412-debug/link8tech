<script setup lang="ts">
import { computed } from 'vue'
import type { Order, OrderStatus } from '../types/order'
import { STATUS_LABELS } from '../constants/labels'

const props = defineProps<{ orders: Order[] }>()

const COLORS: Record<OrderStatus, string> = {
  pending: 'var(--chart-pending)',
  paid: 'var(--chart-paid)',
  cancelled: 'var(--chart-cancelled)',
}

const ORDER: OrderStatus[] = ['paid', 'pending', 'cancelled']

/** 各狀態筆數 */
const counts = computed<Record<OrderStatus, number>>(() => {
  const base = { pending: 0, paid: 0, cancelled: 0 }
  for (const o of props.orders) base[o.status] += 1
  return base
})

const total = computed(() => props.orders.length)

/** 依比例算出每段圓弧的 stroke-dasharray 與偏移 */
const segments = computed(() => {
  const r = 60
  const circumference = 2 * Math.PI * r
  let offset = 0
  return ORDER.filter((s) => counts.value[s] > 0).map((status) => {
    const ratio = counts.value[status] / total.value
    const len = ratio * circumference
    const seg = {
      status,
      color: COLORS[status],
      dash: `${len} ${circumference - len}`,
      offset: -offset,
      percent: Math.round(ratio * 100),
    }
    offset += len
    return seg
  })
})
</script>

<template>
  <div class="donut-card">
    <h3 class="donut-title">訂單狀態分布</h3>
    <div class="donut-body">
      <svg viewBox="0 0 160 160" class="donut" role="img" aria-label="訂單狀態分布圖">
        <!-- 底圈 -->
        <circle cx="80" cy="80" r="60" fill="none" stroke="var(--border)" stroke-width="18" />
        <!-- 各狀態圓弧 -->
        <circle
          v-for="seg in segments"
          :key="seg.status"
          cx="80"
          cy="80"
          r="60"
          fill="none"
          :stroke="seg.color"
          stroke-width="18"
          :stroke-dasharray="seg.dash"
          :stroke-dashoffset="seg.offset"
          stroke-linecap="butt"
          transform="rotate(-90 80 80)"
          class="donut-seg"
        />
        <!-- 中心總數 -->
        <text x="80" y="74" text-anchor="middle" class="donut-total">{{ total }}</text>
        <text x="80" y="94" text-anchor="middle" class="donut-label">總訂單</text>
      </svg>

      <ul class="legend">
        <li v-for="status in ORDER" :key="status" class="legend-item">
          <span class="dot" :style="{ background: COLORS[status] }" />
          <span class="legend-name">{{ STATUS_LABELS[status] }}</span>
          <span class="legend-count">{{ counts[status] }}</span>
        </li>
      </ul>
    </div>
  </div>
</template>

<style scoped>
.donut-card {
  background: var(--card);
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  padding: 20px;
  box-shadow: var(--shadow-sm);
}
.donut-title {
  margin: 0 0 12px;
  font-size: 15px;
  color: var(--text);
}
.donut-body {
  display: flex;
  align-items: center;
  gap: 20px;
}
.donut {
  width: 140px;
  height: 140px;
  flex-shrink: 0;
}
.donut-seg {
  transition: stroke-dasharray 0.6s var(--ease);
}
.donut-total {
  font-size: 30px;
  font-weight: 700;
  fill: var(--text);
}
.donut-label {
  font-size: 12px;
  fill: var(--text-muted);
}
.legend {
  list-style: none;
  margin: 0;
  padding: 0;
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.legend-item {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
}
.dot {
  width: 10px;
  height: 10px;
  border-radius: 3px;
  flex-shrink: 0;
}
.legend-name {
  color: var(--text-secondary);
}
.legend-count {
  margin-left: auto;
  font-weight: 600;
  color: var(--text);
}
</style>
