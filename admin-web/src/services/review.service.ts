import { serviceClient } from '@/services/client'
import { normalizeReviewDetailResult, normalizeReviewTaskListResult } from '@/services/admin-contract.normalizers'
import type { ResolveTaskPayload, ReviewListQuery } from '@/models/review'

export const reviewService = {
  async taskList(payload: ReviewListQuery) {
    const result = await serviceClient.invoke<Record<string, unknown>, ReviewListQuery>('review-admin', 'taskList', payload)
    return normalizeReviewTaskListResult(result)
  },
  async taskDetail(reviewTaskId: string) {
    const result = await serviceClient.invoke<Record<string, unknown>, { reviewTaskId: string }>('review-admin', 'taskDetail', { reviewTaskId })
    return normalizeReviewDetailResult(result)
  },
  claimTask(reviewTaskId: string) {
    return serviceClient.invoke<{ reviewTaskId: string; taskStatus: string; assignedTo: string; claimedAt: string }, { reviewTaskId: string }>(
      'review-admin',
      'claimTask',
      { reviewTaskId },
    )
  },
  releaseTask(reviewTaskId: string) {
    return serviceClient.invoke<{ reviewTaskId: string; taskStatus: string }, { reviewTaskId: string }>('review-admin', 'releaseTask', { reviewTaskId })
  },
  resolveTask(payload: ResolveTaskPayload) {
    return serviceClient.invoke<{ reviewTaskId: string; taskStatus: string; noticeStatus: string; nextReviewTaskId?: string }, ResolveTaskPayload>(
      'review-admin',
      'resolveTask',
      payload,
    )
  },
}
