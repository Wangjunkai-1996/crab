import { MOCK_NETWORK_DELAY } from '@/constants/ui'
import {
  createEmptyPermissionSummary,
  type AdminProfile,
  type ChangePasswordPayload,
  type LoginPayload,
  type LoginResult,
  type PermissionSummary,
  type RoleCode,
} from '@/models/auth'
import type { CreateAccountActionPayload, ReleaseAccountActionPayload } from '@/models/governance'
import type { CursorListResult, ServiceRequest, ServiceResponse } from '@/models/common'
import type { ResolveReportPayload } from '@/models/report'
import type { ResolveTaskPayload } from '@/models/review'
import { ADMIN_AVAILABLE_ACTION_KEYS } from '@/constants/admin-contract'

interface MockDispatchParams {
  moduleName: string
  request: ServiceRequest<Record<string, any>>
}

interface MockAdminUser extends AdminProfile {
  username: string
  password: string
}

interface MockSession {
  adminUserId: string
  expiresAt: string
  idleExpireAt: string
}

interface ReviewRecord {
  reviewTaskId: string
  noticeId: string
  noticeTitle: string
  publisherName: string
  identityType: string
  city: string
  platform: string
  settlementType: string
  riskLevel: string
  riskFlags: string[]
  taskStatus: string
  reviewStage: string
  submittedAt: string
  assignedToId?: string
  assignedToName?: string
  claimedAt?: string
  completedAt?: string
  reviewResult?: string
  reasonCategory?: string
  reasonText?: string
  nextQueueType?: string
  noticePublishedAt?: string
  noticeReviewRoundCount?: number
  noticeApplicationCount?: number
  noticeRemovedAt?: string
  noticeClosedAt?: string
  noticeCreatorRequirements?: string
  noticeDeadlineAt?: string
  noticeBrandName?: string
  noticeCooperationCategory?: string
  noticeCooperationType?: string
  noticeBudgetRange?: string
  noticeRecruitCount?: number
  publisherUserId?: string
  publisherStatus?: string
  profileCompleteness?: number
  publishCount?: number
  approvedPublishCount?: number
  violationCount?: number
  noticeStatus: string
  description: string
  budget?: string
  contactRiskHint?: string
  images: string[]
  publisherProfileId: string
  contactType: string
  contactValue: string
  intro?: string
  historyLogs: MockReviewHistoryLog[]
}

interface ReportRecord {
  reportId: string
  status: string
  targetType: string
  targetId: string
  targetName: string
  reasonCode: string
  reportCount: number
  isHighRisk: boolean
  createdAt: string
  detailText: string
  targetUserId: string
  targetSummary: string
  currentAccountStatus: string
  targetCity?: string
  resultAction?: string
  resultRemark?: string
  handlerId?: string
  handlerName?: string
  historyReports: Array<{
    recordId: string
    reporterLabel: string
    reasonCode: string
    createdAt: string
  }>
  historyActions: Array<{
    actionId: string
    actionType: string
    operatorName: string
    createdAt: string
    remark: string
  }>
}

interface MockReviewHistoryLog {
  logId: string
  actionType: string
  operatorName: string
  createdAt: string
  remark: string
}

interface MockAccountActionRecord {
  restrictionId: string
  userId: string
  restrictionType: string
  accountStatus: string
  reasonCategory: string
  reasonText?: string
  status: string
  createdAt: string
  endAt?: string
  operatorId?: string
  operatorName: string
}

interface MockOperationLogRecord {
  logId: string
  targetType: string
  targetId: string
  actionType: string
  result?: string
  operatorName: string
  operatorType: string
  operatorId?: string
  createdAt: string
  remark: string
  requestId?: string
  beforeSnapshot?: Record<string, unknown> | null
  afterSnapshot?: Record<string, unknown> | null
}

const createMockPermissionSummary = (roleCodes: RoleCode[]): PermissionSummary => {
  const permissionSummary = createEmptyPermissionSummary()
  const isOpsAdmin = roleCodes.includes('ops_admin')
  const isSuperAdmin = roleCodes.includes('super_admin')
  const canAccessGovernance = isOpsAdmin || isSuperAdmin

  permissionSummary.pageAccess.dashboard = true
  permissionSummary.pageAccess.reviewList = true
  permissionSummary.pageAccess.reviewDetail = true
  permissionSummary.pageAccess.reportList = true
  permissionSummary.pageAccess.reportDetail = true
  permissionSummary.pageAccess.accountActionList = canAccessGovernance
  permissionSummary.pageAccess.operationLogList = canAccessGovernance
  permissionSummary.pageAccess.adminUserManagement = isSuperAdmin
  permissionSummary.pageAccess.systemConfigManagement = false

  permissionSummary.actionAccess.claimReviewTask = true
  permissionSummary.actionAccess.releaseReviewTask = true
  permissionSummary.actionAccess.resolveReviewTask = true
  permissionSummary.actionAccess.claimReport = true
  permissionSummary.actionAccess.resolveReportBasic = true
  permissionSummary.actionAccess.createWatchlist = canAccessGovernance
  permissionSummary.actionAccess.createRestrictedPublish = canAccessGovernance
  permissionSummary.actionAccess.createRestrictedApply = canAccessGovernance
  permissionSummary.actionAccess.createBanned = canAccessGovernance
  permissionSummary.actionAccess.createAccountAction = canAccessGovernance
  permissionSummary.actionAccess.releaseAccountAction = canAccessGovernance
  permissionSummary.actionAccess.forceRemoveNotice = canAccessGovernance
  permissionSummary.actionAccess.viewOperationLogList = canAccessGovernance
  permissionSummary.actionAccess.manageAdminUsers = isSuperAdmin
  permissionSummary.actionAccess.manageSystemConfigs = false

  return permissionSummary
}

const mockAdmins: MockAdminUser[] = [
  {
    adminUserId: 'admin-reviewer-1',
    displayName: '审核员演示账号',
    roleCodes: ['reviewer'],
    permissionSummary: createMockPermissionSummary(['reviewer']),
    mustResetPassword: false,
    username: 'reviewer',
    password: 'Admin12345678',
  },
  {
    adminUserId: 'admin-ops-1',
    displayName: '运营管理员演示账号',
    roleCodes: ['ops_admin'],
    permissionSummary: createMockPermissionSummary(['ops_admin']),
    mustResetPassword: false,
    username: 'opsadmin',
    password: 'Admin12345678',
  },
  {
    adminUserId: 'admin-super-1',
    displayName: '超级管理员演示账号',
    roleCodes: ['super_admin'],
    permissionSummary: createMockPermissionSummary(['super_admin']),
    mustResetPassword: true,
    username: 'superadmin',
    password: 'Admin12345678',
  },
]

const reviewRecords: ReviewRecord[] = [
  {
    reviewTaskId: 'rt_1001',
    noticeId: 'notice_1001',
    noticeTitle: '深圳新品探店短视频拍摄',
    publisherName: '星河传媒',
    identityType: 'company',
    city: '深圳',
    platform: '抖音',
    settlementType: '按条结算',
    riskLevel: 'high',
    riskFlags: ['联系方式异常', '历史举报偏高'],
    taskStatus: 'pending',
    reviewStage: 'manual_review',
    submittedAt: '2026-03-16T01:10:00.000Z',
    noticeStatus: 'pending_review',
    description: '需要 3 位达人到店拍摄新品探店内容，48 小时内交付。',
    budget: '800 - 1200 元 / 条',
    contactRiskHint: '文案中出现站外联系方式',
    images: ['/favicon.svg'],
    publisherProfileId: 'publisher_1001',
    contactType: 'wechat',
    contactValue: '品牌商务小助理',
    intro: '消费品品牌代理团队',
    historyLogs: [
      {
        logId: 'rlog_1001_1',
        actionType: 'created',
        operatorName: '系统派单',
        createdAt: '2026-03-16T01:10:00.000Z',
        remark: '任务进入人工审核队列',
      },
    ],
  },
  {
    reviewTaskId: 'rt_1002',
    noticeId: 'notice_1002',
    noticeTitle: '广州女装穿搭图文合作',
    publisherName: '花屿商贸',
    identityType: 'personal',
    city: '广州',
    platform: '小红书',
    settlementType: '按篇结算',
    riskLevel: 'medium',
    riskFlags: ['资料待补全'],
    taskStatus: 'claimed',
    reviewStage: 'manual_review',
    submittedAt: '2026-03-16T02:40:00.000Z',
    assignedToId: 'admin-reviewer-1',
    assignedToName: '审核员演示账号',
    claimedAt: '2026-03-16T03:00:00.000Z',
    noticeStatus: 'pending_review',
    description: '招募 2 位穿搭达人发布春装穿搭图文。',
    budget: '600 元 / 篇',
    images: ['/favicon.svg'],
    publisherProfileId: 'publisher_1002',
    contactType: 'mobile',
    contactValue: '138****5521',
    intro: '淘宝服饰店铺',
    historyLogs: [
      {
        logId: 'rlog_1002_1',
        actionType: 'claimed',
        operatorName: '审核员演示账号',
        createdAt: '2026-03-16T03:00:00.000Z',
        remark: '已领取任务',
      },
    ],
  },
  {
    reviewTaskId: 'rt_1003',
    noticeId: 'notice_1003',
    noticeTitle: '成都餐饮达人直播招商',
    publisherName: '蜀味集团',
    identityType: 'company',
    city: '成都',
    platform: '抖音',
    settlementType: '保底 + 佣金',
    riskLevel: 'low',
    riskFlags: [],
    taskStatus: 'resolved',
    reviewStage: 'final_review',
    submittedAt: '2026-03-15T11:20:00.000Z',
    assignedToId: 'admin-ops-1',
    assignedToName: '运营管理员演示账号',
    claimedAt: '2026-03-15T11:28:00.000Z',
    completedAt: '2026-03-15T11:40:00.000Z',
    reviewResult: 'approved',
    noticePublishedAt: '2026-03-15T11:40:00.000Z',
    noticeReviewRoundCount: 2,
    noticeBrandName: '蜀味集团',
    noticeCooperationCategory: 'food_beverage',
    noticeCooperationType: 'live_stream',
    noticeBudgetRange: '1000_3000',
    noticeRecruitCount: 3,
    noticeDeadlineAt: '2026-03-28T16:00:00.000Z',
    noticeCreatorRequirements: '本地探店直播经验优先。',
    noticeApplicationCount: 0,
    publisherUserId: 'user_5003',
    publisherStatus: 'complete',
    profileCompleteness: 100,
    publishCount: 7,
    approvedPublishCount: 6,
    violationCount: 0,
    noticeStatus: 'approved',
    description: '门店直播引流合作，提供直播间福利券。',
    images: ['/favicon.svg'],
    publisherProfileId: 'publisher_1003',
    contactType: 'wechat',
    contactValue: 'live_brand_ops',
    intro: '本地生活连锁品牌',
    historyLogs: [
      {
        logId: 'rlog_1003_1',
        actionType: 'approved',
        operatorName: '运营管理员演示账号',
        createdAt: '2026-03-15T11:40:00.000Z',
        remark: '审核通过',
      },
    ],
  },
]

const reportRecords: ReportRecord[] = [
  {
    reportId: 'rp_2001',
    status: 'pending',
    targetType: 'notice',
    targetId: 'notice_1001',
    targetName: '深圳新品探店短视频拍摄',
    reasonCode: 'contact_abuse',
    reportCount: 3,
    isHighRisk: true,
    createdAt: '2026-03-16T04:10:00.000Z',
    detailText: '举报人反馈要求站外私聊，存在导流嫌疑。',
    targetUserId: 'user_5001',
    targetSummary: '发布方账号近 7 日被举报 3 次',
    currentAccountStatus: 'active',
    targetCity: '深圳',
    historyReports: [
      {
        recordId: 'report_hist_2001_1',
        reporterLabel: '达人匿名用户 A',
        reasonCode: 'contact_abuse',
        createdAt: '2026-03-16T04:10:00.000Z',
      },
    ],
    historyActions: [],
  },
  {
    reportId: 'rp_2002',
    status: 'processing',
    targetType: 'creator',
    targetId: 'user_5002',
    targetName: '达人账号 user_5002',
    reasonCode: 'fraud',
    reportCount: 5,
    isHighRisk: true,
    createdAt: '2026-03-16T05:30:00.000Z',
    detailText: '举报人反馈存在虚假履约与额外收费。',
    targetUserId: 'user_5002',
    targetSummary: '达人账号近 30 日出现 5 次同类举报',
    currentAccountStatus: 'watchlist',
    handlerId: 'admin-ops-1',
    handlerName: '运营管理员演示账号',
    historyReports: [
      {
        recordId: 'report_hist_2002_1',
        reporterLabel: '商家匿名用户 B',
        reasonCode: 'fraud',
        createdAt: '2026-03-16T05:30:00.000Z',
      },
    ],
    historyActions: [
      {
        actionId: 'report_action_2002_1',
        actionType: 'claimed',
        operatorName: '运营管理员演示账号',
        createdAt: '2026-03-16T05:40:00.000Z',
        remark: '已领取举报任务',
      },
    ],
  },
  {
    reportId: 'rp_2003',
    status: 'closed',
    targetType: 'notice',
    targetId: 'notice_1003',
    targetName: '成都餐饮达人直播招商',
    reasonCode: 'illegal_content',
    reportCount: 1,
    isHighRisk: false,
    createdAt: '2026-03-15T07:18:00.000Z',
    detailText: '举报人反馈标题夸大。',
    targetUserId: 'user_5003',
    targetSummary: '抖音试吃探店，已下架',
    currentAccountStatus: 'removed',
    targetCity: '成都',
    handlerId: 'admin-ops-1',
    handlerName: '运营管理员演示账号',
    resultAction: 'restricted_publish',
    resultRemark: '举报成立并限制发布 7 天',
    historyReports: [
      {
        recordId: 'report_hist_2003_1',
        reporterLabel: '用户 C',
        reasonCode: 'illegal_content',
        createdAt: '2026-03-15T07:18:00.000Z',
      },
    ],
    historyActions: [
      {
        actionId: 'report_action_2003_1',
        actionType: 'report_resolve',
        operatorName: '运营管理员演示账号',
        createdAt: '2026-03-15T07:30:00.000Z',
        remark: '已处理完毕，当前只读',
      },
    ],
  },
]

const accountActions: MockAccountActionRecord[] = [
  {
    restrictionId: 'restrict_3001',
    userId: 'user_5002',
    restrictionType: 'restricted_publish',
    accountStatus: 'restricted_publish',
    reasonCategory: 'fraud',
    reasonText: '举报成立，限制发布 7 天',
    status: 'active',
    createdAt: '2026-03-15T08:00:00.000Z',
    endAt: '2026-03-30T00:00:00.000Z',
    operatorId: 'admin-ops-1',
    operatorName: '运营管理员演示账号',
  },
  {
    restrictionId: 'restrict_3002',
    userId: 'user_5004',
    restrictionType: 'watchlist',
    accountStatus: 'normal',
    reasonCategory: 'illegal_content',
    reasonText: '观察名单已解除，当前只读展示历史记录',
    status: 'released',
    createdAt: '2026-03-10T09:00:00.000Z',
    endAt: '2026-03-17T09:00:00.000Z',
    operatorId: 'admin-super-1',
    operatorName: '超级管理员演示账号',
  },
]

const operationLogs: MockOperationLogRecord[] = [
  {
    logId: 'oplog_4002',
    targetType: 'report',
    targetId: 'rp_2003',
    actionType: 'report_resolve',
    operatorName: '运营管理员演示账号',
    operatorType: 'ops_admin',
    operatorId: 'admin-ops-1',
    requestId: 'req_example_report_resolve_2',
    createdAt: '2026-03-15T07:30:00.000Z',
    remark: '举报成立并限制发布',
    beforeSnapshot: {
      status: 'processing',
      handlerId: 'admin-ops-1',
    },
    afterSnapshot: {
      status: 'closed',
      resultAction: 'restricted_publish',
      resultRemark: '举报成立并限制发布 7 天',
    },
  },
  {
    logId: 'oplog_4003',
    targetType: 'account_action',
    targetId: 'restrict_3001',
    actionType: 'account_action_create',
    operatorName: '运营管理员演示账号',
    operatorType: 'ops_admin',
    operatorId: 'admin-ops-1',
    requestId: 'req_example_account_action_create_2',
    createdAt: '2026-03-15T08:00:00.000Z',
    remark: '新增限制发布 7 天',
    beforeSnapshot: null,
    afterSnapshot: {
      status: 'active',
      restrictionType: 'restricted_publish',
      startAt: '2026-03-15T08:00:00.000Z',
      endAt: '2026-03-30T00:00:00.000Z',
    },
  },
  {
    logId: 'oplog_4004',
    targetType: 'account_action',
    targetId: 'restrict_3002',
    actionType: 'account_action_release',
    operatorName: '超级管理员演示账号',
    operatorType: 'super_admin',
    operatorId: 'admin-super-1',
    requestId: 'req_example_account_action_release_2',
    createdAt: '2026-03-17T09:00:00.000Z',
    remark: '解除观察名单',
    beforeSnapshot: {
      status: 'active',
    },
    afterSnapshot: {
      status: 'released',
      endAt: '2026-03-17T09:00:00.000Z',
    },
  },
  {
    logId: 'oplog_4005',
    targetType: 'notice',
    targetId: 'notice_1003',
    actionType: 'notice_force_remove',
    operatorName: '运营管理员演示账号',
    operatorType: 'ops_admin',
    operatorId: 'admin-ops-1',
    requestId: 'req_example_notice_force_remove_2',
    createdAt: '2026-03-15T07:28:00.000Z',
    remark: '强制下架违规通告',
    beforeSnapshot: {
      status: 'active',
      removedAt: null,
    },
    afterSnapshot: {
      status: 'removed',
      removedAt: '2026-03-15T07:28:00.000Z',
      latestReviewReasonCategory: 'illegal_content',
    },
  },
]

const sessions = new Map<string, MockSession>()

const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value)) as T
const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))
const MOCK_FORCE_ERROR_TOKEN = '[mock_force_error]'
const requestId = () => `mock-${Math.random().toString(36).slice(2, 10)}`
const containsMockForceError = (...values: Array<unknown>) => {
  return values.some((value) => typeof value === 'string' && value.includes(MOCK_FORCE_ERROR_TOKEN))
}
const now = () => new Date()
const addHours = (date: Date, hours: number) => new Date(date.getTime() + hours * 60 * 60 * 1000).toISOString()

const success = <T>(data: T): ServiceResponse<T> => ({
  code: 0,
  message: 'ok',
  data,
  requestId: requestId(),
})

const failure = (code: number, message: string, data: Record<string, any> = {}): ServiceResponse<Record<string, any>> => ({
  code,
  message,
  data,
  requestId: requestId(),
})

const paginate = <T>(list: T[], pageSize = 10, cursor = ''): CursorListResult<T> => {
  const startIndex = cursor ? Number(cursor) : 0
  const nextIndex = startIndex + pageSize
  return {
    list: clone(list.slice(startIndex, nextIndex)),
    nextCursor: nextIndex < list.length ? String(nextIndex) : '',
    hasMore: nextIndex < list.length,
  }
}

const createSession = (adminUserId: string) => {
  const token = `token_${Math.random().toString(36).slice(2, 14)}`
  const expiresAt = addHours(now(), 12)
  const idleExpireAt = addHours(now(), 2)
  sessions.set(token, { adminUserId, expiresAt, idleExpireAt })
  return { token, expiresAt, idleExpireAt }
}

const getCurrentAdmin = (request: ServiceRequest<Record<string, any>>) => {
  const sessionToken = request.meta.adminSessionToken
  if (!sessionToken) {
    return failure(30002, '后台登录态失效')
  }

  const session = sessions.get(sessionToken)
  if (!session) {
    return failure(30002, '后台登录态失效')
  }

  const currentTime = now().toISOString()
  if (session.expiresAt < currentTime || session.idleExpireAt < currentTime) {
    sessions.delete(sessionToken)
    return failure(30002, '后台登录态失效')
  }

  session.idleExpireAt = addHours(now(), 2)
  const admin = mockAdmins.find((item) => item.adminUserId === session.adminUserId)
  if (!admin) {
    return failure(30002, '后台登录态失效')
  }

  return admin
}

const pushOperationLog = (partial: Omit<MockOperationLogRecord, 'logId' | 'createdAt'>) => {
  operationLogs.unshift({
    logId: `oplog_${Math.random().toString(36).slice(2, 10)}`,
    createdAt: now().toISOString(),
    ...partial,
  })
}

const normalizeReviewTaskStatus = (taskStatus: string) => {
  if (taskStatus === 'claimed') {
    return 'processing'
  }
  if (taskStatus === 'resolved') {
    return 'completed'
  }
  if (taskStatus === 'cancelled') {
    return 'cancelled'
  }
  return 'pending'
}

const normalizeReviewStage = (reviewStage: string) => {
  if (reviewStage === 'machine_review') {
    return 'initial_review'
  }
  if (reviewStage === 'final_review') {
    return 'resubmission_review'
  }
  return reviewStage || 'manual_review'
}

const resolveQueueType = (reviewStage: string) => {
  if (reviewStage === 'machine_review') {
    return 'initial_review_queue'
  }
  if (reviewStage === 'final_review') {
    return 'resubmission_review_queue'
  }
  return 'manual_review_queue'
}

const buildActionOption = (key: string, label: string, variant: 'default' | 'primary' | 'danger' = 'default', danger = false) => ({
  key,
  label,
  variant,
  disabled: false,
  disabledReason: null,
  danger,
})

const buildDisabledActionOption = (
  key: string,
  label: string,
  disabledReason: string,
  variant: 'default' | 'primary' | 'danger' = 'default',
  danger = false,
) => ({
  key,
  label,
  variant,
  disabled: true,
  disabledReason,
  danger,
})

const toReviewHistoryLogItem = (item: MockReviewHistoryLog) => ({
  action: item.actionType,
  operatorType: 'admin',
  operatorId: '',
  operatorDisplayName: item.operatorName,
  remark: item.remark,
  createdAt: item.createdAt,
})

const toReviewListItem = (record: ReviewRecord): Record<string, any> => ({
  reviewTaskId: record.reviewTaskId,
  taskStatus: normalizeReviewTaskStatus(record.taskStatus),
  reviewStage: normalizeReviewStage(record.reviewStage),
  queueType: resolveQueueType(record.reviewStage),
  riskLevel: record.riskLevel,
  riskFlags: record.riskFlags,
  createdAt: record.submittedAt,
  claimedAt: record.claimedAt || null,
  notice: {
    noticeId: record.noticeId,
    title: record.noticeTitle,
    status: record.noticeStatus,
    city: record.city,
    cooperationPlatform: record.platform,
    settlementType: record.settlementType,
    budgetSummary: record.budget || '',
  },
  publisher: {
    publisherUserId: '',
    publisherProfileId: record.publisherProfileId,
    displayName: record.publisherName,
    identityType: record.identityType,
    city: record.city,
  },
  assignedAdmin: record.assignedToId
    ? {
        adminUserId: record.assignedToId,
        displayName: record.assignedToName || record.assignedToId,
      }
    : null,
})

const reviewActionsFor = (record: ReviewRecord, admin: MockAdminUser): Array<Record<string, any>> => {
  if (record.taskStatus === 'pending') {
    return [buildActionOption(ADMIN_AVAILABLE_ACTION_KEYS.CLAIM_TASK, '领取任务', 'primary')]
  }

  if (record.taskStatus === 'claimed' && record.assignedToId === admin.adminUserId) {
    return [
      buildActionOption(ADMIN_AVAILABLE_ACTION_KEYS.RELEASE_TASK, '释放任务'),
      buildActionOption(ADMIN_AVAILABLE_ACTION_KEYS.RESOLVE_TASK_APPROVED, '通过', 'primary'),
      buildActionOption(ADMIN_AVAILABLE_ACTION_KEYS.RESOLVE_TASK_REJECTED, '驳回', 'danger', true),
      buildActionOption(ADMIN_AVAILABLE_ACTION_KEYS.RESOLVE_TASK_SUPPLEMENT_REQUIRED, '需补资料'),
      buildActionOption(ADMIN_AVAILABLE_ACTION_KEYS.RESOLVE_TASK_TRANSFER_MANUAL_REVIEW, '转复核'),
      buildActionOption(ADMIN_AVAILABLE_ACTION_KEYS.RESOLVE_TASK_REMOVED, '直接下架', 'danger', true),
    ]
  }

  if (record.taskStatus === 'claimed') {
    const disabledReason = '任务已被其他管理员领取，当前仅可查看'
    return [
      buildDisabledActionOption(ADMIN_AVAILABLE_ACTION_KEYS.RELEASE_TASK, '释放任务', disabledReason),
      buildDisabledActionOption(ADMIN_AVAILABLE_ACTION_KEYS.RESOLVE_TASK_APPROVED, '通过', disabledReason, 'primary'),
    ]
  }

  if (record.taskStatus === 'resolved') {
    const disabledReason = '任务已处理完毕，当前仅可查看历史结果'
    return [buildDisabledActionOption(ADMIN_AVAILABLE_ACTION_KEYS.RESOLVE_TASK_APPROVED, '通过', disabledReason, 'primary')]
  }

  return []
}

const toReviewDetail = (record: ReviewRecord, admin: MockAdminUser): Record<string, any> => ({
  task: {
    reviewTaskId: record.reviewTaskId,
    objectType: 'notice',
    objectId: record.noticeId,
    noticeStatusSnapshot: record.noticeStatus,
    reviewStage: normalizeReviewStage(record.reviewStage),
    taskStatus: normalizeReviewTaskStatus(record.taskStatus),
    queueType: resolveQueueType(record.reviewStage),
    riskLevel: record.riskLevel,
    riskFlags: record.riskFlags,
    assignedTo: record.assignedToId || null,
    assignedAdminName: record.assignedToName || null,
    claimedAt: record.claimedAt || null,
    completedAt: record.completedAt || null,
    reviewResult: record.reviewResult || null,
    reasonCategory: record.reasonCategory || null,
    reasonText: record.reasonText || null,
    nextQueueType: record.nextQueueType || null,
    createdAt: record.submittedAt,
  },
  notice: {
    noticeId: record.noticeId,
    publisherUserId: record.publisherUserId || '',
    publisherProfileId: record.publisherProfileId,
    title: record.noticeTitle,
    brandName: record.noticeBrandName || null,
    identityTypeSnapshot: record.identityType,
    cooperationPlatform: record.platform,
    cooperationCategory: record.noticeCooperationCategory || '',
    cooperationType: record.noticeCooperationType || '',
    city: record.city,
    settlementType: record.settlementType,
    budgetRange: record.noticeBudgetRange || '',
    budgetSummary: record.budget || '',
    recruitCount: record.noticeRecruitCount ?? null,
    deadlineAt: record.noticeDeadlineAt || '',
    creatorRequirements: record.noticeCreatorRequirements || '',
    cooperationDescription: record.description,
    attachments: record.images,
    status: record.noticeStatus,
    reviewRoundCount: record.noticeReviewRoundCount || 0,
    latestReviewReasonCategory: record.reasonCategory || null,
    latestReviewReasonText: record.reasonText || null,
    riskFlags: record.riskFlags,
    applicationCount: record.noticeApplicationCount || 0,
    publishedAt: record.noticePublishedAt || null,
    closedAt: record.noticeClosedAt || null,
    removedAt: record.noticeRemovedAt || null,
  },
  publisherProfile: {
    publisherProfileId: record.publisherProfileId,
    userId: record.publisherUserId || '',
    identityType: record.identityType,
    displayName: record.publisherName,
    city: record.city,
    contactType: record.contactType,
    contactValue: record.contactValue,
    intro: record.intro || null,
    profileCompleteness: record.profileCompleteness || 0,
    publishCount: record.publishCount || 0,
    approvedPublishCount: record.approvedPublishCount || 0,
    violationCount: record.violationCount || 0,
    status: record.publisherStatus || '',
  },
  riskSummary: {
    riskLevel: record.riskLevel,
    riskFlags: record.riskFlags,
    suggestedTags: record.contactRiskHint ? [record.contactRiskHint] : ['当前风险提示仅用于骨架联调展示'],
  },
  historyLogs: clone(record.historyLogs).map((item: MockReviewHistoryLog) => toReviewHistoryLogItem(item)),
  availableActions: reviewActionsFor(record, admin),
})

const reportActionsFor = (record: ReportRecord, admin: MockAdminUser): Array<Record<string, any>> => {
  if (record.status === 'pending') {
    return [buildActionOption(ADMIN_AVAILABLE_ACTION_KEYS.CLAIM_REPORT, '领取举报', 'primary')]
  }

  if (record.status === 'processing' && record.handlerId === admin.adminUserId) {
    const baseActions: Array<Record<string, any>> = [
      buildActionOption(ADMIN_AVAILABLE_ACTION_KEYS.RESOLVE_REPORT_REJECTED, '举报不成立'),
      buildActionOption(ADMIN_AVAILABLE_ACTION_KEYS.RESOLVE_REPORT_CONFIRMED_RECORD_ONLY, '成立仅记录', 'primary'),
    ]

    const canGovern = admin.roleCodes.includes('ops_admin') || admin.roleCodes.includes('super_admin')
    if (canGovern) {
      baseActions.push(
        buildActionOption(ADMIN_AVAILABLE_ACTION_KEYS.RESOLVE_REPORT_CONFIRMED_REMOVE_NOTICE, '成立并下架', 'danger', true),
        buildActionOption(ADMIN_AVAILABLE_ACTION_KEYS.RESOLVE_REPORT_CONFIRMED_WATCHLIST, '加入观察名单'),
        buildActionOption(ADMIN_AVAILABLE_ACTION_KEYS.RESOLVE_REPORT_CONFIRMED_RESTRICT_PUBLISH, '限制发布', 'danger', true),
        buildActionOption(ADMIN_AVAILABLE_ACTION_KEYS.RESOLVE_REPORT_CONFIRMED_RESTRICT_APPLY, '限制报名', 'danger', true),
        buildActionOption(ADMIN_AVAILABLE_ACTION_KEYS.RESOLVE_REPORT_CONFIRMED_BANNED, '封禁账号', 'danger', true),
      )
    }

    return baseActions
  }

  if (record.status === 'processing') {
    return [
      buildDisabledActionOption(
        ADMIN_AVAILABLE_ACTION_KEYS.RESOLVE_REPORT_REJECTED,
        '举报不成立',
        '举报已被其他管理员接手，当前仅可查看',
      ),
    ]
  }

  if (['resolved', 'closed'].includes(record.status)) {
    const readonlyActionKey =
      record.resultAction === 'restricted_publish'
        ? ADMIN_AVAILABLE_ACTION_KEYS.RESOLVE_REPORT_CONFIRMED_RESTRICT_PUBLISH
        : ADMIN_AVAILABLE_ACTION_KEYS.RESOLVE_REPORT_REJECTED
    const readonlyActionLabel = record.resultAction === 'restricted_publish' ? '举报成立并限制发布' : '举报不成立'
    return [
      buildDisabledActionOption(readonlyActionKey, readonlyActionLabel, '当前举报已处理完毕，当前仅可查看历史结果', 'danger'),
    ]
  }

  return []
}

const toReportHistoryItem = (item: ReportRecord['historyReports'][number]) => ({
  reportId: item.recordId,
  reasonCode: item.reasonCode,
  status: 'closed',
  reporterUserId: item.reporterLabel,
  createdAt: item.createdAt,
})

const toReportHistoryActionItem = (item: ReportRecord['historyActions'][number], targetId: string) => ({
  action: item.actionType,
  operatorType: 'admin',
  operatorId: '',
  operatorDisplayName: item.operatorName,
  remark: item.remark,
  createdAt: item.createdAt,
  targetType: 'report',
  targetId,
})

const toReportListItem = (record: ReportRecord): Record<string, any> => ({
  reportId: record.reportId,
  targetType: record.targetType,
  targetId: record.targetId,
  targetDisplayName: record.targetName,
  reasonCode: record.reasonCode,
  status: record.status,
  aggregatedReportCount: record.reportCount,
  isHighRisk: record.isHighRisk,
  createdAt: record.createdAt,
  handlerId: record.handlerId || null,
  resultAction: record.resultAction || null,
})

const toReportDetail = (record: ReportRecord, admin: MockAdminUser): Record<string, any> => ({
  report: {
    reportId: record.reportId,
    reporterUserId: '',
    targetType: record.targetType,
    targetId: record.targetId,
    reasonCode: record.reasonCode,
    reasonText: record.detailText,
    evidenceImages: [],
    status: record.status,
    handlerId: record.handlerId || null,
    resultAction: record.resultAction || null,
    resultRemark: record.resultRemark || null,
    createdAt: record.createdAt,
  },
  targetSnapshot: {
    targetType: record.targetType,
    targetId: record.targetId,
    displayName: record.targetName,
    status: record.currentAccountStatus,
    ownerUserId: record.targetUserId,
    city: record.targetCity || null,
    summary: record.targetSummary,
    riskSummary: {
      riskLevel: record.isHighRisk ? 'high' : 'low',
      riskFlags: record.isHighRisk ? ['multi_reports'] : [],
      suggestedTags: record.isHighRisk ? ['建议优先核查处理'] : ['已处理完毕，供历史查看'],
    },
  },
  historyReports: clone(record.historyReports).map((item: ReportRecord['historyReports'][number]) => toReportHistoryItem(item)),
  historyActions: clone(record.historyActions).map((item: ReportRecord['historyActions'][number]) =>
    toReportHistoryActionItem(item, record.reportId),
  ),
  availableActions: reportActionsFor(record, admin),
})

const toAccountActionListItem = (item: MockAccountActionRecord): Record<string, any> => ({
  restrictionId: item.restrictionId,
  user: {
    userId: item.userId,
    displayName: item.userId,
    avatarUrl: null,
    accountStatus: item.accountStatus,
  },
  restrictionType: item.restrictionType,
  reasonCategory: item.reasonCategory,
  reasonText: item.reasonText || null,
  startAt: item.createdAt,
  endAt: item.endAt || null,
  operator: {
    operatorId: item.operatorId || '',
    displayName: item.operatorName,
  },
  status: item.status,
  createdAt: item.createdAt,
})

const toOperationLogListItem = (item: MockOperationLogRecord): Record<string, any> => ({
  logId: item.logId,
  targetType: item.targetType,
  targetId: item.targetId,
  action: item.actionType,
  operatorType: item.operatorType,
  operatorId: item.operatorId || '',
  operatorDisplayName: item.operatorName,
  requestId: item.requestId || '',
  remark: item.remark,
  createdAt: item.createdAt,
  beforeSnapshot: item.beforeSnapshot || null,
  afterSnapshot: item.afterSnapshot || (item.result ? { status: item.result } : null),
})

const validatePassword = (payload: ChangePasswordPayload) => {
  const hasNumber = /\d/.test(payload.newPassword)
  const hasLetter = /[A-Za-z]/.test(payload.newPassword)
  return payload.newPassword.length >= 12 && hasNumber && hasLetter
}

const handleAdminAuth = (action: string, request: ServiceRequest<Record<string, any>>) => {
  if (action === 'login') {
    const payload = request.payload as LoginPayload
    const admin = mockAdmins.find((item) => item.username === payload.username)
    if (!admin || admin.password !== payload.password) {
      return failure(40003, '用户名或密码错误', { fieldErrors: { password: '用户名或密码错误' } })
    }

    const session = createSession(admin.adminUserId)
    pushOperationLog({
      targetType: 'admin-auth',
      targetId: admin.adminUserId,
      actionType: 'login',
      result: 'success',
      operatorName: admin.displayName,
      operatorType: admin.roleCodes[0],
      remark: '后台登录成功',
    })

    const result: LoginResult = {
      adminUser: {
        adminUserId: admin.adminUserId,
        displayName: admin.displayName,
        roleCodes: admin.roleCodes,
      },
      session: {
        adminSessionToken: session.token,
        expiresAt: session.expiresAt,
        idleExpireAt: session.idleExpireAt,
        mustResetPassword: admin.mustResetPassword,
      },
    }

    return success(result)
  }

  const admin = getCurrentAdmin(request)
  if ('code' in admin) {
    return admin
  }

  if (action === 'me') {
    return success(clone(admin))
  }

  if (action === 'logout') {
    const sessionToken = request.meta.adminSessionToken ?? ''
    sessions.delete(sessionToken)
    pushOperationLog({
      targetType: 'admin-auth',
      targetId: admin.adminUserId,
      actionType: 'logout',
      result: 'success',
      operatorName: admin.displayName,
      operatorType: admin.roleCodes[0],
      remark: '主动登出',
    })
    return success({ success: true })
  }

  if (action === 'changePassword') {
    const payload = request.payload as ChangePasswordPayload
    if (admin.password !== payload.oldPassword) {
      return failure(40003, '旧密码错误', { fieldErrors: { oldPassword: '旧密码错误' } })
    }
    if (!validatePassword(payload)) {
      return failure(40003, '新密码不符合安全策略', {
        fieldErrors: { newPassword: '至少 12 位，且同时包含字母与数字' },
      })
    }

    admin.password = payload.newPassword
    admin.mustResetPassword = false
    pushOperationLog({
      targetType: 'admin-auth',
      targetId: admin.adminUserId,
      actionType: 'change-password',
      result: 'success',
      operatorName: admin.displayName,
      operatorType: admin.roleCodes[0],
      remark: '完成密码修改',
    })
    return success({ success: true, logoutOtherSessions: false })
  }

  return failure(40003, '不支持的后台鉴权动作')
}

const handleReviewAdmin = (action: string, request: ServiceRequest<Record<string, any>>) => {
  const admin = getCurrentAdmin(request)
  if ('code' in admin) {
    return admin
  }

  if (action === 'taskList') {
    const { taskStatus = '', reviewStage = '', city = '', identityType = '', riskLevel = '', pageSize = 10, cursor = '' } = request.payload
    const filtered = reviewRecords
      .filter((item) => !taskStatus || item.taskStatus === taskStatus)
      .filter((item) => !reviewStage || item.reviewStage === reviewStage)
      .filter((item) => !city || item.city === city)
      .filter((item) => !identityType || item.identityType === identityType)
      .filter((item) => !riskLevel || item.riskLevel === riskLevel)
      .map(toReviewListItem)

    const result = paginate(filtered, Number(pageSize), cursor) as CursorListResult<Record<string, any>> & { summary?: Record<string, any> }
    result.summary = {
      pendingCount: reviewRecords.filter((item) => item.taskStatus === 'pending').length,
    }
    return success(result)
  }

  const reviewTaskId = String(request.payload.reviewTaskId ?? '')
  const record = reviewRecords.find((item) => item.reviewTaskId === reviewTaskId)
  if (!record) {
    return failure(40003, '审核任务不存在')
  }

  if (action === 'taskDetail') {
    return success(toReviewDetail(record, admin))
  }

  if (action === 'claimTask') {
    if (record.taskStatus !== 'pending') {
      return failure(60001, '审核任务已被处理')
    }
    record.taskStatus = 'claimed'
    record.assignedToId = admin.adminUserId
    record.assignedToName = admin.displayName
    record.claimedAt = now().toISOString()
    record.historyLogs.unshift({
      logId: `rlog_${Math.random().toString(36).slice(2, 10)}`,
      actionType: 'claimed',
      operatorName: admin.displayName,
      createdAt: now().toISOString(),
      remark: '领取任务成功',
    })
    pushOperationLog({
      targetType: 'review-task',
      targetId: record.reviewTaskId,
      actionType: 'claim',
      result: 'success',
      operatorName: admin.displayName,
      operatorType: admin.roleCodes[0],
      remark: '领取审核任务',
    })
    return success({
      reviewTaskId: record.reviewTaskId,
      taskStatus: record.taskStatus,
      assignedTo: admin.displayName,
      claimedAt: record.claimedAt,
    })
  }

  if (action === 'releaseTask') {
    if (record.assignedToId !== admin.adminUserId || record.taskStatus !== 'claimed') {
      return failure(30003, '当前任务不可释放')
    }
    record.taskStatus = 'pending'
    record.assignedToId = undefined
    record.assignedToName = undefined
    record.claimedAt = undefined
    record.historyLogs.unshift({
      logId: `rlog_${Math.random().toString(36).slice(2, 10)}`,
      actionType: 'released',
      operatorName: admin.displayName,
      createdAt: now().toISOString(),
      remark: '已释放任务',
    })
    return success({ reviewTaskId: record.reviewTaskId, taskStatus: record.taskStatus })
  }

  if (action === 'resolveTask') {
    const payload = request.payload as ResolveTaskPayload
    if (record.assignedToId !== admin.adminUserId || record.taskStatus !== 'claimed') {
      return failure(60001, '任务已被他人处理或未领取')
    }
    if (payload.reviewResult !== 'approved' && !payload.reasonCategory) {
      return failure(40003, '缺少原因分类', { fieldErrors: { reasonCategory: '请选择原因分类' } })
    }
    if (payload.reviewResult === 'transfer_manual_review' && !payload.nextQueueType) {
      return failure(40003, '缺少复核队列', { fieldErrors: { nextQueueType: '请选择复核队列' } })
    }
    if (containsMockForceError(payload.reasonText)) {
      return failure(50001, 'Mock 调试失败：审核动作未提交', { debug: 'resolveTask' })
    }

    record.taskStatus = 'resolved'
    record.noticeStatus = payload.reviewResult === 'approved' ? 'approved' : 'rejected'
    record.historyLogs.unshift({
      logId: `rlog_${Math.random().toString(36).slice(2, 10)}`,
      actionType: payload.reviewResult,
      operatorName: admin.displayName,
      createdAt: now().toISOString(),
      remark: payload.reasonText || payload.reasonCategory || '已完成审核处理',
    })
    record.completedAt = now().toISOString()
    record.reviewResult = payload.reviewResult
    record.reasonCategory = payload.reasonCategory
    record.reasonText = payload.reasonText
    record.nextQueueType = payload.nextQueueType
    if (payload.reviewResult === 'approved') {
      record.noticePublishedAt = record.completedAt
    }
    pushOperationLog({
      targetType: 'review_task',
      targetId: record.reviewTaskId,
      actionType: 'review_task_resolve',
      operatorName: admin.displayName,
      operatorType: admin.roleCodes[0],
      operatorId: admin.adminUserId,
      remark: payload.reasonText || '审核处理完成',
      beforeSnapshot: {
        status: 'processing',
        assignedTo: admin.adminUserId,
      },
      afterSnapshot: {
        status: 'completed',
        reviewResult: payload.reviewResult,
        resultRemark: payload.reasonText || '',
        latestReviewReasonCategory: payload.reasonCategory || '',
      },
    })
    return success({
      reviewTaskId: record.reviewTaskId,
      taskStatus: record.taskStatus,
      noticeStatus: record.noticeStatus,
      nextReviewTaskId: '',
    })
  }

  return failure(40003, '不支持的审核动作')
}

const handleGovernanceAdmin = (action: string, request: ServiceRequest<Record<string, any>>) => {
  const admin = getCurrentAdmin(request)
  if ('code' in admin) {
    return admin
  }

  if (action === 'dashboard') {
    const result = {
      reviewPendingCount: reviewRecords.filter((item) => item.taskStatus !== 'resolved').length,
      reportPendingCount: reportRecords.filter((item) => !['resolved', 'closed'].includes(item.status)).length,
      todayNoticeCount: reviewRecords.length,
      todayApprovedCount: reviewRecords.filter((item) => item.noticeStatus === 'approved').length,
      todayRejectedCount: reviewRecords.filter((item) => item.noticeStatus === 'rejected').length,
      todayNewBlacklistCount: accountActions.filter((item) => item.status === 'active').length,
      priorityItems: [
        ...reviewRecords.filter((item) => item.riskLevel === 'high').map((item) => ({
          itemId: item.reviewTaskId,
          itemType: 'review_task' as const,
          title: item.noticeTitle,
          summary: `审核任务 · ${item.city} · ${normalizeReviewStage(item.reviewStage)}`,
          status: normalizeReviewTaskStatus(item.taskStatus),
          riskLevel: item.riskLevel,
          createdAt: item.submittedAt,
          routeKey: 'review-detail',
          routeParams: { reviewTaskId: item.reviewTaskId },
        })),
        ...reportRecords.filter((item) => item.isHighRisk).map((item) => ({
          itemId: item.reportId,
          itemType: 'report' as const,
          title: item.targetName,
          summary: `举报任务 · ${item.reasonCode}`,
          status: item.status,
          riskLevel: item.isHighRisk ? 'high' : 'low',
          createdAt: item.createdAt,
          routeKey: 'report-detail',
          routeParams: { reportId: item.reportId },
        })),
        ...accountActions.filter((item) => item.status === 'active').map((item) => ({
          itemId: item.restrictionId,
          itemType: 'account_action' as const,
          title: '新治理动作',
          summary: `处罚记录 · ${item.restrictionType}`,
          status: item.status,
          riskLevel: item.restrictionType === 'banned' ? 'high' : item.restrictionType === 'watchlist' ? 'medium' : 'low',
          createdAt: item.createdAt,
          routeKey: 'account-action-list',
          routeParams: {
            restrictionId: item.restrictionId,
            userId: item.userId,
          },
        })),
      ].slice(0, 5),
    }
    return success(result)
  }

  if (action === 'reportList') {
    const { status = '', targetType = '', reasonCode = '', pageSize = 10, cursor = '' } = request.payload
    const filtered = reportRecords
      .filter((item) => !status || item.status === status)
      .filter((item) => !targetType || item.targetType === targetType)
      .filter((item) => !reasonCode || item.reasonCode === reasonCode)
      .map(toReportListItem)

    return success(paginate(filtered, Number(pageSize), cursor))
  }

  if (action === 'reportDetail') {
    const record = reportRecords.find((item) => item.reportId === String(request.payload.reportId))
    if (!record) {
      return failure(40003, '举报记录不存在')
    }
    return success(toReportDetail(record, admin))
  }

  if (action === 'claimReport') {
    const record = reportRecords.find((item) => item.reportId === String(request.payload.reportId))
    if (!record || record.status !== 'pending') {
      return failure(60001, '举报任务已被处理')
    }
    record.status = 'processing'
    record.handlerId = admin.adminUserId
    record.handlerName = admin.displayName
    record.historyActions.unshift({
      actionId: `report_action_${Math.random().toString(36).slice(2, 10)}`,
      actionType: 'claimed',
      operatorName: admin.displayName,
      createdAt: now().toISOString(),
      remark: '已领取举报任务',
    })
    return success({ reportId: record.reportId, status: record.status, handlerId: admin.adminUserId })
  }

  if (action === 'resolveReport') {
    const payload = request.payload as ResolveReportPayload
    const record = reportRecords.find((item) => item.reportId === payload.reportId)
    if (!record || record.status !== 'processing' || record.handlerId !== admin.adminUserId) {
      return failure(60001, '举报任务已被他人处理或未领取')
    }
    if (payload.result === 'confirmed' && !payload.resultAction) {
      return failure(40003, '缺少处理动作', { fieldErrors: { resultAction: '请选择处理动作' } })
    }
    if (containsMockForceError(payload.resultRemark, payload.accountAction?.reasonText)) {
      return failure(50001, 'Mock 调试失败：举报处理未提交', { debug: 'resolveReport' })
    }

    let linkedNoticeStatus = 'unchanged'
    let linkedAccountStatus = record.currentAccountStatus

    if (payload.resultAction === 'remove_notice' || payload.noticeAction === 'remove_notice') {
      linkedNoticeStatus = 'removed'
    }

    if (payload.accountAction) {
      const newAction: MockAccountActionRecord = {
        restrictionId: `restrict_${Math.random().toString(36).slice(2, 10)}`,
        userId: payload.accountAction.userId,
        restrictionType: payload.accountAction.restrictionType,
        accountStatus: payload.accountAction.restrictionType,
        reasonCategory: payload.accountAction.reasonCategory,
        reasonText: payload.accountAction.reasonText,
        status: 'active',
        createdAt: now().toISOString(),
        endAt: payload.accountAction.endAt,
        operatorId: admin.adminUserId,
        operatorName: admin.displayName,
      }
      accountActions.unshift(newAction)
      linkedAccountStatus = payload.accountAction.restrictionType
    }

    record.currentAccountStatus = record.targetType !== 'notice' ? linkedAccountStatus : record.currentAccountStatus
    record.historyActions.unshift({
      actionId: `report_action_${Math.random().toString(36).slice(2, 10)}`,
      actionType: payload.resultAction || payload.result,
      operatorName: admin.displayName,
      createdAt: now().toISOString(),
      remark: payload.resultRemark || '举报处理完成',
    })
    record.status = 'closed'
    record.resultAction = payload.resultAction || undefined
    record.resultRemark = payload.resultRemark || undefined
    if (linkedNoticeStatus === 'removed') {
      record.currentAccountStatus = 'removed'
    }
    record.historyActions[0].actionType = 'report_resolve'
    pushOperationLog({
      targetType: 'report',
      targetId: record.reportId,
      actionType: 'report_resolve',
      operatorName: admin.displayName,
      operatorType: admin.roleCodes[0],
      operatorId: admin.adminUserId,
      remark: payload.resultRemark || '完成举报处理',
      beforeSnapshot: {
        status: 'processing',
        handlerId: admin.adminUserId,
      },
      afterSnapshot: {
        status: 'closed',
        resultAction: payload.resultAction || payload.result,
        resultRemark: payload.resultRemark || '',
      },
    })
    return success({ reportId: record.reportId, status: record.status, linkedNoticeStatus, linkedAccountStatus })
  }

  if (action === 'accountActionList') {
    const { userId = '', restrictionType = '', status = '', pageSize = 10, cursor = '' } = request.payload
    const filtered = accountActions
      .filter((item) => !userId || item.userId === userId)
      .filter((item) => !restrictionType || item.restrictionType === restrictionType)
      .filter((item) => !status || item.status === status)
    return success(paginate(filtered.map((item) => toAccountActionListItem(item)), Number(pageSize), cursor))
  }

  if (action === 'createAccountAction') {
    const payload = request.payload as CreateAccountActionPayload
    if (containsMockForceError(payload.reasonText)) {
      return failure(50001, 'Mock 调试失败：新增处罚未提交', { debug: 'createAccountAction' })
    }
    const newRecord: MockAccountActionRecord = {
      restrictionId: `restrict_${Math.random().toString(36).slice(2, 10)}`,
      userId: payload.userId,
      restrictionType: payload.restrictionType,
      accountStatus: payload.restrictionType,
      reasonCategory: payload.reasonCategory,
      reasonText: payload.reasonText,
      status: 'active',
      createdAt: payload.startAt || now().toISOString(),
      endAt: payload.endAt,
      operatorId: admin.adminUserId,
      operatorName: admin.displayName,
    }
    accountActions.unshift(newRecord)
    pushOperationLog({
      targetType: 'account_action',
      targetId: newRecord.restrictionId,
      actionType: 'account_action_create',
      operatorName: admin.displayName,
      operatorType: admin.roleCodes[0],
      operatorId: admin.adminUserId,
      remark: payload.reasonText || payload.reasonCategory,
      beforeSnapshot: null,
      afterSnapshot: {
        status: 'active',
        restrictionType: newRecord.restrictionType,
        startAt: newRecord.createdAt,
        endAt: newRecord.endAt || null,
      },
    })
    return success({ restrictionId: newRecord.restrictionId, accountStatus: payload.restrictionType })
  }

  if (action === 'releaseAccountAction') {
    const payload = request.payload as ReleaseAccountActionPayload
    if (containsMockForceError(payload.reasonText)) {
      return failure(50001, 'Mock 调试失败：解除处罚未提交', { debug: 'releaseAccountAction' })
    }
    const record = accountActions.find((item) => item.restrictionId === payload.restrictionId)
    if (!record) {
      return failure(40003, '处罚记录不存在')
    }
    record.status = 'released'
    record.accountStatus = 'normal'
    record.endAt = now().toISOString()
    pushOperationLog({
      targetType: 'account_action',
      targetId: record.restrictionId,
      actionType: 'account_action_release',
      operatorName: admin.displayName,
      operatorType: admin.roleCodes[0],
      operatorId: admin.adminUserId,
      remark: payload.reasonText || '提前解除处罚',
      beforeSnapshot: {
        status: 'active',
      },
      afterSnapshot: {
        status: 'released',
        endAt: record.endAt,
      },
    })
    return success({ restrictionId: record.restrictionId, status: record.status, accountStatus: 'normal' })
  }

  if (action === 'forceRemoveNotice') {
    const removedAt = now().toISOString()
    pushOperationLog({
      targetType: 'notice',
      targetId: String(request.payload.noticeId),
      actionType: 'notice_force_remove',
      operatorName: admin.displayName,
      operatorType: admin.roleCodes[0],
      operatorId: admin.adminUserId,
      remark: request.payload.reasonText || request.payload.reasonCategory,
      beforeSnapshot: {
        status: 'active',
        removedAt: null,
      },
      afterSnapshot: {
        status: 'removed',
        removedAt,
        latestReviewReasonCategory: request.payload.reasonCategory || '',
      },
    })
    return success({ noticeId: String(request.payload.noticeId), status: 'removed', removedAt })
  }

  if (action === 'operationLogList') {
    const { targetType = '', targetId = '', operatorType = '', pageSize = 10, cursor = '' } = request.payload
    const filtered = operationLogs
      .filter((item) => !targetType || item.targetType === targetType)
      .filter((item) => !targetId || item.targetId.includes(targetId))
      .filter((item) => !operatorType || item.operatorType === operatorType)
    return success(paginate(filtered.map((item) => toOperationLogListItem(item)), Number(pageSize), cursor))
  }

  return failure(40003, '不支持的治理动作')
}

export const dispatchMockRequest = async ({ moduleName, request }: MockDispatchParams) => {
  await wait(MOCK_NETWORK_DELAY)

  if (moduleName === 'admin-auth') {
    return handleAdminAuth(request.action, request)
  }

  if (moduleName === 'review-admin') {
    return handleReviewAdmin(request.action, request)
  }

  if (moduleName === 'governance-admin') {
    return handleGovernanceAdmin(request.action, request)
  }

  return failure(40003, '未支持的 mock 模块')
}
