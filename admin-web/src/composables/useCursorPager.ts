export interface CursorPagerState {
  cursorStack: string[]
  currentCursor: string
  currentVirtualPage: number
}

export interface CursorPagerRouteState {
  cursor?: string
  virtualPage?: string | number
}

export const createCursorPagerState = (): CursorPagerState => ({
  cursorStack: [],
  currentCursor: '',
  currentVirtualPage: 1,
})

export const buildCursorPagerQuery = (state: CursorPagerState) => ({
  cursor: state.currentCursor,
  virtualPage: state.currentVirtualPage,
})

export const resetCursorPager = (state: CursorPagerState) => {
  state.cursorStack = []
  state.currentCursor = ''
  state.currentVirtualPage = 1
}

export const restoreCursorPager = (state: CursorPagerState, routeState: CursorPagerRouteState) => {
  state.cursorStack = []
  state.currentCursor = routeState.cursor || ''

  const virtualPage = Number(routeState.virtualPage || 1)
  state.currentVirtualPage = Number.isFinite(virtualPage) && virtualPage > 0 ? virtualPage : 1
}

export const moveToNextCursor = (state: CursorPagerState, nextCursor: string) => {
  if (!nextCursor) {
    return
  }

  if (state.currentCursor) {
    state.cursorStack.push(state.currentCursor)
  }

  state.currentCursor = nextCursor
  state.currentVirtualPage += 1
}

export const moveToPreviousCursor = (state: CursorPagerState) => {
  const previousCursor = state.cursorStack.pop() ?? ''
  state.currentCursor = previousCursor
  state.currentVirtualPage = Math.max(1, state.currentVirtualPage - 1)
}
