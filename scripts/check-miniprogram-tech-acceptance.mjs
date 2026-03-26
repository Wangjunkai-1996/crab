#!/usr/bin/env node
import path from 'node:path'
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const repoRoot = path.resolve(__dirname, '..')
const nodeBin = process.execPath

const gates = [
  {
    key: 'build_miniprogram_js',
    command: [nodeBin, path.join(repoRoot, 'scripts/build-miniprogram-js.mjs')],
  },
  {
    key: 'check_devtools_readiness',
    command: [nodeBin, path.join(repoRoot, 'scripts/check-devtools-readiness.mjs')],
  },
  {
    key: 'check_wechat_devtools_cli',
    command: [nodeBin, path.join(repoRoot, 'scripts/check-wechat-devtools-cli.mjs')],
  },
]

function runGate(command) {
  const result = spawnSync(command[0], command.slice(1), {
    cwd: repoRoot,
    encoding: 'utf8',
  })

  return {
    ok: result.status === 0,
    exitCode: typeof result.status === 'number' ? result.status : -1,
    stdout: result.stdout?.trim() || '',
    stderr: result.stderr?.trim() || '',
  }
}

const gateResults = gates.map((gate) => ({
  key: gate.key,
  ...runGate(gate.command),
}))

const summary = {
  round: 'R58',
  ok: gateResults.every((gate) => gate.ok),
  gates: gateResults,
  nextAction: gateResults.every((gate) => gate.ok)
    ? '预检已全绿，可继续执行 DevTools open + auto-smoke 验收'
    : '优先修复失败 gate；若仅 CLI gate 失败，通常只需开启微信开发者工具服务端口',
}

console.log(JSON.stringify(summary, null, 2))

if (!summary.ok) {
  process.exitCode = 1
}
