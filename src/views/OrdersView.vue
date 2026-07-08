<script setup lang="ts">
import { nextTick, onMounted, ref, watch } from 'vue'
import { storeToRefs } from 'pinia'
import { useOrdersStore } from '../stores/orders'
import { useScheduleStore } from '../stores/schedule'
import FilterBar from '../components/FilterBar.vue'
import OrderList from '../components/OrderList.vue'
import OrderDetail from '../components/OrderDetail.vue'

const store = useOrdersStore()
const {
  isLoading,
  loadError,
  updateError,
  updatingIds,
  keyword,
  statusFilter,
  sourceFilter,
  sortField,
  sortDirection,
  selectedOrderId,
  filteredOrders,
  selectedOrder,
} = storeToRefs(store)

// 送餐人員名單來自排班 store（同一份師傅資料，跨頁共享）
const scheduleStore = useScheduleStore()
const { staff, staffById } = storeToRefs(scheduleStore)

onMounted(() => {
  store.loadOrders()
  scheduleStore.loadAll()
})

// 手機版選取後自動捲動至明細
const detailPane = ref<HTMLElement | null>(null)
watch(selectedOrderId, async (id) => {
  if (!id) return
  if (!window.matchMedia('(max-width: 860px)').matches) return
  await nextTick()
  detailPane.value?.scrollIntoView({ behavior: 'smooth', block: 'start' })
})
</script>

<template>
  <div class="page">
    <header class="page-head">
      <h1>訂單管理</h1>
      <p class="subtitle">搜尋、篩選與更新訂單狀態</p>
    </header>

    <FilterBar
      v-model:keyword="keyword"
      v-model:status-filter="statusFilter"
      v-model:source-filter="sourceFilter"
      v-model:sort-field="sortField"
      v-model:sort-direction="sortDirection"
      class="section"
    />

    <div class="layout">
      <div class="list-pane">
        <div v-if="isLoading" class="skeleton-list" aria-label="載入中">
          <div v-for="n in 4" :key="n" class="skeleton-row">
            <div class="skeleton-line skeleton-line--lg" />
            <div class="skeleton-line skeleton-line--sm" />
            <div class="skeleton-line skeleton-line--md" />
          </div>
        </div>

        <div v-else-if="loadError" class="state state--error">
          <p>⚠️ {{ loadError }}</p>
          <button type="button" @click="store.loadOrders(true)">重新載入</button>
        </div>

        <div v-else-if="filteredOrders.length === 0" class="state state--empty">
          <p>🔍 找不到符合條件的訂單</p>
          <span>請調整搜尋關鍵字或篩選條件</span>
        </div>

        <template v-else>
          <p class="result-count">共 {{ filteredOrders.length }} 筆訂單</p>
          <OrderList
            :orders="filteredOrders"
            :selected-id="selectedOrderId"
            :staff-by-id="staffById"
            @select="store.selectOrder"
          />
        </template>
      </div>

      <div ref="detailPane" class="detail-pane">
        <OrderDetail
          :order="selectedOrder"
          :updating="!!selectedOrder && updatingIds.has(selectedOrder.id)"
          :update-error="updateError"
          :staff="staff"
          @change-status="store.changeOrderStatus"
          @change-courier="store.assignCourier"
        />
      </div>
    </div>
  </div>
</template>

<style scoped>
.page {
  max-width: 1120px;
  margin: 0 auto;
  padding: 32px 28px 64px;
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
.section {
  margin-top: 20px;
}
.layout {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 1.1fr);
  gap: 20px;
  margin-top: 20px;
  align-items: start;
}
@media (min-width: 861px) {
  .detail-pane {
    position: sticky;
    top: 16px;
  }
}
.result-count {
  margin: 0 0 10px;
  font-size: 13px;
  color: var(--text-muted);
}
.state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 10px;
  min-height: 280px;
  background: var(--card);
  border: 1px dashed var(--border-strong);
  border-radius: var(--radius-lg);
  color: var(--text-muted);
  text-align: center;
}
.state--error {
  color: var(--status-cancelled-text);
  border-color: var(--status-cancelled-text);
}
.state button {
  padding: 8px 16px;
  border: 1px solid var(--border-strong);
  border-radius: var(--radius-sm);
  background: var(--card);
  color: var(--text);
  cursor: pointer;
}
.skeleton-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.skeleton-row {
  background: var(--card);
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  padding: 14px 16px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.skeleton-line {
  height: 12px;
  border-radius: 6px;
  background: linear-gradient(
    90deg,
    var(--bg-subtle) 25%,
    var(--border) 37%,
    var(--bg-subtle) 63%
  );
  background-size: 400% 100%;
  animation: shimmer 1.4s ease infinite;
}
.skeleton-line--lg {
  width: 55%;
}
.skeleton-line--md {
  width: 40%;
}
.skeleton-line--sm {
  width: 70%;
}
@keyframes shimmer {
  0% {
    background-position: 100% 0;
  }
  100% {
    background-position: 0 0;
  }
}
@media (max-width: 860px) {
  .layout {
    grid-template-columns: 1fr;
  }
}
</style>
