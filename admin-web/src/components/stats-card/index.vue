<template>
  <div class="stats-card surface-panel">
    <div class="stats-card__title">{{ title }}</div>
    <div class="stats-card__value">{{ value }}</div>
    <div class="stats-card__description">{{ description }}</div>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  title: string
  value: string | number
  description: string
}>()
</script>

<style scoped lang="scss">
.stats-card {
  padding: 18px;
}

.stats-card__title {
  color: var(--dm-color-text-secondary);
  font-size: 14px;
}

.stats-card__value {
  margin-top: 8px;
  font-size: 28px;
  font-weight: 700;
  line-height: 36px;
}

.stats-card__description {
  margin-top: 8px;
  color: var(--dm-color-text-secondary);
  font-size: 13px;
}
</style>
