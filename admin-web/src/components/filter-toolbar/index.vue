<template>
  <div class="filter-toolbar surface-panel">
    <div class="filter-toolbar__content">
      <slot />
    </div>
    <div class="filter-toolbar__actions">
      <slot name="actions" />
    </div>
  </div>
</template>

<style scoped lang="scss">
.filter-toolbar {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-end;
  justify-content: space-between;
  gap: 16px;
  padding: 16px;
}

.filter-toolbar__content {
  display: flex;
  flex: 1;
  flex-wrap: wrap;
  gap: 12px 16px;
}

.filter-toolbar__actions {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-left: auto;
}
</style>
