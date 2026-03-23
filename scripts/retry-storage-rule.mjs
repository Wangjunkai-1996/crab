#!/usr/bin/env node
import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const repoRoot = path.resolve(__dirname, '..')
const databaseRoot = path.join(repoRoot, 'database')

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
    return {
      status: 'missing',
      secretId,
      secretKey,
      secretIdStatus,
      secretKeyStatus,
    }
  }

  if (secretIdStatus === 'placeholder' || secretKeyStatus === 'placeholder') {
    return {
      status: 'placeholder',
      secretId,
      secretKey,
      secretIdStatus,
      secretKeyStatus,
    }
  }

  return {
    status: 'provided',
    secretId,
    secretKey,
    secretIdStatus,
    secretKeyStatus,
  }
}

function buildManagerConfig(envId) {
  const credentialStatus = getTencentCredentialStatus()
  const token = getEnvValue(['TENCENTCLOUD_SESSIONTOKEN', 'TENCENT_SESSION_TOKEN'], undefined)

  if (credentialStatus.status === 'missing') {
    throw new Error('missing real TENCENTCLOUD_SECRETID/TENCENTCLOUD_SECRETKEY (or TENCENT_SECRET_ID/TENCENT_SECRET_KEY)')
  }

  if (credentialStatus.status === 'placeholder') {
    throw new Error('placeholder TENCENTCLOUD_SECRETID/TENCENTCLOUD_SECRETKEY detected; replace with real credentials before running --apply')
  }

  return {
    secretId: credentialStatus.secretId,
    secretKey: credentialStatus.secretKey,
    token,
    envId,
  }
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function buildPathPrefixExpression(prefix) {
  return `resource.path.indexOf('${prefix}') === 0`
}

async function readJson(filePath) {
  return JSON.parse(await fs.readFile(filePath, 'utf8'))
}

function buildStorageRule(storageMatrix) {
  const readablePrefixes = storageMatrix.paths
    .filter((item) => item.miniprogramDirectDownload === true)
    .map((item) => `(${buildPathPrefixExpression(item.prefix)})`)

  const writablePrefixes = storageMatrix.paths
    .filter((item) => item.miniprogramUpload === true)
    .map((item) => `(auth != null && ${buildPathPrefixExpression(item.prefix)})`)

  return {
    read: readablePrefixes.length > 0 ? readablePrefixes.join(' || ') : false,
    write: writablePrefixes.length > 0 ? writablePrefixes.join(' || ') : false,
  }
}

async function loadManagerNode() {
  const mod = await import(path.join(__dirname, 'node_modules', '@cloudbase', 'manager-node'))
  return mod.default ?? mod
}

function serializeError(error) {
  if (!error || typeof error !== 'object') {
    return { message: String(error ?? '') }
  }

  return {
    name: typeof error.name === 'string' ? error.name : 'Error',
    message: typeof error.message === 'string' ? error.message : String(error),
    code: typeof error.code === 'string' ? error.code : '',
    action: typeof error.action === 'string' ? error.action : '',
    requestId: typeof error.requestId === 'string' ? error.requestId : '',
    original: error.original ?? null,
  }
}

function buildSuggestions(envId, error) {
  const suggestions = [
    {
      type: 'retry-after-plan-upgrade',
      description: '若环境侧升级到支持存储安全规则的套餐，重新执行本脚本即可只重试 storageRule。',
      command: `cd /Users/gy-vip/Desktop/KK_Crab-backend/scripts && npm run retry:storage-rule -- --env ${envId} --apply`,
    },
    {
      type: 'record-known-limitation',
      description: '若当前 dev 候选环境接受免费套餐限制，可把 storageRule 记为已知环境例外，先继续 admin-auth 与小程序首批真实 smoke。',
    },
    {
      type: 'switch-env',
      description: '若后续切换到已开通对应能力的新环境，使用同一脚本在新 envId 上单独重试 storageRule。',
    },
  ]

  if (error?.code === 'OperationDenied.FreePackageDenied') {
    suggestions.unshift({
      type: 'current-diagnosis',
      description: '当前失败并非脚本参数错误，而是 CloudBase 套餐能力限制；在套餐不变时重复重试不会成功。',
    })
  }

  return suggestions
}

async function applyStorageRule(manager, envId, rule) {
  const envInfo = await manager.env.getEnvInfo()
  const bucket = envInfo.EnvInfo.Storages[0].Bucket

  await manager.commonService().call({
    Action: 'ModifyStorageSafeRule',
    Param: {
      Bucket: bucket,
      EnvId: envId,
      AclTag: 'CUSTOM',
      Rule: JSON.stringify(rule),
    },
  })

  for (let round = 0; round < 20; round += 1) {
    const result = await manager.commonService().call({
      Action: 'DescribeCDNChainTask',
      Param: {
        Bucket: bucket,
        EnvId: envId,
      },
    })

    if (result.Status === 'FINISHED') {
      return {
        bucket,
        status: result.Status,
        round,
        rule,
      }
    }

    if (result.Status === 'ERROR') {
      const error = new Error(`storage rule apply failed for bucket ${bucket}`)
      error.code = 'StorageRuleTaskError'
      error.action = 'DescribeCDNChainTask'
      throw error
    }

    await sleep(5000)
  }

  const error = new Error(`storage rule apply timed out for bucket ${bucket}`)
  error.code = 'StorageRuleTaskTimeout'
  throw error
}

const envId = getArg('--env') ?? getEnvValue(['CLOUDBASE_ENV_ID'], '')
const applyMode = hasFlag('--apply')
const storageMatrix = await readJson(path.join(databaseRoot, 'rules', 'storage-access-matrix.json'))
const rule = buildStorageRule(storageMatrix)

if (!envId) {
  console.error(JSON.stringify({
    ok: false,
    error: {
      message: 'missing envId; pass --env or set CLOUDBASE_ENV_ID',
    },
  }, null, 2))
  process.exit(1)
}

if (!applyMode) {
  console.log(JSON.stringify({
    envId,
    mode: 'dry-run',
    rule,
    retryCommand: `cd /Users/gy-vip/Desktop/KK_Crab-backend/scripts && npm run retry:storage-rule -- --env ${envId} --apply`,
    suggestions: buildSuggestions(envId),
  }, null, 2))
  process.exit(0)
}

const ManagerNode = await loadManagerNode()
const managerConfig = buildManagerConfig(envId)
const manager = ManagerNode.init ? ManagerNode.init(managerConfig) : new ManagerNode(managerConfig)

try {
  const result = await applyStorageRule(manager, envId, rule)
  console.log(JSON.stringify({
    ok: true,
    envId,
    mode: 'apply',
    storageRule: result,
    suggestions: buildSuggestions(envId),
  }, null, 2))
} catch (error) {
  console.error(JSON.stringify({
    ok: false,
    envId,
    mode: 'apply',
    rule,
    error: serializeError(error),
    suggestions: buildSuggestions(envId, error),
  }, null, 2))
  process.exit(1)
}
