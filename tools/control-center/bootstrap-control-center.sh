#!/usr/bin/env bash

set -euo pipefail

usage() {
  cat <<'EOF'
Usage:
  tools/control-center/bootstrap-control-center.sh [--force] [--runtime-dir PATH]

Options:
  --force             Overwrite existing runtime files with repository seed files.
  --runtime-dir PATH  Custom shared runtime directory. Defaults to <main-repo-name>-control sibling directory.
EOF
}

force=0
runtime_dir=""

while [[ $# -gt 0 ]]; do
  case "$1" in
    --force)
      force=1
      shift
      ;;
    --runtime-dir)
      runtime_dir="${2:-}"
      if [[ -z "$runtime_dir" ]]; then
        echo "error: --runtime-dir requires a path" >&2
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
main_repo_root="$(cd "$git_common_dir/.." && pwd)"
project_name="$(basename "$main_repo_root")"
parent_dir="$(dirname "$main_repo_root")"

runtime_dir="${runtime_dir:-$parent_dir/${project_name}-control}"
seed_dir="$repo_root/.control-templates/seed"
state_dir="$repo_root/.control-state/current"

front_worktree="${FRONT_WORKTREE:-$parent_dir/${project_name}-mp}"
admin_worktree="${ADMIN_WORKTREE:-$parent_dir/${project_name}-admin}"
backend_worktree="${BACKEND_WORKTREE:-$parent_dir/${project_name}-backend}"
current_round="${CURRENT_ROUND:-R01}"
generated_at="$(date '+%Y-%m-%d %H:%M')"

escape_sed() {
  printf '%s' "$1" | sed -e 's/[|&]/\\&/g'
}

render_template() {
  local src="$1"
  local dst="$2"

  mkdir -p "$(dirname "$dst")"

  sed \
    -e "s|__REPO_ROOT__|$(escape_sed "$repo_root")|g" \
    -e "s|__MAIN_REPO_ROOT__|$(escape_sed "$main_repo_root")|g" \
    -e "s|__RUNTIME_DIR__|$(escape_sed "$runtime_dir")|g" \
    -e "s|__FRONT_WORKTREE__|$(escape_sed "$front_worktree")|g" \
    -e "s|__ADMIN_WORKTREE__|$(escape_sed "$admin_worktree")|g" \
    -e "s|__BACKEND_WORKTREE__|$(escape_sed "$backend_worktree")|g" \
    -e "s|__CURRENT_ROUND__|$(escape_sed "$current_round")|g" \
    -e "s|__GENERATED_AT__|$(escape_sed "$generated_at")|g" \
    "$src" > "$dst"
}

if [[ ! -d "$seed_dir" ]]; then
  echo "error: seed directory not found: $seed_dir" >&2
  exit 1
fi

source_dir="$seed_dir"
if [[ -f "$state_dir/board.md" ]]; then
  source_dir="$state_dir"
fi

mkdir -p "$runtime_dir"

runtime_readme="$runtime_dir/README.md"
if [[ "$force" -eq 1 || ! -f "$runtime_readme" ]]; then
  render_template "$seed_dir/README.md" "$runtime_readme"
fi

while IFS= read -r -d '' src; do
  if [[ "$(basename "$src")" == "README.md" ]]; then
    continue
  fi

  rel_path="${src#$source_dir/}"
  dst="$runtime_dir/$rel_path"

  if [[ -e "$dst" && "$force" -ne 1 ]]; then
    continue
  fi

  render_template "$src" "$dst"
done < <(find "$source_dir" -type f -print0 | sort -z)

echo "Shared control center ready: $runtime_dir"
echo "Source directory: $source_dir"
echo "Main repo root: $main_repo_root"
echo "Front worktree: $front_worktree"
echo "Admin worktree: $admin_worktree"
echo "Backend worktree: $backend_worktree"
