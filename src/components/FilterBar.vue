<script setup lang="ts">
import type {
  SortDirection,
  SortField,
} from '../types/order'
import type { SourceFilter, StatusFilter } from '../stores/orders'
import { SORT_FIELD_LABELS, SOURCE_LABELS, STATUS_LABELS } from '../constants/labels'

/**
 * 受控元件：所有條件透過 v-model 交給 composable 管理，
 * FilterBar 本身不持有狀態。
 */
const keyword = defineModel<string>('keyword', { required: true })
const statusFilter = defineModel<StatusFilter>('statusFilter', { required: true })
const sourceFilter = defineModel<SourceFilter>('sourceFilter', { required: true })
const sortField = defineModel<SortField>('sortField', { required: true })
const sortDirection = defineModel<SortDirection>('sortDirection', { required: true })

const statusOptions = Object.entries(STATUS_LABELS) as [StatusFilter, string][]
const sourceOptions = Object.entries(SOURCE_LABELS) as [SourceFilter, string][]
const sortOptions = Object.entries(SORT_FIELD_LABELS) as [SortField, string][]

function toggleDirection() {
  sortDirection.value = sortDirection.value === 'asc' ? 'desc' : 'asc'
}
</script>

<template>
  <section class="filter-bar" aria-label="篩選與排序">
    <div class="field field--search">
      <label for="filter-keyword">搜尋</label>
      <input
        id="filter-keyword"
        v-model="keyword"
        type="search"
        placeholder="輸入訂單編號或客戶名稱"
      />
    </div>

    <div class="field">
      <label for="filter-status">狀態</label>
      <select id="filter-status" v-model="statusFilter">
        <option value="all">全部</option>
        <option v-for="[value, text] in statusOptions" :key="value" :value="value">
          {{ text }}
        </option>
      </select>
    </div>

    <div class="field">
      <label for="filter-source">來源</label>
      <select id="filter-source" v-model="sourceFilter">
        <option value="all">全部</option>
        <option v-for="[value, text] in sourceOptions" :key="value" :value="value">
          {{ text }}
        </option>
      </select>
    </div>

    <div class="field">
      <label for="filter-sort">排序依據</label>
      <select id="filter-sort" v-model="sortField">
        <option v-for="[value, text] in sortOptions" :key="value" :value="value">
          {{ text }}
        </option>
      </select>
    </div>

    <div class="field field--dir">
      <label for="filter-dir">順序</label>
      <button id="filter-dir" type="button" class="dir-btn" @click="toggleDirection">
        {{ sortDirection === 'asc' ? '↑ 由小到大' : '↓ 由大到小' }}
      </button>
    </div>
  </section>
</template>

<style scoped>
.filter-bar {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  align-items: flex-end;
  background: var(--card);
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  padding: 18px;
  box-shadow: var(--shadow-sm);
}
.field {
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.field--search {
  flex: 1 1 220px;
}
label {
  font-size: 13px;
  color: var(--text-muted);
}
input,
select,
.dir-btn {
  height: 38px;
  padding: 0 12px;
  border: 1px solid var(--border-strong);
  border-radius: var(--radius-sm);
  font-size: 14px;
  background: var(--card);
  color: var(--text);
  transition: border-color 0.15s var(--ease), box-shadow 0.15s var(--ease);
}
input:focus,
select:focus {
  outline: none;
  border-color: var(--accent);
  box-shadow: 0 0 0 3px var(--accent-soft);
}
.dir-btn {
  cursor: pointer;
  white-space: nowrap;
}
.dir-btn:hover {
  background: var(--card-hover);
  border-color: var(--accent);
}
@media (max-width: 720px) {
  .field {
    flex: 1 1 100%;
  }
}
</style>
