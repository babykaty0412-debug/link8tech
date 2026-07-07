<script setup lang="ts">
import { onMounted } from 'vue'
import { storeToRefs } from 'pinia'
import { useRouter } from 'vue-router'
import { useOrdersStore } from '../stores/orders'
import StatsCard from '../components/StatsCard.vue'
import StatusDonut from '../components/StatusDonut.vue'
import SourceBar from '../components/SourceBar.vue'

const store = useOrdersStore()
const { orders, stats, loadError, isLoading } = storeToRefs(store)
const router = useRouter()

onMounted(store.loadOrders)
</script>

<template>
  <div class="page">
    <header class="page-head">
      <div>
        <h1>儀表板</h1>
        <p class="subtitle">訂單概況一覽</p>
      </div>
      <button type="button" class="link-btn" @click="router.push('/orders')">
        前往訂單管理 →
      </button>
    </header>

    <!-- 首次載入中：不顯示 0 統計 -->
    <div v-if="isLoading && !orders.length" class="loading-state section">
      <span class="spinner" aria-hidden="true" />
      <p>載入中…</p>
    </div>

    <!-- 載入失敗且無資料：顯示錯誤與重試，不顯示「0 訂單」的假統計 -->
    <div v-else-if="loadError && !orders.length" class="error-state section">
      <p>⚠️ {{ loadError }}</p>
      <button type="button" @click="store.loadOrders(true)">重新載入</button>
    </div>

    <template v-else>
      <StatsCard :stats="stats" class="section" />

      <div class="charts section">
        <StatusDonut :orders="orders" />
        <SourceBar :orders="orders" />
      </div>
    </template>
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
.link-btn {
  flex-shrink: 0;
  padding: 9px 16px;
  border: 1px solid var(--accent);
  border-radius: 999px;
  background: var(--accent);
  color: #fff;
  font-size: 14px;
  cursor: pointer;
  transition: transform 0.15s var(--ease), background 0.15s var(--ease);
}
.link-btn:hover {
  transform: translateY(-1px);
  background: var(--accent-hover);
}
.section {
  margin-top: 20px;
}
.charts {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
  align-items: stretch;
}
.error-state,
.loading-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 10px;
  min-height: 200px;
  background: var(--card);
  border: 1px dashed var(--border-strong);
  border-radius: var(--radius-lg);
  color: var(--text-muted);
}
.error-state {
  border-color: var(--status-cancelled-text);
  color: var(--status-cancelled-text);
}
.spinner {
  width: 26px;
  height: 26px;
  border: 3px solid var(--border);
  border-top-color: var(--accent);
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}
@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}
.error-state button {
  padding: 8px 16px;
  border: 1px solid var(--border-strong);
  border-radius: var(--radius-sm);
  background: var(--card);
  color: var(--text);
  cursor: pointer;
}
@media (max-width: 860px) {
  .charts {
    grid-template-columns: 1fr;
  }
}
</style>
