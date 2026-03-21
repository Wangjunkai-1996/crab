import { defineStore } from 'pinia'
import { DEFAULT_PAGE_SIZE } from '@/constants/ui'
import { createCursorPagerState, moveToNextCursor, moveToPreviousCursor, resetCursorPager } from '@/composables/useCursorPager'

export const createDefaultReviewQuery = () => ({
  taskStatus: '',
  reviewStage: '',
  city: '',
  identityType: '',
  riskLevel: '',
  pageSize: DEFAULT_PAGE_SIZE,
})

export const useReviewStore = defineStore('review', {
  state: () => ({
    query: createDefaultReviewQuery(),
    ...createCursorPagerState(),
  }),
  actions: {
    setQuery(patch: Partial<ReturnType<typeof createDefaultReviewQuery>>) {
      this.query = { ...this.query, ...patch }
    },
    resetQuery() {
      this.query = createDefaultReviewQuery()
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
