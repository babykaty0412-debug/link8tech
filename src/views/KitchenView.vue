<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { storeToRefs } from 'pinia'
import { useOrdersStore } from '../stores/orders'
import { useNow, formatElapsed } from '../composables/useNow'
import { SOURCE_LABELS } from '../constants/labels'

const store = useOrdersStore()
const { orders, isLoading, loadError, updatingIds, updateError } =
  storeToRefs(store)

onMounted(store.loadOrders)

const { now } = useNow()

/** 廚房只看待處理訂單，先進先出（最舊的排最前） */
const tickets = computed(() =>
  orders.value
    .filter((o) => o.status === 'pending')
    .sort(
      (a, b) =>
        new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
    ),
)

/** 等待超過 15 分鐘標示為急單 */
function isUrgent(createdAt: string): boolean {
  return now.value - new Date(createdAt).getTime() > 15 * 60000
}

/** 出餐完成：demo 以 paid 代表已完成（實務會擴充 preparing/served 狀態） */
function complete(id: string) {
  store.changeOrderStatus(id, 'paid')
}
</script>

<template>
  <div class="page">
    <header class="page-head">
      <div>
        <h1>廚房出單看板</h1>
        <p class="subtitle">待處理訂單先進先出，出餐後點擊完成</p>
      </div>
      <span class="count-badge">🔥 待處理 {{ tickets.length }} 單</span>
    </header>

    <!-- 出餐失敗提示（樂觀更新已回滾，票卡會重新出現） -->
    <p v-if="updateError" class="update-error" role="alert">
      ⚠️ 訂單 {{ updateError.orderId }} 出餐失敗：{{ updateError.message }}（已還原，請重試）
    </p>

    <div v-if="isLoading" class="state">載入中…</div>

    <!-- 載入失敗：顯示真實錯誤，不偽裝成「沒有訂單」 -->
    <div v-else-if="loadError" class="state state--error">
      <p>⚠️ {{ loadError }}</p>
      <button type="button" @click="store.loadOrders(true)">重新載入</button>
    </div>

    <div v-else-if="tickets.length === 0" class="state state--done">
      <span class="done-icon">🎉</span>
      <p>目前沒有待處理訂單</p>
      <span class="done-sub">新訂單進來會即時出現在這裡</span>
    </div>

    <TransitionGroup v-else name="ticket" tag="div" class="board">
      <article
        v-for="ticket in tickets"
        :key="ticket.id"
        class="ticket"
        :class="{ 'ticket--urgent': isUrgent(ticket.createdAt) }"
      >
        <header class="ticket-head">
          <span class="ticket-id">{{ ticket.id.slice(-3) }}</span>
          <span class="ticket-elapsed" :class="{ urgent: isUrgent(ticket.createdAt) }">
            ⏱ {{ formatElapsed(ticket.createdAt, now) }}
          </span>
        </header>

        <p class="ticket-meta">
          {{ ticket.customerName }}｜{{ SOURCE_LABELS[ticket.source] }}
        </p>

        <ul class="ticket-items">
          <li v-for="item in ticket.items" :key="item.name" class="ticket-item">
            <span class="item-qty">{{ item.qty }}×</span>
            <span class="item-name">{{ item.name }}</span>
          </li>
        </ul>

        <button
          type="button"
          class="done-btn"
          :disabled="updatingIds.has(ticket.id)"
          @click="complete(ticket.id)"
        >
          {{ updatingIds.has(ticket.id) ? '處理中…' : '✓ 完成出餐' }}
        </button>
      </article>
    </TransitionGroup>
  </div>
</template>

<style scoped>
.page {
  max-width: 1120px;
  margin: 0 auto;
  padding: 32px 28px 64px;
}
.page-head {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 16px;
}
.page-head h1 {
  margin: 0;
  font-size: 26px;
  color: var(--text);
}
.subtitle {
  margin: 4px 0 0;
  color: var(--text-muted);
}
.count-badge {
  flex-shrink: 0;
  font-size: 14px;
  font-weight: 600;
  padding: 8px 16px;
  border-radius: 999px;
  background: var(--status-pending-bg);
  color: var(--status-pending-text);
  border: 1px solid var(--status-pending-text);
}
.board {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
  gap: 16px;
  margin-top: 22px;
}
.ticket {
  background: var(--card);
  border: 1px solid var(--border);
  border-top: 4px solid var(--status-pending-text);
  border-radius: var(--radius-lg);
  padding: 16px;
  box-shadow: var(--shadow-sm);
  display: flex;
  flex-direction: column;
}
.ticket--urgent {
  border-top-color: var(--status-cancelled-text);
  animation: pulse 1.6s ease infinite;
}
@keyframes pulse {
  0%,
  100% {
    box-shadow: var(--shadow-sm);
  }
  50% {
    box-shadow: 0 0 0 4px var(--status-cancelled-bg);
  }
}
.ticket-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.ticket-id {
  font-family: monospace;
  font-size: 26px;
  font-weight: 800;
  color: var(--text);
}
.ticket-elapsed {
  font-size: 13px;
  color: var(--text-muted);
}
.ticket-elapsed.urgent {
  color: var(--status-cancelled-text);
  font-weight: 700;
}
.ticket-meta {
  margin: 4px 0 10px;
  font-size: 13px;
  color: var(--text-secondary);
}
.ticket-items {
  list-style: none;
  margin: 0 0 14px;
  padding: 10px 0;
  border-top: 1px dashed var(--border);
  border-bottom: 1px dashed var(--border);
  flex: 1;
}
.ticket-item {
  display: flex;
  gap: 8px;
  padding: 4px 0;
  font-size: 16px;
  color: var(--text);
}
.item-qty {
  font-weight: 800;
  color: var(--accent-text);
  min-width: 30px;
}
.done-btn {
  height: 42px;
  border: none;
  border-radius: var(--radius-md);
  background: var(--status-paid-text);
  color: #fff;
  font-size: 15px;
  font-weight: 700;
  cursor: pointer;
  transition: filter 0.15s var(--ease), transform 0.15s var(--ease);
}
.done-btn:hover {
  filter: brightness(1.1);
  transform: translateY(-1px);
}
.done-btn:disabled {
  opacity: 0.6;
  cursor: wait;
}
.update-error {
  margin: 14px 0 0;
  font-size: 13px;
  color: var(--status-cancelled-text);
  background: var(--status-cancelled-bg);
  border: 1px solid var(--status-cancelled-text);
  border-radius: var(--radius-sm);
  padding: 8px 12px;
}
.state--error {
  color: var(--status-cancelled-text);
  border-color: var(--status-cancelled-text);
}
.state--error button {
  padding: 8px 16px;
  border: 1px solid var(--border-strong);
  border-radius: var(--radius-sm);
  background: var(--card);
  color: var(--text);
  cursor: pointer;
}
.state {
  min-height: 260px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  color: var(--text-muted);
  background: var(--card);
  border: 1px dashed var(--border-strong);
  border-radius: var(--radius-lg);
  margin-top: 22px;
}
.done-icon {
  font-size: 42px;
}
.done-sub {
  font-size: 13px;
}
/* 出餐完成的離場動畫 */
.ticket-leave-active {
  transition: all 0.4s var(--ease);
}
.ticket-leave-to {
  opacity: 0;
  transform: scale(0.9) translateY(-10px);
}
.ticket-enter-active {
  transition: all 0.35s var(--ease);
}
.ticket-enter-from {
  opacity: 0;
  transform: translateY(12px);
}
.ticket-move {
  transition: transform 0.35s var(--ease);
}
</style>
