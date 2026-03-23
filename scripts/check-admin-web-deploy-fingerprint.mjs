#!/usr/bin/env node
import crypto from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'
import { URL } from 'node:url'

const DEFAULT_PAGE_PATHS = ['/']
const DEFAULT_MARKERS = [
  'markPasswordResetCompleted',
  'mustResetPassword',
  'changePassword',
]
const MAX_ASSET_COUNT = 20
const MAX_REDIRECTS = 5

function getArg(flag) {
  const index = process.argv.indexOf(flag)
  if (index === -1) {
    return undefined
  }

  return process.argv[index + 1]
}

function getMultiArg(flag) {
  const values = []
  for (let index = 0; index < process.argv.length; index += 1) {
    if (process.argv[index] === flag) {
      const next = process.argv[index + 1]
      if (typeof next === 'string' && next.trim()) {
        values.push(next.trim())
      }
    }
  }

  return values
}

function hasFlag(flag) {
  return process.argv.includes(flag)
}

function normalizeBaseUrl(input) {
  const value = typeof input === 'string' ? input.trim() : ''
  if (!value) {
    return ''
  }

  return value.endsWith('/') ? value.slice(0, -1) : value
}

function pickEnv(...keys) {
  for (const key of keys) {
    const value = process.env[key]
    if (typeof value === 'string' && value.trim()) {
      return value.trim()
    }
  }

  return ''
}

function sha256(value) {
  return crypto.createHash('sha256').update(value).digest('hex')
}

async function fetchWithRedirects(inputUrl, options = {}) {
  const { redirects = 0 } = options
  const response = await fetch(inputUrl, {
    redirect: 'manual',
    headers: {
      'user-agent': 'kk-crab-admin-web-deploy-check/1.0',
    },
  })

  const status = response.status
  if (status >= 300 && status < 400) {
    const location = response.headers.get('location')
    if (!location) {
      throw new Error(`redirect without location: ${inputUrl}`)
    }

    if (redirects >= MAX_REDIRECTS) {
      throw new Error(`too many redirects: ${inputUrl}`)
    }

    const nextUrl = new URL(location, inputUrl).toString()
    return fetchWithRedirects(nextUrl, { redirects: redirects + 1 })
  }

  const contentType = response.headers.get('content-type') || ''
  const body = await response.text()
  return {
    finalUrl: response.url || inputUrl,
    status,
    ok: response.ok,
    contentType,
    body,
  }
}

function extractAssetUrls(html, pageUrl) {
  const urls = new Set()
  const scriptPattern = /<script[^>]+src=["']([^"']+)["'][^>]*>/gi
  const stylePattern = /<link[^>]+href=["']([^"']+)["'][^>]*>/gi

  for (const pattern of [scriptPattern, stylePattern]) {
    let match = pattern.exec(html)
    while (match) {
      const raw = match[1]
      if (raw && !raw.startsWith('data:')) {
        urls.add(new URL(raw, pageUrl).toString())
      }
      match = pattern.exec(html)
    }
  }

  return [...urls]
}

function extractAssetBasename(assetUrl) {
  try {
    const pathname = new URL(assetUrl).pathname
    const base = path.basename(pathname)
    return base || pathname
  } catch {
    return assetUrl
  }
}

function parseLocalIndexAssets(localDistDir) {
  const indexPath = path.join(localDistDir, 'index.html')
  if (!fs.existsSync(indexPath)) {
    throw new Error(`local dist index missing: ${indexPath}`)
  }

  const html = fs.readFileSync(indexPath, 'utf8')
  const fakePageUrl = 'https://local.dist/'
  const assets = extractAssetUrls(html, fakePageUrl).map((item) => {
    const pathname = new URL(item).pathname
    return pathname.startsWith('/') ? pathname.slice(1) : pathname
  })

  return {
    indexPath,
    assets,
    assetBasenames: assets.map((item) => path.basename(item)),
  }
}

function printHelp() {
  console.log(`Usage:
  node check-admin-web-deploy-fingerprint.mjs [options]

Options:
  --base-url <url>        admin-web base url, fallback: ADMIN_WEB_BASE_URL
  --path <path>           page path to inspect, repeatable; default: "/"
  --marker <text>         marker text to assert in downloaded JS, repeatable
  --local-dist <path>     optional local admin-web dist dir for asset filename comparison
  --output <file>         optional output json file path
  --json                  print JSON only
  --help                  show this help

Example:
  node check-admin-web-deploy-fingerprint.mjs \\
    --base-url https://cloud1-xxx.tcloudbaseapp.com \\
    --marker markPasswordResetCompleted \\
    --local-dist /Users/gy-vip/Desktop/KK_Crab-admin/admin-web/dist`)
}

if (hasFlag('--help')) {
  printHelp()
  process.exit(0)
}

const baseUrl = normalizeBaseUrl(getArg('--base-url') || pickEnv('ADMIN_WEB_BASE_URL'))
const pagePaths = getMultiArg('--path')
const markers = getMultiArg('--marker')
const localDistDir = getArg('--local-dist')
const outputFile = getArg('--output')
const jsonOnly = hasFlag('--json')

if (!baseUrl) {
  console.error(JSON.stringify({
    ok: false,
    error: {
      message: 'missing base url; pass --base-url or set ADMIN_WEB_BASE_URL',
    },
  }, null, 2))
  process.exit(1)
}

const targetPaths = pagePaths.length > 0 ? pagePaths : DEFAULT_PAGE_PATHS
const targetMarkers = markers.length > 0 ? markers : DEFAULT_MARKERS

const pageResults = []
const assetUrlSet = new Set()

for (const pagePath of targetPaths) {
  const pageUrl = new URL(pagePath, `${baseUrl}/`).toString()
  const page = await fetchWithRedirects(pageUrl)
  const assets = page.ok && page.contentType.includes('text/html')
    ? extractAssetUrls(page.body, page.finalUrl)
    : []

  for (const assetUrl of assets) {
    assetUrlSet.add(assetUrl)
  }

  pageResults.push({
    requestUrl: pageUrl,
    finalUrl: page.finalUrl,
    status: page.status,
    ok: page.ok,
    contentType: page.contentType,
    htmlSha256: sha256(page.body),
    assetsDiscovered: assets.length,
  })
}

const assetUrls = [...assetUrlSet].slice(0, MAX_ASSET_COUNT)
const assetResults = []

for (const assetUrl of assetUrls) {
  const resource = await fetchWithRedirects(assetUrl)
  const content = resource.body
  assetResults.push({
    url: resource.finalUrl,
    status: resource.status,
    ok: resource.ok,
    contentType: resource.contentType,
    byteLength: Buffer.byteLength(content),
    sha256: sha256(content),
    basename: extractAssetBasename(resource.finalUrl),
    content,
  })
}

const jsAssets = assetResults.filter(
  (item) => item.contentType.includes('javascript') || item.basename.endsWith('.js'),
)

const markerChecks = targetMarkers.map((marker) => {
  const matchedAssets = jsAssets
    .filter((asset) => asset.content.includes(marker))
    .map((asset) => asset.basename)

  return {
    marker,
    found: matchedAssets.length > 0,
    matchedAssets,
  }
})

let localComparison = null
if (localDistDir) {
  const local = parseLocalIndexAssets(localDistDir)
  const remoteBasenames = assetResults.map((item) => item.basename)
  const missingInRemote = local.assetBasenames.filter((name) => !remoteBasenames.includes(name))
  const matched = local.assetBasenames.filter((name) => remoteBasenames.includes(name))

  localComparison = {
    localDistDir: path.resolve(localDistDir),
    localIndexPath: local.indexPath,
    localAssetCount: local.assetBasenames.length,
    remoteAssetCount: remoteBasenames.length,
    matchedCount: matched.length,
    missingInRemoteCount: missingInRemote.length,
    missingInRemote,
  }
}

const summaryAssets = assetResults.map((item) => ({
  basename: item.basename,
  status: item.status,
  ok: item.ok,
  contentType: item.contentType,
  byteLength: item.byteLength,
  sha256: item.sha256,
}))

const allMarkersFound = markerChecks.every((item) => item.found)
const pagesOk = pageResults.some((item) => item.ok && item.contentType.includes('text/html'))
const localAligned = localComparison ? localComparison.missingInRemoteCount === 0 : null

const result = {
  ok: pagesOk && allMarkersFound && (localAligned === null || localAligned),
  checkedAt: new Date().toISOString(),
  baseUrl,
  targetPaths,
  pageResults,
  markerChecks,
  localComparison,
  fetchedAssetCount: summaryAssets.length,
  assets: summaryAssets,
  interpretation: {
    pagesReachable: pagesOk,
    markersAllFound: allMarkersFound,
    localDistAligned: localAligned,
    suggestion: pagesOk && allMarkersFound
      ? '线上资源包含当前关键标记；若 UI 行为仍异常，优先排查运行态/状态链路'
      : '线上可能仍有旧版资源或关键逻辑未部署；优先核对 admin-web 发布版本',
  },
}

if (outputFile) {
  fs.writeFileSync(path.resolve(outputFile), `${JSON.stringify(result, null, 2)}\n`, 'utf8')
}

if (jsonOnly) {
  console.log(JSON.stringify(result, null, 2))
  process.exit(result.ok ? 0 : 2)
}

console.log(`# Admin-Web Deploy Fingerprint Check`)
console.log('')
console.log(`- baseUrl: ${result.baseUrl}`)
console.log(`- pagesReachable: ${result.interpretation.pagesReachable}`)
console.log(`- markersAllFound: ${result.interpretation.markersAllFound}`)
console.log(`- localDistAligned: ${result.interpretation.localDistAligned === null ? 'n/a' : result.interpretation.localDistAligned}`)
console.log(`- fetchedAssetCount: ${result.fetchedAssetCount}`)
console.log('')
console.log('## Marker Checks')
for (const marker of result.markerChecks) {
  console.log(`- ${marker.found ? '✅' : '❌'} ${marker.marker}${marker.matchedAssets.length > 0 ? ` (${marker.matchedAssets.join(', ')})` : ''}`)
}
console.log('')
console.log('## Suggestion')
console.log(`- ${result.interpretation.suggestion}`)
console.log('')
console.log('## JSON Result')
console.log(JSON.stringify(result, null, 2))

process.exit(result.ok ? 0 : 2)
