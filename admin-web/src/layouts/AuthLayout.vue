<template>
  <div class="auth-layout">
    <div class="auth-layout__panel surface-panel">
      <router-view />
    </div>
  </div>
</template>

<style scoped lang="scss">
.auth-layout {
  display: flex;
  min-height: 100vh;
  align-items: center;
  justify-content: center;
  padding: 32px;
  background: var(--dm-color-background);
}

.auth-layout__panel {
  width: 100%;
  max-width: 460px;
  padding: 32px;
}
</style>
