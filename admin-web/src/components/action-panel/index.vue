<template>
  <el-card shadow="never" class="action-panel">
    <template #header>
      <div class="action-panel__title">{{ title }}</div>
    </template>

    <p v-if="description" class="action-panel__description">{{ description }}</p>
    <el-alert v-if="readonly && readonlyReason" :title="readonlyReason" type="info" :closable="false" />

    <div v-if="actions.length" class="action-panel__actions">
      <el-button
        v-for="action in actions"
        :key="action.key"
        :type="resolveButtonType(action.variant)"
        :loading="loading"
        :disabled="readonly || action.disabled"
        @click="$emit('action', action)"
      >
        {{ action.label }}
      </el-button>
      <div v-if="readonly && readonlyReason" class="action-panel__hint">{{ readonlyReason }}</div>
    </div>
    <div v-else class="action-panel__empty">当前状态暂无可执行动作。</div>

    <slot />
  </el-card>
</template>

<script setup lang="ts">
import type { ActionOption } from '@/models/common'

defineProps<{
  title: string
  description?: string
  actions: ActionOption[]
  loading?: boolean
  readonly?: boolean
  readonlyReason?: string
}>()

defineEmits<{
  action: [action: ActionOption]
}>()

const resolveButtonType = (variant: ActionOption['variant']) => {
  return variant === 'danger' ? 'danger' : variant === 'primary' ? 'primary' : 'default'
}
</script>

<style scoped lang="scss">
.action-panel__title {
  font-size: 16px;
  font-weight: 700;
}

.action-panel__description {
  margin: 0 0 16px;
  color: var(--dm-color-text-secondary);
  font-size: 13px;
  line-height: 20px;
}

.action-panel__actions {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.action-panel__actions .el-button {
  margin-left: 0;
}

.action-panel__empty,
.action-panel__hint {
  color: var(--dm-color-text-secondary);
  font-size: 13px;
  line-height: 20px;
}
</style>
