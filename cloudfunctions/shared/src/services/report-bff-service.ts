import { COLLECTIONS } from '../constants/collections'
import {
  ReportListResponseData,
  ReportSubmitPayload,
  ReportSubmitResponseData,
} from '../contracts/miniprogram/report-bff'
import { addDocument, listByWhere } from '../db/repository'
import { UserContext } from '../types'
import { createResourceId } from '../utils/id'
import { now } from '../utils/time'
import { writeOperationLog } from './operation-log-service'

function asString(value: unknown, fallback = '') {
  return typeof value === 'string' ? value : fallback
}

function asNullableString(value: unknown) {
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : null
}

function asStringArray(value: unknown) {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string').map((item) => item.trim()).filter(Boolean) : []
}

function buildCursor(offset: number) {
  return offset > 0 ? Buffer.from(JSON.stringify({ offset })).toString('base64') : ''
}

function decodeCursor(cursor: unknown) {
  if (typeof cursor !== 'string' || !cursor.trim()) {
    return 0
  }

  try {
    const parsed = JSON.parse(Buffer.from(cursor, 'base64').toString('utf8'))
    const offset = Number(parsed?.offset)
    return Number.isFinite(offset) && offset > 0 ? offset : 0
  } catch (error) {
    return 0
  }
}

function formatReportStatus(status: string) {
  switch (status) {
    case 'pending':
    case 'processing':
      return '处理中'
    case 'rejected':
    case 'dismissed':
    case 'invalid':
      return '未成立'
    default:
      return '已处理'
  }
}

function formatReportResultAction(resultAction: string | null, status: string) {
  if (!resultAction) {
    return status === 'pending' || status === 'processing' ? undefined : '平台已完成处理'
  }

  const labels: Record<string, string> = {
    record_only: '已记录处理',
    remove_notice: '已下架通告',
    watchlist: '已加入观察名单',
    restricted_publish: '已限制发布',
    restrict_publish: '已限制发布',
    restricted_apply: '已限制报名',
    restrict_apply: '已限制报名',
    banned: '已封禁账号',
  }

  return labels[resultAction] || resultAction
}

export async function submitReport(
  payload: ReportSubmitPayload,
  userContext: UserContext,
  requestId: string,
): Promise<ReportSubmitResponseData> {
  const currentTime = now()
  const reportId = createResourceId('report')

  await addDocument(COLLECTIONS.REPORTS, {
    reportId,
    reporterUserId: userContext.userId,
    targetType: payload.targetType,
    targetId: payload.targetId ?? '',
    targetSummary: payload.targetSummary,
    reasonCode: payload.reasonCode,
    reasonText: payload.description ?? null,
    evidenceImages: payload.evidenceImages ?? [],
    status: 'pending',
    handlerId: null,
    resultAction: null,
    resultRemark: null,
    createdAt: currentTime,
    updatedAt: currentTime,
  })

  await writeOperationLog({
    operatorType: 'user',
    operatorId: userContext.userId,
    action: 'report_submit',
    targetType: 'report',
    targetId: reportId,
    requestId,
    afterSnapshot: {
      status: 'pending',
      targetType: payload.targetType,
      targetId: payload.targetId ?? '',
      reasonCode: payload.reasonCode,
    },
  })

  return {
    reportId,
    status: 'pending',
  }
}

export async function listMyReports(
  userContext: UserContext,
  payload: {
    cursor?: unknown
    pageSize?: unknown
  } = {},
): Promise<ReportListResponseData> {
  const offset = decodeCursor(payload.cursor)
  const pageSize = Number.isFinite(Number(payload.pageSize)) && Number(payload.pageSize) > 0
    ? Math.min(Number(payload.pageSize), 50)
    : 50
  const rows = await listByWhere(COLLECTIONS.REPORTS, {
    reporterUserId: userContext.userId,
  }, {
    orderBy: [{ field: 'createdAt', order: 'desc' }],
    limit: pageSize + 1,
    skip: offset,
  })
  const hasMore = rows.length > pageSize
  const list = rows.slice(0, pageSize).map((row) => {
    const rawStatus = asString(row.status)

    return {
      reportId: asString(row.reportId),
      targetType: asString(row.targetType),
      targetId: asNullableString(row.targetId) ?? undefined,
      reasonCode: asString(row.reasonCode),
      status: formatReportStatus(rawStatus),
      resultAction: formatReportResultAction(asNullableString(row.resultAction), rawStatus),
    }
  })

  return {
    list,
    nextCursor: hasMore ? buildCursor(offset + pageSize) : '',
    hasMore,
  }
}
