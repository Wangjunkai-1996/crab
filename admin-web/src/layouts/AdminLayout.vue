<template>
  <app-shell>
    <template #sidebar>
      <side-nav
        :items="navItems"
        :active-route-name="String(route.name || '')"
        :disabled="authStore.mustResetPassword"
        @navigate="handleNavigate"
      />
    </template>

    <template #topbar>
      <top-bar
        :display-name="authStore.adminUser?.displayName"
        :role-labels="roleLabels"
        :must-reset-password="authStore.mustResetPassword"
        @change-password="openPasswordDialog"
        @logout="handleLogout"
      />
    </template>

    <router-view />
  </app-shell>

  <el-dialog
    v-model="passwordDialogVisible"
    title="修改后台密码"
    width="520px"
    :close-on-click-modal="false"
    :close-on-press-escape="!authStore.mustResetPassword"
    :show-close="!authStore.mustResetPassword"
  >
    <el-alert
      v-if="authStore.mustResetPassword"
      type="warning"
      :closable="false"
      title="首次登录必须先完成改密，完成前导航与高风险动作保持禁用。"
    />
    <el-alert
      v-if="dialogErrorMessage"
      type="error"
      :closable="false"
      :title="dialogErrorMessage"
      style="margin-top: 12px"
    />
    <el-form ref="passwordFormRef" :model="passwordForm" label-position="top" style="margin-top: 16px">
      <el-form-item
        label="旧密码"
        prop="oldPassword"
        :error="fieldErrors.oldPassword"
        :rules="[{ required: true, message: '请输入旧密码', trigger: 'blur' }]"
      >
        <el-input v-model="passwordForm.oldPassword" type="password" show-password />
      </el-form-item>
      <el-form-item
        label="新密码"
        prop="newPassword"
        :error="fieldErrors.newPassword"
        :rules="[
          { required: true, message: '请输入新密码', trigger: 'blur' },
          { min: 12, message: '新密码至少 12 位', trigger: 'blur' },
        ]"
      >
        <el-input v-model="passwordForm.newPassword" type="password" show-password />
      </el-form-item>
    </el-form>
    <template #footer>
      <el-button v-if="!authStore.mustResetPassword" @click="passwordDialogVisible = false">取消</el-button>
      <el-button type="primary" :loading="submitting" @click="submitPasswordChange">确认修改</el-button>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import type { FormInstance } from 'element-plus'
import { ElMessage } from 'element-plus'
import { useRoute, useRouter } from 'vue-router'

import AppShell from '@/components/app-shell/index.vue'
import SideNav from '@/components/side-nav/index.vue'
import TopBar from '@/components/top-bar/index.vue'
import { ROLE_LABEL_MAP } from '@/constants/roles'
import { NAV_ITEMS, ROUTE_NAMES } from '@/constants/routes'
import { usePermission } from '@/composables/usePermission'
import { useAuthStore } from '@/stores/auth.store'
import { getFieldErrorsFromError } from '@/utils/request'

const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()
const { canAccessPage } = usePermission()

const passwordDialogVisible = ref(false)
const passwordFormRef = ref<FormInstance>()
const submitting = ref(false)
const dialogErrorMessage = ref('')
const passwordForm = reactive({
  oldPassword: '',
  newPassword: '',
})
const fieldErrors = reactive<Record<string, string>>({
  oldPassword: '',
  newPassword: '',
})

const navItems = computed(() => {
  return NAV_ITEMS.map((item) => ({
    label: item.label,
    routeName: item.routeName,
    disabled: !canAccessPage(item.pageKey, item.allowedRoles),
  }))
})

const roleLabels = computed(() => authStore.roleCodes.map((role) => ROLE_LABEL_MAP[role]))

const resetPasswordFormState = () => {
  dialogErrorMessage.value = ''
  fieldErrors.oldPassword = ''
  fieldErrors.newPassword = ''
}

watch(
  () => authStore.mustResetPassword,
  (value) => {
    if (value) {
      resetPasswordFormState()
      passwordDialogVisible.value = true
    }
  },
  { immediate: true },
)

const openPasswordDialog = () => {
  resetPasswordFormState()
  passwordDialogVisible.value = true
}

const handleNavigate = (routeName: string) => {
  if (authStore.mustResetPassword) {
    ElMessage.warning('请先完成首次改密')
    passwordDialogVisible.value = true
    return
  }
  router.push({ name: routeName })
}

const handleLogout = async () => {
  await authStore.logout()
  ElMessage.success('已退出登录')
  router.replace({ name: ROUTE_NAMES.LOGIN })
}

const submitPasswordChange = async () => {
  resetPasswordFormState()

  try {
    await passwordFormRef.value?.validate()
    submitting.value = true
    await authStore.changePassword({ ...passwordForm })
    authStore.markPasswordResetCompleted()

    ElMessage.success('密码修改成功')
    passwordDialogVisible.value = false
    passwordForm.oldPassword = ''
    passwordForm.newPassword = ''

    try {
      await authStore.fetchMe()
    } catch (refreshError) {
      ElMessage.warning(
        refreshError instanceof Error
          ? `密码已修改成功，资料刷新失败：${refreshError.message}`
          : '密码已修改成功，资料刷新失败，请重新登录后重试',
      )
    }
  } catch (error) {
    const nextFieldErrors = getFieldErrorsFromError(error)
    Object.assign(fieldErrors, {
      oldPassword: '',
      newPassword: '',
      ...nextFieldErrors,
    })

    const hasFieldErrors = Object.keys(nextFieldErrors).length > 0
    dialogErrorMessage.value = hasFieldErrors
      ? '请根据表单提示修正后重试'
      : error instanceof Error
        ? error.message
        : '密码修改失败'
  } finally {
    submitting.value = false
  }
}
</script>
