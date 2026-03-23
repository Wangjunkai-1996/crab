<template>
  <div class="page-container">
    <div class="page-header">
      <div>
        <h1 class="page-title">举报列表</h1>
        <div class="page-subtitle">统一筛选工具栏 + 游标分页表格，列表字段以后端 DTO 与样例为准。</div>
      </div>
    </div>

    <filter-toolbar>
      <el-select v-model="filters.status" placeholder="举报状态" style="width: 160px">
        <el-option v-for="item in dictionaryStore.reportStatusOptions" :key="String(item.value)" :label="item.label" :value="item.value" />
      </el-select>
      <el-select v-model="filters.targetType" placeholder="举报对象" style="width: 160px">
        <el-option v-for="item in dictionaryStore.reportTargetTypeOptions" :key="String(item.value)" :label="item.label" :value="item.value" />
      </el-select>
      <el-select v-model="filters.reasonCode" placeholder="举报原因" style="width: 160px">
        <el-option v-for="item in dictionaryStore.reportReasonOptions" :key="String(item.value)" :label="item.label" :value="item.value" />
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
    <page-error-state v-else-if="tableState === 'error'" description="举报列表加载失败，请重试。" @retry="loadList" />
    <el-card v-else shadow="never">
      <table-empty v-if="tableState === 'empty'" description="当前筛选条件下没有举报记录。" />
      <template v-else>
        <el-table :data="rows" stripe @row-click="goDetail">
          <el-table-column label="举报对象类型" width="140">
            <template #default="scope">
              {{ formatReportTargetTypeLabel(scope.row.targetType) }}
            </template>
          </el-table-column>
          <el-table-column label="对象名称 / ID" min-width="260">
            <template #default="scope">
              <div>{{ scope.row.targetDisplayName || '--' }}</div>
              <div class="muted-text">{{ scope.row.targetId }}</div>
            </template>
          </el-table-column>
          <el-table-column label="举报原因" width="160">
            <template #default="scope">
              {{ formatReportReasonCodeLabel(scope.row.reasonCode) }}
            </template>
          </el-table-column>
          <el-table-column label="举报状态" width="140">
            <template #default="scope">
              <status-tag :status="scope.row.status" :label="formatReportStatusLabel(scope.row.status)" />
            </template>
          </el-table-column>
          <el-table-column prop="aggregatedReportCount" label="累计举报次数" width="140" />
          <el-table-column label="高风险" width="120">
            <template #default="scope">
              <el-tag :type="scope.row.isHighRisk ? 'danger' : 'info'" effect="plain">{{ scope.row.isHighRisk ? '高风险' : '普通' }}</el-tag>
            </template>
          </el-table-column>
          <el-table-column label="举报时间" width="180">
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
          <span class="muted-text">第 {{ reportStore.currentVirtualPage }} 页</span>
          <el-button :disabled="reportStore.currentVirtualPage === 1" @click="handlePrevPage">上一页</el-button>
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
import StatusTag from '@/components/status-tag/index.vue'
import TableEmpty from '@/components/table-empty/index.vue'
import { buildCursorPagerQuery, restoreCursorPager } from '@/composables/useCursorPager'
import { usePageLoadState } from '@/composables/usePageLoadState'
import { buildRouteQuery, pickRouteQuery } from '@/composables/usePageQuery'
import { useTableState } from '@/composables/useTableState'
import { ROUTE_NAMES } from '@/constants/routes'
import type { ReportListItem } from '@/models/report'
import { governanceService } from '@/services/governance.service'
import { useDictionaryStore } from '@/stores/dictionary.store'
import { createDefaultReportQuery, useReportStore } from '@/stores/report.store'
import { formatReportReasonCodeLabel, formatReportStatusLabel, formatReportTargetTypeLabel } from '@/utils/admin-labels'
import { formatDateTime } from '@/utils/formatter'

const route = useRoute()
const router = useRouter()
const reportStore = useReportStore()
const dictionaryStore = useDictionaryStore()

const rows = ref<ReportListItem[]>([])
const nextCursor = ref('')
const hasMore = ref(false)
const { loading, error, runPageLoad } = usePageLoadState()
const filters = reactive(createDefaultReportQuery())
const tableState = useTableState(loading, error, rows)

const syncRouteQuery = async () => {
  await router.replace({
    query: buildRouteQuery({
      ...reportStore.query,
      ...buildCursorPagerQuery(reportStore),
    }),
  })
}

const restoreFromRoute = () => {
  const routeQuery = pickRouteQuery(route.query, ['status', 'targetType', 'reasonCode', 'pageSize', 'cursor', 'virtualPage'])
  reportStore.setQuery({
    status: routeQuery.status || '',
    targetType: routeQuery.targetType || '',
    reasonCode: routeQuery.reasonCode || '',
    pageSize: Number(routeQuery.pageSize || reportStore.query.pageSize),
  })
  restoreCursorPager(reportStore, {
    cursor: routeQuery.cursor,
    virtualPage: routeQuery.virtualPage,
  })
  Object.assign(filters, reportStore.query)
}

const loadList = async () => {
  try {
    await runPageLoad(async () => {
      const result = await governanceService.reportList({
        ...reportStore.query,
        cursor: reportStore.currentCursor || undefined,
      })
      rows.value = result.list
      nextCursor.value = result.nextCursor
      hasMore.value = result.hasMore
    })
  } catch {}
}

const handleSearch = async () => {
  reportStore.setQuery({ ...filters })
  reportStore.resetPager()
  await syncRouteQuery()
  await loadList()
}

const handleReset = async () => {
  Object.assign(filters, createDefaultReportQuery())
  reportStore.resetQuery()
  Object.assign(filters, reportStore.query)
  await syncRouteQuery()
  await loadList()
}

const handleNextPage = async () => {
  reportStore.moveNext(nextCursor.value)
  await syncRouteQuery()
  await loadList()
}

const handlePrevPage = async () => {
  reportStore.movePrev()
  await syncRouteQuery()
  await loadList()
}

const goDetail = (row: ReportListItem) => {
  router.push({
    name: ROUTE_NAMES.REPORT_DETAIL,
    params: { reportId: row.reportId },
    query: route.query,
  })
}

onMounted(() => {
  restoreFromRoute()
  void loadList()
})
</script>
