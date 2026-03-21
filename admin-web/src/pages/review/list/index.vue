<template>
  <div class="page-container">
    <div class="page-header">
      <div>
        <h1 class="page-title">审核列表</h1>
        <div class="page-subtitle">统一筛选工具栏 + 游标分页表格，返回详情后保留查询上下文。</div>
      </div>
      <el-tag type="warning" effect="plain">待处理 {{ pendingCount }}</el-tag>
    </div>

    <filter-toolbar>
      <el-select v-model="filters.taskStatus" placeholder="任务状态" style="width: 160px">
        <el-option v-for="item in dictionaryStore.reviewTaskStatusOptions" :key="String(item.value)" :label="item.label" :value="item.value" />
      </el-select>
      <el-select v-model="filters.reviewStage" placeholder="审核阶段" style="width: 160px">
        <el-option v-for="item in dictionaryStore.reviewStageOptions" :key="String(item.value)" :label="item.label" :value="item.value" />
      </el-select>
      <el-select v-model="filters.city" placeholder="城市" style="width: 140px">
        <el-option v-for="item in dictionaryStore.cityOptions" :key="String(item.value)" :label="item.label" :value="item.value" />
      </el-select>
      <el-select v-model="filters.identityType" placeholder="身份类型" style="width: 140px">
        <el-option v-for="item in dictionaryStore.identityTypeOptions" :key="String(item.value)" :label="item.label" :value="item.value" />
      </el-select>
      <el-select v-model="filters.riskLevel" placeholder="风险等级" style="width: 140px">
        <el-option v-for="item in dictionaryStore.riskLevelOptions" :key="String(item.value)" :label="item.label" :value="item.value" />
      </el-select>
      <el-select v-model="filters.pageSize" placeholder="页大小" style="width: 140px">
        <el-option v-for="item in dictionaryStore.pageSizeOptions" :key="String(item.value)" :label="item.label" :value="item.value" />
      </el-select>
      <template #actions>
        <el-button @click="handleReset">重置</el-button>
        <el-button type="primary" @click="handleSearch">查询</el-button>
      </template>
    </filter-toolbar>

    <page-skeleton v-if="tableState === 'loading'" />
    <page-error-state v-else-if="tableState === 'error'" description="审核列表加载失败，请重试。" @retry="loadList" />
    <el-card v-else shadow="never">
      <table-empty v-if="tableState === 'empty'" description="当前筛选条件下没有审核任务。" />
      <template v-else>
        <el-table :data="rows" stripe @row-click="goDetail">
          <el-table-column label="通告标题" min-width="240">
            <template #default="scope">
              {{ scope.row.notice.title }}
            </template>
          </el-table-column>
          <el-table-column label="发布方名称" min-width="160">
            <template #default="scope">
              {{ scope.row.publisher.displayName }}
            </template>
          </el-table-column>
          <el-table-column label="身份类型" width="120">
            <template #default="scope">
              {{ formatIdentityTypeLabel(scope.row.publisher.identityType) }}
            </template>
          </el-table-column>
          <el-table-column label="城市" width="100">
            <template #default="scope">
              {{ scope.row.notice.city }}
            </template>
          </el-table-column>
          <el-table-column label="平台" width="140">
            <template #default="scope">
              {{ formatCooperationPlatformLabel(scope.row.notice.cooperationPlatform) }}
            </template>
          </el-table-column>
          <el-table-column label="结算方式" min-width="160">
            <template #default="scope">
              {{ formatSettlementTypeLabel(scope.row.notice.settlementType) }}
            </template>
          </el-table-column>
          <el-table-column label="处理人" min-width="150">
            <template #default="scope">
              {{ scope.row.assignedAdmin?.displayName || '--' }}
            </template>
          </el-table-column>
          <el-table-column label="风险标签" min-width="220">
            <template #default="scope">
              <risk-flag-list :flags="scope.row.riskFlags" />
            </template>
          </el-table-column>
          <el-table-column label="任务状态" width="120">
            <template #default="scope">
              <status-tag :status="scope.row.taskStatus" :label="formatReviewTaskStatusLabel(scope.row.taskStatus)" />
            </template>
          </el-table-column>
          <el-table-column label="审核阶段" width="120">
            <template #default="scope">
              <status-tag :status="scope.row.reviewStage" :label="formatReviewStageLabel(scope.row.reviewStage)" />
            </template>
          </el-table-column>
          <el-table-column label="进入队列时间" width="180">
            <template #default="scope">
              {{ formatDateTime(scope.row.createdAt) }}
            </template>
          </el-table-column>
          <el-table-column label="操作" width="120" fixed="right">
            <template #default="scope">
              <el-button link type="primary" @click.stop="goDetail(scope.row)">查看详情</el-button>
            </template>
          </el-table-column>
        </el-table>

        <div class="toolbar-actions" style="margin-top: 16px">
          <span class="muted-text">第 {{ reviewStore.currentVirtualPage }} 页</span>
          <el-button :disabled="reviewStore.currentVirtualPage === 1" @click="handlePrevPage">上一页</el-button>
          <el-button type="primary" :disabled="!hasMore" @click="handleNextPage">下一页</el-button>
        </div>
      </template>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'

import FilterToolbar from '@/components/filter-toolbar/index.vue'
import PageErrorState from '@/components/page-error-state/index.vue'
import PageSkeleton from '@/components/page-skeleton/index.vue'
import RiskFlagList from '@/components/risk-flag-list/index.vue'
import StatusTag from '@/components/status-tag/index.vue'
import TableEmpty from '@/components/table-empty/index.vue'
import { buildCursorPagerQuery, restoreCursorPager } from '@/composables/useCursorPager'
import { usePageLoadState } from '@/composables/usePageLoadState'
import { buildRouteQuery, pickRouteQuery } from '@/composables/usePageQuery'
import { useTableState } from '@/composables/useTableState'
import { ROUTE_NAMES } from '@/constants/routes'
import type { ReviewTaskListItem } from '@/models/review'
import { reviewService } from '@/services/review.service'
import { useDictionaryStore } from '@/stores/dictionary.store'
import { createDefaultReviewQuery, useReviewStore } from '@/stores/review.store'
import {
  formatCooperationPlatformLabel,
  formatIdentityTypeLabel,
  formatReviewStageLabel,
  formatReviewTaskStatusLabel,
  formatSettlementTypeLabel,
} from '@/utils/admin-labels'
import { formatDateTime } from '@/utils/formatter'

const route = useRoute()
const router = useRouter()
const reviewStore = useReviewStore()
const dictionaryStore = useDictionaryStore()

const rows = ref<ReviewTaskListItem[]>([])
const nextCursor = ref('')
const hasMore = ref(false)
const pendingCount = ref(0)
const { loading, error, runPageLoad } = usePageLoadState()

const filters = reactive(createDefaultReviewQuery())
const tableState = useTableState(loading, error, rows)



const syncRouteQuery = async () => {
  await router.replace({
    query: buildRouteQuery({
      ...reviewStore.query,
      ...buildCursorPagerQuery(reviewStore),
    }),
  })
}

const restoreFromRoute = () => {
  const routeQuery = pickRouteQuery(route.query, ['taskStatus', 'reviewStage', 'city', 'identityType', 'riskLevel', 'pageSize', 'cursor', 'virtualPage'])
  reviewStore.setQuery({
    taskStatus: routeQuery.taskStatus || '',
    reviewStage: routeQuery.reviewStage || '',
    city: routeQuery.city || '',
    identityType: routeQuery.identityType || '',
    riskLevel: routeQuery.riskLevel || '',
    pageSize: Number(routeQuery.pageSize || reviewStore.query.pageSize),
  })
  restoreCursorPager(reviewStore, {
    cursor: routeQuery.cursor,
    virtualPage: routeQuery.virtualPage,
  })
  Object.assign(filters, reviewStore.query)
}

const loadList = async () => {
  try {
    await runPageLoad(async () => {
      const result = await reviewService.taskList({
        ...reviewStore.query,
        cursor: reviewStore.currentCursor || undefined,
      })
      rows.value = result.list
      nextCursor.value = result.nextCursor
      hasMore.value = result.hasMore
      pendingCount.value = Number(result.summary?.pendingCount || 0)
    })
  } catch {}
}

const handleSearch = async () => {
  reviewStore.setQuery({ ...filters })
  reviewStore.resetPager()
  await syncRouteQuery()
  await loadList()
}

const handleReset = async () => {
  Object.assign(filters, createDefaultReviewQuery())
  reviewStore.resetQuery()
  Object.assign(filters, reviewStore.query)
  await syncRouteQuery()
  await loadList()
}

const handleNextPage = async () => {
  reviewStore.moveNext(nextCursor.value)
  await syncRouteQuery()
  await loadList()
}

const handlePrevPage = async () => {
  reviewStore.movePrev()
  await syncRouteQuery()
  await loadList()
}

const goDetail = (row: ReviewTaskListItem) => {
  router.push({
    name: ROUTE_NAMES.REVIEW_DETAIL,
    params: { reviewTaskId: row.reviewTaskId },
    query: route.query,
  })
}

onMounted(() => {
  restoreFromRoute()
  void loadList()
})
</script>
