<template>
  <div class="page-container">
    <el-card shadow="never">
      <div class="forbidden-page">
        <div>
          <h1 class="page-title">无权限访问</h1>
          <div class="page-subtitle">当前账号已登录，但不具备访问该模块所需角色。</div>
        </div>
        <el-space>
          <el-button type="primary" @click="router.push({ name: ROUTE_NAMES.DASHBOARD })">返回工作台</el-button>
          <el-button @click="router.push({ name: ROUTE_NAMES.LOGIN })">切换账号</el-button>
        </el-space>
        <el-alert type="info" :closable="false" title="如需开通对应后台角色，请联系超级管理员。" />
      </div>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { useRouter } from 'vue-router'
import { ROUTE_NAMES } from '@/constants/routes'

const router = useRouter()
</script>

<style scoped lang="scss">
.forbidden-page {
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding: 16px;
}
</style>
