<template>
  <div class="table-empty">
    <div class="table-empty__title">{{ title }}</div>
    <div class="table-empty__description">{{ description }}</div>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  title?: string
  description: string
}>()
</script>

<style scoped lang="scss">
.table-empty {
  padding: 32px 16px;
  text-align: center;
}

.table-empty__title {
  font-size: 16px;
  font-weight: 700;
}

.table-empty__description {
  margin-top: 8px;
  color: var(--dm-color-text-secondary);
  font-size: 14px;
}
</style>
