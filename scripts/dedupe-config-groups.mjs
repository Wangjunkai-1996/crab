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
    throw new Error('placeholder TENCENTCLOUD_SECRETID/TENCENTCLOUD_SECRETKEY detected; replace with real credentials before running dedupe')
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

function compareTimestamp(left, right) {
  const leftValue = typeof left === 'string' ? Date.parse(left) : Number.NaN
  const rightValue = typeof right === 'string' ? Date.parse(right) : Number.NaN

  if (Number.isNaN(leftValue) && Number.isNaN(rightValue)) {
    return 0
  }

  if (Number.isNaN(leftValue)) {
    return -1
  }

  if (Number.isNaN(rightValue)) {
    return 1
  }

  return leftValue - rightValue
}

function normalizePayload(doc) {
  return doc && typeof doc.data === 'object' && doc.data !== null ? doc.data : doc
}

function normalizeBusinessPayload(payload) {
  return JSON.stringify({
    groupKey: payload.groupKey ?? null,
    visibility: payload.visibility ?? null,
    description: payload.description ?? null,
    items: Array.isArray(payload.items) ? payload.items : null,
  })
}

function buildPlan(docs, strategy) {
  const grouped = new Map()

  for (const doc of docs) {
    const payload = normalizePayload(doc)
    const groupKey = typeof payload.groupKey === 'string' && payload.groupKey ? payload.groupKey : '<missing-groupKey>'
    const entries = grouped.get(groupKey) ?? []
    entries.push({
      _id: doc._id,
      payload,
      createdAt: payload.createdAt ?? null,
      updatedAt: payload.updatedAt ?? null,
      configId: payload.configId ?? null,
      fingerprint: normalizeBusinessPayload(payload),
    })
    grouped.set(groupKey, entries)
  }

  const duplicateGroups = []

  for (const [groupKey, entries] of grouped.entries()) {
    if (entries.length <= 1) {
      continue
    }

    const sorted = [...entries].sort((left, right) => compareTimestamp(left.createdAt, right.createdAt))
    const keepEntry = strategy === 'latest' ? sorted[sorted.length - 1] : sorted[0]
    const deleteEntries = sorted.filter((entry) => entry._id !== keepEntry._id)
    const fingerprints = new Set(sorted.map((entry) => entry.fingerprint))

    duplicateGroups.push({
      groupKey,
      count: entries.length,
      strategy,
      sameBusinessPayload: fingerprints.size === 1,
      keep: {
        _id: keepEntry._id,
        configId: keepEntry.configId,
        createdAt: keepEntry.createdAt,
        updatedAt: keepEntry.updatedAt,
      },
      delete: deleteEntries.map((entry) => ({
        _id: entry._id,
        configId: entry.configId,
        createdAt: entry.createdAt,
        updatedAt: entry.updatedAt,
      })),
    })
  }

  duplicateGroups.sort((left, right) => left.groupKey.localeCompare(right.groupKey))
  return duplicateGroups
}

async function applyPlan(collection, duplicateGroups) {
  const applied = []

  for (const group of duplicateGroups) {
    if (!group.sameBusinessPayload) {
      throw new Error(`group ${group.groupKey} has divergent business payloads; abort apply`) 
    }

    for (const entry of group.delete) {
      await collection.doc(entry._id).remove()
      applied.push({
        groupKey: group.groupKey,
        deletedId: entry._id,
      })
    }
  }

  return applied
}

const envId = getArg('--env') ?? getEnvValue(['CLOUDBASE_ENV_ID'], '')
const strategy = getArg('--strategy') ?? 'oldest'
const applyMode = hasFlag('--apply')

if (!envId) {
  console.error(JSON.stringify({ ok: false, error: { message: 'missing envId; pass --env or set CLOUDBASE_ENV_ID' } }, null, 2))
  process.exit(1)
}

if (!['oldest', 'latest'].includes(strategy)) {
  console.error(JSON.stringify({ ok: false, error: { message: 'invalid --strategy, expected oldest or latest' } }, null, 2))
  process.exit(1)
}

const nodeSdk = await loadNodeSdk()
const app = createNodeSdkApp(nodeSdk, envId)
const collection = app.database().collection('dm_configs')
const docs = await listAllDocs(collection)
const duplicateGroups = buildPlan(docs, strategy)

const summary = {
  duplicateGroupCount: duplicateGroups.length,
  totalDeleteCount: duplicateGroups.reduce((total, item) => total + item.delete.length, 0),
  safeGroupCount: duplicateGroups.filter((item) => item.sameBusinessPayload).length,
  unsafeGroupCount: duplicateGroups.filter((item) => !item.sameBusinessPayload).length,
}

if (!applyMode) {
  console.log(JSON.stringify({
    ok: true,
    envId,
    mode: 'dry-run',
    strategy,
    summary,
    duplicateGroups,
    suggestedApplyCommand: `cd /Users/gy-vip/Desktop/KK_Crab-backend/scripts && npm run dedupe:config-groups -- --env ${envId} --strategy ${strategy} --apply`,
  }, null, 2))
  process.exit(0)
}

const applied = await applyPlan(collection, duplicateGroups)
console.log(JSON.stringify({
  ok: true,
  envId,
  mode: 'apply',
  strategy,
  summary,
  applied,
}, null, 2))
