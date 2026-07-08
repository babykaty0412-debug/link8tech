<script setup lang="ts">
import { computed } from 'vue'
import type { Order, OrderStatus } from '../types/order'
import type { Staff } from '../types/schedule'
import type { UpdateError } from '../stores/orders'
import { SOURCE_LABELS, STATUS_LABELS } from '../constants/labels'
import { formatCurrency, formatDateFull } from '../utils/format'
import StatusBadge from './StatusBadge.vue'

const props = defineProps<{
  order: Order | null
  updating?: boolean
  updateError?: UpdateError | null
  /** 可指派的送餐人員名單 */
  staff?: Staff[]
}>()
const emit = defineEmits<{
  changeStatus: [id: string, status: OrderStatus]
  changeCourier: [id: string, courierId: string | null]
}>()

const isUpdating = computed(() => !!props.updating)

/** 只顯示屬於「目前這筆訂單」的錯誤，別筆的失敗不會掛錯地方 */
const ownError = computed(() =>
  props.updateError && props.order && props.updateError.orderId === props.order.id
    ? props.updateError.message
    : null,
)

/** 品項小計加總（可能與 order.amount 不同：金額可能含運費、折扣等） */
const itemsSubtotal = computed(
  () =>
    props.order?.items.reduce((sum, i) => sum + i.price * i.qty, 0) ?? 0,
)

/** 訂單金額與品項小計是否有差異，用於提示 */
const hasAmountGap = computed(
  () => !!props.order && props.order.amount !== itemsSubtotal.value,
)

const statusOptions = Object.keys(STATUS_LABELS) as OrderStatus[]

function onChange(event: Event) {
  if (!props.order) return
  const status = (event.target as HTMLSelectElement).value as OrderStatus
  emit('changeStatus', props.order.id, status)
}

function onCourierChange(event: Event) {
  if (!props.order) return
  const value = (event.target as HTMLSelectElement).value
  emit('changeCourier', props.order.id, value || null)
}
</script>

<template>
  <aside class="detail">
    <div v-if="!order" class="detail-empty">
      <p>👈 請從左側選擇一筆訂單以查看明細</p>
    </div>

    <div v-else class="detail-body">
      <header class="detail-head">
        <div>
          <h3 class="detail-id">{{ order.id }}</h3>
          <p class="detail-customer">{{ order.customerName }}</p>
        </div>
        <StatusBadge :status="order.status" />
      </header>

      <dl class="detail-meta">
        <div>
          <dt>來源</dt>
          <dd>{{ SOURCE_LABELS[order.source] }}</dd>
        </div>
        <div>
          <dt>建立時間</dt>
          <dd>{{ formatDateFull(order.createdAt) }}</dd>
        </div>
      </dl>

      <div class="status-control">
        <label for="status-select">修改狀態</label>
        <select
          id="status-select"
          :value="order.status"
          :disabled="isUpdating"
          @change="onChange"
        >
          <option v-for="s in statusOptions" :key="s" :value="s">
            {{ STATUS_LABELS[s] }}
          </option>
        </select>
        <span v-if="isUpdating" class="updating-hint">處理中…</span>
      </div>

      <!-- 送餐人員指派 -->
      <div class="status-control">
        <label for="courier-select">送餐人員</label>
        <select
          id="courier-select"
          :value="order.courierId ?? ''"
          :disabled="isUpdating"
          @change="onCourierChange"
        >
          <option value="">未指派</option>
          <option v-for="s in staff ?? []" :key="s.id" :value="s.id">
            {{ s.icon }} {{ s.name }}（{{ s.specialty }}）
          </option>
        </select>
      </div>

      <p v-if="ownError" class="update-error" role="alert">
        ⚠️ {{ ownError }}
      </p>

      <h4 class="items-title">訂單品項</h4>
      <table class="items-table">
        <thead>
          <tr>
            <th>品名</th>
            <th class="num">單價</th>
            <th class="num">數量</th>
            <th class="num">小計</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="item in order.items" :key="item.name">
            <td>{{ item.name }}</td>
            <td class="num">{{ formatCurrency(item.price) }}</td>
            <td class="num">{{ item.qty }}</td>
            <td class="num">{{ formatCurrency(item.price * item.qty) }}</td>
          </tr>
        </tbody>
        <tfoot>
          <tr class="subtotal-row">
            <td colspan="3">商品小計</td>
            <td class="num">{{ formatCurrency(itemsSubtotal) }}</td>
          </tr>
          <tr>
            <td colspan="3">訂單金額</td>
            <td class="num total">{{ formatCurrency(order.amount) }}</td>
          </tr>
        </tfoot>
      </table>

      <p v-if="hasAmountGap" class="amount-note">
        ※ 訂單金額與商品小計不一致，此處以後端提供的訂單金額為準（可能含運費或折扣）。
      </p>
    </div>
  </aside>
</template>

<style scoped>
.detail {
  background: var(--card);
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  padding: 20px;
  min-height: 320px;
  box-shadow: var(--shadow-sm);
}
.detail-body {
  animation: detail-in 0.3s var(--ease) both;
}
@keyframes detail-in {
  from {
    opacity: 0;
    transform: translateY(8px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
.detail-empty {
  height: 100%;
  min-height: 280px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--text-muted);
}
.detail-head {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  border-bottom: 1px solid var(--border);
  padding-bottom: 14px;
}
.detail-id {
  margin: 0;
  font-family: monospace;
  font-size: 18px;
  color: var(--text);
}
.detail-customer {
  margin: 4px 0 0;
  color: var(--text-secondary);
}
.detail-meta {
  display: flex;
  gap: 32px;
  margin: 16px 0;
}
.detail-meta dt {
  font-size: 13px;
  color: var(--text-muted);
}
.detail-meta dd {
  margin: 2px 0 0;
  font-weight: 500;
  color: var(--text);
}
.status-control {
  display: flex;
  align-items: center;
  gap: 10px;
  background: var(--bg-subtle);
  border-radius: var(--radius-md);
  padding: 12px;
  margin-bottom: 16px;
}
.status-control label {
  font-size: 14px;
  color: var(--text-secondary);
}
.status-control select {
  height: 36px;
  padding: 0 10px;
  border: 1px solid var(--border-strong);
  border-radius: var(--radius-sm);
  background: var(--card);
  color: var(--text);
}
.status-control select:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}
.updating-hint {
  font-size: 13px;
  color: var(--accent);
}
.update-error {
  margin: 0 0 16px;
  font-size: 13px;
  color: var(--status-cancelled-text);
  background: var(--status-cancelled-bg);
  border: 1px solid var(--status-cancelled-text);
  border-radius: var(--radius-sm);
  padding: 8px 10px;
}
.items-title {
  margin: 0 0 8px;
  font-size: 15px;
  color: var(--text);
}
.items-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 14px;
  color: var(--text);
}
.items-table th,
.items-table td {
  padding: 8px 10px;
  border-bottom: 1px solid var(--border);
  text-align: left;
}
.items-table th {
  color: var(--text-muted);
  font-weight: 500;
}
.items-table .num {
  text-align: right;
}
.items-table tfoot td {
  border-bottom: none;
}
.items-table tfoot .total,
.items-table tfoot tr:last-child td {
  font-weight: 700;
}
.subtotal-row td {
  color: var(--text-muted);
  font-weight: 400;
}
.items-table .total {
  color: var(--status-paid-text);
}
.amount-note {
  margin: 10px 0 0;
  font-size: 12px;
  color: var(--status-pending-text);
  background: var(--status-pending-bg);
  border: 1px solid var(--status-pending-text);
  border-radius: var(--radius-sm);
  padding: 8px 10px;
  line-height: 1.5;
}
</style>
