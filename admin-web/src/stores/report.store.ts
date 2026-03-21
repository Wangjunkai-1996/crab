import { defineStore } from 'pinia'
import { DEFAULT_PAGE_SIZE } from '@/constants/ui'
import { createCursorPagerState, moveToNextCursor, moveToPreviousCursor, resetCursorPager } from '@/composables/useCursorPager'

export const createDefaultReportQuery = () => ({
  status: '',
  targetType: '',
  reasonCode: '',
  pageSize: DEFAULT_PAGE_SIZE,
})

export const useReportStore = defineStore('report', {
  state: () => ({
    query: createDefaultReportQuery(),
    ...createCursorPagerState(),
  }),
  actions: {
    setQuery(patch: Partial<ReturnType<typeof createDefaultReportQuery>>) {
      this.query = { ...this.query, ...patch }
    },
    resetQuery() {
      this.query = createDefaultReportQuery()
      resetCursorPager(this)
    },
    resetPager() {
      resetCursorPager(this)
    },
    moveNext(nextCursor: string) {
      moveToNextCursor(this, nextCursor)
    },
    movePrev() {
      moveToPreviousCursor(this)
    },
  },
})
