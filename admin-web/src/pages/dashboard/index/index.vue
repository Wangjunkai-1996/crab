<template>
  <div class="page-container">
    <div class="page-header">
      <div>
        <h1 class="page-title">工作台</h1>
        <div class="page-subtitle">展示待处理任务概况、快捷入口和优先处理项。</div>
      </div>
    </div>

    <page-skeleton v-if="loading" />
    <page-error-state v-else-if="error" description="工作台数据加载失败，请重试。" @retry="loadDashboard" />
    <template v-else-if="dashboard">
      <section class="card-list-grid">
        <stats-card title="待处理审核" :value="dashboard.reviewPendingCount" description="审核与复核队列总量" />
        <stats-card title="待处理举报" :value="dashboard.reportPendingCount" description="待领取与处理中举报" />
        <stats-card title="今日新通告" :value="dashboard.todayNoticeCount" description="今日进入后台视野的通告量" />
        <stats-card title="今日审核通过" :value="dashboard.todayApprovedCount" description="当日完成通过数量" />
      </section>

      <el-card shadow="never">
        <template #header>
          <div class="page-header">
            <div>
              <div class="page-title" style="font-size: 18px">快捷入口</div>
              <div class="page-subtitle">根据当前账号权限展示可进入的工作区。</div>
            </div>
          </div>
        </template>
        <el-space wrap>
          <el-button
            v-for="entry in quickEntries"
            :key="entry.routeName"
            :disabled="authStore.mustResetPassword"
            @click="router.push({ name: entry.routeName })"
          >
            {{ entry.label }}
          </el-button>
        </el-space>
      </el-card>

      <el-card shadow="never">
        <template #header>
          <div class="page-header">
            <div>
              <div class="page-title" style="font-size: 18px">优先处理列表</div>
              <div class="page-subtitle">优先展示需要尽快处理的审核、举报和处罚事项。</div>
            </div>
          </div>
        </template>

        <table-empty v-if="dashboard.priorityItems.length === 0" description="当前没有需要优先处理的高风险事项。" />
        <el-table v-else :data="dashboard.priorityItems" stripe>
          <el-table-column label="类型" width="120">
            <template #default="scope">
              {{ formatDashboardPriorityTypeLabel(scope.row.itemType) }}
            </template>
          </el-table-column>
          <el-table-column label="事项" min-width="260">
            <template #default="scope">
              <div>{{ formatDashboardPriorityTitle(scope.row) }}</div>
              <div class="muted-text">{{ formatDashboardPrioritySummary(scope.row) }}</div>
            </template>
          </el-table-column>
          <el-table-column label="状态 / 提示" min-width="220">
            <template #default="scope">
              <div>
                <status-tag :status="scope.row.status" :label="formatDashboardPriorityStatusLabel(scope.row.itemType, scope.row.status)" />
              </div>
              <div class="muted-text">{{ formatDashboardPriorityHint(scope.row) }}</div>
            </template>
          </el-table-column>
          <el-table-column label="风险等级" width="120">
            <template #default="scope">
              <status-tag
                v-if="scope.row.riskLevel"
                :status="scope.row.riskLevel"
                :label="formatDashboardPriorityRiskLabel(scope.row.riskLevel)"
              />
              <span v-else class="muted-text">{{ formatDashboardPriorityRiskLabel(scope.row.riskLevel) }}</span>
            </template>
          </el-table-column>
          <el-table-column label="操作" width="140" fixed="right">
            <template #default="scope">
              <el-button link type="primary" :disabled="authStore.mustResetPassword" @click="goPriorityItem(scope.row)">
                进入处理
              </el-button>
            </template>
          </el-table-column>
        </el-table>
      </el-card>
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'

import PageErrorState from '@/components/page-error-state/index.vue'
import PageSkeleton from '@/components/page-skeleton/index.vue'
import StatsCard from '@/components/stats-card/index.vue'
import StatusTag from '@/components/status-tag/index.vue'
import TableEmpty from '@/components/table-empty/index.vue'
import { usePageLoadState } from '@/composables/usePageLoadState'
import { usePermission } from '@/composables/usePermission'
import { NAV_ITEMS } from '@/constants/routes'
import type { DashboardPriorityItem, DashboardResult } from '@/models/governance'
import { governanceService } from '@/services/governance.service'
import { useAuthStore } from '@/stores/auth.store'
import {
  formatDashboardPriorityHint,
  formatDashboardPriorityRiskLabel,
  formatDashboardPriorityStatusLabel,
  formatDashboardPrioritySummary,
  formatDashboardPriorityTitle,
  formatDashboardPriorityTypeLabel,
} from '@/utils/admin-labels'

const router = useRouter()
const authStore = useAuthStore()
const { canAccessPage } = usePermission()

const { loading, error, runPageLoad } = usePageLoadState()
const dashboard = ref<DashboardResult | null>(null)

const quickEntries = computed(() => NAV_ITEMS.filter((item) => canAccessPage(item.pageKey, item.allowedRoles)))

const goPriorityItem = (item: DashboardPriorityItem) => {
  router.push({
    name: item.routeKey,
    params: item.routeParams,
  })
}

const loadDashboard = async () => {
  try {
    await runPageLoad(async () => {
      dashboard.value = await governanceService.dashboard()
    })
  } catch {}
}

onMounted(() => {
  void loadDashboard()
})
</script>
