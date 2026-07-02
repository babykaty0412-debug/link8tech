<script setup lang="ts">
import { onMounted } from 'vue'
import { storeToRefs } from 'pinia'
import { useRouter } from 'vue-router'
import { useOrdersStore } from '../stores/orders'
import StatsCard from '../components/StatsCard.vue'
import StatusDonut from '../components/StatusDonut.vue'
import SourceBar from '../components/SourceBar.vue'

const store = useOrdersStore()
const { orders, stats } = storeToRefs(store)
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

    <StatsCard :stats="stats" class="section" />

    <div class="charts section">
      <StatusDonut :orders="orders" />
      <SourceBar :orders="orders" />
    </div>
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
@media (max-width: 860px) {
  .charts {
    grid-template-columns: 1fr;
  }
}
</style>
