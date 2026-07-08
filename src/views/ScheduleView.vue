<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { storeToRefs } from 'pinia'
import { useScheduleStore } from '../stores/schedule'
import type { ShiftSlot, WeekDay } from '../types/schedule'

const store = useScheduleStore()
const { staff, isLoading, error, staffById, weekCount } = storeToRefs(store)

onMounted(store.loadAll)

const DAYS: { day: WeekDay; label: string }[] = [
  { day: 0, label: '週一' },
  { day: 1, label: '週二' },
  { day: 2, label: '週三' },
  { day: 3, label: '週四' },
  { day: 4, label: '週五' },
  { day: 5, label: '週六' },
  { day: 6, label: '週日' },
]

const SLOTS: { slot: ShiftSlot; label: string; time: string }[] = [
  { slot: 'morning', label: '早班', time: '10:00–14:00' },
  { slot: 'afternoon', label: '午班', time: '14:00–17:00' },
  { slot: 'evening', label: '晚班', time: '17:00–21:00' },
]

/** 目前開啟指派選單的格子（day-slot），一次只開一格 */
const openCell = ref<string | null>(null)

function toggleCell(day: WeekDay, slot: ShiftSlot) {
  const key = `${day}-${slot}`
  openCell.value = openCell.value === key ? null : key
}

async function pick(staffId: string, day: WeekDay, slot: ShiftSlot) {
  const myCell = `${day}-${slot}`
  await store.assign(staffId, day, slot)
  // 只關閉自己這格的選單：await 期間使用者若已開啟別格，不去干擾
  if (openCell.value === myCell) openCell.value = null
}

// ---- 師傅管理面板 ----
const ICONS = ['🧑‍🍳', '👩‍🍳', '👨‍🍳', '🧑‍🔧', '👩‍💼']

const showManage = ref(false)
/** 新增表單 */
const newStaff = ref({ name: '', specialty: '', icon: ICONS[0] })
/** 編輯中的師傅 id 與草稿 */
const editingId = ref<string | null>(null)
const editDraft = ref({ name: '', specialty: '', icon: ICONS[0] })

async function submitNewStaff() {
  const ok = await store.addStaff({ ...newStaff.value })
  if (ok) newStaff.value = { name: '', specialty: '', icon: ICONS[0] }
}

function startEdit(id: string) {
  const s = staffById.value.get(id)
  if (!s) return
  editingId.value = id
  editDraft.value = { name: s.name, specialty: s.specialty, icon: s.icon }
}

async function saveEdit() {
  if (!editingId.value) return
  const ok = await store.editStaff(editingId.value, { ...editDraft.value })
  if (ok) editingId.value = null
}
</script>

<template>
  <div class="page">
    <header class="page-head">
      <div>
        <h1>師傅排班</h1>
        <p class="subtitle">點「＋」指派班別；同人同日連班會出現 ⚠ 提醒</p>
      </div>
    </header>

    <!-- 師傅週負載概況 + 管理入口 -->
    <div class="staff-summary">
      <span v-for="s in staff" :key="s.id" class="staff-chip">
        {{ s.icon }} {{ s.name }}
        <em class="staff-count">{{ weekCount.get(s.id) ?? 0 }} 班</em>
      </span>
      <button type="button" class="manage-btn" @click="showManage = !showManage">
        {{ showManage ? '完成' : '⚙️ 管理師傅' }}
      </button>
    </div>

    <!-- 師傅管理面板：新增／編輯／刪除 -->
    <section v-if="showManage" class="manage-panel" aria-label="師傅管理">
      <div v-for="s in staff" :key="s.id" class="manage-row">
        <!-- 編輯模式 -->
        <template v-if="editingId === s.id">
          <div class="icon-pick">
            <button
              v-for="ic in ICONS"
              :key="ic"
              type="button"
              class="icon-btn"
              :class="{ 'icon-btn--on': editDraft.icon === ic }"
              @click="editDraft.icon = ic"
            >
              {{ ic }}
            </button>
          </div>
          <input v-model="editDraft.name" class="manage-input" placeholder="姓名" />
          <input v-model="editDraft.specialty" class="manage-input" placeholder="專長" />
          <button type="button" class="row-btn row-btn--save" :disabled="store.isSavingStaff" @click="saveEdit">
            儲存
          </button>
          <button type="button" class="row-btn" @click="editingId = null">取消</button>
        </template>

        <!-- 一般模式 -->
        <template v-else>
          <span class="manage-name">{{ s.icon }} {{ s.name }}</span>
          <span class="manage-spec">{{ s.specialty }}</span>
          <span class="manage-count">{{ weekCount.get(s.id) ?? 0 }} 班</span>
          <button type="button" class="row-btn" @click="startEdit(s.id)">✎ 編輯</button>
          <button
            type="button"
            class="row-btn row-btn--danger"
            :disabled="(weekCount.get(s.id) ?? 0) > 0"
            :title="(weekCount.get(s.id) ?? 0) > 0 ? '仍有排班，請先移除其班別' : ''"
            @click="store.removeStaff(s.id)"
          >
            🗑 刪除
          </button>
        </template>
      </div>

      <!-- 新增列 -->
      <div class="manage-row manage-row--new">
        <div class="icon-pick">
          <button
            v-for="ic in ICONS"
            :key="ic"
            type="button"
            class="icon-btn"
            :class="{ 'icon-btn--on': newStaff.icon === ic }"
            @click="newStaff.icon = ic"
          >
            {{ ic }}
          </button>
        </div>
        <input
          v-model="newStaff.name"
          class="manage-input"
          placeholder="新師傅姓名"
          @keydown.enter="submitNewStaff"
        />
        <input
          v-model="newStaff.specialty"
          class="manage-input"
          placeholder="專長（如：鍋物）"
          @keydown.enter="submitNewStaff"
        />
        <button
          type="button"
          class="row-btn row-btn--save"
          :disabled="store.isSavingStaff || !newStaff.name.trim()"
          @click="submitNewStaff"
        >
          {{ store.isSavingStaff ? '處理中…' : '＋ 新增' }}
        </button>
      </div>
    </section>

    <p v-if="error && staff.length" class="error-note" role="alert">⚠️ {{ error }}</p>

    <div v-if="isLoading" class="state">載入排班中…</div>

    <!-- 載入失敗：給重試，不渲染可互動的空班表 -->
    <div v-else-if="error && !staff.length" class="state state--error">
      <p>⚠️ {{ error }}</p>
      <button type="button" class="retry-btn" @click="store.loadAll(true)">重新載入</button>
    </div>

    <!-- 週曆網格 -->
    <div v-else class="grid-wrap">
      <table class="grid">
        <thead>
          <tr>
            <th class="slot-col">班別</th>
            <th v-for="d in DAYS" :key="d.day">{{ d.label }}</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="s in SLOTS" :key="s.slot">
            <th class="slot-col">
              <span class="slot-name">{{ s.label }}</span>
              <span class="slot-time">{{ s.time }}</span>
            </th>
            <td v-for="d in DAYS" :key="d.day" class="cell">
              <!-- 已指派的師傅 -->
              <span
                v-for="a in store.cellOf(d.day, s.slot)"
                :key="a.id"
                class="chip"
                :class="{ 'chip--warn': store.isOverworked(a.staffId, d.day) }"
                :title="store.isOverworked(a.staffId, d.day) ? '此師傅當日連多班' : ''"
              >
                {{ store.isOverworked(a.staffId, d.day) ? '⚠' : '' }}
                {{ staffById.get(a.staffId)?.name ?? a.staffId }}
                <button
                  type="button"
                  class="chip-x"
                  :aria-label="`移除 ${staffById.get(a.staffId)?.name}`"
                  @click="store.remove(a.id)"
                >
                  ×
                </button>
              </span>

              <!-- 指派按鈕與選單 -->
              <div class="add-wrap">
                <button
                  type="button"
                  class="add-btn"
                  :aria-label="`指派 ${d.label} ${s.label}`"
                  @click="toggleCell(d.day, s.slot)"
                >
                  ＋
                </button>
                <ul
                  v-if="openCell === `${d.day}-${s.slot}`"
                  class="picker"
                  role="listbox"
                >
                  <li v-for="p in staff" :key="p.id">
                    <button
                      type="button"
                      class="picker-item"
                      :disabled="store.isAssigning(p.id, d.day, s.slot)"
                      @click="pick(p.id, d.day, s.slot)"
                    >
                      {{ p.icon }} {{ p.name }}
                      <small>{{ p.specialty }}</small>
                    </button>
                  </li>
                </ul>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
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
.staff-summary {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 18px;
}
.staff-chip {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  padding: 6px 12px;
  border-radius: 999px;
  background: var(--card);
  border: 1px solid var(--border);
  color: var(--text-secondary);
}
.staff-count {
  font-style: normal;
  font-weight: 700;
  color: var(--accent-text);
}
.manage-btn {
  padding: 6px 14px;
  border-radius: 999px;
  border: 1px dashed var(--border-strong);
  background: transparent;
  color: var(--text-secondary);
  font-size: 13px;
  cursor: pointer;
  transition: all 0.15s var(--ease);
}
.manage-btn:hover {
  border-color: var(--accent);
  color: var(--accent);
}
.manage-panel {
  margin-top: 12px;
  background: var(--card);
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  padding: 12px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  box-shadow: var(--shadow-sm);
  animation: panel-in 0.2s var(--ease) both;
}
@keyframes panel-in {
  from {
    opacity: 0;
    transform: translateY(-4px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
.manage-row {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 10px;
  border-radius: var(--radius-md);
  flex-wrap: wrap;
}
.manage-row:hover {
  background: var(--bg-subtle);
}
.manage-row--new {
  border-top: 1px dashed var(--border);
  padding-top: 12px;
}
.manage-name {
  min-width: 140px;
  font-size: 14px;
  color: var(--text);
  font-weight: 500;
}
.manage-spec {
  min-width: 90px;
  font-size: 13px;
  color: var(--text-muted);
}
.manage-count {
  font-size: 13px;
  color: var(--accent-text);
  font-weight: 600;
  margin-right: auto;
}
.row-btn {
  padding: 6px 12px;
  border-radius: var(--radius-sm);
  border: 1px solid var(--border-strong);
  background: var(--card);
  color: var(--text-secondary);
  font-size: 13px;
  cursor: pointer;
  transition: all 0.15s var(--ease);
}
.row-btn:hover:not(:disabled) {
  border-color: var(--accent);
  color: var(--accent);
}
.row-btn--save {
  background: var(--accent);
  border-color: var(--accent);
  color: #fff;
}
.row-btn--save:hover:not(:disabled) {
  color: #fff;
  filter: brightness(1.1);
}
.row-btn--danger:hover:not(:disabled) {
  border-color: var(--status-cancelled-text);
  color: var(--status-cancelled-text);
}
.row-btn:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}
.manage-input {
  height: 34px;
  padding: 0 10px;
  border: 1px solid var(--border-strong);
  border-radius: var(--radius-sm);
  background: var(--card);
  color: var(--text);
  font-size: 13px;
  min-width: 120px;
  flex: 1;
  max-width: 180px;
}
.icon-pick {
  display: flex;
  gap: 4px;
}
.icon-btn {
  width: 32px;
  height: 32px;
  border-radius: var(--radius-sm);
  border: 1px solid transparent;
  background: transparent;
  font-size: 17px;
  cursor: pointer;
}
.icon-btn--on {
  border-color: var(--accent);
  background: var(--accent-soft);
}
.error-note {
  margin: 14px 0 0;
  font-size: 13px;
  color: var(--status-cancelled-text);
  background: var(--status-cancelled-bg);
  border: 1px solid var(--status-cancelled-text);
  border-radius: var(--radius-sm);
  padding: 8px 12px;
}
.grid-wrap {
  margin-top: 18px;
  overflow-x: auto;
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  background: var(--card);
  box-shadow: var(--shadow-sm);
}
.grid {
  width: 100%;
  min-width: 860px;
  border-collapse: collapse;
}
.grid th,
.grid td {
  border: 1px solid var(--border);
  padding: 10px;
  text-align: center;
  vertical-align: top;
}
.grid thead th {
  background: var(--bg-subtle);
  color: var(--text-secondary);
  font-size: 14px;
  padding: 12px 10px;
}
.slot-col {
  width: 96px;
  background: var(--bg-subtle);
}
.slot-name {
  display: block;
  font-size: 15px;
  color: var(--text);
}
.slot-time {
  display: block;
  font-size: 11px;
  color: var(--text-muted);
  margin-top: 2px;
}
.cell {
  min-width: 104px;
  height: 86px;
}
.chip {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 12px;
  padding: 4px 6px 4px 10px;
  border-radius: 999px;
  background: var(--accent-soft);
  color: var(--accent-text);
  margin: 2px;
  animation: chip-in 0.25s var(--ease) both;
}
@keyframes chip-in {
  from {
    opacity: 0;
    transform: scale(0.85);
  }
  to {
    opacity: 1;
    transform: scale(1);
  }
}
.chip--warn {
  background: var(--status-pending-bg);
  color: var(--status-pending-text);
}
.chip-x {
  border: none;
  background: transparent;
  color: inherit;
  font-size: 14px;
  cursor: pointer;
  padding: 0 2px;
  opacity: 0.7;
}
.chip-x:hover {
  opacity: 1;
}
.add-wrap {
  position: relative;
  display: inline-block;
}
.add-btn {
  width: 26px;
  height: 26px;
  margin: 2px;
  border-radius: 50%;
  border: 1px dashed var(--border-strong);
  background: transparent;
  color: var(--text-muted);
  cursor: pointer;
  transition: all 0.15s var(--ease);
}
.add-btn:hover {
  border-color: var(--accent);
  color: var(--accent);
}
.picker {
  position: absolute;
  top: 30px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 20;
  list-style: none;
  margin: 0;
  padding: 6px;
  min-width: 168px;
  background: var(--card);
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-md);
}
.picker-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 8px;
  width: 100%;
  padding: 8px 10px;
  border: none;
  border-radius: var(--radius-sm);
  background: transparent;
  color: var(--text);
  font-size: 13px;
  cursor: pointer;
  text-align: left;
}
.picker-item:hover {
  background: var(--accent-soft);
}
.picker-item small {
  color: var(--text-muted);
}
.state {
  min-height: 220px;
  display: flex;
  flex-direction: column;
  gap: 10px;
  align-items: center;
  justify-content: center;
  color: var(--text-muted);
  background: var(--card);
  border: 1px dashed var(--border-strong);
  border-radius: var(--radius-lg);
  margin-top: 18px;
}
.state--error {
  color: var(--status-cancelled-text);
  border-color: var(--status-cancelled-text);
}
.retry-btn {
  padding: 8px 16px;
  border: 1px solid var(--border-strong);
  border-radius: var(--radius-sm);
  background: var(--card);
  color: var(--text);
  cursor: pointer;
}
</style>
