#!/usr/bin/env node
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const EXPECTED_FUNCTIONS = [
  'admin-auth',
  'user-bff',
  'publisher-bff',
  'creator-bff',
  'application-bff',
  'review-admin',
  'governance-admin',
  'notice-bff',
  'message-bff',
  'cron-jobs',
]

function getArg(flag) {
  const index = process.argv.indexOf(flag)
  if (index === -1) {
    return undefined
  }

  return process.argv[index + 1]
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

async function loadManagerNode() {
  try {
    const mod = await import('@cloudbase/manager-node')
    return mod.default ?? mod
  } catch (error) {
    throw new Error('missing @cloudbase/manager-node. run `cd scripts && npm install` first')
  }
}

function buildManagerConfig(envId) {
  const credentialStatus = getTencentCredentialStatus()
  const token = getEnvValue(['TENCENTCLOUD_SESSIONTOKEN', 'TENCENT_SESSION_TOKEN'], undefined)

  if (credentialStatus.status === 'missing') {
    throw new Error('missing real TENCENTCLOUD_SECRETID/TENCENTCLOUD_SECRETKEY (or TENCENT_SECRET_ID/TENCENT_SECRET_KEY)')
  }

  if (credentialStatus.status === 'placeholder') {
    throw new Error('placeholder TENCENTCLOUD_SECRETID/TENCENTCLOUD_SECRETKEY detected; replace with real credentials before running check')
  }

  return {
    secretId: credentialStatus.secretId,
    secretKey: credentialStatus.secretKey,
    token,
    envId,
  }
}

function serializeFunctionSummary(func) {
  return {
    name: func.FunctionName,
    status: func.Status,
    runtime: func.Runtime,
    modTime: func.ModTime,
  }
}

function compareFunctions(functions) {
  const byName = new Map(functions.map((item) => [item.FunctionName, item]))
  const missingFunctions = EXPECTED_FUNCTIONS.filter((name) => !byName.has(name))
  const unexpectedFunctions = functions
    .map((item) => item.FunctionName)
    .filter((name) => !EXPECTED_FUNCTIONS.includes(name))
  const inactiveFunctions = EXPECTED_FUNCTIONS
    .map((name) => byName.get(name))
    .filter(Boolean)
    .filter((item) => item.Status !== 'Active')
    .map(serializeFunctionSummary)

  return {
    missingFunctions,
    unexpectedFunctions,
    inactiveFunctions,
    activeCount: functions.filter((item) => item.Status === 'Active').length,
  }
}

const envId = getArg('--env') ?? getEnvValue(['CLOUDBASE_ENV_ID', 'CLOUDBASE_ENV_ID_DEV'], '')

if (!envId) {
  console.error(JSON.stringify({
    ok: false,
    error: {
      message: 'missing envId; pass --env or set CLOUDBASE_ENV_ID / CLOUDBASE_ENV_ID_DEV',
    },
  }, null, 2))
  process.exit(1)
}

const ManagerNode = await loadManagerNode()
const managerConfig = buildManagerConfig(envId)
const manager = ManagerNode.init ? ManagerNode.init(managerConfig) : new ManagerNode(managerConfig)
const functions = await manager.functions.listFunctions(100, 0)
const summaries = functions.map(serializeFunctionSummary)
const compared = compareFunctions(functions)
const ok =
  compared.missingFunctions.length === 0 &&
  compared.unexpectedFunctions.length === 0 &&
  compared.inactiveFunctions.length === 0 &&
  compared.activeCount === EXPECTED_FUNCTIONS.length

console.log(JSON.stringify({
  ok,
  envId,
  expectedCount: EXPECTED_FUNCTIONS.length,
  totalCount: functions.length,
  activeCount: compared.activeCount,
  missingFunctions: compared.missingFunctions,
  unexpectedFunctions: compared.unexpectedFunctions,
  inactiveFunctions: compared.inactiveFunctions,
  functions: summaries,
}, null, 2))
