import { randomBytes, randomUUID } from 'node:crypto'

export function createRequestId() {
  return `req_${randomUUID()}`
}

export function createResourceId(prefix: string) {
  return `${prefix}_${randomBytes(8).toString('hex')}`
}

