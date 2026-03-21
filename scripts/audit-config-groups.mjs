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
    }
  }

  if (secretIdStatus === 'placeholder' || secretKeyStatus === 'placeholder') {
    return {
      status: 'placeholder',
      secretId,
      secretKey,
    }
  }

  return {
    status: 'provided',
    secretId,
    secretKey,
  }
}

async function readJson(filePath) {
  return JSON.parse(await fs.readFile(filePath, 'utf8'))
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
    throw new Error('placeholder TENCENTCLOUD_SECRETID/TENCENTCLOUD_SECRETKEY detected; replace with real credentials before running audit')
  }

  return nodeSdk.init({
    env: envId,
    secretId: credentialStatus.secretId,
    secretKey: credentialStatus.secretKey,
    sessionToken: getEnvValue(['TENCENTCLOUD_SESSIONTOKEN', 'TENCENT_SESSION_TOKEN'], undefined),
  })
}

async function listAllDocs(collection, pageSize = 100) {
  const rows = []
  let skip = 0

  while (true) {
    const result = await collection.skip(skip).limit(pageSize).get()
    rows.push(...result.data)

    if (result.data.length < pageSize) {
      return rows
    }

    skip += result.data.length
  }
}

function summarizeByGroupKey(docs) {
  const groups = new Map()

  for (const doc of docs) {
    const payload = doc && typeof doc.data === 'object' && doc.data !== null ? doc.data : doc
    const groupKey = typeof payload.groupKey === 'string' && payload.groupKey ? payload.groupKey : '<missing-groupKey>'
    const summary = groups.get(groupKey) ?? {
      groupKey,
      count: 0,
      visibilities: new Set(),
      ids: [],
    }

    summary.count += 1
    summary.ids.push(doc._id)
    if (typeof payload.visibility === 'string' && payload.visibility) {
      summary.visibilities.add(payload.visibility)
    }
    groups.set(groupKey, summary)
  }

  return [...groups.values()]
    .map((item) => ({
      groupKey: item.groupKey,
      count: item.count,
      visibilities: [...item.visibilities.values()].sort(),
      ids: item.ids,
    }))
    .sort((left, right) => left.groupKey.localeCompare(right.groupKey))
}

function buildDiagnosis(expectedGroups, summaries) {
  const expectedSet = new Set(expectedGroups)
  const duplicateGroups = summaries.filter((item) => item.count > 1)
  const unexpectedGroups = summaries.filter((item) => !expectedSet.has(item.groupKey))
  const missingGroups = expectedGroups.filter((groupKey) => !summaries.some((item) => item.groupKey === groupKey))

  let primaryFinding = 'no-drift-detected'
  let explanation = '当前 `dm_configs` 与初始化模板按 `groupKey` 对齐，未发现额外组或重复组。'

  if (duplicateGroups.length > 0 && unexpectedGroups.length > 0) {
    primaryFinding = 'mixed-historical-and-duplicate'
    explanation = '同时存在模板外历史组与重复 groupKey；当前 upsert 不会新增新重复，但也不会收敛已有重复，仍需后续去重。'
  } else if (duplicateGroups.length > 0) {
    primaryFinding = 'duplicate-groups-detected'
    explanation = '存在重复 groupKey；这更像历史重复 seed 或既有重复数据，当前 upsert 只更新首条记录，幂等写入不会自动清理旧重复。'
  } else if (unexpectedGroups.length > 0) {
    primaryFinding = 'historical-extra-groups-detected'
    explanation = '存在模板外 groupKey，更像环境已有历史配置，而不是当前模板再次重复写入。'
  } else if (missingGroups.length > 0) {
    primaryFinding = 'missing-expected-groups'
    explanation = '模板中的部分 groupKey 未落库，需排查 seed 是否完整执行。'
  }

  return {
    primaryFinding,
    explanation,
    duplicateGroups,
    unexpectedGroups,
    missingGroups,
    idempotenceAssessment: duplicateGroups.length > 0
      ? '当前 upsert 对未来重跑基本幂等，但无法自动收口既有重复 groupKey，建议补清理或唯一性守卫。'
      : '当前 upsert 表现为幂等，未见脚本继续制造重复的证据。',
  }
}

const envId = getArg('--env') ?? getEnvValue(['CLOUDBASE_ENV_ID'], '')

if (!envId) {
  console.error(JSON.stringify({
    ok: false,
    error: {
      message: 'missing envId; pass --env or set CLOUDBASE_ENV_ID',
    },
  }, null, 2))
  process.exit(1)
}

const [nodeSdk, configTemplate] = await Promise.all([
  loadNodeSdk(),
  readJson(path.join(databaseRoot, 'seeds', 'config-groups.template.json')),
])

const app = createNodeSdkApp(nodeSdk, envId)
const db = app.database()
const docs = await listAllDocs(db.collection('dm_configs'))
const expectedGroups = configTemplate.groups.map((item) => item.groupKey)
const summaries = summarizeByGroupKey(docs)
const diagnosis = buildDiagnosis(expectedGroups, summaries)

console.log(JSON.stringify({
  ok: true,
  envId,
  totalDocs: docs.length,
  expectedGroupCount: expectedGroups.length,
  expectedGroups,
  summaries,
  diagnosis,
}, null, 2))
