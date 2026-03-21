<template>
  <el-card shadow="never" class="detail-section-card">
    <template #header>
      <div class="detail-section-card__header">
        <div>
          <div class="detail-section-card__title">{{ title }}</div>
          <div v-if="description" class="detail-section-card__description">{{ description }}</div>
        </div>
        <slot name="extra" />
      </div>
    </template>
    <slot />
  </el-card>
</template>

<script setup lang="ts">
defineProps<{
  title: string
  description?: string
}>()
</script>

<style scoped lang="scss">
.detail-section-card {
  border-radius: var(--dm-radius-lg);
}

.detail-section-card__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.detail-section-card__title {
  font-size: 16px;
  font-weight: 700;
}

.detail-section-card__description {
  margin-top: 4px;
  color: var(--dm-color-text-secondary);
  font-size: 13px;
}
</style>
