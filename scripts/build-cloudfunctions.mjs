#!/usr/bin/env node
import { spawnSync } from 'node:child_process'
import { existsSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const repoRoot = path.resolve(__dirname, '..')
const cloudfunctionsRoot = path.join(repoRoot, 'cloudfunctions')
const functionNames = [
  'user-bff',
  'admin-auth',
  'publisher-bff',
  'creator-bff',
  'notice-bff',
  'application-bff',
  'message-bff',
  'report-bff',
  'review-admin',
  'governance-admin',
  'cron-jobs',
]

const requested = process.argv[2] && process.argv[2] !== 'all' ? [process.argv[2]] : functionNames

for (const functionName of requested) {
  const entryFile = path.join(cloudfunctionsRoot, functionName, 'src', 'index.ts')
  const outputFile = path.join(cloudfunctionsRoot, functionName, 'index.js')

  if (!existsSync(entryFile)) {
    console.error(`missing entry file: ${entryFile}`)
    process.exitCode = 1
    continue
  }

  const result = spawnSync(
    'npx',
    [
      '-y',
      'esbuild',
      entryFile,
      '--bundle',
      '--platform=node',
      '--format=cjs',
      '--target=node16',
      '--external:wx-server-sdk',
      `--outfile=${outputFile}`,
    ],
    {
      cwd: repoRoot,
      stdio: 'inherit',
    },
  )

  if (result.status !== 0) {
    process.exit(result.status ?? 1)
  }
}
