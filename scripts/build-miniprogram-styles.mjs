#!/usr/bin/env node
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import * as sass from 'sass'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const repoRoot = path.resolve(__dirname, '..')
const miniprogramRoot = path.join(repoRoot, 'miniprogram')

function walkScssFiles(targetDir, files = []) {
  for (const entry of fs.readdirSync(targetDir, { withFileTypes: true })) {
    const absolutePath = path.join(targetDir, entry.name)

    if (entry.isDirectory()) {
      if (entry.name === 'node_modules' || entry.name === 'evidence') {
        continue
      }

      walkScssFiles(absolutePath, files)
      continue
    }

    if (!entry.isFile() || !absolutePath.endsWith('.scss')) {
      continue
    }

    const relativePath = path.relative(miniprogramRoot, absolutePath)

    if (relativePath.startsWith(`styles${path.sep}`)) {
      continue
    }

    files.push(absolutePath)
  }

  return files
}

function normalizeWxss(content) {
  return content
    .replace(/^@charset "UTF-8";\n?/i, '')
    .replace(/\n{3,}/g, '\n\n')
}

const scssFiles = walkScssFiles(miniprogramRoot)
const outputs = []

for (const filePath of scssFiles) {
  const result = sass.compile(filePath, {
    loadPaths: [miniprogramRoot],
    style: 'expanded',
    silenceDeprecations: ['import'],
  })

  const outputPath = filePath.replace(/\.scss$/, '.wxss')
  fs.writeFileSync(outputPath, normalizeWxss(result.css), 'utf8')
  outputs.push(path.relative(miniprogramRoot, outputPath))
}

console.log(
  JSON.stringify(
    {
      ok: true,
      scssEntryCount: scssFiles.length,
      generatedWxssCount: outputs.length,
      generatedWxssEntries: outputs,
    },
    null,
    2,
  ),
)
