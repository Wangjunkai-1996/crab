import { createHash, randomBytes, scryptSync, timingSafeEqual } from 'node:crypto'

const PASSWORD_HASH_PREFIX = 'scrypt'
const PASSWORD_KEY_LENGTH = 64

export function createSessionToken() {
  return randomBytes(32).toString('hex')
}

export function hashSessionToken(token: string) {
  return createHash('sha256').update(token).digest('hex')
}

export function hashPassword(password: string) {
  const salt = randomBytes(16).toString('hex')
  const hash = scryptSync(password, salt, PASSWORD_KEY_LENGTH).toString('hex')
  return `${PASSWORD_HASH_PREFIX}$${salt}$${hash}`
}

export function verifyPassword(password: string, passwordHash: string) {
  const [algorithm, salt, storedHash] = String(passwordHash || '').split('$')

  if (algorithm !== PASSWORD_HASH_PREFIX || !salt || !storedHash) {
    return false
  }

  const target = Buffer.from(storedHash, 'hex')
  const actual = scryptSync(password, salt, PASSWORD_KEY_LENGTH)

  if (target.length !== actual.length) {
    return false
  }

  return timingSafeEqual(target, actual)
}

