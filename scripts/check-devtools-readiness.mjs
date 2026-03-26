#!/usr/bin/env node
import fs from 'node:fs'
import path from 'node:path'
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const repoRoot = path.resolve(__dirname, '..')
const miniprogramRoot = path.join(repoRoot, 'miniprogram')
const expectedAppId = 'wxa6f615dcab1f984f'
const autoSmokeServicePath = path.join(miniprogramRoot, 'services/dev-auto-smoke.service.ts')
const appEntryPath = path.join(miniprogramRoot, 'app.ts')
const executionPath = `${path.dirname(process.execPath)}:${process.env.PATH || ''}`

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

function runTypeCheck() {
  const result = spawnSync('npx', ['--yes', '-p', 'typescript', 'tsc', '--noEmit', '-p', path.join(miniprogramRoot, 'tsconfig.json')], {
    cwd: repoRoot,
    encoding: 'utf8',
    env: {
      ...process.env,
      PATH: executionPath,
    },
  })

  return {
    ok: result.status === 0,
    stdout: result.stdout?.trim() || '',
    stderr: result.stderr?.trim() || '',
  }
}

function collectMissingPageArtifacts(pageEntries) {
  const targets = ['app', ...pageEntries]
  const missing = []

  for (const entry of targets) {
    const jsPath = path.join(miniprogramRoot, `${entry}.js`)
    const tsPath = path.join(miniprogramRoot, `${entry}.ts`)
    const wxmlPath = path.join(miniprogramRoot, `${entry}.wxml`)
    const jsonPath = path.join(miniprogramRoot, `${entry}.json`)
    const wxssPath = path.join(miniprogramRoot, `${entry}.wxss`)

    if (entry === 'app') {
      if (!fs.existsSync(jsPath)) {
        missing.push(`${entry}.js`)
      }
      if (!fs.existsSync(tsPath)) {
        missing.push(`${entry}.ts`)
      }
      if (!fs.existsSync(wxssPath)) {
        missing.push(`${entry}.wxss`)
      }
      continue
    }

    if (!fs.existsSync(jsPath)) {
      missing.push(`${entry}.js`)
    }
    if (!fs.existsSync(tsPath)) {
      missing.push(`${entry}.ts`)
    }
    if (!fs.existsSync(wxmlPath)) {
      missing.push(`${entry}.wxml`)
    }
    if (!fs.existsSync(jsonPath)) {
      missing.push(`${entry}.json`)
    }
    if (!fs.existsSync(wxssPath)) {
      missing.push(`${entry}.wxss`)
    }
  }

  return missing
}

function collectMissingComponentWxssOutputs() {
  const missing = []

  function walk(targetDir) {
    for (const entry of fs.readdirSync(targetDir, { withFileTypes: true })) {
      const absolutePath = path.join(targetDir, entry.name)

      if (entry.isDirectory()) {
        if (entry.name === 'node_modules' || entry.name === 'evidence' || entry.name === 'styles') {
          continue
        }

        walk(absolutePath)
        continue
      }

      if (!entry.isFile() || !absolutePath.endsWith('.scss')) {
        continue
      }

      const wxssPath = absolutePath.replace(/\.scss$/, '.wxss')

      if (!fs.existsSync(wxssPath)) {
        missing.push(path.relative(miniprogramRoot, wxssPath))
      }
    }
  }

  walk(miniprogramRoot)

  return missing
}

function collectWxmlIssues() {
  const issues = []
  const wxmlFiles = []

  function walk(targetDir) {
    for (const entry of fs.readdirSync(targetDir, { withFileTypes: true })) {
      const absolutePath = path.join(targetDir, entry.name)

      if (entry.isDirectory()) {
        walk(absolutePath)
        continue
      }

      if (entry.isFile() && absolutePath.endsWith('.wxml')) {
        wxmlFiles.push(absolutePath)
      }
    }
  }

  walk(miniprogramRoot)

  for (const filePath of wxmlFiles) {
    const lines = fs.readFileSync(filePath, 'utf8').split('\n')

    for (let index = 0; index < lines.length; index += 1) {
      const line = lines[index]
      const trimmed = line.trim()

      if (!trimmed) {
        continue
      }

      if ((trimmed.includes('wx:else') || trimmed.includes('wx:elif')) && trimmed.includes('wx:for')) {
        issues.push({
          file: path.relative(miniprogramRoot, filePath),
          line: index + 1,
          message: '同一标签同时出现条件分支与 wx:for，易触发 DevTools 编译错误',
        })
      }
    }
  }

  return issues
}

const projectConfig = readJson(path.join(miniprogramRoot, 'project.config.json'))
const appConfig = readJson(path.join(miniprogramRoot, 'app.json'))
const pageEntries = collectPageEntryPaths(appConfig)
const typecheck = runTypeCheck()
const missingArtifacts = collectMissingPageArtifacts(pageEntries)
const missingComponentWxssOutputs = collectMissingComponentWxssOutputs()
const wxmlIssues = collectWxmlIssues()
const autoSmokeReady =
  fs.existsSync(autoSmokeServicePath) &&
  fs.readFileSync(autoSmokeServicePath, 'utf8').includes('AUTO_SMOKE_RESULT::') &&
  fs.readFileSync(appEntryPath, 'utf8').includes('resolveAutoSmokeLaunchOptions')

const summary = {
  ok:
    projectConfig.appid === expectedAppId &&
    typecheck.ok &&
    missingArtifacts.length === 0 &&
    missingComponentWxssOutputs.length === 0 &&
    wxmlIssues.length === 0 &&
    autoSmokeReady,
  projectConfigAppId: projectConfig.appid || '',
  expectedAppId,
  pageEntryCount: pageEntries.length,
  checks: [
    {
      key: 'project_config_appid',
      ok: projectConfig.appid === expectedAppId,
      detail: `project.config.json=${projectConfig.appid || 'missing'}`,
    },
    {
      key: 'typescript_no_emit',
      ok: typecheck.ok,
      detail: typecheck.ok ? 'tsc --noEmit passed' : typecheck.stderr || typecheck.stdout || 'tsc failed',
    },
    {
      key: 'compiled_js_outputs',
      ok: missingArtifacts.length === 0,
      detail: missingArtifacts.length === 0 ? `已发现 ${pageEntries.length + 1} 个页面入口及对应样式产物` : missingArtifacts.join(', '),
    },
    {
      key: 'compiled_component_styles',
      ok: missingComponentWxssOutputs.length === 0,
      detail: missingComponentWxssOutputs.length === 0 ? '已发现组件样式产物' : missingComponentWxssOutputs.join(', '),
    },
    {
      key: 'wxml_compatibility',
      ok: wxmlIssues.length === 0,
      detail: wxmlIssues.length === 0 ? '未发现已知 DevTools 兼容性问题' : `${wxmlIssues.length} 个疑似问题`,
    },
    {
      key: 'auto_smoke_hook',
      ok: autoSmokeReady,
      detail: autoSmokeReady ? '已发现 launch query auto-smoke 链路与 tagged result 输出' : '未发现 R58 auto-smoke 启动链路',
    },
  ],
  missingArtifacts,
  missingComponentWxssOutputs,
  wxmlIssues,
}

console.log(JSON.stringify(summary, null, 2))

if (!summary.ok) {
  process.exitCode = 1
}
