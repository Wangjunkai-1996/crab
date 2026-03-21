<template>
  <div class="page-container">
    <div class="page-header">
      <div>
        <h1 class="page-title">举报详情</h1>
        <div class="page-subtitle">集中查看举报对象、历史记录、风险信息与可执行动作。</div>
      </div>
      <el-button @click="goBack">返回列表</el-button>
    </div>

    <page-skeleton v-if="loading" />
    <page-error-state v-else-if="error" description="举报详情加载失败，请重试。" @retry="loadDetail" />
    <template v-else-if="detail">
      <div class="two-column-detail">
        <div class="page-container">
          <detail-section-card title="举报摘要" description="展示举报对象、原因、处理状态与当前结论。">
            <el-descriptions :column="2" border>
              <el-descriptions-item label="举报 ID">{{ detail.report.reportId }}</el-descriptions-item>
              <el-descriptions-item label="状态">
                <status-tag :status="detail.report.status" :label="formatReportStatusLabel(detail.report.status)" />
              </el-descriptions-item>
              <el-descriptions-item label="对象类型">{{ formatReportTargetTypeLabel(detail.report.targetType) }}</el-descriptions-item>
              <el-descriptions-item label="对象名称">{{ detail.targetSnapshot.displayName }}</el-descriptions-item>
              <el-descriptions-item label="对象 ID">{{ detail.report.targetId }}</el-descriptions-item>
              <el-descriptions-item label="举报原因">{{ formatReportReasonCodeLabel(detail.report.reasonCode) }}</el-descriptions-item>
              <el-descriptions-item label="举报时间">{{ formatDateTime(detail.report.createdAt) }}</el-descriptions-item>
              <el-descriptions-item label="处理动作">{{ formatResultActionLabel(detail.report.resultAction) }}</el-descriptions-item>
            </el-descriptions>
            <p style="margin: 16px 0 0">{{ formatText(detail.report.reasonText) }}</p>
          </detail-section-card>

          <detail-section-card title="被举报对象详情" description="在本页集中查看对象摘要、状态与关联账号信息。">
            <el-descriptions :column="1" border>
              <el-descriptions-item label="对象摘要">{{ formatReportTargetSummary(detail.targetSnapshot) }}</el-descriptions-item>
              <el-descriptions-item label="对象状态">{{ formatGenericStatusLabel(detail.targetSnapshot.status) }}</el-descriptions-item>
              <el-descriptions-item label="关联用户 ID">{{ detail.targetSnapshot.ownerUserId }}</el-descriptions-item>
              <el-descriptions-item label="城市">{{ formatText(detail.targetSnapshot.city) }}</el-descriptions-item>
            </el-descriptions>
          </detail-section-card>

          <detail-section-card title="历史举报记录" description="按时间回看同对象的历史举报线索。">
            <el-timeline>
              <el-timeline-item v-for="item in detail.historyReports" :key="item.reportId" :timestamp="formatDateTime(item.createdAt)">
                <strong>{{ formatReportReasonCodeLabel(item.reasonCode) }}</strong>
                <div class="muted-text">{{ formatReportHistoryRecordSummary(item) }}</div>
              </el-timeline-item>
            </el-timeline>
          </detail-section-card>

          <detail-section-card title="历史处罚记录" description="按时间查看相关处罚动作，完整记录以处罚列表为准。">
            <el-timeline>
              <el-timeline-item
                v-for="item in detail.historyActions"
                :key="`${item.action}-${item.createdAt}-${item.operatorId}`"
                :timestamp="formatDateTime(item.createdAt)"
              >
                <strong>{{ formatOperationActionLabel(item.action) }}</strong>
                <div class="muted-text">{{ formatReportHistoryActionSummary(item) }}</div>
              </el-timeline-item>
            </el-timeline>
          </detail-section-card>
        </div>

        <div class="page-container">
          <detail-section-card title="风险提示" description="统一展示风险等级、风险标签与处理提示。">
            <div style="display: flex; gap: 12px; align-items: center; margin-bottom: 12px">
              <status-tag
                :status="detail.targetSnapshot.riskSummary.riskLevel || 'low'"
                :label="formatRiskLevelLabel(detail.targetSnapshot.riskSummary.riskLevel)"
              />
              <risk-flag-list :flags="riskFlagLabels" />
            </div>
            <el-alert
              v-for="tag in detail.targetSnapshot.riskSummary.suggestedTags"
              :key="tag"
              type="warning"
              :closable="false"
              :title="tag"
              style="margin-bottom: 8px"
            />
          </detail-section-card>

          <detail-section-card
            v-if="showHistoryResultCard"
            title="历史处理结果"
            description="已处理或由他人接手时，展示处理人、处理动作与处理备注。"
          >
            <el-descriptions :column="1" border>
              <el-descriptions-item label="当前状态">{{ formatReportStatusLabel(detail.report.status) }}</el-descriptions-item>
              <el-descriptions-item label="处理人">
                {{ formatHistoryOperatorLabel('admin', detail.report.handlerId, detail.report.handlerId) }}
              </el-descriptions-item>
              <el-descriptions-item label="处理动作">{{ formatResultActionLabel(detail.report.resultAction) }}</el-descriptions-item>
              <el-descriptions-item label="处理备注">{{ formatText(detail.report.resultRemark) }}</el-descriptions-item>
            </el-descriptions>
          </detail-section-card>

          <action-panel
            title="处理动作区"
            description="仅展示当前账号在本举报上可执行的动作。"
            :actions="panelActions"
            :loading="submitting"
            :readonly="actionReadonly"
            :readonly-reason="actionReadonlyReason"
            @action="handleActionClick"
          />
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
import { getTempResolveReportActionBridge } from '@/constants/admin-action-payloads'
import { ADMIN_AVAILABLE_ACTION_KEYS } from '@/constants/admin-contract'
import { ROUTE_NAMES } from '@/constants/routes'
import { ENABLE_REAL_ADMIN_READS, ENABLE_REAL_ADMIN_WRITES, REAL_ADMIN_WRITE_READONLY_REASON } from '@/constants/ui'
import type { ActionDialogSchema, ActionOption } from '@/models/common'
import type { ReportDetailResult, ResolveReportPayload } from '@/models/report'
import { governanceService } from '@/services/governance.service'
import { useAuthStore } from '@/stores/auth.store'
import { getReportDetailReadonlyReason } from '@/utils/admin-detail-readonly'
import {
  formatHistoryOperatorLabel,
  formatOperationActionLabel,
  formatGenericStatusLabel,
  formatReportHistoryActionSummary,
  formatReportHistoryRecordSummary,
  formatReportReasonCodeLabel,
  formatReportStatusLabel,
  formatReportTargetSummary,
  formatReportTargetTypeLabel,
  formatResultActionLabel,
  formatRiskFlagList,
  formatRiskLevelLabel,
  shouldShowReportResultCard,
} from '@/utils/admin-labels'
import { formatDateTime, formatText } from '@/utils/formatter'

const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()
const { resolveActionState, mustResetPassword } = usePermission()

const { loading, error, runPageLoad } = usePageLoadState()
const submitting = ref(false)
const detail = ref<ReportDetailResult | null>(null)
const dialogVisible = ref(false)
const activeAction = ref<ActionOption | null>(null)

const resolveReportBridge = getTempResolveReportActionBridge

const { panelActions, isReadonly, readonlyReason } = useDetailActionPanel({
  detail,
  getAvailableActions: (currentDetail) => currentDetail.availableActions,
  resolveActionState,
  resolveReadonlyReason: (currentDetail, currentPanelActions) =>
    getReportDetailReadonlyReason({
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

const riskFlagLabels = computed(() => (detail.value ? formatRiskFlagList(detail.value.targetSnapshot.riskSummary.riskFlags) : []))
const showHistoryResultCard = computed(() => {
  if (!detail.value) {
    return false
  }

  return shouldShowReportResultCard(detail.value.report)
})

const dialogSchema = computed<ActionDialogSchema | null>(() => {
  const action = activeAction.value
  if (!action) {
    return null
  }

  if (action.key === ADMIN_AVAILABLE_ACTION_KEYS.CLAIM_REPORT) {
    return {
      title: '领取举报任务',
      description: '领取后该举报进入你的处理态。',
      confirmText: '确认领取',
    }
  }

  if (action.key === ADMIN_AVAILABLE_ACTION_KEYS.RESOLVE_REPORT_REJECTED) {
    return {
      title: '确认举报不成立',
      description: '将记录结论并刷新详情页。',
      confirmText: '确认提交',
      fields: [
        {
          key: 'resultRemark',
          label: '处理备注',
          type: 'textarea',
          placeholder: '请输入处理说明',
        },
      ],
    }
  }

  const bridge = resolveReportBridge(action.key)

  const baseFields = [
    {
      key: 'reasonCategory',
      label: '原因分类',
      type: 'select' as const,
      required: Boolean(bridge?.requiresReasonCategory),
      options: [
        { label: '诈骗诱导', value: 'fraud' },
        { label: '违规内容', value: 'illegal_content' },
        { label: '联系方式违规', value: 'contact_abuse' },
      ],
    },
    {
      key: 'resultRemark',
      label: '处理备注',
      type: 'textarea' as const,
      placeholder: '请输入处理备注',
    },
  ]

  if (action.key === ADMIN_AVAILABLE_ACTION_KEYS.RESOLVE_REPORT_CONFIRMED_RECORD_ONLY) {
    return {
      title: '举报成立但仅记录',
      description: '将记录成立结论，但不联动处罚。',
      confirmText: '确认提交',
      fields: baseFields,
    }
  }

  if (action.key === ADMIN_AVAILABLE_ACTION_KEYS.RESOLVE_REPORT_CONFIRMED_REMOVE_NOTICE) {
    return {
      title: '举报成立并下架通告',
      description: '该动作会同步联动通告下架。',
      confirmText: '确认下架',
      danger: true,
      fields: baseFields,
    }
  }

  const requiresEndAt = Boolean(bridge?.requiresEndAt)

  return {
    title: `确认${action.label}`,
    description: '处罚动作需要明确原因分类、处罚时长和影响范围。',
    confirmText: `确认${action.label}`,
    danger: Boolean(action.danger),
    fields: [
      ...baseFields,
      {
        key: 'endAt',
        label: '处罚到期时间',
        type: 'datetime',
        required: requiresEndAt,
      },
      {
        key: 'forceRemoveActiveNotices',
        label: '同步下架在架通告',
        type: 'switch',
      },
    ],
    initialValues: {
      forceRemoveActiveNotices: true,
    },
  }
})

const loadDetail = async () => {
  try {
    await runPageLoad(async () => {
      detail.value = await governanceService.reportDetail(String(route.params.reportId))
    })
  } catch {}
}

const handleActionClick = (action: ActionOption) => {
  activeAction.value = action
  dialogVisible.value = true
}

const submitAction = async (payload: Record<string, unknown>) => {
  if (!activeAction.value || !detail.value) {
    return
  }

  const reportId = String(route.params.reportId)
  submitting.value = true
  try {
    if (activeAction.value.key === ADMIN_AVAILABLE_ACTION_KEYS.CLAIM_REPORT) {
      await governanceService.claimReport(reportId)
    } else {
      const bridge = resolveReportBridge(activeAction.value.key)
      if (!bridge) {
        throw new Error('当前动作待后端进一步确认请求映射')
      }

      const resolvePayload: ResolveReportPayload = {
        reportId,
        result: bridge.result,
        resultAction: bridge.resultAction,
        resultRemark: payload.resultRemark as string | undefined,
        noticeAction: bridge.noticeAction ?? 'none',
      }

      if (bridge.restrictionType) {
        resolvePayload.accountAction = {
          userId: detail.value.targetSnapshot.ownerUserId,
          restrictionType: bridge.restrictionType,
          reasonCategory: String(payload.reasonCategory || ''),
          reasonText: payload.resultRemark as string | undefined,
          endAt: payload.endAt as string | undefined,
          forceRemoveActiveNotices: Boolean(payload.forceRemoveActiveNotices),
        }
      }

      await governanceService.resolveReport(resolvePayload)
    }

    ElMessage.success('举报处理已提交')
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
  router.push({ name: ROUTE_NAMES.REPORT_LIST, query: route.query })
}

watch(
  () => route.params.reportId,
  () => {
    void loadDetail()
  },
)

onMounted(() => {
  void loadDetail()
})
</script>
