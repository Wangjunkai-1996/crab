#!/usr/bin/env node
import fs from 'node:fs'
import path from 'node:path'
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const repoRoot = path.resolve(__dirname, '..')
const miniprogramRoot = path.join(repoRoot, 'miniprogram')
const tsconfigPath = path.join(miniprogramRoot, 'tsconfig.json')
const appJsonPath = path.join(miniprogramRoot, 'app.json')

function readJson(targetPath) {
  return JSON.parse(fs.readFileSync(targetPath, 'utf8'))
}

function collectPageEntryPaths(appConfig) {
  const entries = [...(appConfig.pages || [])]

  for (const subpackage of appConfig.subpackages || []) {
    const root = subpackage.root || ''
    for (const page of subpackage.pages || []) {
      entries.push(path.posix.join(root, page))
    }
  }

  return entries
}

function runTsc() {
  const result = spawnSync('npx', ['--yes', '-p', 'typescript', 'tsc', '-p', tsconfigPath], {
    cwd: repoRoot,
    stdio: 'inherit',
  })

  if (typeof result.status === 'number' && result.status !== 0) {
    process.exit(result.status)
  }

  if (result.error) {
    throw result.error
  }
}

function verifyJsOutputs(pageEntries) {
  const requiredTargets = ['app', ...pageEntries]
  const missing = requiredTargets.filter((entry) => !fs.existsSync(path.join(miniprogramRoot, `${entry}.js`)))

  return {
    requiredCount: requiredTargets.length,
    missing,
  }
}

const appConfig = readJson(appJsonPath)
const pageEntries = collectPageEntryPaths(appConfig)

runTsc()

const outputCheck = verifyJsOutputs(pageEntries)

console.log(
  JSON.stringify(
    {
      ok: outputCheck.missing.length === 0,
      tsconfigPath,
      generatedEntryCount: outputCheck.requiredCount,
      missingJsEntries: outputCheck.missing,
    },
    null,
    2,
  ),
)

if (outputCheck.missing.length > 0) {
  process.exitCode = 1
}
