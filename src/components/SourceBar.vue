<script setup lang="ts">
import { computed } from 'vue'
import type { Order, OrderSource } from '../types/order'
import { SOURCE_LABELS } from '../constants/labels'

const props = defineProps<{ orders: Order[] }>()

const SOURCES: OrderSource[] = ['web', 'app', 'pos']

/** 各來源的訂單數與金額總和 */
const rows = computed(() => {
  const max = Math.max(
    1,
    ...SOURCES.map((s) => props.orders.filter((o) => o.source === s).length),
  )
  return SOURCES.map((source) => {
    const count = props.orders.filter((o) => o.source === source).length
    return {
      source,
      count,
      percent: Math.round((count / max) * 100),
    }
  })
})
</script>

<template>
  <div class="bar-card">
    <h3 class="bar-title">來源分布</h3>
    <ul class="bars">
      <li v-for="row in rows" :key="row.source" class="bar-row">
        <span class="bar-label">{{ SOURCE_LABELS[row.source] }}</span>
        <div class="bar-track">
          <div
            class="bar-fill"
            :class="`bar-fill--${row.source}`"
            :style="{ width: `${row.percent}%` }"
          />
        </div>
        <span class="bar-count">{{ row.count }}</span>
      </li>
    </ul>
  </div>
</template>

<style scoped>
.bar-card {
  background: var(--card);
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  padding: 20px;
  box-shadow: var(--shadow-sm);
}
.bar-title {
  margin: 0 0 16px;
  font-size: 15px;
  color: var(--text);
}
.bars {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 14px;
}
.bar-row {
  display: grid;
  grid-template-columns: 64px 1fr 28px;
  align-items: center;
  gap: 10px;
}
.bar-label {
  font-size: 13px;
  color: var(--text-secondary);
}
.bar-track {
  height: 10px;
  background: var(--bg-subtle);
  border-radius: 999px;
  overflow: hidden;
}
.bar-fill {
  height: 100%;
  border-radius: 999px;
  transition: width 0.7s var(--ease);
}
.bar-fill--web {
  background: var(--accent);
}
.bar-fill--app {
  background: var(--chart-paid);
}
.bar-fill--pos {
  background: var(--chart-pending);
}
.bar-count {
  font-size: 14px;
  font-weight: 600;
  color: var(--text);
  text-align: right;
}
</style>
