import { COLLECTIONS } from '../constants/collections'
import { ACCOUNT_STATUSES } from '../enums/account-status'
import { countByWhere } from '../db/repository'
import { UserContext } from '../types'
import { getCreatorCard } from './creator-bff-service'
import { getUnreadMessageCount } from './message-service'
import { getPublisherProfile } from './publisher-bff-service'
import { MineSummaryResponseData } from '../contracts/miniprogram/user-bff'

const QUICK_ACTION_ROUTES = {
  noticeList: '/packages/publish/notice-list/index',
  applicationList: '/packages/creator/application-list/index',
  creatorCard: '/packages/creator/creator-card/index',
  messages: '/pages/messages/index',
  rules: '/packages/mine/rules/index',
  feedback: '/packages/mine/feedback/index',
} as const

function asString(value: unknown, fallback = '') {
  return typeof value === 'string' ? value : fallback
}

function asCount(result: unknown) {
  const total = Number((result as any)?.total)
  return Number.isFinite(total) ? total : 0
}

function buildAvatarText(displayName: string) {
  const normalized = displayName.trim()
  return normalized ? normalized.slice(0, 1).toUpperCase() : '我'
}

function buildRestrictionSummary(accountStatus: string): MineSummaryResponseData['restrictionSummary'] {
  switch (accountStatus) {
    case ACCOUNT_STATUSES.WATCHLIST:
      return {
        type: accountStatus,
        title: '账号处于观察名单',
        description: '当前仍可继续使用主要功能，但后续异常行为会触发更严格治理。',
      }
    case ACCOUNT_STATUSES.RESTRICTED_PUBLISH:
      return {
        type: accountStatus,
        title: '当前账号被限制发布',
        description: '你仍可查看已有内容，但新建与提交通告会被限制。',
      }
    case ACCOUNT_STATUSES.RESTRICTED_APPLY:
      return {
        type: accountStatus,
        title: '当前账号被限制报名',
        description: '你仍可查看已有记录，但新的报名动作会被限制。',
      }
    case ACCOUNT_STATUSES.BANNED:
      return {
        type: accountStatus,
        title: '当前账号已被限制使用',
        description: '平台已暂停该账号的核心操作能力，如需恢复请联系平台处理。',
      }
    default:
      return undefined
  }
}

export async function getMineSummary(userContext: UserContext): Promise<MineSummaryResponseData> {
  const [
    publisherProfile,
    creatorCard,
    unreadCount,
    noticeCountResult,
    applicationCountResult,
  ] = await Promise.all([
    getPublisherProfile(userContext),
    getCreatorCard(userContext),
    getUnreadMessageCount(userContext.userId),
    countByWhere(COLLECTIONS.NOTICES, { publisherUserId: userContext.userId }),
    countByWhere(COLLECTIONS.APPLICATIONS, { creatorUserId: userContext.userId }),
  ])
  const roleFlags = userContext.roleFlags
  const isTourist = !roleFlags.publisherEnabled && !roleFlags.creatorEnabled
  const noticeCount = asCount(noticeCountResult)
  const applicationCount = asCount(applicationCountResult)
  const displayName = asString(
    publisherProfile.publisherProfile?.displayName,
    asString(creatorCard.creatorCard?.nickname, '微信用户'),
  )
  const city = asString(
    publisherProfile.publisherProfile?.city,
    asString(creatorCard.creatorCard?.city),
  )
  const entryStates = {
    noticeList: {
      locked: !roleFlags.publisherEnabled,
      reason: roleFlags.publisherEnabled ? '' : '需发布方资料',
      actionText: roleFlags.publisherEnabled ? '查看' : '去完善',
    },
    applicationList: {
      locked: !roleFlags.creatorEnabled,
      reason: roleFlags.creatorEnabled ? '' : '需达人名片',
      actionText: roleFlags.creatorEnabled ? '查看' : '去完善',
    },
    creatorCard: {
      locked: false,
      actionText: roleFlags.creatorEnabled ? '维护' : '去完善',
    },
    messages: {
      locked: false,
      actionText: unreadCount > 0 ? '查看未读' : '查看',
    },
  }

  return {
    userSummary: {
      displayName,
      avatarText: buildAvatarText(displayName),
      city,
    },
    publisherSummary: {
      noticeCount,
      profileCompleteness: publisherProfile.profileCompleteness,
    },
    creatorSummary: {
      applicationCount,
      cardCompleteness: creatorCard.profileCompleteness,
    },
    messageSummary: {
      unreadCount,
    },
    quickActions: [
      {
        key: 'myNotice',
        label: '我的通告',
        route: QUICK_ACTION_ROUTES.noticeList,
        badgeText: entryStates.noticeList.locked ? '需发布方资料' : '查看',
        locked: entryStates.noticeList.locked,
        lockedReason: entryStates.noticeList.reason,
      },
      {
        key: 'myApplication',
        label: '我的报名',
        route: QUICK_ACTION_ROUTES.applicationList,
        badgeText: entryStates.applicationList.locked ? '需达人名片' : '查看',
        locked: entryStates.applicationList.locked,
        lockedReason: entryStates.applicationList.reason,
      },
      {
        key: 'creatorCard',
        label: '达人名片',
        route: QUICK_ACTION_ROUTES.creatorCard,
        badgeText: roleFlags.creatorEnabled ? '维护' : '去完善',
      },
      {
        key: 'messages',
        label: '消息中心',
        route: QUICK_ACTION_ROUTES.messages,
        badgeText: unreadCount > 0 ? `${unreadCount} 条未读` : '查看',
      },
      {
        key: 'rules',
        label: '规则说明',
        route: QUICK_ACTION_ROUTES.rules,
        badgeText: '查看',
      },
      {
        key: 'feedback',
        label: '意见反馈',
        route: QUICK_ACTION_ROUTES.feedback,
        badgeText: '提交',
      },
    ],
    isTourist,
    roleFlags,
    preferredView: userContext.preferredView,
    restrictionSummary: buildRestrictionSummary(userContext.accountStatus),
    entryStates,
  }
}
