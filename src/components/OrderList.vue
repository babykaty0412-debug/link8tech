<script setup lang="ts">
import type { Order, OrderSource } from '../types/order'
import type { Staff } from '../types/schedule'
import { SOURCE_LABELS } from '../constants/labels'
import { formatCurrency, formatDateShort } from '../utils/format'
import StatusBadge from './StatusBadge.vue'

defineProps<{
  orders: Order[]
  selectedId: string | null
  /** 師傅查表，用於顯示送餐人員名字 */
  staffById?: Map<string, Staff>
}>()

const emit = defineEmits<{ select: [id: string] }>()

const SOURCE_ICON: Record<OrderSource, string> = {
  web: '🌐',
  app: '📱',
  pos: '🏪',
}

/** 取客戶名稱第一個字當頭像 */
const initial = (name: string) => name.trim().charAt(0)
</script>

<template>
  <ul class="order-list">
    <li
      v-for="(order, index) in orders"
      :key="order.id"
      class="order-row"
      :class="{ 'order-row--active': order.id === selectedId }"
      :style="{ animationDelay: `${index * 60}ms` }"
      role="button"
      :aria-selected="order.id === selectedId"
      tabindex="0"
      @click="emit('select', order.id)"
      @keydown.enter="emit('select', order.id)"
    >
      <div class="row-main">
        <div class="row-customer">
          <span class="avatar" aria-hidden="true">{{ initial(order.customerName) }}</span>
          <div>
            <span class="order-id">{{ order.id }}</span>
            <span class="customer">{{ order.customerName }}</span>
          </div>
        </div>
        <StatusBadge :status="order.status" />
      </div>
      <div class="row-foot">
        <span class="source-pill">
          {{ SOURCE_ICON[order.source] }} {{ SOURCE_LABELS[order.source] }}
        </span>
        <span v-if="order.courierId && staffById?.get(order.courierId)" class="courier-pill">
          🛵 {{ staffById.get(order.courierId)!.name }}
        </span>
        <span class="amount">{{ formatCurrency(order.amount) }}</span>
        <span class="date">{{ formatDateShort(order.createdAt) }}</span>
      </div>
    </li>
  </ul>
</template>

<style scoped>
.order-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.order-row {
  border: 1px solid var(--border);
  border-left: 4px solid var(--border);
  border-radius: var(--radius-md);
  padding: 14px 16px;
  cursor: pointer;
  background: var(--card);
  transition: border-color 0.15s var(--ease), box-shadow 0.15s var(--ease),
    background 0.15s var(--ease), transform 0.15s var(--ease);
  animation: row-in 0.35s var(--ease) both;
}
@keyframes row-in {
  from {
    opacity: 0;
    transform: translateY(6px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
.order-row:hover {
  background: var(--card-hover);
  transform: translateX(2px);
}
.order-row:focus-visible {
  outline: 2px solid var(--accent);
  outline-offset: 1px;
}
.order-row--active {
  border-left-color: var(--accent);
  background: var(--accent-soft);
  box-shadow: var(--shadow-lg);
}
.row-main {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 8px;
}
.row-customer {
  display: flex;
  align-items: center;
  gap: 10px;
  min-width: 0;
}
.avatar {
  width: 38px;
  height: 38px;
  flex-shrink: 0;
  border-radius: 50%;
  display: grid;
  place-items: center;
  font-size: 16px;
  font-weight: 700;
  color: #fff;
  background: linear-gradient(135deg, var(--accent), var(--accent-hover));
}
.order-id {
  display: block;
  font-weight: 600;
  font-family: monospace;
  font-size: 14px;
  color: var(--text);
}
.customer {
  display: block;
  font-size: 13px;
  color: var(--text-secondary);
  margin-top: 1px;
}
.row-foot {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 12px;
  font-size: 14px;
}
.source-pill {
  font-size: 12px;
  color: var(--text-secondary);
  background: var(--bg-subtle);
  border-radius: 999px;
  padding: 3px 10px;
}
.courier-pill {
  font-size: 12px;
  color: var(--accent-text);
  background: var(--accent-soft);
  border-radius: 999px;
  padding: 3px 10px;
}
.amount {
  margin-left: auto;
  font-weight: 700;
  color: var(--text);
}
.date {
  color: var(--text-muted);
  font-size: 13px;
}
</style>
