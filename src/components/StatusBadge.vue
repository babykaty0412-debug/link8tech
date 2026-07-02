<script setup lang="ts">
import { computed } from 'vue'
import type { OrderStatus } from '../types/order'
import { STATUS_LABELS } from '../constants/labels'

const props = defineProps<{ status: OrderStatus }>()

const label = computed(() => STATUS_LABELS[props.status])
</script>

<template>
  <span class="badge" :class="`badge--${status}`">{{ label }}</span>
</template>

<style scoped>
.badge {
  display: inline-flex;
  align-items: center;
  padding: 3px 10px;
  border-radius: 999px;
  font-size: 13px;
  font-weight: 600;
  line-height: 1.5;
  white-space: nowrap;
}
.badge--pending {
  background: var(--status-pending-bg);
  color: var(--status-pending-text);
}
.badge--paid {
  background: var(--status-paid-bg);
  color: var(--status-paid-text);
}
.badge--cancelled {
  background: var(--status-cancelled-bg);
  color: var(--status-cancelled-text);
}
</style>
