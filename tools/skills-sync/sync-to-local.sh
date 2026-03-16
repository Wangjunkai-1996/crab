#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")" && pwd)"
AGENTS_TARGET="$HOME/.agents/skills"
CODEX_TARGET="$HOME/.codex/skills"

mkdir -p "$AGENTS_TARGET"
mkdir -p "$CODEX_TARGET"

rsync -a "$ROOT_DIR/agents/" "$AGENTS_TARGET/"
rsync -a "$ROOT_DIR/codex/" "$CODEX_TARGET/"

echo "Skills synced to:"
echo "  $AGENTS_TARGET"
echo "  $CODEX_TARGET"
