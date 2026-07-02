<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { storeToRefs } from 'pinia'
import { useRouter } from 'vue-router'
import { useCartStore } from '../stores/cart'
import { useOnline } from '../composables/useOnline'
import { formatCurrency } from '../utils/format'
import type { MenuCategory } from '../types/menu'

const cart = useCartStore()
const {
  isMenuLoading,
  menuError,
  activeCategory,
  menuByCategory,
  customerName,
  totalCount,
  totalAmount,
  isSubmitting,
  submitError,
  queuedCount,
} = storeToRefs(cart)

const router = useRouter()

// 只取連線狀態顯示徽章；佇列補送由 AppLayout 全域負責，避免重複監聽造成重複送單
const { isOnline } = useOnline()

onMounted(cart.loadMenu)

const CATEGORIES: { key: MenuCategory; label: string; icon: string }[] = [
  { key: 'hotpot', label: '鍋物', icon: '🍲' },
  { key: 'main', label: '主食', icon: '🍚' },
  { key: 'side', label: '小點', icon: '🥞' },
  { key: 'drink', label: '飲品', icon: '🍵' },
]

/** 送單結果提示 */
const notice = ref<{ type: 'sent' | 'queued'; text: string } | null>(null)

async function submitOrder() {
  try {
    const result = await cart.submit()
    if (result === 'queued') {
      notice.value = {
        type: 'queued',
        text: '📴 目前離線：訂單已暫存，恢復連線後會自動送出，不會遺失！',
      }
    } else {
      notice.value = { type: 'sent', text: '✅ 送單成功！訂單已進入後台' }
      setTimeout(() => router.push('/orders'), 1200)
    }
  } catch {
    /* submitError 已由 store 記錄並顯示 */
  }
}
</script>

<template>
  <div class="page">
    <header class="page-head">
      <div>
        <h1>顧客點餐</h1>
        <p class="subtitle">選擇餐點加入購物車，送單後即時進入後台</p>
      </div>
      <span class="net-badge" :class="isOnline ? 'net-badge--on' : 'net-badge--off'">
        {{ isOnline ? '🟢 已連線' : '🔴 離線中' }}
      </span>
    </header>

    <!-- 離線佇列提示 -->
    <p v-if="queuedCount > 0" class="queue-note">
      📦 有 {{ queuedCount }} 筆離線訂單待補送，恢復連線後會自動送出
    </p>

    <!-- 分類頁籤 -->
    <nav class="tabs" aria-label="菜單分類">
      <button
        v-for="c in CATEGORIES"
        :key="c.key"
        type="button"
        class="tab"
        :class="{ 'tab--active': activeCategory === c.key }"
        @click="activeCategory = c.key"
      >
        {{ c.icon }} {{ c.label }}
      </button>
    </nav>

    <!-- 菜單 -->
    <div v-if="isMenuLoading" class="state">載入菜單中…</div>
    <div v-else-if="menuError" class="state state--error">
      ⚠️ {{ menuError }}
      <button type="button" @click="cart.loadMenu">重試</button>
    </div>
    <div v-else class="menu-grid">
      <div
        v-for="item in menuByCategory"
        :key="item.id"
        class="menu-card"
        :class="{ 'menu-card--soldout': item.soldOut }"
      >
        <span class="menu-icon">{{ item.icon }}</span>
        <h3 class="menu-name">{{ item.name }}</h3>
        <p class="menu-price">{{ formatCurrency(item.price) }}</p>

        <span v-if="item.soldOut" class="soldout-tag">售完</span>
        <div v-else class="stepper">
          <button
            type="button"
            class="step-btn"
            :disabled="cart.qtyOf(item) === 0"
            :aria-label="`減少${item.name}`"
            @click="cart.remove(item)"
          >
            −
          </button>
          <span class="step-qty">{{ cart.qtyOf(item) }}</span>
          <button
            type="button"
            class="step-btn step-btn--add"
            :aria-label="`增加${item.name}`"
            @click="cart.add(item)"
          >
            ＋
          </button>
        </div>
      </div>
    </div>

    <!-- 購物車結帳列 -->
    <footer v-if="totalCount > 0" class="cart-bar">
      <div class="cart-info">
        <span class="cart-count">🛒 {{ totalCount }} 件</span>
        <strong class="cart-total">{{ formatCurrency(totalAmount) }}</strong>
      </div>
      <input
        v-model="customerName"
        class="cart-name"
        type="text"
        placeholder="顧客姓名（可留空）"
        aria-label="顧客姓名"
      />
      <button
        type="button"
        class="submit-btn"
        :disabled="isSubmitting"
        @click="submitOrder"
      >
        {{ isSubmitting ? '送單中…' : '送出訂單' }}
      </button>
    </footer>

    <!-- 結果提示 -->
    <Transition name="pop">
      <p v-if="notice" class="notice" :class="`notice--${notice.type}`" role="status">
        {{ notice.text }}
      </p>
    </Transition>
    <p v-if="submitError" class="notice notice--error" role="alert">
      ⚠️ {{ submitError }}
    </p>
  </div>
</template>

<style scoped>
.page {
  max-width: 1120px;
  margin: 0 auto;
  padding: 32px 28px 120px;
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
.net-badge {
  flex-shrink: 0;
  font-size: 13px;
  padding: 6px 12px;
  border-radius: 999px;
  border: 1px solid var(--border);
  background: var(--card);
  color: var(--text-secondary);
}
.net-badge--off {
  border-color: var(--status-cancelled-text);
  color: var(--status-cancelled-text);
}
.queue-note {
  margin: 14px 0 0;
  font-size: 13px;
  color: var(--status-pending-text);
  background: var(--status-pending-bg);
  border: 1px solid var(--status-pending-text);
  border-radius: var(--radius-sm);
  padding: 8px 12px;
}
.tabs {
  display: flex;
  gap: 8px;
  margin-top: 20px;
  flex-wrap: wrap;
}
.tab {
  padding: 9px 18px;
  border-radius: 999px;
  border: 1px solid var(--border);
  background: var(--card);
  color: var(--text-secondary);
  font-size: 15px;
  cursor: pointer;
  transition: all 0.15s var(--ease);
}
.tab:hover {
  border-color: var(--accent);
}
.tab--active {
  background: var(--accent);
  border-color: var(--accent);
  color: #fff;
  font-weight: 600;
}
.menu-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
  gap: 14px;
  margin-top: 18px;
}
.menu-card {
  position: relative;
  background: var(--card);
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  padding: 18px 16px 16px;
  text-align: center;
  box-shadow: var(--shadow-sm);
  transition: transform 0.15s var(--ease), box-shadow 0.15s var(--ease);
  animation: card-in 0.3s var(--ease) both;
}
@keyframes card-in {
  from {
    opacity: 0;
    transform: translateY(8px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
.menu-card:hover {
  transform: translateY(-3px);
  box-shadow: var(--shadow-md);
}
.menu-card--soldout {
  opacity: 0.55;
}
.menu-icon {
  font-size: 40px;
  line-height: 1;
}
.menu-name {
  margin: 10px 0 2px;
  font-size: 15px;
  color: var(--text);
}
.menu-price {
  margin: 0 0 12px;
  font-weight: 700;
  color: var(--accent-text);
}
.soldout-tag {
  display: inline-block;
  font-size: 13px;
  color: var(--status-cancelled-text);
  background: var(--status-cancelled-bg);
  border-radius: 999px;
  padding: 4px 14px;
}
.stepper {
  display: inline-flex;
  align-items: center;
  gap: 12px;
}
.step-btn {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  border: 1px solid var(--border-strong);
  background: var(--card);
  color: var(--text);
  font-size: 16px;
  cursor: pointer;
  transition: all 0.15s var(--ease);
}
.step-btn:disabled {
  opacity: 0.35;
  cursor: not-allowed;
}
.step-btn--add {
  background: var(--accent);
  border-color: var(--accent);
  color: #fff;
}
.step-btn--add:hover {
  background: var(--accent-hover);
}
.step-qty {
  min-width: 20px;
  font-weight: 700;
  color: var(--text);
}
/* 結帳列：吸附底部 */
.cart-bar {
  position: fixed;
  bottom: 16px;
  left: 50%;
  transform: translateX(-50%);
  width: min(680px, calc(100% - 32px));
  display: flex;
  align-items: center;
  gap: 12px;
  background: var(--card);
  border: 1px solid var(--border);
  border-radius: 999px;
  padding: 10px 12px 10px 20px;
  box-shadow: var(--shadow-lg);
  z-index: 10;
  animation: bar-in 0.25s var(--ease) both;
}
@keyframes bar-in {
  from {
    opacity: 0;
    transform: translate(-50%, 16px);
  }
  to {
    opacity: 1;
    transform: translate(-50%, 0);
  }
}
.cart-info {
  display: flex;
  align-items: center;
  gap: 10px;
  white-space: nowrap;
}
.cart-count {
  font-size: 14px;
  color: var(--text-secondary);
}
.cart-total {
  font-size: 17px;
  color: var(--text);
}
.cart-name {
  flex: 1;
  min-width: 0;
  height: 38px;
  border: 1px solid var(--border-strong);
  border-radius: 999px;
  padding: 0 14px;
  background: var(--bg-subtle);
  color: var(--text);
  font-size: 14px;
}
.submit-btn {
  flex-shrink: 0;
  height: 40px;
  padding: 0 22px;
  border: none;
  border-radius: 999px;
  background: var(--accent);
  color: #fff;
  font-size: 15px;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.15s var(--ease), transform 0.15s var(--ease);
}
.submit-btn:hover {
  background: var(--accent-hover);
  transform: translateY(-1px);
}
.submit-btn:disabled {
  opacity: 0.6;
  cursor: wait;
}
.state {
  min-height: 200px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 10px;
  color: var(--text-muted);
  background: var(--card);
  border: 1px dashed var(--border-strong);
  border-radius: var(--radius-lg);
  margin-top: 18px;
}
.state--error {
  color: var(--status-cancelled-text);
}
.notice {
  position: fixed;
  bottom: 80px;
  left: 50%;
  transform: translateX(-50%);
  padding: 10px 20px;
  border-radius: 999px;
  font-size: 14px;
  z-index: 11;
  box-shadow: var(--shadow-md);
}
.notice--sent {
  background: var(--status-paid-bg);
  color: var(--status-paid-text);
  border: 1px solid var(--status-paid-text);
}
.notice--queued,
.notice--error {
  background: var(--status-pending-bg);
  color: var(--status-pending-text);
  border: 1px solid var(--status-pending-text);
}
.notice--error {
  background: var(--status-cancelled-bg);
  color: var(--status-cancelled-text);
  border-color: var(--status-cancelled-text);
}
.pop-enter-active,
.pop-leave-active {
  transition: opacity 0.25s var(--ease), transform 0.25s var(--ease);
}
.pop-enter-from,
.pop-leave-to {
  opacity: 0;
  transform: translate(-50%, 10px);
}
@media (max-width: 640px) {
  .cart-bar {
    flex-wrap: wrap;
    border-radius: var(--radius-lg);
  }
  .cart-name {
    order: 3;
    flex-basis: 100%;
  }
}
</style>
