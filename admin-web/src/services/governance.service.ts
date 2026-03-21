import { serviceClient } from '@/services/client'
import {
  normalizeAccountActionListResult,
  normalizeDashboardResult,
  normalizeOperationLogListResult,
  normalizeReportDetailResult,
  normalizeReportListResult,
} from '@/services/admin-contract.normalizers'
import type {
  AccountActionListQuery,
  CreateAccountActionPayload,
  OperationLogListQuery,
  ReleaseAccountActionPayload,
} from '@/models/governance'
import type { ReportListQuery, ResolveReportPayload } from '@/models/report'

export const governanceService = {
  async dashboard() {
    const result = await serviceClient.invoke<Record<string, unknown>>('governance-admin', 'dashboard')
    return normalizeDashboardResult(result)
  },
  async reportList(payload: ReportListQuery) {
    const result = await serviceClient.invoke<Record<string, unknown>, ReportListQuery>('governance-admin', 'reportList', payload)
    return normalizeReportListResult(result)
  },
  async reportDetail(reportId: string) {
    const result = await serviceClient.invoke<Record<string, unknown>, { reportId: string }>('governance-admin', 'reportDetail', { reportId })
    return normalizeReportDetailResult(result)
  },
  claimReport(reportId: string) {
    return serviceClient.invoke<{ reportId: string; status: string; handlerId: string }, { reportId: string }>('governance-admin', 'claimReport', { reportId })
  },
  resolveReport(payload: ResolveReportPayload) {
    return serviceClient.invoke<{ reportId: string; status: string; linkedNoticeStatus?: string; linkedAccountStatus?: string }, ResolveReportPayload>(
      'governance-admin',
      'resolveReport',
      payload,
    )
  },
  async accountActionList(payload: AccountActionListQuery) {
    const result = await serviceClient.invoke<Record<string, unknown>, AccountActionListQuery>('governance-admin', 'accountActionList', payload)
    return normalizeAccountActionListResult(result)
  },
  createAccountAction(payload: CreateAccountActionPayload) {
    return serviceClient.invoke<{ restrictionId: string; accountStatus: string }, CreateAccountActionPayload>('governance-admin', 'createAccountAction', payload)
  },
  releaseAccountAction(payload: ReleaseAccountActionPayload) {
    return serviceClient.invoke<{ restrictionId: string; status: string; accountStatus: string }, ReleaseAccountActionPayload>(
      'governance-admin',
      'releaseAccountAction',
      payload,
    )
  },
  forceRemoveNotice(payload: { noticeId: string; reasonCategory: string; reasonText?: string }) {
    return serviceClient.invoke<{ noticeId: string; status: string; removedAt: string }, typeof payload>('governance-admin', 'forceRemoveNotice', payload)
  },
  async operationLogList(payload: OperationLogListQuery) {
    const result = await serviceClient.invoke<Record<string, unknown>, OperationLogListQuery>('governance-admin', 'operationLogList', payload)
    return normalizeOperationLogListResult(result)
  },
}
