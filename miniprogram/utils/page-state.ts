export type PageStatus = 'loading' | 'ready' | 'empty' | 'error' | 'submitting';

export const PAGE_STATUS: Record<string, PageStatus> = {
  loading: 'loading',
  ready: 'ready',
  empty: 'empty',
  error: 'error',
  submitting: 'submitting',
};

export function resolveListPageStatus<T>(list: T[]) {
  return list.length ? PAGE_STATUS.ready : PAGE_STATUS.empty;
}
