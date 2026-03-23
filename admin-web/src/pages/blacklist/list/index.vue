<template>
  <div class="page-container">
    <div class="page-header">
      <div>
        <h1 class="page-title">黑名单与处罚列表</h1>
        <div class="page-subtitle">统一查看处罚记录、限制状态与当前生效区间。</div>
      </div>
      <el-button type="primary" :disabled="createButtonDisabled" @click="openCreateDialog">新增处罚</el-button>
    </div>

    <el-alert
      v-if="realWriteReadonly"
      type="info"
      :closable="false"
      :title="REAL_ADMIN_WRITE_READONLY_REASON"
    />
    <el-alert
      v-else-if="mustResetPassword"
      type="warning"
      :closable="false"
      title="首次改密未完成前，新增处罚和解除处罚动作保持禁用。"
    />
    <el-alert
      v-else-if="!canCreateAccountAction || !canReleaseAccountAction"
      type="info"
      :closable="false"
      title="当前账号按 permissionSummary 限制，部分处罚动作处于只读态。"
    />

    <filter-toolbar>
      <el-input v-model="filters.userId" placeholder="目标用户 ID" style="width: 180px" clearable />
      <el-select v-model="filters.restrictionType" placeholder="限制类型" style="width: 160px">
        <el-option v-for="item in dictionaryStore.restrictionTypeOptions" :key="String(item.value)" :label="item.label" :value="item.value" />
      </el-select>
      <el-select v-model="filters.status" placeholder="记录状态" style="width: 160px">
        <el-option v-for="item in dictionaryStore.actionStatusOptions" :key="String(item.value)" :label="item.label" :value="item.value" />
      </el-select>
      <el-select v-model="filters.pageSize" placeholder="页大小" style="width: 140px">
        <el-option v-for="item in dictionaryStore.pageSizeOptions" :key="String(item.value)" :label="item.label" :value="item.value" />
      </el-select>
      <template #actions>
        <el-button @click="handleReset">重置</el-button>
        <el-button type="primary" @click="handleSearch">查询</el-button>
      </template>
    </filter-toolbar>

    <page-skeleton v-if="loading" />
    <page-error-state v-else-if="error" description="处罚列表加载失败，请重试。" @retry="loadList" />
    <el-card v-else shadow="never">
      <table-empty v-if="rows.length === 0" description="当前没有符合条件的处罚记录。" />
      <template v-else>
        <el-table :data="rows" stripe>
          <el-table-column prop="restrictionId" label="处罚记录 ID" min-width="180" />
          <el-table-column label="目标用户" min-width="200">
            <template #default="scope">
              <div>{{ scope.row.user.displayName || scope.row.user.userId }}</div>
              <div class="muted-text">{{ scope.row.user.userId }}</div>
            </template>
          </el-table-column>
          <el-table-column label="限制类型" min-width="150">
            <template #default="scope">
              {{ formatRestrictionTypeLabel(scope.row.restrictionType) }}
            </template>
          </el-table-column>
          <el-table-column label="原因分类" width="140">
            <template #default="scope">
              {{ formatAccountActionReasonCategoryLabel(scope.row.reasonCategory) }}
            </template>
          </el-table-column>
          <el-table-column label="账号状态" width="140">
            <template #default="scope">
              {{ formatAccountStatusLabel(scope.row.user.accountStatus) }}
            </template>
          </el-table-column>
          <el-table-column label="记录状态" width="120">
            <template #default="scope">
              <status-tag :status="scope.row.status" :label="formatRestrictionStatusLabel(scope.row.status)" />
            </template>
          </el-table-column>
          <el-table-column label="生效时间" width="180">
            <template #default="scope">
              {{ formatDateTime(scope.row.startAt) }}
            </template>
          </el-table-column>
          <el-table-column label="到期时间" width="180">
            <template #default="scope">
              {{ formatDateTime(scope.row.endAt) }}
            </template>
          </el-table-column>
          <el-table-column label="操作人" width="180">
            <template #default="scope">
              <div>{{ formatHistoryOperatorLabel('admin', scope.row.operator.displayName, scope.row.operator.operatorId) }}</div>
              <div v-if="scope.row.operator.operatorId" class="muted-text">{{ scope.row.operator.operatorId }}</div>
            </template>
          </el-table-column>
          <el-table-column label="操作" width="140" fixed="right">
            <template #default="scope">
              <el-button link type="danger" :disabled="releaseDisabled(scope.row)" @click="openReleaseDialog(scope.row.restrictionId)">
                提前解除
              </el-button>
            </template>
          </el-table-column>
        </el-table>

        <div class="toolbar-actions" style="margin-top: 16px">
          <span class="muted-text">按顺序继续加载更早的处罚记录。</span>
          <el-button :disabled="pagerState.currentVirtualPage === 1" @click="handlePrevPage">上一页</el-button>
          <el-button type="primary" :disabled="!hasMore" @click="handleNextPage">下一页</el-button>
        </div>
      </template>
    </el-card>

    <el-dialog v-model="createDialogVisible" title="新增处罚" width="560px" :close-on-click-modal="false">
      <el-form ref="createFormRef" :model="createForm" label-position="top">
        <el-form-item label="目标用户 ID" prop="userId" :rules="[{ required: true, message: '请输入目标用户 ID', trigger: 'blur' }]">
          <el-input v-model="createForm.userId" />
        </el-form-item>
        <el-form-item label="限制类型" prop="restrictionType" :rules="[{ required: true, message: '请选择限制类型', trigger: 'change' }]">
          <el-select v-model="createForm.restrictionType">
            <el-option
              v-for="item in createRestrictionOptions"
              :key="String(item.value)"
              :label="item.label"
              :value="item.value"
              :disabled="item.disabled"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="原因分类" prop="reasonCategory" :rules="[{ required: true, message: '请选择原因分类', trigger: 'change' }]">
          <el-select v-model="createForm.reasonCategory">
            <el-option v-for="item in dictionaryStore.reportReasonOptions.slice(1)" :key="String(item.value)" :label="item.label" :value="item.value" />
          </el-select>
        </el-form-item>
        <el-form-item label="备注">
          <el-input v-model="createForm.reasonText" type="textarea" :rows="4" />
        </el-form-item>
        <el-form-item label="到期时间">
          <el-date-picker v-model="createForm.endAt" type="datetime" value-format="YYYY-MM-DDTHH:mm:ss[Z]" />
        </el-form-item>
        <el-form-item label="同步下架在架通告">
          <el-switch v-model="createForm.forceRemoveActiveNotices" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="createDialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="submitting" :disabled="!canCreateSelectedRestriction" @click="submitCreate">确认新增</el-button>
      </template>
    </el-dialog>

    <el-dialog v-model="releaseDialogVisible" title="提前解除处罚" width="520px" :close-on-click-modal="false">
      <el-form ref="releaseFormRef" :model="releaseForm" label-position="top">
        <el-form-item label="解除说明" prop="reasonText" :rules="[{ required: true, message: '请输入解除说明', trigger: 'blur' }]">
          <el-input v-model="releaseForm.reasonText" type="textarea" :rows="4" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="releaseDialogVisible = false">取消</el-button>
        <el-button type="danger" :loading="submitting" :disabled="!canReleaseAccountAction" @click="submitRelease">确认解除</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import type { FormInstance } from 'element-plus'
import { ElMessage } from 'element-plus'

import FilterToolbar from '@/components/filter-toolbar/index.vue'
import PageErrorState from '@/components/page-error-state/index.vue'
import PageSkeleton from '@/components/page-skeleton/index.vue'
import StatusTag from '@/components/status-tag/index.vue'
import TableEmpty from '@/components/table-empty/index.vue'
import { createCursorPagerState, moveToNextCursor, moveToPreviousCursor, resetCursorPager } from '@/composables/useCursorPager'
import { usePageLoadState } from '@/composables/usePageLoadState'
import { usePermission } from '@/composables/usePermission'
import { TEMP_ACCOUNT_ACTION_RESTRICTION_TYPES, TEMP_RESTRICTION_TYPE_ACTION_ACCESS_MAP } from '@/constants/admin-action-payloads'
import { ADMIN_ACTION_ACCESS_KEYS } from '@/constants/admin-contract'
import { DEFAULT_PAGE_SIZE, ENABLE_REAL_ADMIN_READS, ENABLE_REAL_ADMIN_WRITES, REAL_ADMIN_WRITE_READONLY_REASON } from '@/constants/ui'
import type { AccountActionListItem } from '@/models/governance'
import { governanceService } from '@/services/governance.service'
import { useDictionaryStore } from '@/stores/dictionary.store'
import {
  formatAccountActionReasonCategoryLabel,
  formatAccountStatusLabel,
  formatHistoryOperatorLabel,
  formatRestrictionStatusLabel,
  formatRestrictionTypeLabel,
} from '@/utils/admin-labels'
import { formatDateTime } from '@/utils/formatter'

const dictionaryStore = useDictionaryStore()
const { mustResetPassword, canAccessAction } = usePermission()

const rows = ref<AccountActionListItem[]>([])
const nextCursor = ref('')
const pagerState = reactive(createCursorPagerState())
const hasMore = ref(false)
const { loading, error, runPageLoad } = usePageLoadState()
const submitting = ref(false)
const selectedRestrictionId = ref('')

const createDialogVisible = ref(false)
const releaseDialogVisible = ref(false)
const createFormRef = ref<FormInstance>()
const releaseFormRef = ref<FormInstance>()
const realWriteReadonly = computed(() => ENABLE_REAL_ADMIN_READS && !ENABLE_REAL_ADMIN_WRITES)

const filters = reactive({
  userId: '',
  restrictionType: '',
  status: '',
  pageSize: DEFAULT_PAGE_SIZE,
})

const createForm = reactive({
  userId: '',
  restrictionType: TEMP_ACCOUNT_ACTION_RESTRICTION_TYPES.WATCHLIST,
  reasonCategory: 'fraud',
  reasonText: '',
  endAt: '',
  forceRemoveActiveNotices: true,
})

const releaseForm = reactive({
  reasonText: '',
})

const canCreateAccountAction = computed(() => canAccessAction(ADMIN_ACTION_ACCESS_KEYS.CREATE_ACCOUNT_ACTION))
const canReleaseAccountAction = computed(() => canAccessAction(ADMIN_ACTION_ACCESS_KEYS.RELEASE_ACCOUNT_ACTION))
const createButtonDisabled = computed(() => realWriteReadonly.value || mustResetPassword.value || !canCreateAccountAction.value)
const selectedRestrictionActionAccess = computed(() => {
  return TEMP_RESTRICTION_TYPE_ACTION_ACCESS_MAP[createForm.restrictionType as keyof typeof TEMP_RESTRICTION_TYPE_ACTION_ACCESS_MAP]
})
const canCreateSelectedRestriction = computed(() => {
  if (realWriteReadonly.value || !canCreateAccountAction.value || !selectedRestrictionActionAccess.value) {
    return false
  }
  return canAccessAction(selectedRestrictionActionAccess.value)
})
const createRestrictionOptions = computed(() => {
  return dictionaryStore.restrictionTypeOptions.map((item) => {
    const accessKey = TEMP_RESTRICTION_TYPE_ACTION_ACCESS_MAP[item.value as keyof typeof TEMP_RESTRICTION_TYPE_ACTION_ACCESS_MAP]
    return {
      ...item,
      disabled: accessKey ? !canAccessAction(accessKey) : true,
    }
  })
})

const releaseDisabled = (row: AccountActionListItem) => {
  return realWriteReadonly.value || mustResetPassword.value || row.status !== 'active' || !canReleaseAccountAction.value
}

const loadList = async () => {
  try {
    await runPageLoad(async () => {
      const result = await governanceService.accountActionList({
        ...filters,
        cursor: pagerState.currentCursor || undefined,
      })
      rows.value = result.list
      nextCursor.value = result.nextCursor
      hasMore.value = result.hasMore
    })
  } catch {}
}

const resetPager = () => {
  resetCursorPager(pagerState)
}

const handleSearch = async () => {
  resetPager()
  await loadList()
}

const handleReset = async () => {
  filters.userId = ''
  filters.restrictionType = ''
  filters.status = ''
  filters.pageSize = DEFAULT_PAGE_SIZE
  resetPager()
  await loadList()
}

const handleNextPage = async () => {
  moveToNextCursor(pagerState, nextCursor.value)
  await loadList()
}

const handlePrevPage = async () => {
  moveToPreviousCursor(pagerState)
  await loadList()
}

const openCreateDialog = () => {
  if (realWriteReadonly.value) {
    ElMessage.warning(REAL_ADMIN_WRITE_READONLY_REASON)
    return
  }
  if (mustResetPassword.value) {
    ElMessage.warning('请先完成首次改密')
    return
  }
  if (!canCreateAccountAction.value) {
    ElMessage.warning('当前账号暂无新增处罚权限')
    return
  }
  createDialogVisible.value = true
}

const openReleaseDialog = (restrictionId: string) => {
  if (realWriteReadonly.value) {
    ElMessage.warning(REAL_ADMIN_WRITE_READONLY_REASON)
    return
  }
  if (mustResetPassword.value) {
    ElMessage.warning('请先完成首次改密')
    return
  }
  if (!canReleaseAccountAction.value) {
    ElMessage.warning('当前账号暂无解除处罚权限')
    return
  }
  selectedRestrictionId.value = restrictionId
  releaseForm.reasonText = ''
  releaseDialogVisible.value = true
}

const submitCreate = async () => {
  if (!canCreateSelectedRestriction.value) {
    ElMessage.warning('当前账号暂无该处罚类型的创建权限')
    return
  }
  await createFormRef.value?.validate()
  submitting.value = true
  try {
    await governanceService.createAccountAction({ ...createForm })
    ElMessage.success('处罚新增成功')
    createDialogVisible.value = false
    await loadList()
  } catch (submitError) {
    ElMessage.error(submitError instanceof Error ? submitError.message : '提交失败')
  } finally {
    submitting.value = false
  }
}

const submitRelease = async () => {
  if (!canReleaseAccountAction.value) {
    ElMessage.warning('当前账号暂无解除处罚权限')
    return
  }
  await releaseFormRef.value?.validate()
  submitting.value = true
  try {
    await governanceService.releaseAccountAction({
      restrictionId: selectedRestrictionId.value,
      reasonText: releaseForm.reasonText,
    })
    ElMessage.success('处罚解除成功')
    releaseDialogVisible.value = false
    await loadList()
  } catch (submitError) {
    ElMessage.error(submitError instanceof Error ? submitError.message : '提交失败')
  } finally {
    submitting.value = false
  }
}

onMounted(() => {
  void loadList()
})
</script>
