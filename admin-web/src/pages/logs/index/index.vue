<template>
  <div class="page-container">
    <div class="page-header">
      <div>
        <h1 class="page-title">操作日志</h1>
        <div class="page-subtitle">按对象、操作人和时间回看后台关键治理动作。</div>
      </div>
    </div>

    <filter-toolbar>
      <el-input v-model="filters.targetType" placeholder="目标类型" style="width: 160px" clearable />
      <el-input v-model="filters.targetId" placeholder="目标 ID" style="width: 180px" clearable />
      <el-select v-model="filters.operatorType" placeholder="操作者类型" style="width: 160px">
        <el-option v-for="item in dictionaryStore.operatorTypeOptions" :key="String(item.value)" :label="item.label" :value="item.value" />
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
    <page-error-state v-else-if="error" description="操作日志加载失败，请重试。" @retry="loadList" />
    <el-card v-else shadow="never">
      <table-empty v-if="rows.length === 0" description="当前没有符合条件的日志记录。" />
      <template v-else>
        <el-table :data="rows" stripe>
          <el-table-column label="对象类型" width="140">
            <template #default="scope">
              {{ formatOperationTargetTypeLabel(scope.row.targetType) }}
            </template>
          </el-table-column>
          <el-table-column prop="targetId" label="对象 ID" min-width="180" />
          <el-table-column label="动作类型" width="180">
            <template #default="scope">
              {{ formatOperationActionLabel(scope.row.action) }}
            </template>
          </el-table-column>
          <el-table-column label="处理结果" min-width="200">
            <template #default="scope">
              {{ formatOperationResultLabel(scope.row) }}
            </template>
          </el-table-column>
          <el-table-column prop="operatorDisplayName" label="操作人" width="160" />
          <el-table-column label="操作者类型" width="140">
            <template #default="scope">
              {{ formatOperatorTypeLabel(scope.row.operatorType) }}
            </template>
          </el-table-column>
          <el-table-column prop="requestId" label="请求 ID" min-width="220" />
          <el-table-column label="操作时间" width="180">
            <template #default="scope">
              {{ formatDateTime(scope.row.createdAt) }}
            </template>
          </el-table-column>
          <el-table-column prop="remark" label="备注摘要" min-width="220" />
        </el-table>

        <div class="toolbar-actions" style="margin-top: 16px">
          <span class="muted-text">按时间顺序继续加载更早的操作记录。</span>
          <el-button :disabled="pagerState.currentVirtualPage === 1" @click="handlePrevPage">上一页</el-button>
          <el-button type="primary" :disabled="!hasMore" @click="handleNextPage">下一页</el-button>
        </div>
      </template>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue'

import FilterToolbar from '@/components/filter-toolbar/index.vue'
import PageErrorState from '@/components/page-error-state/index.vue'
import PageSkeleton from '@/components/page-skeleton/index.vue'
import TableEmpty from '@/components/table-empty/index.vue'
import { createCursorPagerState, moveToNextCursor, moveToPreviousCursor, resetCursorPager } from '@/composables/useCursorPager'
import { usePageLoadState } from '@/composables/usePageLoadState'
import { DEFAULT_PAGE_SIZE } from '@/constants/ui'
import type { OperationLogItem } from '@/models/governance'
import { governanceService } from '@/services/governance.service'
import { useDictionaryStore } from '@/stores/dictionary.store'
import {
  formatOperationActionLabel,
  formatOperationResultLabel,
  formatOperationTargetTypeLabel,
  formatOperatorTypeLabel,
} from '@/utils/admin-labels'
import { formatDateTime } from '@/utils/formatter'

const dictionaryStore = useDictionaryStore()

const rows = ref<OperationLogItem[]>([])
const nextCursor = ref('')
const pagerState = reactive(createCursorPagerState())
const hasMore = ref(false)
const { loading, error, runPageLoad } = usePageLoadState()

const filters = reactive({
  targetType: '',
  targetId: '',
  operatorType: '',
  pageSize: DEFAULT_PAGE_SIZE,
})

const loadList = async () => {
  try {
    await runPageLoad(async () => {
      const result = await governanceService.operationLogList({
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
  filters.targetType = ''
  filters.targetId = ''
  filters.operatorType = ''
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

onMounted(() => {
  void loadList()
})
</script>
