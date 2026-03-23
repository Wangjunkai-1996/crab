<template>
  <div class="side-nav">
    <div class="side-nav__brand">
      <div class="side-nav__title">多米通告 V1</div>
      <div class="side-nav__subtitle">运营后台</div>
    </div>
    <el-menu :default-active="String(activeRouteName)" class="side-nav__menu" @select="handleSelect">
      <el-menu-item
        v-for="item in items"
        :key="item.routeName"
        :index="item.routeName"
        :disabled="disabled || item.disabled"
      >
        <span>{{ item.label }}</span>
      </el-menu-item>
    </el-menu>
    <div class="side-nav__footer">V1 骨架 · 按文档基线实现</div>
  </div>
</template>

<script setup lang="ts">
interface NavItem {
  label: string
  routeName: string
  disabled?: boolean
}

const props = defineProps<{
  items: NavItem[]
  activeRouteName?: string
  disabled?: boolean
}>()

const emit = defineEmits<{
  navigate: [routeName: string]
}>()

const handleSelect = (routeName: string) => {
  emit('navigate', routeName)
}
</script>

<style scoped lang="scss">
.side-nav {
  display: flex;
  height: 100%;
  flex-direction: column;
}

.side-nav__brand {
  padding: 24px 20px 16px;
}

.side-nav__title {
  font-size: 20px;
  font-weight: 700;
  line-height: 28px;
}

.side-nav__subtitle {
  margin-top: 4px;
  color: var(--dm-color-text-secondary);
  font-size: 12px;
}

.side-nav__menu {
  flex: 1;
  border-right: none;
  padding: 0 12px;
}

.side-nav__menu :deep(.el-menu-item) {
  margin-bottom: 8px;
  border-radius: 12px;
}

.side-nav__footer {
  padding: 16px 20px 24px;
  color: var(--dm-color-text-secondary);
  font-size: 12px;
}
</style>
