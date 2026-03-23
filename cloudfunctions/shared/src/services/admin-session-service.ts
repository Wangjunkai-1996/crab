import { COLLECTIONS } from '../constants/collections'
import { DEFAULTS, REQUEST_SOURCES } from '../constants/runtime'
import { ERROR_CODES } from '../constants/error-codes'
import { addDocument, findOneByField, listByWhere, updateDocumentById } from '../db/repository'
import { ADMIN_SESSION_STATUSES } from '../enums/admin'
import { AppError } from '../errors/app-error'
import { createSessionToken, hashSessionToken } from '../utils/crypto'
import { createResourceId } from '../utils/id'
import { addHours, now, toDate } from '../utils/time'

function getAbsoluteHours() {
  const value = Number(process.env.SESSION_ABSOLUTE_HOURS)
  return Number.isFinite(value) && value > 0 ? value : DEFAULTS.SESSION_ABSOLUTE_HOURS
}

function getIdleHours() {
  const value = Number(process.env.SESSION_IDLE_HOURS)
  return Number.isFinite(value) && value > 0 ? value : DEFAULTS.SESSION_IDLE_HOURS
}

export async function createAdminSession(adminUserId: string, meta: Record<string, unknown>) {
  const currentTime = now()
  const plainToken = createSessionToken()
  const session = {
    sessionId: createResourceId('session'),
    adminUserId,
    tokenHash: hashSessionToken(plainToken),
    status: ADMIN_SESSION_STATUSES.ACTIVE,
    issuedAt: currentTime,
    expiresAt: addHours(currentTime, getAbsoluteHours()),
    lastActiveAt: currentTime,
    idleExpireAt: addHours(currentTime, getIdleHours()),
    clientType: typeof meta.source === 'string' ? meta.source : REQUEST_SOURCES.ADMIN_WEB,
    ip: typeof meta.ip === 'string' ? meta.ip : '',
    userAgent: typeof meta.userAgent === 'string' ? meta.userAgent : '',
    revokedAt: null,
    revokeReason: '',
    createdAt: currentTime,
    updatedAt: currentTime,
  }

  await addDocument(COLLECTIONS.ADMIN_SESSIONS, session)
  await enforceSessionLimit(adminUserId, session.sessionId)

  return {
    plainToken,
    session,
  }
}

export async function findSessionByToken(token: string) {
  return findOneByField(COLLECTIONS.ADMIN_SESSIONS, 'tokenHash', hashSessionToken(token))
}

export async function touchAdminSession(session: Record<string, any>) {
  const currentTime = now()
  const patch = {
    lastActiveAt: currentTime,
    idleExpireAt: addHours(currentTime, getIdleHours()),
    updatedAt: currentTime,
  }

  await updateDocumentById(COLLECTIONS.ADMIN_SESSIONS, session._id, patch)

  return {
    ...session,
    ...patch,
  }
}

export async function revokeSessionBySessionId(sessionId: string, revokeReason: string) {
  const session = await findOneByField(COLLECTIONS.ADMIN_SESSIONS, 'sessionId', sessionId)

  if (!session || session.status !== ADMIN_SESSION_STATUSES.ACTIVE) {
    return session
  }

  return updateSessionStatus(session, ADMIN_SESSION_STATUSES.REVOKED, revokeReason)
}

export async function revokeOtherSessions(adminUserId: string, excludeSessionId: string, revokeReason: string) {
  const sessions = await listByWhere(
    COLLECTIONS.ADMIN_SESSIONS,
    {
      adminUserId,
      status: ADMIN_SESSION_STATUSES.ACTIVE,
    },
    {
      orderBy: [{ field: 'lastActiveAt', order: 'asc' }],
    },
  )

  const revokedSessionIds: string[] = []

  for (const session of sessions) {
    if (session.sessionId === excludeSessionId) {
      continue
    }

    await updateSessionStatus(session, ADMIN_SESSION_STATUSES.REVOKED, revokeReason)
    revokedSessionIds.push(session.sessionId)
  }

  return revokedSessionIds
}

export async function expireSession(session: Record<string, any>, revokeReason: string) {
  return updateSessionStatus(session, ADMIN_SESSION_STATUSES.EXPIRED, revokeReason)
}

async function enforceSessionLimit(adminUserId: string, currentSessionId: string) {
  const sessions = await listByWhere(
    COLLECTIONS.ADMIN_SESSIONS,
    {
      adminUserId,
      status: ADMIN_SESSION_STATUSES.ACTIVE,
    },
    {
      orderBy: [{ field: 'lastActiveAt', order: 'asc' }],
    },
  )

  const overflowCount = sessions.length - DEFAULTS.ADMIN_MAX_CONCURRENT_SESSIONS

  if (overflowCount <= 0) {
    return
  }

  let handled = 0

  for (const session of sessions) {
    if (handled >= overflowCount) {
      break
    }

    if (session.sessionId === currentSessionId) {
      continue
    }

    await updateSessionStatus(session, ADMIN_SESSION_STATUSES.REVOKED, 'session_limit_exceeded')
    handled += 1
  }
}

async function updateSessionStatus(session: Record<string, any>, status: string, revokeReason: string) {
  const patch = {
    status,
    revokedAt: now(),
    revokeReason,
    updatedAt: now(),
  }

  await updateDocumentById(COLLECTIONS.ADMIN_SESSIONS, session._id, patch)

  return {
    ...session,
    ...patch,
  }
}

export function assertSessionValid(session: Record<string, any>) {
  if (!session || session.status !== ADMIN_SESSION_STATUSES.ACTIVE) {
    throw new AppError({
      code: ERROR_CODES.ADMIN_SESSION_INVALID,
      message: '后台登录态失效',
    })
  }

  const currentTime = now()
  const expiresAt = toDate(session.expiresAt)
  const idleExpireAt = toDate(session.idleExpireAt)

  if (expiresAt.getTime() <= currentTime.getTime() || idleExpireAt.getTime() <= currentTime.getTime()) {
    throw new AppError({
      code: ERROR_CODES.ADMIN_SESSION_INVALID,
      message: '后台登录态失效',
    })
  }
}

