#!/usr/bin/env node
import fs from 'node:fs'
import path from 'node:path'

function parseEnvFile(content) {
  const result = {}
  const lines = content.split(/\r?\n/)

  for (const rawLine of lines) {
    const line = rawLine.trim()
    if (!line || line.startsWith('#')) {
      continue
    }

    const equalIndex = line.indexOf('=')
    if (equalIndex === -1) {
      continue
    }

    const key = line.slice(0, equalIndex).trim()
    let value = line.slice(equalIndex + 1).trim()

    if (!key) {
      continue
    }

    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1)
    }

    result[key] = value
  }

  return result
}

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

function hasFlag(flag) {
  return process.argv.includes(flag)
}

function getDefaultCredentialFile() {
  const homeDir = process.env.HOME
  if (!homeDir) {
    return ''
  }

  return path.join(homeDir, '.config', 'kk-crab', 'admin-web-publish.env')
}

function loadLocalEnvFile(filePath) {
  if (!filePath) {
    return {}
  }

  const normalized = path.resolve(filePath)
  if (!fs.existsSync(normalized)) {
    return {}
  }

  return parseEnvFile(fs.readFileSync(normalized, 'utf8'))
}

function normalizeEnvString(value) {
  return typeof value === 'string' ? value.trim() : ''
}

const credentialFile =
  getArg('--credential-file') ??
  process.env.KK_CRAB_PUBLISH_ENV_FILE ??
  getDefaultCredentialFile()

const localEnv = loadLocalEnvFile(credentialFile)

function getConfigValue(keys, fallback = '') {
  for (const key of keys) {
    const processValue = process.env[key]
    if (typeof processValue === 'string' && processValue.trim()) {
      return processValue.trim()
    }
  }

  for (const key of keys) {
    const fileValue = localEnv[key]
    if (typeof fileValue === 'string' && fileValue.trim()) {
      return fileValue.trim()
    }
  }

  return fallback
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
  const secretId = getConfigValue(['TENCENTCLOUD_SECRETID', 'TENCENT_SECRET_ID'], '')
  const secretKey = getConfigValue(['TENCENTCLOUD_SECRETKEY', 'TENCENT_SECRET_KEY'], '')
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

function buildManagerConfig(envId) {
  const credentialStatus = getTencentCredentialStatus()
  const token = getConfigValue(['TENCENTCLOUD_SESSIONTOKEN', 'TENCENT_SESSION_TOKEN'], undefined)

  if (credentialStatus.status === 'missing') {
    throw new Error('missing real TENCENTCLOUD_SECRETID/TENCENTCLOUD_SECRETKEY (or TENCENT_SECRET_ID/TENCENT_SECRET_KEY)')
  }

  if (credentialStatus.status === 'placeholder') {
    throw new Error('placeholder TENCENTCLOUD_SECRETID/TENCENTCLOUD_SECRETKEY detected; replace with real credentials before running publish')
  }

  return {
    secretId: credentialStatus.secretId,
    secretKey: credentialStatus.secretKey,
    token,
    envId,
  }
}

async function loadManagerNode() {
  try {
    const mod = await import('@cloudbase/manager-node')
    return mod.default ?? mod
  } catch (error) {
    throw new Error('missing @cloudbase/manager-node. run `cd scripts && npm install` first')
  }
}

function ensureDirWithIndex(distDir) {
  const normalized = path.resolve(distDir)
  const indexPath = path.join(normalized, 'index.html')

  if (!fs.existsSync(normalized)) {
    throw new Error(`dist dir not found: ${normalized}`)
  }

  if (!fs.existsSync(indexPath)) {
    throw new Error(`dist index missing: ${indexPath}`)
  }

  return {
    distDir: normalized,
    indexPath,
  }
}

async function ensureHostingReady(manager) {
  const hostings = await manager.hosting.getInfo()

  if (Array.isArray(hostings) && hostings.length > 0) {
    return hostings[0]
  }

  await manager.hosting.enableService()

  for (let attempt = 0; attempt < 20; attempt += 1) {
    await new Promise((resolve) => setTimeout(resolve, 3000))
    const next = await manager.hosting.getInfo()
    if (Array.isArray(next) && next.length > 0) {
      return next[0]
    }
  }

  throw new Error('hosting service was enabled but hosting info is still unavailable after waiting')
}

function printHelp() {
  console.log(`Usage:
  node publish-admin-web-hosting.mjs [options]

Options:
  --env <envId>          CloudBase env id, fallback: CLOUDBASE_ENV_ID / CLOUDBASE_ENV_ID_DEV
  --dist <dir>           local admin-web dist dir, default: /Users/gy-vip/Desktop/KK_Crab-admin/admin-web/dist
  --credential-file <file>
                         local publish credential env file, default: ~/.config/kk-crab/admin-web-publish.env
  --cloud-path <path>    remote hosting path prefix, default: ""
  --dry-run              only validate env/dist and print plan
  --help                 show this help

Examples:
  npm run publish:admin-web -- --env cloud1-xxxx --dist /Users/gy-vip/Desktop/KK_Crab-admin/admin-web/dist
  npm run publish:admin-web -- --credential-file ~/.config/kk-crab/admin-web-publish.env
  npm run publish:admin-web -- --env cloud1-xxxx --dry-run`)
}

if (hasFlag('--help')) {
  printHelp()
  process.exit(0)
}

const envId = getArg('--env') ?? getConfigValue(['CLOUDBASE_ENV_ID', 'CLOUDBASE_ENV_ID_DEV'], '')
const dist = getArg('--dist') ?? '/Users/gy-vip/Desktop/KK_Crab-admin/admin-web/dist'
const cloudPath = getArg('--cloud-path') ?? ''
const dryRun = hasFlag('--dry-run')

if (!envId) {
  console.error(JSON.stringify({
    ok: false,
    error: {
      message: 'missing envId; pass --env or set CLOUDBASE_ENV_ID / CLOUDBASE_ENV_ID_DEV',
    },
  }, null, 2))
  process.exit(1)
}

try {
  const distInfo = ensureDirWithIndex(dist)

  if (dryRun) {
    console.log(JSON.stringify({
      ok: true,
      dryRun: true,
      envId,
      distDir: distInfo.distDir,
      indexPath: distInfo.indexPath,
      cloudPath,
      credentialFile: credentialFile || '<missing>',
      credentialFilePresent: Boolean(credentialFile && fs.existsSync(path.resolve(credentialFile))),
      nextCommand: `cd /Users/gy-vip/Desktop/KK_Crab-backend/scripts && npm run publish:admin-web -- --env ${envId} --dist ${distInfo.distDir}`,
    }, null, 2))
    process.exit(0)
  }

  const ManagerNode = await loadManagerNode()
  const managerConfig = buildManagerConfig(envId)
  const manager = ManagerNode.init ? ManagerNode.init(managerConfig) : new ManagerNode(managerConfig)
  const hosting = await ensureHostingReady(manager)

  await manager.hosting.uploadFiles({
    localPath: distInfo.distDir,
    cloudPath,
    ignore: ['.DS_Store'],
  })

  console.log(JSON.stringify({
    ok: true,
    envId,
    distDir: distInfo.distDir,
    cloudPath,
    credentialFile: credentialFile || '<missing>',
    hosting: {
      envId: hosting.EnvId,
      cdnDomain: hosting.CdnDomain,
      bucket: hosting.Bucket,
      region: hosting.Regoin,
      status: hosting.Status,
    },
    nextSteps: [
      `cd /Users/gy-vip/Desktop/KK_Crab-backend/scripts && npm run check:admin-web-deploy -- --base-url https://${hosting.CdnDomain} --local-dist ${distInfo.distDir}`,
      `cd /Users/gy-vip/Desktop/KK_Crab-admin/admin-web && npm run smoke:admin-auth:real:first-reset`,
    ],
  }, null, 2))
} catch (error) {
  console.error(JSON.stringify({
    ok: false,
    envId,
    dist,
    cloudPath,
    credentialFile: credentialFile || '<missing>',
    error: {
      message: error instanceof Error ? error.message : String(error),
    },
  }, null, 2))
  process.exit(1)
}
