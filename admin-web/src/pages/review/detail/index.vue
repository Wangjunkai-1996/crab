<template>
  <div class="page-container">
    <div class="page-header">
      <div>
        <h1 class="page-title">审核详情</h1>
        <div class="page-subtitle">左侧查看资料信息，右侧查看当前可执行动作。</div>
      </div>
      <el-button @click="goBack">返回列表</el-button>
    </div>

    <page-skeleton v-if="loading" />
    <page-error-state v-else-if="error" description="审核详情加载失败，请重试。" @retry="loadDetail" />
    <template v-else-if="detail">
      <div class="two-column-detail">
        <div class="page-container">
          <detail-section-card title="通告基础信息" description="展示通告标题、城市、平台、预算与当前状态。">
            <el-descriptions :column="2" border>
              <el-descriptions-item label="通告标题">{{ detail.notice.title }}</el-descriptions-item>
              <el-descriptions-item label="品牌名">{{ formatText(detail.notice.brandName) }}</el-descriptions-item>
              <el-descriptions-item label="城市">{{ detail.notice.city }}</el-descriptions-item>
              <el-descriptions-item label="平台">{{ formatCooperationPlatformLabel(detail.notice.cooperationPlatform) }}</el-descriptions-item>
              <el-descriptions-item label="结算方式">{{ formatSettlementTypeLabel(detail.notice.settlementType) }}</el-descriptions-item>
              <el-descriptions-item label="预算摘要">{{ formatText(detail.notice.budgetSummary) }}</el-descriptions-item>
              <el-descriptions-item label="任务创建时间">{{ formatDateTime(detail.task.createdAt) }}</el-descriptions-item>
              <el-descriptions-item label="通告状态">{{ formatGenericStatusLabel(detail.notice.status) }}</el-descriptions-item>
            </el-descriptions>
            <p style="margin: 16px 0 0">{{ formatText(detail.notice.cooperationDescription) }}</p>
          </detail-section-card>

          <detail-section-card title="发布方信息" description="展示发布方基础资料、城市与联系方式。">
            <el-descriptions :column="2" border>
              <el-descriptions-item label="发布方名称">{{ detail.publisherProfile.displayName }}</el-descriptions-item>
              <el-descriptions-item label="身份类型">{{ formatIdentityTypeLabel(detail.publisherProfile.identityType) }}</el-descriptions-item>
              <el-descriptions-item label="城市">{{ detail.publisherProfile.city }}</el-descriptions-item>
              <el-descriptions-item label="联系方式">{{ formatContactDisplay(detail.publisherProfile.contactType, detail.publisherProfile.contactValue) }}</el-descriptions-item>
              <el-descriptions-item label="资料完整度">{{ detail.publisherProfile.profileCompleteness }}%</el-descriptions-item>
              <el-descriptions-item label="累计发布">{{ detail.publisherProfile.publishCount }}</el-descriptions-item>
            </el-descriptions>
            <p v-if="detail.publisherProfile.intro" style="margin: 16px 0 0">{{ detail.publisherProfile.intro }}</p>
          </detail-section-card>

          <detail-section-card title="历史处理记录" description="按时间回看领取、释放与处理记录。">
            <el-timeline>
              <el-timeline-item
                v-for="item in detail.historyLogs"
                :key="`${item.action}-${item.createdAt}-${item.operatorId}`"
                :timestamp="formatDateTime(item.createdAt)"
              >
                <strong>{{ formatOperationActionLabel(item.action) }}</strong>
                <div class="muted-text">{{ formatReviewHistoryLogSummary(item) }}</div>
              </el-timeline-item>
            </el-timeline>
          </detail-section-card>
        </div>

        <div class="page-container">
          <detail-section-card title="风险提示" description="统一展示风险等级、风险标签和处理建议。">
            <div style="display: flex; gap: 12px; align-items: center; margin-bottom: 12px">
              <status-tag :status="detail.riskSummary.riskLevel || 'low'" :label="formatRiskLevelLabel(detail.riskSummary.riskLevel)" />
              <risk-flag-list :flags="riskFlagLabels" />
            </div>
            <el-alert
              v-for="tag in detail.riskSummary.suggestedTags"
              :key="tag"
              type="warning"
              :title="tag"
              :closable="false"
              style="margin-bottom: 8px"
            />
          </detail-section-card>

          <detail-section-card
            v-if="showHistoryResultCard"
            title="历史处理结果"
            description="已处理只读态优先展示后端返回的结论、原因和完成时间。"
          >
            <el-descriptions :column="1" border>
              <el-descriptions-item label="处理状态">{{ formatReviewTaskStatusLabel(detail.task.taskStatus) }}</el-descriptions-item>
              <el-descriptions-item label="审核结论">{{ formatReviewResultLabel(detail.task.reviewResult) }}</el-descriptions-item>
              <el-descriptions-item label="完成时间">{{ formatDateTime(detail.task.completedAt || '') }}</el-descriptions-item>
              <el-descriptions-item label="原因分类">{{ formatReasonCategoryLabel(detail.task.reasonCategory) }}</el-descriptions-item>
              <el-descriptions-item label="处理备注">{{ formatText(detail.task.reasonText) }}</el-descriptions-item>
              <el-descriptions-item label="目标队列">{{ formatReviewNextQueueLabel(detail.task.nextQueueType) }}</el-descriptions-item>
            </el-descriptions>
          </detail-section-card>

          <action-panel
            title="审核动作区"
            description="仅展示当前账号在本任务上可执行的动作。"
            :actions="panelActions"
            :loading="submitting"
            :readonly="actionReadonly"
            :readonly-reason="actionReadonlyReason"
            @action="handleActionClick"
          >
            <div class="muted-text" style="margin-top: 16px">
              当前任务状态：{{ formatReviewTaskStatusLabel(detail.task.taskStatus) }}
              <span v-if="detail.task.assignedAdminName || detail.task.assignedTo">
                · 领取人：{{ detail.task.assignedAdminName || detail.task.assignedTo }}
              </span>
            </div>
          </action-panel>
        </div>
      </div>
    </template>

    <confirm-action-dialog v-model="dialogVisible" :schema="dialogSchema" :loading="submitting" @confirm="submitAction" />
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { ElMessage } from 'element-plus'
import { useRoute, useRouter } from 'vue-router'

import ActionPanel from '@/components/action-panel/index.vue'
import ConfirmActionDialog from '@/components/confirm-action-dialog/index.vue'
import DetailSectionCard from '@/components/detail-section-card/index.vue'
import PageErrorState from '@/components/page-error-state/index.vue'
import PageSkeleton from '@/components/page-skeleton/index.vue'
import RiskFlagList from '@/components/risk-flag-list/index.vue'
import StatusTag from '@/components/status-tag/index.vue'
import { useDetailActionPanel } from '@/composables/useDetailActionPanel'
import { usePageLoadState } from '@/composables/usePageLoadState'
import { usePermission } from '@/composables/usePermission'
import { TEMP_REVIEW_NEXT_QUEUE_OPTIONS, TEMP_REVIEW_NEXT_QUEUE_PLACEHOLDER } from '@/constants/admin-action-payloads'
import { ADMIN_AVAILABLE_ACTION_KEYS } from '@/constants/admin-contract'
import { ROUTE_NAMES } from '@/constants/routes'
import { ENABLE_REAL_ADMIN_READS, ENABLE_REAL_ADMIN_WRITES, REAL_ADMIN_WRITE_READONLY_REASON } from '@/constants/ui'
import type { ActionDialogSchema, ActionOption } from '@/models/common'
import type { ResolveTaskPayload, ReviewDetailResult } from '@/models/review'
import { reviewService } from '@/services/review.service'
import { useAuthStore } from '@/stores/auth.store'
import { getReviewDetailReadonlyReason } from '@/utils/admin-detail-readonly'
import {
  formatCooperationPlatformLabel,
  formatContactDisplay,
  formatGenericStatusLabel,
  formatIdentityTypeLabel,
  formatOperationActionLabel,
  formatReasonCategoryLabel,
  formatReviewHistoryLogSummary,
  formatReviewNextQueueLabel,
  formatReviewResultLabel,
  formatReviewTaskStatusLabel,
  formatRiskFlagList,
  formatRiskLevelLabel,
  formatSettlementTypeLabel,
  shouldShowReviewResultCard,
} from '@/utils/admin-labels'
import { formatDateTime, formatText } from '@/utils/formatter'

const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()
const { resolveActionState, mustResetPassword } = usePermission()

const { loading, error, runPageLoad } = usePageLoadState()
const submitting = ref(false)
const detail = ref<ReviewDetailResult | null>(null)
const dialogVisible = ref(false)
const activeAction = ref<ActionOption | null>(null)

const REVIEW_ACTION_RESULT_MAP: Partial<Record<string, ResolveTaskPayload['reviewResult']>> = {
  [ADMIN_AVAILABLE_ACTION_KEYS.RESOLVE_TASK_APPROVED]: 'approved',
  [ADMIN_AVAILABLE_ACTION_KEYS.RESOLVE_TASK_REJECTED]: 'rejected',
  [ADMIN_AVAILABLE_ACTION_KEYS.RESOLVE_TASK_SUPPLEMENT_REQUIRED]: 'supplement_required',
  [ADMIN_AVAILABLE_ACTION_KEYS.RESOLVE_TASK_TRANSFER_MANUAL_REVIEW]: 'transfer_manual_review',
  [ADMIN_AVAILABLE_ACTION_KEYS.RESOLVE_TASK_REMOVED]: 'removed',
}

const { panelActions, isReadonly, readonlyReason } = useDetailActionPanel({
  detail,
  getAvailableActions: (currentDetail) => currentDetail.availableActions,
  resolveActionState,
  resolveReadonlyReason: (currentDetail, currentPanelActions) =>
    getReviewDetailReadonlyReason({
      detail: currentDetail,
      panelActions: currentPanelActions,
      mustResetPassword: mustResetPassword.value,
      currentAdminUserId: authStore.adminUser?.adminUserId,
    }),
})

const isRealReadWriteReadonly = computed(() => ENABLE_REAL_ADMIN_READS && !ENABLE_REAL_ADMIN_WRITES)
const actionReadonly = computed(() => isReadonly.value || isRealReadWriteReadonly.value)
const actionReadonlyReason = computed(() => {
  if (isRealReadWriteReadonly.value) {
    return REAL_ADMIN_WRITE_READONLY_REASON
  }

  return readonlyReason.value
})

const dialogSchema = computed<ActionDialogSchema | null>(() => {
  const action = activeAction.value
  if (!action) {
    return null
  }

  const reviewReasonFields = [
    {
      key: 'reasonCategory',
      label: '原因分类',
      type: 'select' as const,
      required: true,
      options: [
        { label: '联系方式异常', value: 'contact_risk' },
        { label: '敏感内容', value: 'sensitive_content' },
        { label: '资料不完整', value: 'incomplete_material' },
        { label: '需人工复核', value: 'manual_review' },
      ],
    },
    {
      key: 'reasonText',
      label: '处理备注',
      type: 'textarea' as const,
      placeholder: '请输入处理说明',
    },
  ]

  if (action.key === ADMIN_AVAILABLE_ACTION_KEYS.CLAIM_TASK) {
    return {
      title: '领取审核任务',
      description: '领取后该任务进入你的处理态，详情页将自动刷新。',
      confirmText: '确认领取',
    }
  }

  if (action.key === ADMIN_AVAILABLE_ACTION_KEYS.RELEASE_TASK) {
    return {
      title: '释放审核任务',
      description: '释放后任务回到待领取状态，其他审核员可接手处理。',
      confirmText: '确认释放',
    }
  }

  if (action.key === ADMIN_AVAILABLE_ACTION_KEYS.RESOLVE_TASK_APPROVED) {
    return {
      title: '确认审核通过',
      description: '通过后将以最新状态刷新详情。',
      confirmText: '确认通过',
      fields: [
        {
          key: 'reasonText',
          label: '处理备注',
          type: 'textarea',
          placeholder: '可选填写处理备注',
        },
        {
          key: 'notifyUser',
          label: '通知用户',
          type: 'switch',
        },
      ],
      initialValues: {
        notifyUser: true,
      },
    }
  }

  if (action.key === ADMIN_AVAILABLE_ACTION_KEYS.RESOLVE_TASK_TRANSFER_MANUAL_REVIEW) {
    return {
      title: '转人工复核',
      description: '转复核需要填写原因分类和目标队列。',
      confirmText: '确认转复核',
      fields: [
        ...reviewReasonFields,
        {
          key: 'nextQueueType',
          label: '目标队列 code',
          type: 'select',
          required: true,
          placeholder: TEMP_REVIEW_NEXT_QUEUE_PLACEHOLDER,
          options: [...TEMP_REVIEW_NEXT_QUEUE_OPTIONS],
        },
      ],
    }
  }

  return {
    title: `确认${action.label}`,
    description: '该动作属于审核处理链路中的关键节点，提交后详情会刷新。',
    confirmText: `确认${action.label}`,
    danger: Boolean(action.danger),
    fields: reviewReasonFields,
  }
})

const riskFlagLabels = computed(() => (detail.value ? formatRiskFlagList(detail.value.riskSummary.riskFlags) : []))
const showHistoryResultCard = computed(() => (detail.value ? shouldShowReviewResultCard(detail.value.task) : false))

const loadDetail = async () => {
  try {
    await runPageLoad(async () => {
      detail.value = await reviewService.taskDetail(String(route.params.reviewTaskId))
    })
  } catch {}
}

const handleActionClick = (action: ActionOption) => {
  activeAction.value = action
  dialogVisible.value = true
}

const submitAction = async (payload: Record<string, unknown>) => {
  const reviewTaskId = String(route.params.reviewTaskId)
  if (!activeAction.value) {
    return
  }

  submitting.value = true
  try {
    if (activeAction.value.key === ADMIN_AVAILABLE_ACTION_KEYS.CLAIM_TASK) {
      await reviewService.claimTask(reviewTaskId)
    } else if (activeAction.value.key === ADMIN_AVAILABLE_ACTION_KEYS.RELEASE_TASK) {
      await reviewService.releaseTask(reviewTaskId)
    } else {
      const reviewResult = REVIEW_ACTION_RESULT_MAP[activeAction.value.key]
      if (!reviewResult) {
        throw new Error('当前动作尚未映射到审核结果')
      }

      const resolvePayload: ResolveTaskPayload = {
        reviewTaskId,
        reviewResult,
        reasonCategory: payload.reasonCategory as string | undefined,
        reasonText: payload.reasonText as string | undefined,
        notifyUser: typeof payload.notifyUser === 'boolean' ? payload.notifyUser : undefined,
        nextQueueType: payload.nextQueueType as ResolveTaskPayload['nextQueueType'],
      }
      await reviewService.resolveTask(resolvePayload)
    }

    ElMessage.success('审核动作已提交')
    dialogVisible.value = false
    activeAction.value = null
    await loadDetail()
  } catch (submitError) {
    ElMessage.error(submitError instanceof Error ? submitError.message : '提交失败')
  } finally {
    submitting.value = false
  }
}

const goBack = () => {
  router.push({ name: ROUTE_NAMES.REVIEW_LIST, query: route.query })
}

watch(
  () => route.params.reviewTaskId,
  () => {
    void loadDetail()
  },
)

onMounted(() => {
  void loadDetail()
})
</script>
