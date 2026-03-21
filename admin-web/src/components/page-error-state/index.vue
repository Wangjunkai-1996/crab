<template>
  <div class="page-error-state surface-panel">
    <div class="page-error-state__title">{{ title }}</div>
    <div class="page-error-state__description">{{ description }}</div>
    <el-button type="primary" @click="$emit('retry')">{{ buttonText }}</el-button>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  title?: string
  description: string
  buttonText?: string
}>()

defineEmits<{
  retry: []
}>()
</script>

<style scoped lang="scss">
.page-error-state {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 12px;
  padding: 24px;
}

.page-error-state__title {
  font-size: 18px;
  font-weight: 700;
}

.page-error-state__description {
  color: var(--dm-color-text-secondary);
  font-size: 14px;
  line-height: 22px;
}
</style>
