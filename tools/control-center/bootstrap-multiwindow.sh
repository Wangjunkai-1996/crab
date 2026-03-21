#!/usr/bin/env bash

set -euo pipefail

usage() {
  cat <<'EOF'
Usage:
  tools/control-center/bootstrap-multiwindow.sh [--main-branch NAME] [--force-control]

Options:
  --main-branch NAME  Base branch used when a target worktree branch does not exist locally or remotely. Default: main
  --force-control     Force overwrite shared control center from repository snapshot/template.
EOF
}

main_branch="main"
force_control=0

while [[ $# -gt 0 ]]; do
  case "$1" in
    --main-branch)
      main_branch="${2:-}"
      if [[ -z "$main_branch" ]]; then
        echo "error: --main-branch requires a branch name" >&2
        exit 1
      fi
      shift 2
      ;;
    --force-control)
      force_control=1
      shift
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

ensure_worktree() {
  local branch="$1"
  local path="$2"

  if [[ -d "$path/.git" ]] || [[ -f "$path/.git" ]]; then
    echo "Worktree already exists: $path"
    return 0
  fi

  if git -C "$main_repo_root" show-ref --verify --quiet "refs/heads/$branch"; then
    git -C "$main_repo_root" worktree add "$path" "$branch"
    echo "Created worktree from local branch: $branch -> $path"
    return 0
  fi

  if git -C "$main_repo_root" show-ref --verify --quiet "refs/remotes/origin/$branch"; then
    git -C "$main_repo_root" worktree add -b "$branch" "$path" "origin/$branch"
    echo "Created worktree from remote branch: origin/$branch -> $path"
    return 0
  fi

  git -C "$main_repo_root" worktree add -b "$branch" "$path" "$main_branch"
  echo "Created fallback worktree from $main_branch: $branch -> $path"
}

ensure_worktree "codex/mp-v1" "$parent_dir/${project_name}-mp"
ensure_worktree "codex/admin-v1" "$parent_dir/${project_name}-admin"
ensure_worktree "codex/backend-v1" "$parent_dir/${project_name}-backend"

control_cmd=("$repo_root/tools/control-center/bootstrap-control-center.sh")
if [[ "$force_control" -eq 1 ]]; then
  control_cmd+=(--force)
fi

"${control_cmd[@]}"

echo
echo "Control environment ready."
echo "Recommended default mode:"
echo "1. 总控单窗口: $main_repo_root"
echo "   内部角色 subagents: 前端 / 后台 / 后端 / 产品经理 / 体验设计审查 / 阻塞协调"
echo
echo "Worktrees restored for code ownership:"
echo "2. 前端 worktree: $parent_dir/${project_name}-mp"
echo "3. 后台 worktree: $parent_dir/${project_name}-admin"
echo "4. 后端 worktree: $parent_dir/${project_name}-backend"
echo
echo "Fallback manual multiwindow mode is still supported, but no longer recommended by default."
echo "If you expect latest remote changes, run git pull / git fetch before this script."
