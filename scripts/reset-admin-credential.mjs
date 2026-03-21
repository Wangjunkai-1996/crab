#!/usr/bin/env node
import { randomBytes, scryptSync } from 'node:crypto'
import { spawnSync } from 'node:child_process'

function getArg(flag) {
  const index = process.argv.indexOf(flag)
  if (index === -1) {
    return undefined
  }

  return process.argv[index + 1]
}

function hasFlag(flag) {
  return process.argv.includes(flag)
}

function getEnvValue(keys, fallback = '') {
  for (const key of keys) {
    if (process.env[key]) {
      return process.env[key]
    }
  }

  return fallback
}

function normalizeEnvString(value) {
  return typeof value === 'string' ? value.trim() : ''
}

function detectPlaceholderCredential(value, type) {
  const normalized = normalizeEnvString(value)

  if (!normalized) {
    return 'missing'
  }

  const lower = normalized.toLowerCase()
  const genericPlaceholders = [
    '<secret-id>',
    '<secret-key>',
    'your-secret-id',
    'your-secret-key',
    'example',
    'placeholder',
    'pending',
    'todo',
    'changeme',
  ]

  if (genericPlaceholders.some((item) => lower.includes(item))) {
    return 'placeholder'
  }

  if (type === 'secretId' && lower.includes('secretid')) {
    return 'placeholder'
  }

  if (type === 'secretKey' && lower.includes('secretkey')) {
    return 'placeholder'
  }

  return 'provided'
}

function getTencentCredentialStatus() {
  const secretId = getEnvValue(['TENCENTCLOUD_SECRETID', 'TENCENT_SECRET_ID'], '')
  const secretKey = getEnvValue(['TENCENTCLOUD_SECRETKEY', 'TENCENT_SECRET_KEY'], '')
  const secretIdStatus = detectPlaceholderCredential(secretId, 'secretId')
  const secretKeyStatus = detectPlaceholderCredential(secretKey, 'secretKey')

  if (secretIdStatus === 'missing' || secretKeyStatus === 'missing') {
    return { status: 'missing', secretId, secretKey }
  }

  if (secretIdStatus === 'placeholder' || secretKeyStatus === 'placeholder') {
    return { status: 'placeholder', secretId, secretKey }
  }

  return { status: 'provided', secretId, secretKey }
}

async function loadNodeSdk() {
  try {
    const mod = await import('@cloudbase/node-sdk')
    return mod.default ?? mod
  } catch (error) {
    throw new Error('missing @cloudbase/node-sdk. run `cd scripts && npm install` first')
  }
}

function createNodeSdkApp(nodeSdk, envId) {
  const credentialStatus = getTencentCredentialStatus()

  if (credentialStatus.status === 'missing') {
    throw new Error('missing real TENCENTCLOUD_SECRETID/TENCENTCLOUD_SECRETKEY (or TENCENT_SECRET_ID/TENCENT_SECRET_KEY)')
  }

  if (credentialStatus.status === 'placeholder') {
    throw new Error('placeholder TENCENTCLOUD_SECRETID/TENCENTCLOUD_SECRETKEY detected; replace with real credentials before running reset')
  }

  return nodeSdk.init({
    env: envId,
    secretId: credentialStatus.secretId,
    secretKey: credentialStatus.secretKey,
    sessionToken: getEnvValue(['TENCENTCLOUD_SESSIONTOKEN', 'TENCENT_SESSION_TOKEN'], undefined),
  })
}

function toPayload(doc) {
  return doc && typeof doc.data === 'object' && doc.data !== null ? doc.data : doc
}

function toWritablePayload(doc) {
  const payload = { ...toPayload(doc) }
  delete payload._id
  delete payload._openid
  return payload
}

function hashPassword(password) {
  const salt = randomBytes(16).toString('hex')
  const hash = scryptSync(password, salt, 64).toString('hex')
  return `scrypt$${salt}$${hash}`
}

function generatePassword(username) {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789'

  while (true) {
    let middle = ''
    for (let index = 0; index < 12; index += 1) {
      middle += alphabet[randomBytes(1)[0] % alphabet.length]
    }

    const candidate = `Dm${middle}9a`
    if (candidate.length >= 12 && /[A-Za-z]/.test(candidate) && /\d/.test(candidate) && candidate !== username) {
      return candidate
    }
  }
}

function copyToClipboard(value) {
  const result = spawnSync('pbcopy', {
    input: value,
    encoding: 'utf8',
  })

  if (result.status !== 0) {
    throw new Error(result.stderr || 'pbcopy failed')
  }
}

async function listAllByWhere(collection, where, pageSize = 100) {
  const rows = []
  let skip = 0

  while (true) {
    const result = await collection.where(where).skip(skip).limit(pageSize).get()
    rows.push(...result.data)

    if (result.data.length < pageSize) {
      return rows
    }

    skip += result.data.length
  }
}

async function listAllByAnyWhere(collection, wheres, pageSize = 100) {
  const rowsById = new Map()

  for (const where of wheres) {
    const rows = await listAllByWhere(collection, where, pageSize)
    for (const row of rows) {
      if (row?._id) {
        rowsById.set(row._id, row)
      }
    }
  }

  return Array.from(rowsById.values())
}

const envId = getArg('--env') ?? getEnvValue(['CLOUDBASE_ENV_ID'], '')
const username = getArg('--username') ?? process.env.ADMIN_INIT_USERNAME ?? 'domi_admin'
const password = getArg('--password') ?? generatePassword(username)
const copyPassword = hasFlag('--copy-password')
const keepActiveSessions = hasFlag('--keep-sessions')

if (!envId) {
  console.error(JSON.stringify({ ok: false, error: { message: 'missing envId; pass --env or set CLOUDBASE_ENV_ID' } }, null, 2))
  process.exit(1)
}

if (password.length < 12 || !/[A-Za-z]/.test(password) || !/\d/.test(password) || password === username) {
  console.error(JSON.stringify({ ok: false, error: { message: 'generated password does not satisfy V1 policy' } }, null, 2))
  process.exit(1)
}

const nodeSdk = await loadNodeSdk()
const app = createNodeSdkApp(nodeSdk, envId)
const db = app.database()
const adminCollection = db.collection('dm_admin_users')
const sessionCollection = db.collection('dm_admin_sessions')
const now = new Date()

const adminDocs = await listAllByAnyWhere(
  adminCollection,
  [
    { username },
    { 'data.username': username },
  ],
  20,
)

if (adminDocs.length === 0) {
  console.error(JSON.stringify({ ok: false, error: { message: `admin user not found: ${username}` } }, null, 2))
  process.exit(1)
}

const adminDoc = adminDocs[0]
const adminPayload = toWritablePayload(adminDoc)
const adminUserId = adminPayload.adminUserId

await adminCollection.doc(adminDoc._id).set({
  ...adminPayload,
  passwordHash: hashPassword(password),
  mustResetPassword: true,
  failedLoginCount: 0,
  lockedUntil: null,
  status: 'active',
  updatedAt: now,
})

let revokedSessionCount = 0
if (!keepActiveSessions) {
  const activeSessions = await listAllByAnyWhere(sessionCollection, [
    {
      adminUserId,
      status: 'active',
    },
    {
      'data.adminUserId': adminUserId,
      'data.status': 'active',
    },
  ])

  for (const sessionDoc of activeSessions) {
    const sessionPayload = toWritablePayload(sessionDoc)

    await sessionCollection.doc(sessionDoc._id).set({
      ...sessionPayload,
      status: 'revoked',
      revokedAt: now,
      revokeReason: 'credential_reset',
      updatedAt: now,
    })
  }

  revokedSessionCount = activeSessions.length
}

if (copyPassword) {
  copyToClipboard(password)
}

console.log(JSON.stringify({
  ok: true,
  envId,
  username,
  adminUserId,
  mustResetPassword: true,
  credentialPrepared: true,
  credentialDelivery: copyPassword ? 'clipboard-ready' : 'prepared-not-printed',
  revokedSessionCount,
  activeSessionPreserved: keepActiveSessions,
}, null, 2))
