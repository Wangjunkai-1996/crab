#!/usr/bin/env node
import { randomBytes, scryptSync } from 'node:crypto'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
void __dirname

function getArg(flag) {
  const index = process.argv.indexOf(flag)
  if (index === -1) {
    return undefined
  }

  return process.argv[index + 1]
}

function createResourceId(prefix) {
  return `${prefix}_${randomBytes(8).toString('hex')}`
}

function hashPassword(password) {
  const salt = randomBytes(16).toString('hex')
  const hash = scryptSync(password, salt, 64).toString('hex')
  return `scrypt$${salt}$${hash}`
}

const username = getArg('--username')
const displayName = getArg('--display-name') ?? '系统超管'
const roles = (getArg('--roles') ?? 'super_admin').split(',').map((item) => item.trim()).filter(Boolean)
const notes = getArg('--notes') ?? 'generated-by-script'
const password = process.env.ADMIN_INIT_PASSWORD

if (!username) {
  console.error('missing --username')
  process.exit(1)
}

if (!password) {
  console.error('missing ADMIN_INIT_PASSWORD env var')
  process.exit(1)
}

if (password.length < 12 || !/[A-Za-z]/.test(password) || !/\d/.test(password) || password === username) {
  console.error('ADMIN_INIT_PASSWORD does not satisfy V1 password policy')
  process.exit(1)
}

const now = new Date().toISOString()
const doc = {
  adminUserId: createResourceId('admin'),
  username,
  passwordHash: hashPassword(password),
  displayName,
  roleCodes: roles,
  status: 'active',
  failedLoginCount: 0,
  lockedUntil: null,
  mustResetPassword: true,
  lastLoginAt: null,
  lastLoginIp: '',
  notes,
  createdAt: now,
  updatedAt: now,
}

console.log(JSON.stringify(doc, null, 2))
