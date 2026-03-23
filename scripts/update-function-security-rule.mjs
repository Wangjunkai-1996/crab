#!/usr/bin/env node
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

function getArg(flag) {
  const index = process.argv.indexOf(flag)
  if (index === -1) {
    return undefined
  }

  return process.argv[index + 1]
}

function getArgList(flag) {
  const values = []

  for (let index = 0; index < process.argv.length; index += 1) {
    if (process.argv[index] === flag && process.argv[index + 1]) {
      values.push(process.argv[index + 1])
    }
  }

  return values
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

function buildManagerConfig(envId) {
  const secretId = getEnvValue(['TENCENTCLOUD_SECRETID', 'TENCENT_SECRET_ID'], '')
  const secretKey = getEnvValue(['TENCENTCLOUD_SECRETKEY', 'TENCENT_SECRET_KEY'], '')
  const token = getEnvValue(['TENCENTCLOUD_SESSIONTOKEN', 'TENCENT_SESSION_TOKEN'], undefined)

  const secretIdStatus = detectPlaceholderCredential(secretId, 'secretId')
  const secretKeyStatus = detectPlaceholderCredential(secretKey, 'secretKey')

  if (secretIdStatus === 'missing' || secretKeyStatus === 'missing') {
    throw new Error('missing real TENCENTCLOUD_SECRETID/TENCENTCLOUD_SECRETKEY (or TENCENT_SECRET_ID/TENCENT_SECRET_KEY)')
  }

  if (secretIdStatus === 'placeholder' || secretKeyStatus === 'placeholder') {
    throw new Error('placeholder TENCENTCLOUD_SECRETID/TENCENTCLOUD_SECRETKEY detected; replace with real credentials before running')
  }

  return {
    secretId,
    secretKey,
    token,
    envId,
  }
}

async function loadManagerNode() {
  const mod = await import(path.join(__dirname, 'node_modules', '@cloudbase', 'manager-node', 'lib', 'index.js'))
  return mod.default ?? mod
}

function normalizeFunctionNames(values) {
  return [...new Set(
    values
      .flatMap((value) => value.split(','))
      .map((value) => value.trim())
      .filter(Boolean),
  )]
}

async function describeFunctionSecurityRule(manager, envId) {
  const result = await manager.commonService().call({
    Action: 'DescribeSecurityRule',
    Param: {
      EnvId: envId,
      ResourceType: 'FUNCTION',
    },
  })

  return {
    aclTag: result.AclTag || 'CUSTOM',
    rule: result.Rule ? JSON.parse(result.Rule) : {},
    requestId: result.RequestId || '',
  }
}

async function modifyFunctionSecurityRule(manager, envId, aclTag, rule) {
  return manager.commonService().call({
    Action: 'ModifySecurityRule',
    Param: {
      EnvId: envId,
      ResourceType: 'FUNCTION',
      AclTag: aclTag,
      Rule: JSON.stringify(rule),
    },
  })
}

function cloneRule(rule) {
  return JSON.parse(JSON.stringify(rule))
}

function buildNextRule(currentRule, addInvokeNames) {
  const nextRule = cloneRule(currentRule)

  for (const functionName of addInvokeNames) {
    const currentEntry = nextRule[functionName]

    if (currentEntry && typeof currentEntry === 'object') {
      nextRule[functionName] = {
        ...currentEntry,
        invoke: true,
      }
      continue
    }

    nextRule[functionName] = {
      invoke: true,
    }
  }

  return nextRule
}

function getChangedFunctionNames(currentRule, nextRule, names) {
  return names.filter((name) => JSON.stringify(currentRule[name] ?? null) !== JSON.stringify(nextRule[name] ?? null))
}

const envId = getArg('--env') ?? getEnvValue(['CLOUDBASE_ENV_ID'], '')
const addInvokeNames = normalizeFunctionNames(getArgList('--add-invoke'))
const applyMode = hasFlag('--apply')

if (!envId) {
  console.error(JSON.stringify({
    ok: false,
    error: {
      message: 'missing envId; pass --env or set CLOUDBASE_ENV_ID',
    },
  }, null, 2))
  process.exit(1)
}

if (addInvokeNames.length === 0) {
  console.error(JSON.stringify({
    ok: false,
    error: {
      message: 'missing function names; pass one or more --add-invoke <functionName>',
    },
  }, null, 2))
  process.exit(1)
}

const CloudBase = await loadManagerNode()
const manager = new CloudBase(buildManagerConfig(envId))

const before = await describeFunctionSecurityRule(manager, envId)
const nextRule = buildNextRule(before.rule, addInvokeNames)
const changedFunctionNames = getChangedFunctionNames(before.rule, nextRule, addInvokeNames)

const result = {
  ok: true,
  mode: applyMode ? 'apply' : 'dry-run',
  envId,
  addInvokeNames,
  changedFunctionNames,
  aclTag: before.aclTag,
  beforeRule: before.rule,
  nextRule,
  beforeRequestId: before.requestId,
}

if (!applyMode) {
  console.log(JSON.stringify(result, null, 2))
  process.exit(0)
}

const modifyResult = await modifyFunctionSecurityRule(manager, envId, before.aclTag, nextRule)
const after = await describeFunctionSecurityRule(manager, envId)

console.log(JSON.stringify({
  ...result,
  modifyRequestId: modifyResult.RequestId || '',
  afterRule: after.rule,
  afterRequestId: after.requestId,
}, null, 2))
