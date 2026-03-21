<template>
  <div class="top-bar">
    <div class="top-bar__left">
      <div>
        <div class="top-bar__welcome">欢迎回来，{{ displayName || '管理员' }}</div>
        <div class="top-bar__hint">当前工作台按后台前端开发文档基线渲染。</div>
      </div>
      <el-alert
        v-if="mustResetPassword"
        class="top-bar__alert"
        type="warning"
        :closable="false"
        title="首次登录需先完成改密，期间导航和处理动作将保持锁定。"
      />
    </div>
    <div class="top-bar__right">
      <el-space wrap>
        <el-tag v-for="role in roleLabels" :key="role" type="info" effect="plain">{{ role }}</el-tag>
      </el-space>
      <el-button link type="primary" @click="$emit('changePassword')">修改密码</el-button>
      <el-button link @click="$emit('logout')">退出登录</el-button>
    </div>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  displayName?: string
  roleLabels: string[]
  mustResetPassword: boolean
}>()

defineEmits<{
  changePassword: []
  logout: []
}>()
</script>

<style scoped lang="scss">
.top-bar {
  display: flex;
  height: 100%;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 0 20px;
}

.top-bar__left {
  display: flex;
  min-width: 0;
  align-items: center;
  gap: 16px;
}

.top-bar__welcome {
  font-size: 16px;
  font-weight: 600;
}

.top-bar__hint {
  color: var(--dm-color-text-secondary);
  font-size: 12px;
}

.top-bar__right {
  display: flex;
  align-items: center;
  gap: 12px;
}

.top-bar__alert {
  min-width: 360px;
}
</style>
