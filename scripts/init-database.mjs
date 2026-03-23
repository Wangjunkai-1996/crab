#!/usr/bin/env node
import fs from 'node:fs/promises'
import path from 'node:path'
import { randomBytes, scryptSync } from 'node:crypto'
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

async function readJson(filePath) {
  return JSON.parse(await fs.readFile(filePath, 'utf8'))
}

function getEnvValue(keys, fallback) {
  for (const key of keys) {
    if (process.env[key]) {
      return process.env[key]
    }
  }

  return fallback
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
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

function buildDatabaseRuleEntries(accessMatrix) {
  return accessMatrix.collections.map((item) => {
    if (item.name === 'dm_configs') {
      const publicGroups = item.publicGroups
        .map((groupKey) => `doc.groupKey == '${groupKey}'`)
        .join(' || ')

      return {
        collectionName: item.name,
        aclTag: 'CUSTOM',
        rule: {
          read: `doc.visibility == 'public' && (${publicGroups})`,
          write: false,
        },
      }
    }

    return {
      collectionName: item.name,
      aclTag: 'CUSTOM',
      rule: {
        read: false,
        write: false,
      },
    }
  })
}

function buildStorageRule() {
  return {
    read: '/^system-assets\\//.test(resource.path)',
    write:
      'auth != null && /^notice-images\\//.test(resource.path) || auth != null && /^creator-portfolio\\//.test(resource.path) || auth != null && /^report-evidence\\//.test(resource.path) || auth != null && /^feedback-screenshots\\//.test(resource.path)',
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

function createResourceId(prefix) {
  return `${prefix}_${randomBytes(8).toString('hex')}`
}

function hashPassword(password) {
  const salt = randomBytes(16).toString('hex')
  const hash = scryptSync(password, salt, 64).toString('hex')
  return `scrypt$${salt}$${hash}`
}

async function loadManagerNode() {
  try {
    const mod = await import('@cloudbase/manager-node')
    return mod.default ?? mod
  } catch (error) {
    throw new Error('missing @cloudbase/manager-node. run `cd scripts && npm install` first')
  }
}

async function loadNodeSdk() {
  try {
    const mod = await import('@cloudbase/node-sdk')
    return mod.default ?? mod
  } catch (error) {
    throw new Error('missing @cloudbase/node-sdk. run `cd scripts && npm install` first')
  }
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

async function ensureCollections(manager, collectionConfig) {
  const results = []

  for (const collection of [...collectionConfig.collections].sort((a, b) => a.initOrder - b.initOrder)) {
    const result = await manager.database.createCollectionIfNotExists(collection.name)
    results.push({
      collectionName: collection.name,
      created: result.IsCreated,
    })
  }

  return results
}

function toIndexPayload(indexConfig) {
  return {
    IndexName: indexConfig.name,
    MgoKeySchema: {
      MgoIndexKeys: indexConfig.fields.map((field) => ({
        Name: field.name,
        Direction: field.order === 'desc' ? '-1' : '1',
      })),
      MgoIsUnique: Boolean(indexConfig.unique),
    },
  }
}

async function ensureIndexes(manager, indexesConfig) {
  const results = []

  for (const indexConfig of indexesConfig.indexes) {
    const exists = await manager.database.checkIndexExists(indexConfig.collection, indexConfig.name)

    if (!exists.Exists) {
      await manager.database.updateCollection(indexConfig.collection, {
        CreateIndexes: [toIndexPayload(indexConfig)],
      })
    }

    results.push({
      collectionName: indexConfig.collection,
      indexName: indexConfig.name,
      created: !exists.Exists,
    })
  }

  return results
}

async function ensureDatabaseRules(manager, envId, accessMatrix) {
  const results = []

  for (const ruleEntry of buildDatabaseRuleEntries(accessMatrix)) {
    await manager.commonService().call({
      Action: 'ModifySafeRule',
      Param: {
        CollectionName: ruleEntry.collectionName,
        EnvId: envId,
        AclTag: ruleEntry.aclTag,
        Rule: JSON.stringify(ruleEntry.rule),
      },
    })

    results.push({
      collectionName: ruleEntry.collectionName,
      aclTag: ruleEntry.aclTag,
    })
  }

  return results
}

async function ensureStorageRule(manager, envId) {
  const envInfo = await manager.env.getEnvInfo()
  const bucket = envInfo.EnvInfo.Storages[0].Bucket
  const rule = buildStorageRule()

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
        rule,
      }
    }

    if (result.Status === 'ERROR') {
      throw new Error(`storage rule apply failed for bucket ${bucket}`)
    }

    await sleep(5000)
  }

  throw new Error(`storage rule apply timed out for bucket ${bucket}`)
}

function createNodeSdkApp(nodeSdk, envId) {
  return nodeSdk.init({
    env: envId,
    secretId: getEnvValue(['TENCENTCLOUD_SECRETID', 'TENCENT_SECRET_ID'], ''),
    secretKey: getEnvValue(['TENCENTCLOUD_SECRETKEY', 'TENCENT_SECRET_KEY'], ''),
    sessionToken: getEnvValue(['TENCENTCLOUD_SESSIONTOKEN', 'TENCENT_SESSION_TOKEN'], undefined),
  })
}

async function upsertConfigGroups(nodeSdk, envId, configGroups) {
  const app = createNodeSdkApp(nodeSdk, envId)
  const db = app.database()
  const collection = db.collection('dm_configs')
  const results = []

  for (const group of configGroups.groups) {
    const matchedDocs = await listAllByAnyWhere(collection, [
      { groupKey: group.groupKey },
      { 'data.groupKey': group.groupKey },
    ], 20)
    const existing = matchedDocs[0]
    const existingPayload = existing ? toWritablePayload(existing) : null
    const now = new Date()
    const doc = {
      configId: existingPayload?.configId || createResourceId('config'),
      groupKey: group.groupKey,
      visibility: group.visibility,
      description: group.description,
      items: group.items,
      createdAt: existingPayload?.createdAt ?? now,
      updatedAt: now,
    }

    if (existing?._id) {
      await collection.doc(existing._id).set(doc)
      results.push({
        groupKey: group.groupKey,
        created: false,
        matchedCount: matchedDocs.length,
        duplicateCount: Math.max(matchedDocs.length - 1, 0),
      })
      continue
    }

    await collection.add(doc)
    results.push({ groupKey: group.groupKey, created: true })
  }

  return results
}

function serializeApplyError(error) {
  if (!error || typeof error !== 'object') {
    return { message: String(error ?? '') }
  }

  const anyError = error
  return {
    name: typeof anyError.name === 'string' ? anyError.name : 'Error',
    message: typeof anyError.message === 'string' ? anyError.message : String(anyError),
    code: typeof anyError.code === 'string' ? anyError.code : '',
    action: typeof anyError.action === 'string' ? anyError.action : '',
    requestId: typeof anyError.requestId === 'string' ? anyError.requestId : '',
    original: anyError.original ?? null,
  }
}

async function ensureInitialAdmin(nodeSdk, envId) {
  const username = process.env.ADMIN_INIT_USERNAME
  const password = process.env.ADMIN_INIT_PASSWORD

  if (!username || !password) {
    return {
      skipped: true,
      reason: 'missing ADMIN_INIT_USERNAME or ADMIN_INIT_PASSWORD',
    }
  }

  if (password.length < 12 || !/[A-Za-z]/.test(password) || !/\d/.test(password) || password === username) {
    throw new Error('ADMIN_INIT_PASSWORD does not satisfy V1 password policy')
  }

  const app = createNodeSdkApp(nodeSdk, envId)
  const db = app.database()
  const collection = db.collection('dm_admin_users')
  const matchedDocs = await listAllByAnyWhere(collection, [
    { username },
    { 'data.username': username },
  ], 20)

  if (matchedDocs.length > 0) {
    const existing = toPayload(matchedDocs[0])
    return {
      skipped: true,
      reason: 'admin already exists',
      matchedCount: matchedDocs.length,
      duplicateCount: Math.max(matchedDocs.length - 1, 0),
      adminUserId: existing?.adminUserId || '',
    }
  }

  const now = new Date()
  const doc = {
    adminUserId: createResourceId('admin'),
    username,
    passwordHash: hashPassword(password),
    displayName: process.env.ADMIN_INIT_DISPLAY_NAME || '系统超管',
    roleCodes: (process.env.ADMIN_INIT_ROLE_CODES || 'super_admin').split(',').map((item) => item.trim()).filter(Boolean),
    status: 'active',
    failedLoginCount: 0,
    lockedUntil: null,
    mustResetPassword: true,
    lastLoginAt: null,
    lastLoginIp: '',
    notes: process.env.ADMIN_INIT_NOTES || 'created-by-init-script',
    createdAt: now,
    updatedAt: now,
  }

  await collection.add(doc)

  return {
    skipped: false,
    adminUserId: doc.adminUserId,
    username: doc.username,
  }
}

const envId = getArg('--env') ?? getEnvValue(['CLOUDBASE_ENV_ID'], '<pending-env-id>')
const applyMode = hasFlag('--apply')

const [collections, indexes, accessMatrix, storageMatrix, configGroups] = await Promise.all([
  readJson(path.join(databaseRoot, 'collections', 'collections.json')),
  readJson(path.join(databaseRoot, 'indexes', 'indexes.json')),
  readJson(path.join(databaseRoot, 'rules', 'database-access-matrix.json')),
  readJson(path.join(databaseRoot, 'rules', 'storage-access-matrix.json')),
  readJson(path.join(databaseRoot, 'seeds', 'config-groups.template.json')),
])
void storageMatrix

const plan = {
  envId,
  mode: applyMode ? 'apply' : 'dry-run',
  steps: [
    {
      order: 1,
      type: 'create-collections',
      count: collections.collections.length,
      items: collections.collections.map((item) => item.name),
    },
    {
      order: 2,
      type: 'apply-database-rules',
      count: accessMatrix.collections.length,
      items: buildDatabaseRuleEntries(accessMatrix),
    },
    {
      order: 3,
      type: 'create-indexes',
      count: indexes.indexes.length,
      items: indexes.indexes.map((item) => `${item.collection}.${item.name}`),
    },
    {
      order: 4,
      type: 'seed-config-groups',
      count: configGroups.groups.length,
      items: configGroups.groups.map((item) => item.groupKey),
    },
    {
      order: 5,
      type: 'apply-storage-rule',
      rule: buildStorageRule(),
    },
    {
      order: 6,
      type: 'seed-admin-users',
      note: '若提供 ADMIN_INIT_USERNAME / ADMIN_INIT_PASSWORD，则自动创建首个超管。',
    },
  ],
  pending: [
    'preferredView 默认值文档未锁定，当前初始化脚本不写任何业务层默认偏好。',
    'ad_slots / feature_flags 与 ad_slots_public / feature_flags_public 命名存在文档差异，已保留待确认。',
  ],
}

if (!applyMode) {
  console.log(JSON.stringify(plan, null, 2))
  process.exit(0)
}

const managerConfig = buildManagerConfig(envId)
const ManagerNode = await loadManagerNode()
const nodeSdk = await loadNodeSdk()
const manager = ManagerNode.init ? ManagerNode.init(managerConfig) : new ManagerNode(managerConfig)

const applyResult = {
  envId,
  mode: 'apply',
  collections: null,
  databaseRules: null,
  indexes: null,
  configSeeds: null,
  storageRule: null,
  initialAdmin: null,
  stepErrors: [],
}

try {
  applyResult.collections = await ensureCollections(manager, collections)
  applyResult.databaseRules = await ensureDatabaseRules(manager, envId, accessMatrix)
  applyResult.indexes = await ensureIndexes(manager, indexes)
  applyResult.configSeeds = await upsertConfigGroups(nodeSdk, envId, configGroups)

  try {
    applyResult.storageRule = await ensureStorageRule(manager, envId)
  } catch (error) {
    applyResult.stepErrors.push({
      step: 'storageRule',
      error: serializeApplyError(error),
    })
  }

  try {
    applyResult.initialAdmin = await ensureInitialAdmin(nodeSdk, envId)
  } catch (error) {
    applyResult.stepErrors.push({
      step: 'seed-admin-users',
      error: serializeApplyError(error),
    })
  }

  if (applyResult.stepErrors.length > 0) {
    console.error(JSON.stringify({
      ok: false,
      envId,
      partialResult: applyResult,
      params: {
        indexDirectionEncoding: 'string:1/-1',
        adminInitUsernameProvided: Boolean(process.env.ADMIN_INIT_USERNAME),
        adminInitPasswordProvided: Boolean(process.env.ADMIN_INIT_PASSWORD),
      },
    }, null, 2))
    process.exit(1)
  }

  console.log(JSON.stringify(applyResult, null, 2))
} catch (error) {
  console.error(JSON.stringify({
    ok: false,
    envId,
    partialResult: applyResult,
    error: serializeApplyError(error),
    params: {
      indexDirectionEncoding: 'string:1/-1',
      adminInitUsernameProvided: Boolean(process.env.ADMIN_INIT_USERNAME),
      adminInitPasswordProvided: Boolean(process.env.ADMIN_INIT_PASSWORD),
    },
  }, null, 2))
  process.exit(1)
}
