<template>
  <div class="login-page">
    <div class="login-page__header">
      <h1 class="login-page__title">多米通告 V1 运营后台</h1>
      <p class="login-page__subtitle">按后台前端开发文档 V1 落地的登录骨架；已预留真实 `admin-auth` 接入通道。</p>
    </div>

    <el-alert type="info" :closable="false" class="login-page__alert">
      <template #title>
        演示账号：`reviewer` / `opsadmin` / `superadmin`，统一密码：`Admin12345678`
      </template>
    </el-alert>

    <el-form ref="formRef" :model="form" label-position="top" @keyup.enter="handleSubmit">
      <el-form-item
        label="用户名"
        prop="username"
        :error="fieldErrors.username"
        :rules="[{ required: true, message: '请输入用户名', trigger: 'blur' }]"
      >
        <el-input v-model="form.username" placeholder="请输入后台用户名" />
      </el-form-item>
      <el-form-item
        label="密码"
        prop="password"
        :error="fieldErrors.password"
        :rules="[{ required: true, message: '请输入密码', trigger: 'blur' }]"
      >
        <el-input v-model="form.password" type="password" show-password placeholder="请输入后台密码" />
      </el-form-item>
      <el-alert v-if="errorMessage" type="error" :closable="false" :title="errorMessage" class="login-page__error" />
      <el-button type="primary" class="login-page__submit" :loading="submitting" @click="handleSubmit">登录后台</el-button>
    </el-form>
  </div>
</template>

<script setup lang="ts">
import { reactive, ref } from 'vue'
import type { FormInstance } from 'element-plus'
import { ElMessage } from 'element-plus'
import { useRoute, useRouter } from 'vue-router'

import { ROUTE_NAMES } from '@/constants/routes'
import { useAuthStore } from '@/stores/auth.store'
import { getFieldErrorsFromError } from '@/utils/request'

const authStore = useAuthStore()
const route = useRoute()
const router = useRouter()

const formRef = ref<FormInstance>()
const submitting = ref(false)
const errorMessage = ref('')
const fieldErrors = reactive<Record<string, string>>({
  username: '',
  password: '',
})
const form = reactive({
  username: 'reviewer',
  password: 'Admin12345678',
})

const resetFieldErrors = () => {
  fieldErrors.username = ''
  fieldErrors.password = ''
}

const handleSubmit = async () => {
  await formRef.value?.validate()
  submitting.value = true
  errorMessage.value = ''
  resetFieldErrors()

  try {
    await authStore.login({ ...form })
    ElMessage.success('登录成功')
    const redirect = typeof route.query.redirect === 'string' ? route.query.redirect : ''
    if (redirect) {
      router.replace(redirect)
      return
    }
    router.replace({ name: ROUTE_NAMES.DASHBOARD })
  } catch (error) {
    Object.assign(fieldErrors, {
      username: '',
      password: '',
      ...getFieldErrorsFromError(error),
    })
    errorMessage.value = error instanceof Error ? error.message : '登录失败'
  } finally {
    submitting.value = false
  }
}
</script>

<style scoped lang="scss">
.login-page {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.login-page__header {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.login-page__title {
  margin: 0;
  font-size: 24px;
  line-height: 32px;
}

.login-page__subtitle {
  margin: 0;
  color: var(--dm-color-text-secondary);
  font-size: 14px;
  line-height: 22px;
}

.login-page__alert,
.login-page__error {
  margin-bottom: 4px;
}

.login-page__submit {
  width: 100%;
  margin-top: 8px;
}
</style>
