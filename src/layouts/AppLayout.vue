<script setup lang="ts">
import { onMounted } from 'vue'
import { useTheme } from '../composables/useTheme'
import { useOnline } from '../composables/useOnline'
import { useCartStore } from '../stores/cart'

const { theme, toggle } = useTheme()

// 離線佇列補送是「全域職責」：掛在常駐的 Layout，
// 無論使用者在哪一頁，恢復連線都會補送，訂單不遺失。
const cart = useCartStore()
useOnline(() => cart.flushQueue())
// app 啟動時也補送一次（涵蓋「離線關閉、連線後重開」的情境）
onMounted(() => {
  if (navigator.onLine) cart.flushQueue()
})

const navItems = [
  { to: '/', label: '儀表板', icon: '📊' },
  { to: '/menu', label: '顧客點餐', icon: '🛒' },
  { to: '/orders', label: '訂單管理', icon: '🧾' },
  { to: '/kitchen', label: '廚房出單', icon: '🍳' },
  { to: '/schedule', label: '師傅排班', icon: '📅' },
]
</script>

<template>
  <div class="shell">
    <!-- 側邊欄導覽 -->
    <aside class="sidebar">
      <div class="brand">
        <span class="brand-logo">🍱</span>
        <span class="brand-name">訂單系統</span>
      </div>
      <nav class="nav">
        <RouterLink
          v-for="item in navItems"
          :key="item.to"
          :to="item.to"
          class="nav-link"
        >
          <span class="nav-icon">{{ item.icon }}</span>
          <span>{{ item.label }}</span>
        </RouterLink>
      </nav>
      <button
        type="button"
        class="theme-toggle"
        :aria-label="theme === 'dark' ? '切換為淺色模式' : '切換為深色模式'"
        @click="toggle"
      >
        {{ theme === 'dark' ? '☀️ 淺色模式' : '🌙 深色模式' }}
      </button>
    </aside>

    <!-- 主內容：路由出口，切頁時淡入 -->
    <main class="content">
      <RouterView v-slot="slotProps">
        <Transition name="fade" mode="out-in">
          <component :is="slotProps?.Component" />
        </Transition>
      </RouterView>
    </main>
  </div>
</template>

<style scoped>
.shell {
  display: grid;
  grid-template-columns: 232px 1fr;
  min-height: 100vh;
}
.sidebar {
  position: sticky;
  top: 0;
  height: 100vh;
  background: var(--card);
  border-right: 1px solid var(--border);
  padding: 20px 16px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.brand {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 10px 20px;
}
.brand-logo {
  font-size: 26px;
}
.brand-name {
  font-size: 18px;
  font-weight: 700;
  color: var(--text);
}
.nav {
  display: flex;
  flex-direction: column;
  gap: 4px;
  flex: 1;
}
.nav-link {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 11px 12px;
  border-radius: var(--radius-md);
  color: var(--text-secondary);
  text-decoration: none;
  font-size: 15px;
  transition: background 0.15s var(--ease), color 0.15s var(--ease);
}
.nav-link:hover {
  background: var(--bg-subtle);
  color: var(--text);
}
.nav-link.router-link-active {
  background: var(--accent-soft);
  color: var(--accent-text);
  font-weight: 600;
}
.nav-icon {
  font-size: 18px;
}
.theme-toggle {
  padding: 10px 12px;
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  background: var(--card);
  color: var(--text-secondary);
  font-size: 14px;
  cursor: pointer;
  text-align: left;
  transition: border-color 0.15s var(--ease);
}
.theme-toggle:hover {
  border-color: var(--accent);
  color: var(--text);
}
.content {
  min-width: 0;
}

/* 路由切換淡入 */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s var(--ease), transform 0.2s var(--ease);
}
.fade-enter-from {
  opacity: 0;
  transform: translateY(8px);
}
.fade-leave-to {
  opacity: 0;
}

/* 手機版：側邊欄變頂部橫列 */
@media (max-width: 720px) {
  .shell {
    grid-template-columns: 1fr;
  }
  .sidebar {
    position: sticky;
    height: auto;
    flex-direction: row;
    align-items: center;
    border-right: none;
    border-bottom: 1px solid var(--border);
    padding: 10px 14px;
    gap: 6px;
    overflow-x: auto;
  }
  .brand {
    padding: 0 10px 0 4px;
  }
  .brand-name {
    display: none;
  }
  .nav {
    flex-direction: row;
    flex: 1;
  }
  .nav-link {
    white-space: nowrap;
    padding: 8px 12px;
  }
  .theme-toggle {
    padding: 8px 10px;
    white-space: nowrap;
  }
}
</style>
