#!/usr/bin/env bash

set -euo pipefail
export LC_ALL=C

usage() {
  cat <<'EOF'
Usage:
  tools/control-center/sync-control-state.sh [--runtime-dir PATH] [--state-dir PATH]

Options:
  --runtime-dir PATH  Custom shared runtime directory. Defaults to <main-repo-name>-control sibling directory.
  --state-dir PATH    Custom repository snapshot directory. Defaults to .control-state/current under repo root.
EOF
}

runtime_dir=""
state_dir=""

while [[ $# -gt 0 ]]; do
  case "$1" in
    --runtime-dir)
      runtime_dir="${2:-}"
      if [[ -z "$runtime_dir" ]]; then
        echo "error: --runtime-dir requires a path" >&2
        exit 1
      fi
      shift 2
      ;;
    --state-dir)
      state_dir="${2:-}"
      if [[ -z "$state_dir" ]]; then
        echo "error: --state-dir requires a path" >&2
        exit 1
      fi
      shift 2
      ;;
    -h|--help)
      usage
      exit 0
      ;;
    *)
      echo "error: unknown argument: $1" >&2
      usage >&2
      exit 1
      ;;
  esac
done

script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
repo_root="$(git -C "$script_dir" rev-parse --show-toplevel)"
git_common_dir="$(git -C "$repo_root" rev-parse --git-common-dir)"
if [[ "$git_common_dir" != /* ]]; then
  git_common_dir="$repo_root/$git_common_dir"
fi
main_repo_root="$(cd "$git_common_dir/.." && pwd)"
project_name="$(basename "$main_repo_root")"
parent_dir="$(dirname "$main_repo_root")"

runtime_dir="${runtime_dir:-$parent_dir/${project_name}-control}"
state_dir="${state_dir:-$repo_root/.control-state/current}"

front_worktree="${FRONT_WORKTREE:-$parent_dir/${project_name}-mp}"
admin_worktree="${ADMIN_WORKTREE:-$parent_dir/${project_name}-admin}"
backend_worktree="${BACKEND_WORKTREE:-$parent_dir/${project_name}-backend}"

if [[ ! -d "$runtime_dir" ]]; then
  echo "error: runtime control center not found: $runtime_dir" >&2
  exit 1
fi

mkdir -p "$state_dir"
find "$state_dir" -mindepth 1 -delete

render_snapshot() {
  local src="$1"
  local dst="$2"

  mkdir -p "$(dirname "$dst")"

  escape_pattern() {
    printf '%s' "$1" | sed -e 's/[.[\*^$()+?{}|/\\]/\\&/g'
  }

  sed \
    -e "s|$(escape_pattern "$front_worktree")|__FRONT_WORKTREE__|g" \
    -e "s|$(escape_pattern "$admin_worktree")|__ADMIN_WORKTREE__|g" \
    -e "s|$(escape_pattern "$backend_worktree")|__BACKEND_WORKTREE__|g" \
    -e "s|$(escape_pattern "$runtime_dir")|__RUNTIME_DIR__|g" \
    -e "s|$(escape_pattern "$main_repo_root")|__MAIN_REPO_ROOT__|g" \
    -e "s|$(escape_pattern "$repo_root")|__REPO_ROOT__|g" \
    "$src" > "$dst"
}

while IFS= read -r -d '' src; do
  if [[ "$(basename "$src")" == "README.md" ]]; then
    continue
  fi

  rel_path="${src#$runtime_dir/}"
  dst="$state_dir/$rel_path"
  render_snapshot "$src" "$dst"
done < <(find "$runtime_dir" -type f -print0 | sort -z)

echo "Control state snapshot synced."
echo "Runtime directory: $runtime_dir"
echo "State snapshot: $state_dir"
