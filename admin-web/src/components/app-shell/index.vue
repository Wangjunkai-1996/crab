<template>
  <div class="app-shell">
    <aside class="app-shell__sidebar">
      <slot name="sidebar" />
    </aside>
    <div class="app-shell__body">
      <header class="app-shell__topbar">
        <slot name="topbar" />
      </header>
      <main class="app-shell__content">
        <slot />
      </main>
    </div>
  </div>
</template>

<style scoped lang="scss">
.app-shell {
  display: grid;
  grid-template-columns: var(--dm-layout-sidebar-width) minmax(0, 1fr);
  min-height: 100vh;
}

.app-shell__sidebar {
  border-right: 1px solid var(--dm-color-border);
  background: var(--dm-color-surface);
}

.app-shell__body {
  display: flex;
  min-width: 0;
  flex-direction: column;
}

.app-shell__topbar {
  height: var(--dm-layout-topbar-height);
  border-bottom: 1px solid var(--dm-color-border);
  background: var(--dm-color-surface);
}

.app-shell__content {
  min-width: 0;
  flex: 1;
  padding: 20px;
  overflow: auto;
}
</style>
