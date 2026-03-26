#!/usr/bin/env node
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const repoRoot = path.resolve(__dirname, '..')

const requiredFunctionDirs = [
  'cloudfunctions/shared/src',
  'cloudfunctions/user-bff/src',
  'cloudfunctions/admin-auth/src',
  'cloudfunctions/publisher-bff/src',
  'cloudfunctions/creator-bff/src',
  'cloudfunctions/notice-bff/src',
  'cloudfunctions/application-bff/src',
  'cloudfunctions/message-bff/src',
  'cloudfunctions/report-bff/src',
  'cloudfunctions/review-admin/src',
  'cloudfunctions/governance-admin/src',
  'cloudfunctions/cron-jobs/src',
]

const missing = requiredFunctionDirs.filter((dir) => !fs.existsSync(path.join(repoRoot, dir)))

if (missing.length > 0) {
  console.error(JSON.stringify({ ok: false, missing }, null, 2))
  process.exit(1)
}

const collections = JSON.parse(fs.readFileSync(path.join(repoRoot, 'database/collections/collections.json'), 'utf8'))
const indexes = JSON.parse(fs.readFileSync(path.join(repoRoot, 'database/indexes/indexes.json'), 'utf8'))
const rules = JSON.parse(fs.readFileSync(path.join(repoRoot, 'database/rules/database-access-matrix.json'), 'utf8'))

const summary = {
  ok: true,
  collectionCount: collections.collections.length,
  indexCount: indexes.indexes.length,
  ruleCollectionCount: rules.collections.length,
  checks: {
    hasSharedRouter: fs.existsSync(path.join(repoRoot, 'cloudfunctions/shared/src/router/create-action-router.ts')),
    hasUserBootstrap: fs.existsSync(path.join(repoRoot, 'cloudfunctions/user-bff/src/actions/bootstrap.ts')),
    hasAdminAuth: fs.existsSync(path.join(repoRoot, 'cloudfunctions/admin-auth/src/index.ts')),
    hasAdminDtos: fs.existsSync(path.join(repoRoot, 'cloudfunctions/shared/src/contracts/admin/review-admin.ts')),
    hasAdminSamples: fs.existsSync(path.join(repoRoot, 'scripts/api-samples/review-admin.taskDetail.response.json')),
    hasMiniprogramGuide: fs.existsSync(path.join(repoRoot, 'scripts/coordination/miniprogram-cloudbase-integration.md')),
    hasExecutableInitScript: fs.existsSync(path.join(repoRoot, 'scripts/package.json')),
  },
}

if (summary.collectionCount !== 14 || summary.indexCount !== 25 || summary.ruleCollectionCount !== 14) {
  summary.ok = false
  console.error(JSON.stringify(summary, null, 2))
  process.exit(1)
}

if (Object.values(summary.checks).some((value) => value !== true)) {
  summary.ok = false
  console.error(JSON.stringify(summary, null, 2))
  process.exit(1)
}

console.log(JSON.stringify(summary, null, 2))
