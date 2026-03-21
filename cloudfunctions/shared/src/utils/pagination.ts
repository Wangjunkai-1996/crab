import { DEFAULTS } from '../constants/runtime'
import { createValidationError } from '../validators/common'

export function normalizePageSize(value: unknown) {
  if (value === undefined || value === null || value === '') {
    return DEFAULTS.DEFAULT_PAGE_SIZE
  }

  const pageSize = Number(value)

  if (!Number.isInteger(pageSize) || pageSize <= 0) {
    throw createValidationError({
      pageSize: 'pageSize 必须为正整数',
    })
  }

  return Math.min(pageSize, DEFAULTS.MAX_PAGE_SIZE)
}

export function decodeOffsetCursor(cursor: unknown) {
  if (cursor === undefined || cursor === null || cursor === '') {
    return 0
  }

  if (typeof cursor !== 'string') {
    throw createValidationError({
      cursor: 'cursor 必须为字符串',
    })
  }

  try {
    const decoded = Buffer.from(cursor, 'base64').toString('utf8')
    const parsed = JSON.parse(decoded)
    const offset = Number(parsed?.offset)

    if (!Number.isInteger(offset) || offset < 0) {
      throw new Error('invalid offset')
    }

    return offset
  } catch (_error) {
    throw createValidationError({
      cursor: 'cursor 非法',
    })
  }
}

export function encodeOffsetCursor(offset: number) {
  if (!Number.isInteger(offset) || offset <= 0) {
    return ''
  }

  return Buffer.from(JSON.stringify({ offset })).toString('base64')
}
