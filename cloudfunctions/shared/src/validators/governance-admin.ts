import {
  TEMP_ACCOUNT_ACTION_RESTRICTION_TYPES,
  TEMP_RESOLVE_REPORT_RESULT_ACTIONS,
} from '../contracts/admin/action-payloads'
import { decodeOffsetCursor, normalizePageSize } from '../utils/pagination'
import { createValidationError, requireString } from './common'

function optionalString(value: unknown) {
  if (typeof value !== 'string') {
    return undefined
  }

  const normalized = value.trim()
  return normalized.length > 0 ? normalized : undefined
}

function optionalBoolean(value: unknown) {
  if (typeof value !== 'boolean') {
    return undefined
  }

  return value
}

function optionalObject(value: unknown) {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : undefined
}

export function validateDashboardPayload() {
  return {}
}

export function validateReportListPayload(payload: Record<string, unknown> = {}) {
  return {
    status: optionalString(payload.status),
    targetType: optionalString(payload.targetType),
    reasonCode: optionalString(payload.reasonCode),
    pageSize: normalizePageSize(payload.pageSize),
    offset: decodeOffsetCursor(payload.cursor),
  }
}

export function validateReportDetailPayload(payload: Record<string, unknown> = {}) {
  return {
    reportId: requireString(payload.reportId, {
      fieldName: 'reportId',
    }),
  }
}

export function validateClaimReportPayload(payload: Record<string, unknown> = {}) {
  return {
    reportId: requireString(payload.reportId, {
      fieldName: 'reportId',
    }),
  }
}

export function validateResolveReportPayload(payload: Record<string, unknown> = {}) {
  const reportId = requireString(payload.reportId, {
    fieldName: 'reportId',
  })
  const result = requireString(payload.result, {
    fieldName: 'result',
  })
  const resultAction = optionalString(payload.resultAction)
  const resultRemark = optionalString(payload.resultRemark)
  const noticeAction = optionalString(payload.noticeAction) ?? 'none'
  const accountAction = optionalObject(payload.accountAction)

  if (!['confirmed', 'rejected'].includes(result)) {
    throw createValidationError({
      result: 'result 仅支持 confirmed / rejected',
    })
  }

  if (!['none', 'remove_notice'].includes(noticeAction)) {
    throw createValidationError({
      noticeAction: 'noticeAction 仅支持 none / remove_notice',
    })
  }

  if (result === 'confirmed') {
    if (!resultAction) {
      throw createValidationError({
        resultAction: 'result = confirmed 时必须提供 resultAction',
      })
    }

    if (!Object.values(TEMP_RESOLVE_REPORT_RESULT_ACTIONS).includes(resultAction as any)) {
      throw createValidationError({
        resultAction: 'resultAction 当前仅支持临时枚举口径',
      })
    }
  }

  let normalizedAccountAction: Record<string, unknown> | null = null

  if (accountAction) {
    const userId = requireString(accountAction.userId, { fieldName: 'accountAction.userId' })
    const restrictionType = requireString(accountAction.restrictionType, { fieldName: 'accountAction.restrictionType' })
    const reasonCategory = requireString(accountAction.reasonCategory, { fieldName: 'accountAction.reasonCategory' })
    const reasonText = optionalString(accountAction.reasonText)
    const endAt = optionalString(accountAction.endAt)
    const forceRemoveActiveNotices = optionalBoolean(accountAction.forceRemoveActiveNotices) ?? false

    if (!Object.values(TEMP_ACCOUNT_ACTION_RESTRICTION_TYPES).includes(restrictionType as any)) {
      throw createValidationError({
        'accountAction.restrictionType': 'restrictionType 当前仅支持临时枚举口径',
      })
    }

    normalizedAccountAction = {
      userId,
      restrictionType,
      reasonCategory,
      reasonText,
      endAt,
      forceRemoveActiveNotices,
    }
  }

  if (
    resultAction &&
    [
      TEMP_RESOLVE_REPORT_RESULT_ACTIONS.WATCHLIST,
      TEMP_RESOLVE_REPORT_RESULT_ACTIONS.RESTRICTED_PUBLISH,
      TEMP_RESOLVE_REPORT_RESULT_ACTIONS.RESTRICTED_APPLY,
      TEMP_RESOLVE_REPORT_RESULT_ACTIONS.BANNED,
    ].includes(resultAction as any) &&
    !normalizedAccountAction
  ) {
    throw createValidationError({
      accountAction: 'resultAction 含账号治理动作时，必须提供 accountAction',
    })
  }

  return {
    reportId,
    result,
    resultAction: resultAction ?? null,
    resultRemark,
    noticeAction,
    accountAction: normalizedAccountAction,
  }
}

export function validateAccountActionListPayload(payload: Record<string, unknown> = {}) {
  return {
    userId: optionalString(payload.userId),
    restrictionType: optionalString(payload.restrictionType),
    status: optionalString(payload.status),
    pageSize: normalizePageSize(payload.pageSize),
    offset: decodeOffsetCursor(payload.cursor),
  }
}

export function validateCreateAccountActionPayload(payload: Record<string, unknown> = {}) {
  const userId = requireString(payload.userId, { fieldName: 'userId' })
  const restrictionType = requireString(payload.restrictionType, { fieldName: 'restrictionType' })
  const reasonCategory = requireString(payload.reasonCategory, { fieldName: 'reasonCategory' })
  const reasonText = optionalString(payload.reasonText)
  const startAt = optionalString(payload.startAt)
  const endAt = optionalString(payload.endAt)
  const forceRemoveActiveNotices = optionalBoolean(payload.forceRemoveActiveNotices) ?? false

  if (!Object.values(TEMP_ACCOUNT_ACTION_RESTRICTION_TYPES).includes(restrictionType as any)) {
    throw createValidationError({
      restrictionType: 'restrictionType 当前仅支持临时枚举口径',
    })
  }

  return {
    userId,
    restrictionType,
    reasonCategory,
    reasonText,
    startAt,
    endAt,
    forceRemoveActiveNotices,
  }
}

export function validateReleaseAccountActionPayload(payload: Record<string, unknown> = {}) {
  return {
    restrictionId: requireString(payload.restrictionId, {
      fieldName: 'restrictionId',
    }),
    reasonText: optionalString(payload.reasonText) ?? null,
  }
}

export function validateForceRemoveNoticePayload(payload: Record<string, unknown> = {}) {
  return {
    noticeId: requireString(payload.noticeId, {
      fieldName: 'noticeId',
    }),
    reasonCategory: requireString(payload.reasonCategory, {
      fieldName: 'reasonCategory',
    }),
    reasonText: optionalString(payload.reasonText) ?? null,
  }
}

export function validateOperationLogListPayload(payload: Record<string, unknown> = {}) {
  return {
    targetType: optionalString(payload.targetType),
    targetId: optionalString(payload.targetId),
    operatorType: optionalString(payload.operatorType),
    pageSize: normalizePageSize(payload.pageSize),
    offset: decodeOffsetCursor(payload.cursor),
  }
}
