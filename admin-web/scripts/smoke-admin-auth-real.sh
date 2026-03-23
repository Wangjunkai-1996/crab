#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
DEFAULT_ENV_FILE="$PROJECT_DIR/.env.real-admin-auth.local"
EXAMPLE_ENV_FILE="$PROJECT_DIR/.env.real-admin-auth.example"
EVIDENCE_ROOT_DEFAULT="$PROJECT_DIR/evidence/r09/real-admin-auth"

DRY_RUN=0
MODE="all"

print_usage() {
  cat <<INFO
Usage:
  bash ./scripts/smoke-admin-auth-real.sh [--dry-run] [--standard-only|--first-reset-only]

Options:
  --dry-run           仅生成待执行摘要，不访问真实环境
  --standard-only     只跑标准登录闭环；若未提供独立标准账号，则默认使用“已改密后的单账号”
  --first-reset-only  只跑首次改密闭环
  -h, --help          显示帮助
INFO
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --dry-run)
      DRY_RUN=1
      ;;
    --standard-only)
      MODE="standard"
      ;;
    --first-reset-only)
      MODE="first-reset"
      ;;
    -h|--help)
      print_usage
      exit 0
      ;;
    *)
      echo "Unknown arg: $1" >&2
      print_usage >&2
      exit 1
      ;;
  esac
  shift
done

if [[ -f "$DEFAULT_ENV_FILE" ]]; then
  set -a
  source "$DEFAULT_ENV_FILE"
  set +a
fi

if [[ -x "$HOME/.agents/skills/playwright/scripts/playwright_cli.sh" ]]; then
  PWCLI="$HOME/.agents/skills/playwright/scripts/playwright_cli.sh"
elif [[ -x "$HOME/.codex/skills/playwright/scripts/playwright_cli.sh" ]]; then
  PWCLI="$HOME/.codex/skills/playwright/scripts/playwright_cli.sh"
else
  echo "Missing playwright wrapper. Expected ~/.agents/skills/playwright/scripts/playwright_cli.sh or ~/.codex/skills/playwright/scripts/playwright_cli.sh" >&2
  exit 1
fi

if [[ -z "${PLAYWRIGHT_CLI_SESSION:-}" ]]; then
  export PLAYWRIGHT_CLI_SESSION="dm$(date +%H%M%S)$$"
fi

command -v npx >/dev/null 2>&1 || {
  echo "npx is required. Install Node.js/npm first." >&2
  exit 1
}
command -v python3 >/dev/null 2>&1 || {
  echo "python3 is required for ref extraction." >&2
  exit 1
}

ADMIN_WEB_BASE_URL="${ADMIN_WEB_BASE_URL:-}"
ADMIN_WEB_BASE_URL="${ADMIN_WEB_BASE_URL%/}"
ADMIN_WEB_LOGIN_PATH="${ADMIN_WEB_LOGIN_PATH:-/login}"
ADMIN_WEB_LOGIN_PATH="/${ADMIN_WEB_LOGIN_PATH#/}"
ADMIN_WEB_LOGIN_URL="${ADMIN_WEB_BASE_URL}${ADMIN_WEB_LOGIN_PATH}"
ADMIN_WEB_ENTRY_URL="${ADMIN_WEB_BASE_URL}/"

ADMIN_REAL_SEED_USERNAME="${ADMIN_REAL_SEED_USERNAME:-domi_admin}"
ADMIN_REAL_SEED_INITIAL_PASSWORD="${ADMIN_REAL_SEED_INITIAL_PASSWORD:-}"
ADMIN_REAL_SEED_NEW_PASSWORD="${ADMIN_REAL_SEED_NEW_PASSWORD:-}"

ADMIN_REAL_STANDARD_USERNAME="${ADMIN_REAL_STANDARD_USERNAME:-}"
ADMIN_REAL_STANDARD_PASSWORD="${ADMIN_REAL_STANDARD_PASSWORD:-}"
ADMIN_REAL_FIRST_RESET_USERNAME="${ADMIN_REAL_FIRST_RESET_USERNAME:-}"
ADMIN_REAL_FIRST_RESET_OLD_PASSWORD="${ADMIN_REAL_FIRST_RESET_OLD_PASSWORD:-}"
ADMIN_REAL_FIRST_RESET_NEW_PASSWORD="${ADMIN_REAL_FIRST_RESET_NEW_PASSWORD:-}"
ADMIN_REAL_EVIDENCE_DIR="${ADMIN_REAL_EVIDENCE_DIR:-$EVIDENCE_ROOT_DEFAULT}"
ADMIN_REAL_SKIP_RUNTIME_LOGS="${ADMIN_REAL_SKIP_RUNTIME_LOGS:-0}"

EFFECTIVE_FIRST_RESET_USERNAME="${ADMIN_REAL_FIRST_RESET_USERNAME:-$ADMIN_REAL_SEED_USERNAME}"
EFFECTIVE_FIRST_RESET_OLD_PASSWORD="${ADMIN_REAL_FIRST_RESET_OLD_PASSWORD:-$ADMIN_REAL_SEED_INITIAL_PASSWORD}"
EFFECTIVE_FIRST_RESET_NEW_PASSWORD="${ADMIN_REAL_FIRST_RESET_NEW_PASSWORD:-$ADMIN_REAL_SEED_NEW_PASSWORD}"
EFFECTIVE_STANDARD_USERNAME="${ADMIN_REAL_STANDARD_USERNAME:-$EFFECTIVE_FIRST_RESET_USERNAME}"
EFFECTIVE_STANDARD_PASSWORD="${ADMIN_REAL_STANDARD_PASSWORD:-$EFFECTIVE_FIRST_RESET_NEW_PASSWORD}"

SCREENSHOT_DIR="$ADMIN_REAL_EVIDENCE_DIR/screenshots"
LOG_DIR="$ADMIN_REAL_EVIDENCE_DIR/logs"
SUMMARY_FILE="$ADMIN_REAL_EVIDENCE_DIR/summary.md"
mkdir -p "$SCREENSHOT_DIR" "$LOG_DIR"
LAST_POST_LOGIN_STATE=""
LAST_POST_LOGIN_ALERT=""

missing_vars=()

add_missing_var() {
  local candidate="$1"
  local existing
  for existing in "${missing_vars[@]:-}"; do
    [[ "$existing" == "$candidate" ]] && return 0
  done
  missing_vars+=("$candidate")
}

has_explicit_standard_creds() {
  [[ -n "$ADMIN_REAL_STANDARD_USERNAME" && -n "$ADMIN_REAL_STANDARD_PASSWORD" ]]
}

uses_same_account_post_reset_standard_creds() {
  [[ -n "$ADMIN_REAL_STANDARD_USERNAME" && "$ADMIN_REAL_STANDARD_USERNAME" == "$EFFECTIVE_FIRST_RESET_USERNAME" ]]
}

has_standard_flow() {
  [[ -n "$EFFECTIVE_STANDARD_USERNAME" && -n "$EFFECTIVE_STANDARD_PASSWORD" ]]
}

has_first_reset_flow() {
  [[ -n "$EFFECTIVE_FIRST_RESET_USERNAME" && -n "$EFFECTIVE_FIRST_RESET_OLD_PASSWORD" && -n "$EFFECTIVE_FIRST_RESET_NEW_PASSWORD" ]]
}

credential_strategy() {
  if has_explicit_standard_creds && ! uses_same_account_post_reset_standard_creds; then
    echo "explicit-standard + first-reset"
  elif has_first_reset_flow; then
    echo "single-account-post-reset"
  else
    echo "unresolved"
  fi
}

resolved_login_url() {
  if [[ -n "$ADMIN_WEB_BASE_URL" ]]; then
    echo "$ADMIN_WEB_LOGIN_URL"
  else
    echo "<requires ADMIN_WEB_BASE_URL>"
  fi
}

execution_order() {
  case "$MODE" in
    standard)
      if has_explicit_standard_creds && ! uses_same_account_post_reset_standard_creds; then
        echo "standard"
      else
        echo "standard (post-reset password)"
      fi
      ;;
    first-reset)
      echo "first-reset"
      ;;
    all)
      if has_explicit_standard_creds && ! uses_same_account_post_reset_standard_creds; then
        echo "standard -> first-reset"
      else
        echo "first-reset -> standard"
      fi
      ;;
  esac
}

collect_missing_vars() {
  [[ -n "$ADMIN_WEB_BASE_URL" ]] || add_missing_var "ADMIN_WEB_BASE_URL"

  if [[ "$MODE" == "all" || "$MODE" == "standard" ]]; then
    [[ -n "$EFFECTIVE_STANDARD_USERNAME" ]] || add_missing_var "ADMIN_REAL_STANDARD_USERNAME or ADMIN_REAL_FIRST_RESET_USERNAME or ADMIN_REAL_SEED_USERNAME"
    [[ -n "$EFFECTIVE_STANDARD_PASSWORD" ]] || add_missing_var "ADMIN_REAL_STANDARD_PASSWORD or ADMIN_REAL_FIRST_RESET_NEW_PASSWORD or ADMIN_REAL_SEED_NEW_PASSWORD"
  fi

  if [[ "$MODE" == "all" || "$MODE" == "first-reset" ]]; then
    [[ -n "$EFFECTIVE_FIRST_RESET_USERNAME" ]] || add_missing_var "ADMIN_REAL_FIRST_RESET_USERNAME or ADMIN_REAL_SEED_USERNAME"
    [[ -n "$EFFECTIVE_FIRST_RESET_OLD_PASSWORD" ]] || add_missing_var "ADMIN_REAL_FIRST_RESET_OLD_PASSWORD or ADMIN_REAL_SEED_INITIAL_PASSWORD"
    [[ -n "$EFFECTIVE_FIRST_RESET_NEW_PASSWORD" ]] || add_missing_var "ADMIN_REAL_FIRST_RESET_NEW_PASSWORD or ADMIN_REAL_SEED_NEW_PASSWORD"
  fi
}

print_config() {
  cat <<INFO
[admin-auth real smoke]
- base_url: ${ADMIN_WEB_BASE_URL:-<missing>}
- login_path: ${ADMIN_WEB_LOGIN_PATH:-<missing>}
- login_url: $(resolved_login_url)
- entry_url: ${ADMIN_WEB_ENTRY_URL:-<missing>}
- login_override_ready: yes (set ADMIN_WEB_LOGIN_PATH when real path != /login)
- mode: $MODE
- credential_strategy: $(credential_strategy)
- execution_order: $(execution_order)
- env_file: $DEFAULT_ENV_FILE
- env_example: $EXAMPLE_ENV_FILE
- evidence_dir: $ADMIN_REAL_EVIDENCE_DIR
- screenshot_dir: $SCREENSHOT_DIR
- log_dir: $LOG_DIR
- summary_file: $SUMMARY_FILE
- skip_runtime_logs: $ADMIN_REAL_SKIP_RUNTIME_LOGS
INFO
}

collect_missing_vars

if [[ $DRY_RUN -eq 1 ]]; then
  print_config
  if [[ ${#missing_vars[@]} -gt 0 ]]; then
    echo "- missing_vars: ${missing_vars[*]}"
  else
    echo "- missing_vars: none"
  fi
  cat > "$SUMMARY_FILE" <<MD
# admin-auth 真实闭环执行摘要（待实跑）

- base_url: ${ADMIN_WEB_BASE_URL:-<待提供>}
- login_path: ${ADMIN_WEB_LOGIN_PATH:-/login}
- login_url: $(resolved_login_url)
- entry_url: ${ADMIN_WEB_ENTRY_URL:-<missing>}
- login_override_ready: yes (set ADMIN_WEB_LOGIN_PATH when real path != /login)
- mode: $MODE
- credential_strategy: $(credential_strategy)
- execution_order: $(execution_order)
- env_file: $DEFAULT_ENV_FILE
- evidence_dir: $ADMIN_REAL_EVIDENCE_DIR
- 待补截图目录: $SCREENSHOT_DIR
- 待补日志目录: $LOG_DIR
- required_vars: ${missing_vars[*]:-none}

## 当前外部缺口

- 云函数部署 / 环境一致性结论（当前若登录提交报 PERMISSION_DENIED，先按函数或环境不一致处理）
- seed 初始密码安全交付状态（后端已确认已生成，但敏感值不得进入同步文档）

## 本地执行仍需填写

- ADMIN_REAL_SEED_INITIAL_PASSWORD：待环境侧安全交付
- ADMIN_REAL_SEED_NEW_PASSWORD：由执行侧在本地自填
- ADMIN_WEB_LOGIN_PATH：仅当真实入口不是默认 /login 时需要覆盖
- 当前自动化入口：脚本先打开根路径 /，必要时自动点击 CloudBase 测试域名的“确定访问”提示，再落到登录页
- 如需避免在证据目录写入敏感运行日志，可在本地执行时临时设置 `ADMIN_REAL_SKIP_RUNTIME_LOGS=1`

## 推荐执行顺序

1. npm run smoke:admin-auth:real:dry-run
2. 如仅有 seed 单账号：先执行 npm run smoke:admin-auth:real:first-reset，再执行 npm run smoke:admin-auth:real:standard
3. 如另有独立标准账号：先执行 npm run smoke:admin-auth:real:standard，再执行 npm run smoke:admin-auth:real:first-reset
4. 如需整包复跑：npm run smoke:admin-auth:real

## 预期产物

- 标准登录成功：
  - $SCREENSHOT_DIR/standard-01-workspace.png
  - $SCREENSHOT_DIR/standard-02-after-logout.png
  - $LOG_DIR/standard-login-snapshot.txt
  - $LOG_DIR/standard-after-submit-snapshot.txt
  - $LOG_DIR/standard-workspace-snapshot.txt
  - $LOG_DIR/standard-after-logout-snapshot.txt
  - $LOG_DIR/standard-network.log 或 $LOG_DIR/standard-runtime-skipped.log
- 首次改密闭环：
  - $SCREENSHOT_DIR/first-reset-01-password-dialog.png
  - $SCREENSHOT_DIR/first-reset-02-workspace-after-change.png
  - $SCREENSHOT_DIR/first-reset-03-after-logout.png
  - $LOG_DIR/first-reset-login-snapshot.txt
  - $LOG_DIR/first-reset-after-submit-snapshot.txt
  - $LOG_DIR/first-reset-password-dialog-snapshot.txt
  - $LOG_DIR/first-reset-workspace-snapshot.txt
  - $LOG_DIR/first-reset-after-logout-snapshot.txt
  - $LOG_DIR/first-reset-network.log 或 $LOG_DIR/first-reset-runtime-skipped.log
MD
  echo "Dry run complete."
  exit 0
fi

if [[ ${#missing_vars[@]} -gt 0 ]]; then
  print_config
  echo "Missing required vars: ${missing_vars[*]}" >&2
  exit 1
fi

pw() {
  "$PWCLI" "$@" >/dev/null
}

cleanup_playwright_artifacts() {
  rm -f "$PROJECT_DIR"/.playwright-cli/*.yml 2>/dev/null || true
  rm -f "$PROJECT_DIR"/.playwright-cli/*.png 2>/dev/null || true
  rm -f "$PROJECT_DIR"/.playwright-cli/console-*.log 2>/dev/null || true
  rm -f "$PROJECT_DIR"/.playwright-cli/network-*.log 2>/dev/null || true
}

trap cleanup_playwright_artifacts EXIT

latest_snapshot() {
  ls -t "$PROJECT_DIR"/.playwright-cli/*.yml 2>/dev/null | head -1
}

latest_png() {
  ls -t "$PROJECT_DIR"/.playwright-cli/*.png 2>/dev/null | head -1
}

snapshot_raw() {
  local raw_output="$1"
  "$PWCLI" snapshot > "$raw_output"
}

find_ref() {
  local file="$1"
  local kind="$2"
  local label="$3"
  python3 - "$file" "$kind" "$label" <<'PY'
import pathlib, re, sys
file_path, kind, label = sys.argv[1:4]
text = pathlib.Path(file_path).read_text()
pattern = re.compile(rf'{re.escape(kind)} "{re.escape(label)}"(?: \[disabled\])? \[ref=([^\]]+)\]')
match = pattern.search(text)
if match:
    print(match.group(1))
PY
}

find_ref_contains() {
  local file="$1"
  local kind="$2"
  local label_fragment="$3"
  python3 - "$file" "$kind" "$label_fragment" <<'PY'
import pathlib, re, sys
file_path, kind, label_fragment = sys.argv[1:4]
for line in pathlib.Path(file_path).read_text().splitlines():
    pattern = re.compile(rf'{re.escape(kind)} "([^"]*{re.escape(label_fragment)}[^"]*)"(?: \[disabled\])? \[ref=([^\]]+)\]')
    match = pattern.search(line)
    if match:
        print(match.group(2))
        break
PY
}

find_enabled_ref_contains() {
  local file="$1"
  local kind="$2"
  local label_fragment="$3"
  python3 - "$file" "$kind" "$label_fragment" <<'PY'
import pathlib, re, sys
file_path, kind, label_fragment = sys.argv[1:4]
for line in pathlib.Path(file_path).read_text().splitlines():
    if ' [disabled]' in line:
        continue
    pattern = re.compile(rf'{re.escape(kind)} "([^"]*{re.escape(label_fragment)}[^"]*)" \[ref=([^\]]+)\]')
    match = pattern.search(line)
    if match:
        print(match.group(2))
        break
PY
}

has_marker_contains() {
  local file="$1"
  local kind="$2"
  local label_fragment="$3"
  python3 - "$file" "$kind" "$label_fragment" <<'PY'
import pathlib, re, sys
file_path, kind, label_fragment = sys.argv[1:4]
text = pathlib.Path(file_path).read_text()
pattern = re.compile(rf'{re.escape(kind)} "([^"]*{re.escape(label_fragment)}[^"]*)"')
print('yes' if pattern.search(text) else '')
PY
}

count_alert_blocks() {
  local file="$1"
  python3 - "$file" <<'PY'
import pathlib, re, sys
file_path = pathlib.Path(sys.argv[1])
text = file_path.read_text() if file_path.exists() else ''
count = sum(1 for line in text.splitlines() if re.match(r'^\s*- alert(?:\s|\[)', line))
print(count)
PY
}

extract_alert_messages() {
  local file="$1"
  python3 - "$file" <<'PY'
import pathlib, re, sys

file_path = pathlib.Path(sys.argv[1])
if not file_path.exists():
    print('')
    raise SystemExit

lines = file_path.read_text().splitlines()
messages = []

for index, line in enumerate(lines):
    if not re.match(r'^\s*- alert(?:\s|\[)', line):
        continue

    base_indent = len(line) - len(line.lstrip(' '))
    collected = []

    for next_line in lines[index + 1:]:
        indent = len(next_line) - len(next_line.lstrip(' '))
        if indent <= base_indent:
            break

        for match in re.findall(r'"([^"]+)"', next_line):
            text = match.strip()
            if text:
                collected.append(text)

    if collected:
        deduped = list(dict.fromkeys(collected))
        messages.append(' / '.join(deduped))

if messages:
    print(' | '.join(dict.fromkeys(messages[-2:])))
else:
    print('')
PY
}

inspect_post_login_snapshot() {
  local snapshot_file="$1"
  local has_dashboard has_logout has_confirm has_login has_old has_new

  has_dashboard="$(has_marker_contains "$snapshot_file" "heading" "工作台")"
  has_logout="$(has_marker_contains "$snapshot_file" "button" "退出登录")"
  has_confirm="$(has_marker_contains "$snapshot_file" "button" "确认修改")"
  has_old="$(has_marker_contains "$snapshot_file" "textbox" "旧密码")"
  has_new="$(has_marker_contains "$snapshot_file" "textbox" "新密码")"
  has_login="$(has_marker_contains "$snapshot_file" "button" "登录后台")"

  if [[ -n "$has_confirm" || ( -n "$has_old" && -n "$has_new" ) ]]; then
    echo "first-reset"
    return 0
  fi

  if [[ -n "$has_dashboard" && -n "$has_logout" ]]; then
    echo "workspace"
    return 0
  fi

  if [[ -n "$has_login" ]]; then
    echo "login-page"
    return 0
  fi

  echo "pending"
}

wait_for_ref() {
  local kind="$1"
  local label="$2"
  local timeout_seconds="${3:-20}"
  local deadline=$((SECONDS + timeout_seconds))
  local raw_output snapshot_file ref

  while (( SECONDS < deadline )); do
    raw_output="$(mktemp)"
    snapshot_raw "$raw_output"
    snapshot_file="$(latest_snapshot)"
    ref="$(find_ref "$snapshot_file" "$kind" "$label")"
    rm -f "$raw_output" "$snapshot_file"

    if [[ -n "$ref" ]]; then
      echo "$ref"
      return 0
    fi

    sleep 1
  done

  return 1
}

wait_for_missing_ref() {
  local kind="$1"
  local label="$2"
  local timeout_seconds="${3:-20}"
  local deadline=$((SECONDS + timeout_seconds))
  local raw_output snapshot_file ref

  while (( SECONDS < deadline )); do
    raw_output="$(mktemp)"
    snapshot_raw "$raw_output"
    snapshot_file="$(latest_snapshot)"
    ref="$(find_ref "$snapshot_file" "$kind" "$label")"
    rm -f "$raw_output" "$snapshot_file"

    if [[ -z "$ref" ]]; then
      return 0
    fi

    sleep 1
  done

  return 1
}

wait_for_workspace_ready() {
  local timeout_seconds="${1:-20}"
  local deadline=$((SECONDS + timeout_seconds))
  local raw_output snapshot_file state

  while (( SECONDS < deadline )); do
    raw_output="$(mktemp)"
    snapshot_raw "$raw_output"
    snapshot_file="$(latest_snapshot)"
    state="$(inspect_post_login_snapshot "$snapshot_file")"
    rm -f "$raw_output" "$snapshot_file"

    if [[ "$state" == "workspace" ]]; then
      return 0
    fi

    sleep 1
  done

  return 1
}

wait_for_workspace_or_alternative() {
  local timeout_seconds="${1:-20}"
  local deadline=$((SECONDS + timeout_seconds))
  local raw_output snapshot_file state

  while (( SECONDS < deadline )); do
    raw_output="$(mktemp)"
    snapshot_raw "$raw_output"
    snapshot_file="$(latest_snapshot)"
    state="$(inspect_post_login_snapshot "$snapshot_file")"
    LAST_POST_LOGIN_ALERT="$(extract_alert_messages "$snapshot_file")"
    rm -f "$raw_output" "$snapshot_file"

    case "$state" in
      workspace)
        return 0
        ;;
      first-reset)
        return 2
        ;;
      login-error)
        return 3
        ;;
    esac

    sleep 1
  done

  return 1
}

wait_for_first_reset_or_alternative() {
  local timeout_seconds="${1:-20}"
  local deadline=$((SECONDS + timeout_seconds))
  local raw_output snapshot_file state

  while (( SECONDS < deadline )); do
    raw_output="$(mktemp)"
    snapshot_raw "$raw_output"
    snapshot_file="$(latest_snapshot)"
    state="$(inspect_post_login_snapshot "$snapshot_file")"
    LAST_POST_LOGIN_ALERT="$(extract_alert_messages "$snapshot_file")"
    rm -f "$raw_output" "$snapshot_file"

    case "$state" in
      first-reset)
        return 0
        ;;
      workspace)
        return 2
        ;;
      login-error)
        return 3
        ;;
    esac

    sleep 1
  done

  return 1
}

capture_to() {
  local target="$1"
  local latest_png_file
  pw screenshot
  latest_png_file="$(latest_png)"
  cp "$latest_png_file" "$target"
  rm -f "$latest_png_file"
}

sanitize_snapshot_log() {
  local raw_output="$1"
  local snapshot_file="$2"
  local target="$3"

  python3 - "$raw_output" "$snapshot_file" "$target" <<'PY'
import pathlib, re, sys
raw_file, snapshot_file, target_file = map(pathlib.Path, sys.argv[1:4])
raw_text = raw_file.read_text() if raw_file.exists() else ''
snapshot_text = snapshot_file.read_text() if snapshot_file.exists() else ''
url = re.search(r'Page URL: (.*)', raw_text)
title = re.search(r'Page Title: (.*)', raw_text)
console = re.search(r'Console: (.*)', raw_text)
patterns = [
    (re.compile(r'heading "([^"]+)"'), 'heading'),
    (re.compile(r'button "([^"]+)"'), 'button'),
    (re.compile(r'link "([^"]+)"'), 'link'),
    (re.compile(r'textbox "([^"]+)"'), 'textbox'),
    (re.compile(r'alert "([^"]+)"'), 'alert'),
    (re.compile(r'dialog "([^"]+)"'), 'dialog'),
    (re.compile(r'text "([^"]+)"'), 'text'),
]
markers = []
for pattern, kind in patterns:
    for match in pattern.finditer(snapshot_text):
        label = match.group(1).strip()
        if label:
            markers.append(f'{kind}: {label}')
seen = []
for item in markers:
    if item not in seen:
        seen.append(item)
lines = ['### Page']
lines.append(f"- Page URL: {url.group(1) if url else '<unknown>'}")
lines.append(f"- Page Title: {title.group(1) if title else '<unknown>'}")
if console:
    lines.append(f"- Console: {console.group(1)}")
lines.append('### Markers')
if seen:
    lines.extend(f'- {item}' for item in seen[:12])
else:
    lines.append('- none')
lines.append('### Note')
lines.append('- 已移除 Playwright 原始 DOM 快照引用，避免把交互中的表单输入状态写入同步目录。')
target_file.write_text('\n'.join(lines) + '\n')
PY

  rm -f "$raw_output"
}

snapshot_and_log() {
  local prefix="$1"
  local raw_output snapshot_file
  raw_output="$(mktemp)"
  snapshot_raw "$raw_output"
  snapshot_file="$(latest_snapshot)"
  sanitize_snapshot_log "$raw_output" "$snapshot_file" "$LOG_DIR/${prefix}-snapshot.txt"
}

save_runtime_logs() {
  local prefix="$1"

  if [[ "$ADMIN_REAL_SKIP_RUNTIME_LOGS" == "1" ]]; then
    cat > "$LOG_DIR/${prefix}-runtime-skipped.log" <<LOG
skip_runtime_logs=1
reason=avoid persisting potentially sensitive runtime details for this execution
LOG
    return 0
  fi

  persist_playwright_runtime_log "$LOG_DIR/${prefix}-network.log" network
  persist_playwright_runtime_log "$LOG_DIR/${prefix}-console.log" console error
}

extract_playwright_log_path() {
  printf '%s\n' "$1" | sed -n 's/.*(\(.playwright-cli\/[^)]*\.log\)).*/\1/p' | tail -1
}

persist_playwright_runtime_log() {
  local target_file="$1"
  shift

  local raw_output source_log summary_file
  raw_output="$("$PWCLI" "$@" || true)"
  summary_file="${target_file%.log}-summary.md"

  printf '%s\n' "$raw_output" > "$summary_file"
  source_log="$(extract_playwright_log_path "$raw_output")"

  if [[ -n "$source_log" && -f "$source_log" ]]; then
    cp "$source_log" "$target_file"
    return 0
  fi

  printf '%s\n' "$raw_output" > "$target_file"
}

install_change_password_response_capture() {
  local capture_script
  capture_script="$(cat <<'JS'
(() => {
  window.__DM_CHANGE_PASSWORD_CAPTURE__ = null

  const markCapture = (payload) => {
    window.__DM_CHANGE_PASSWORD_CAPTURE__ = payload
  }

  if (!window.__DM_CHANGE_PASSWORD_FETCH_PATCHED__) {
    window.__DM_CHANGE_PASSWORD_FETCH_PATCHED__ = true
    const originalFetch = window.fetch.bind(window)

    window.fetch = async (...args) => {
      const input = args[0]
      const init = args[1]
      const url = typeof input === 'string' ? input : (input && input.url) || ''
      let requestText = ''

      try {
        if (init && typeof init.body === 'string') {
          requestText = init.body
        } else if (input instanceof Request) {
          requestText = await input.clone().text()
        }
      } catch (error) {}

      const response = await originalFetch(...args)

      if (url.includes('/web?env=') && requestText.includes('"action":"changePassword"')) {
        const clone = response.clone()
        let bodyText = ''
        let bodyJson = null

        try {
          bodyText = await clone.text()
          try {
            bodyJson = JSON.parse(bodyText)
          } catch (error) {
            bodyJson = { parseError: String(error) }
          }
        } catch (error) {
          bodyJson = { readError: String(error) }
        }

        markCapture({
          transport: 'fetch',
          url,
          status: response.status,
          bodyText,
          bodyJson,
        })
      }

      return response
    }
  }

  if (!window.__DM_CHANGE_PASSWORD_XHR_PATCHED__) {
    window.__DM_CHANGE_PASSWORD_XHR_PATCHED__ = true
    const originalOpen = XMLHttpRequest.prototype.open
    const originalSend = XMLHttpRequest.prototype.send

    XMLHttpRequest.prototype.open = function(method, url, ...rest) {
      this.__dmCaptureUrl = url
      return originalOpen.call(this, method, url, ...rest)
    }

    XMLHttpRequest.prototype.send = function(body) {
      const requestText = typeof body === 'string' ? body : ''
      const url = this.__dmCaptureUrl || ''

      if (url.includes('/web?env=') && requestText.includes('"action":"changePassword"')) {
        this.addEventListener(
          'loadend',
          () => {
            let bodyText = ''
            let bodyJson = null

            try {
              bodyText = this.responseText || ''
              try {
                bodyJson = JSON.parse(bodyText)
              } catch (error) {
                bodyJson = { parseError: String(error) }
              }
            } catch (error) {
              bodyJson = { readError: String(error) }
            }

            markCapture({
              transport: 'xhr',
              url,
              status: this.status,
              bodyText,
              bodyJson,
            })
          },
          { once: true },
        )
      }

      return originalSend.call(this, body)
    }
  }

  return 'installed'
})()
JS
)"
  "$PWCLI" eval "$capture_script" >/dev/null
}

read_change_password_response_capture() {
  "$PWCLI" eval "window.__DM_CHANGE_PASSWORD_CAPTURE__ ? JSON.stringify(window.__DM_CHANGE_PASSWORD_CAPTURE__) : 'null'" || true
}

enable_admin_auth_debug_capture() {
  "$PWCLI" eval "(function(){ window.__DM_ENABLE_ADMIN_AUTH_DEBUG__ = true; window.__DM_ADMIN_AUTH_DEBUG_LAST__ = null; window.__DM_ADMIN_AUTH_DEBUG_LOG__ = []; return 'enabled'; })()" >/dev/null || true
}

read_admin_auth_debug_capture() {
  "$PWCLI" eval "window.__DM_ADMIN_AUTH_DEBUG_LOG__ ? JSON.stringify(window.__DM_ADMIN_AUTH_DEBUG_LOG__) : '[]'" || true
}

persist_admin_auth_debug_capture() {
  local prefix="$1"
  local raw_file json_file
  raw_file="$LOG_DIR/${prefix}-admin-auth-debug-raw.txt"
  json_file="$LOG_DIR/${prefix}-admin-auth-debug.json"

  read_admin_auth_debug_capture > "$raw_file"
  python3 - "$raw_file" "$json_file" <<'PY'
import json, pathlib, sys

raw_path = pathlib.Path(sys.argv[1])
json_path = pathlib.Path(sys.argv[2])
text = raw_path.read_text()
result = '[]'

for line in text.splitlines():
    line = line.strip()
    if line.startswith('[') or line.startswith('"['):
        result = line

if result.startswith('"') and result.endswith('"'):
    result = json.loads(result)

try:
    parsed = json.loads(result)
except Exception:
    parsed = {'raw': result}

json_path.write_text(json.dumps(parsed, ensure_ascii=False, indent=2) + '\n')
PY
}

persist_change_password_response_capture() {
  local prefix="$1"
  local raw_file json_file
  raw_file="$LOG_DIR/${prefix}-change-password-response-raw.txt"
  json_file="$LOG_DIR/${prefix}-change-password-response.json"

  read_change_password_response_capture > "$raw_file"
  python3 - "$raw_file" "$json_file" <<'PY'
import json, pathlib, sys

raw_path = pathlib.Path(sys.argv[1])
json_path = pathlib.Path(sys.argv[2])
text = raw_path.read_text()
result = 'null'

for line in text.splitlines():
    line = line.strip()
    if line.startswith('{') or line == 'null' or line.startswith('"{'):
        result = line

if result.startswith('"') and result.endswith('"'):
    result = json.loads(result)

try:
    parsed = None if result == 'null' else json.loads(result)
except Exception:
    parsed = {'raw': result}

json_path.write_text(json.dumps(parsed, ensure_ascii=False, indent=2) + '\n')
PY
}

confirm_cloudbase_risk_notice_if_needed() {
  local prefix="$1"
  local raw_output snapshot_file confirm_ref any_confirm_ref login_ref
  local deadline=$((SECONDS + 12))

  while (( SECONDS < deadline )); do
    raw_output="$(mktemp)"
    snapshot_raw "$raw_output"
    snapshot_file="$(latest_snapshot)"
    confirm_ref="$(find_enabled_ref_contains "$snapshot_file" "button" "确定访问")"
    any_confirm_ref="$(find_ref_contains "$snapshot_file" "button" "确定访问")"
    login_ref="$(find_ref "$snapshot_file" "button" "登录后台")"
    sanitize_snapshot_log "$raw_output" "$snapshot_file" "$LOG_DIR/${prefix}-risk-gate-snapshot.txt"

    if [[ -n "$confirm_ref" ]]; then
      pw click "$confirm_ref"
      sleep 1
      snapshot_and_log "$prefix-after-risk-gate"
      return 0
    fi

    if [[ -z "$any_confirm_ref" || -n "$login_ref" ]]; then
      return 0
    fi

    sleep 1
  done
}

open_login() {
  "$PWCLI" close-all >/dev/null 2>&1 || true
  "$PWCLI" delete-data >/dev/null 2>&1 || true
  cleanup_playwright_artifacts
  pw open "$ADMIN_WEB_ENTRY_URL"
  pw resize 1440 2200
  confirm_cloudbase_risk_notice_if_needed "$1"
  enable_admin_auth_debug_capture
}

perform_login() {
  local prefix="$1"
  local username="$2"
  local password="$3"
  local raw_output snapshot_file username_ref password_ref login_ref

  raw_output="$(mktemp)"
  snapshot_raw "$raw_output"
  snapshot_file="$(latest_snapshot)"
  username_ref="$(find_ref "$snapshot_file" "textbox" "*用户名")"
  password_ref="$(find_ref "$snapshot_file" "textbox" "*密码")"
  login_ref="$(find_ref "$snapshot_file" "button" "登录后台")"
  sanitize_snapshot_log "$raw_output" "$snapshot_file" "$LOG_DIR/${prefix}-login-snapshot.txt"

  [[ -n "$username_ref" && -n "$password_ref" && -n "$login_ref" ]]
  pw fill "$username_ref" "$username"
  pw fill "$password_ref" "$password"
  pw click "$login_ref"
  sleep 1

  raw_output="$(mktemp)"
  snapshot_raw "$raw_output"
  snapshot_file="$(latest_snapshot)"
  sanitize_snapshot_log "$raw_output" "$snapshot_file" "$LOG_DIR/${prefix}-after-submit-snapshot.txt"
  LAST_POST_LOGIN_STATE="$(inspect_post_login_snapshot "$snapshot_file")"
  LAST_POST_LOGIN_ALERT="$(extract_alert_messages "$snapshot_file")"
  if [[ "$LAST_POST_LOGIN_STATE" == "login-error" || "$LAST_POST_LOGIN_STATE" == "login-page" ]]; then
    capture_to "$SCREENSHOT_DIR/${prefix}-00-after-submit.png"
  fi
  rm -f "$snapshot_file"

  if [[ "$LAST_POST_LOGIN_STATE" == "login-error" ]]; then
    persist_admin_auth_debug_capture "$prefix"
    save_runtime_logs "$prefix"
    echo "Login failed during ${prefix} flow: ${LAST_POST_LOGIN_ALERT:-unknown alert}" >&2
    return 1
  fi

  if [[ "$LAST_POST_LOGIN_STATE" == "login-page" ]]; then
    persist_admin_auth_debug_capture "$prefix"
    save_runtime_logs "$prefix"
    echo "Login failed during ${prefix} flow: still on login page after submit. ${LAST_POST_LOGIN_ALERT:-no explicit alert extracted}" >&2
    return 1
  fi
}

capture_workspace_state() {
  local prefix="$1"
  if [[ "$LAST_POST_LOGIN_STATE" == "first-reset" ]]; then
    echo "Workspace expected during ${prefix} flow, but account is still in first-reset state." >&2
    return 1
  fi

  wait_for_workspace_or_alternative 20
  local wait_status=$?

  case "$wait_status" in
    0)
      ;;
    2)
      echo "Workspace expected during ${prefix} flow, but password-reset dialog is still blocking." >&2
      return 1
      ;;
    3)
      echo "Login failed during ${prefix} flow: ${LAST_POST_LOGIN_ALERT:-unknown alert}" >&2
      return 1
      ;;
    *)
      echo "Timed out waiting for workspace during ${prefix} flow." >&2
      return 1
      ;;
  esac

  sleep 1
  snapshot_and_log "$prefix-workspace"
  save_runtime_logs "$prefix"
  capture_to "$SCREENSHOT_DIR/${prefix}-01-workspace.png"
}

perform_logout() {
  local prefix="$1"
  local raw_output snapshot_file logout_ref username_ref password_ref

  raw_output="$(mktemp)"
  snapshot_raw "$raw_output"
  snapshot_file="$(latest_snapshot)"
  logout_ref="$(find_ref "$snapshot_file" "button" "退出登录")"
  rm -f "$raw_output" "$snapshot_file"
  [[ -n "$logout_ref" ]]
  pw click "$logout_ref"
  sleep 1

  raw_output="$(mktemp)"
  snapshot_raw "$raw_output"
  snapshot_file="$(latest_snapshot)"
  username_ref="$(find_ref "$snapshot_file" "textbox" "*用户名")"
  password_ref="$(find_ref "$snapshot_file" "textbox" "*密码")"
  if [[ -n "$username_ref" ]]; then
    pw fill "$username_ref" ""
  fi
  if [[ -n "$password_ref" ]]; then
    pw fill "$password_ref" ""
  fi
  rm -f "$raw_output" "$snapshot_file"

  snapshot_and_log "$prefix-after-logout"
  capture_to "$SCREENSHOT_DIR/${prefix}-02-after-logout.png"
}

perform_first_reset_change() {
  local raw_output snapshot_file old_ref new_ref confirm_ref state

  wait_for_first_reset_or_alternative 20
  local wait_status=$?

  case "$wait_status" in
    0)
      ;;
    2)
      echo "First-reset flow expected password dialog, but account entered workspace directly." >&2
      return 1
      ;;
    3)
      echo "Login failed during first-reset flow: ${LAST_POST_LOGIN_ALERT:-unknown alert}" >&2
      return 1
      ;;
    *)
      echo "Timed out waiting for first-reset dialog." >&2
      return 1
      ;;
  esac

  raw_output="$(mktemp)"
  snapshot_raw "$raw_output"
  snapshot_file="$(latest_snapshot)"
  capture_to "$SCREENSHOT_DIR/first-reset-01-password-dialog.png"
  old_ref="$(find_ref_contains "$snapshot_file" "textbox" "旧密码")"
  new_ref="$(find_ref_contains "$snapshot_file" "textbox" "新密码")"
  confirm_ref="$(find_ref "$snapshot_file" "button" "确认修改")"
  sanitize_snapshot_log "$raw_output" "$snapshot_file" "$LOG_DIR/first-reset-password-dialog-snapshot.txt"

  [[ -n "$old_ref" && -n "$new_ref" && -n "$confirm_ref" ]]
  pw fill "$old_ref" "$EFFECTIVE_FIRST_RESET_OLD_PASSWORD"
  pw fill "$new_ref" "$EFFECTIVE_FIRST_RESET_NEW_PASSWORD"
  install_change_password_response_capture
  pw click "$confirm_ref"

  if ! wait_for_missing_ref "button" "确认修改" 20 >/dev/null; then
    snapshot_and_log "first-reset-after-change-failed"
    persist_change_password_response_capture "first-reset"
    save_runtime_logs "first-reset"
    capture_to "$SCREENSHOT_DIR/first-reset-02-after-change-failed.png"
    echo "Password dialog did not close after first-reset submit." >&2
    return 1
  fi

  if ! wait_for_workspace_ready 20; then
    raw_output="$(mktemp)"
    snapshot_raw "$raw_output"
    snapshot_file="$(latest_snapshot)"
    state="$(inspect_post_login_snapshot "$snapshot_file")"

    if [[ "$state" == "workspace" ]]; then
      sanitize_snapshot_log "$raw_output" "$snapshot_file" "$LOG_DIR/first-reset-workspace-snapshot.txt"
      persist_change_password_response_capture "first-reset"
      persist_admin_auth_debug_capture "first-reset"
      save_runtime_logs "first-reset"
      capture_to "$SCREENSHOT_DIR/first-reset-02-workspace-after-change.png"
      rm -f "$snapshot_file"
      return 0
    fi

    sanitize_snapshot_log "$raw_output" "$snapshot_file" "$LOG_DIR/first-reset-after-change-failed-snapshot.txt"
    persist_change_password_response_capture "first-reset"
    persist_admin_auth_debug_capture "first-reset"
    save_runtime_logs "first-reset"
    capture_to "$SCREENSHOT_DIR/first-reset-02-after-change-failed.png"
    rm -f "$snapshot_file"
    echo "Workspace not ready after first-reset submit." >&2
    return 1
  fi

  sleep 1
  snapshot_and_log "first-reset-workspace"
  persist_change_password_response_capture "first-reset"
  persist_admin_auth_debug_capture "first-reset"
  save_runtime_logs "first-reset"
  capture_to "$SCREENSHOT_DIR/first-reset-02-workspace-after-change.png"
}

run_standard_flow() {
  open_login standard
  perform_login standard "$EFFECTIVE_STANDARD_USERNAME" "$EFFECTIVE_STANDARD_PASSWORD"
  capture_workspace_state standard
  perform_logout standard
}

run_first_reset_flow() {
  open_login first-reset
  perform_login first-reset "$EFFECTIVE_FIRST_RESET_USERNAME" "$EFFECTIVE_FIRST_RESET_OLD_PASSWORD"
  perform_first_reset_change
  perform_logout first-reset
  mv "$SCREENSHOT_DIR/first-reset-02-after-logout.png" "$SCREENSHOT_DIR/first-reset-03-after-logout.png"
}

write_summary() {
  local standard_log_1 standard_log_2 first_reset_log_1 first_reset_log_2

  if [[ "$ADMIN_REAL_SKIP_RUNTIME_LOGS" == "1" ]]; then
    standard_log_1="$LOG_DIR/standard-runtime-skipped.log"
    standard_log_2=""
    first_reset_log_1="$LOG_DIR/first-reset-runtime-skipped.log"
    first_reset_log_2=""
  else
    standard_log_1="$LOG_DIR/standard-network.log"
    standard_log_2="$LOG_DIR/standard-console.log"
    first_reset_log_1="$LOG_DIR/first-reset-network.log"
    first_reset_log_2="$LOG_DIR/first-reset-console.log"
  fi

  cat > "$SUMMARY_FILE" <<MD
# admin-auth 真实闭环执行摘要

- base_url: $ADMIN_WEB_BASE_URL
- login_path: $ADMIN_WEB_LOGIN_PATH
- login_url: $ADMIN_WEB_LOGIN_URL
- entry_url: $ADMIN_WEB_ENTRY_URL
- mode: $MODE
- credential_strategy: $(credential_strategy)
- execution_order: $(execution_order)
- env_file: $DEFAULT_ENV_FILE
- skip_runtime_logs: $ADMIN_REAL_SKIP_RUNTIME_LOGS
- executed_at: $(date '+%Y-%m-%d %H:%M:%S')

## 产物

- 标准登录
  - $SCREENSHOT_DIR/standard-01-workspace.png
  - $SCREENSHOT_DIR/standard-02-after-logout.png
  - $LOG_DIR/standard-risk-gate-snapshot.txt
  - $LOG_DIR/standard-after-risk-gate-snapshot.txt
  - $LOG_DIR/standard-login-snapshot.txt
  - $LOG_DIR/standard-after-submit-snapshot.txt
  - $LOG_DIR/standard-workspace-snapshot.txt
  - $LOG_DIR/standard-after-logout-snapshot.txt
  - $standard_log_1
$(if [[ -n "$standard_log_2" ]]; then printf '  - %s
' "$standard_log_2"; fi)
- 首次改密
  - $SCREENSHOT_DIR/first-reset-01-password-dialog.png
  - $SCREENSHOT_DIR/first-reset-02-workspace-after-change.png
  - $SCREENSHOT_DIR/first-reset-03-after-logout.png
  - $LOG_DIR/first-reset-risk-gate-snapshot.txt
  - $LOG_DIR/first-reset-after-risk-gate-snapshot.txt
  - $LOG_DIR/first-reset-login-snapshot.txt
  - $LOG_DIR/first-reset-after-submit-snapshot.txt
  - $LOG_DIR/first-reset-password-dialog-snapshot.txt
  - $LOG_DIR/first-reset-workspace-snapshot.txt
  - $LOG_DIR/first-reset-after-logout-snapshot.txt
  - $first_reset_log_1
$(if [[ -n "$first_reset_log_2" ]]; then printf '  - %s
' "$first_reset_log_2"; fi)
MD
}

case "$MODE" in
  standard)
    run_standard_flow
    ;;
  first-reset)
    run_first_reset_flow
    ;;
  all)
    if has_explicit_standard_creds && ! uses_same_account_post_reset_standard_creds; then
      run_standard_flow
      run_first_reset_flow
    else
      run_first_reset_flow
      run_standard_flow
    fi
    ;;
esac

write_summary
printf 'admin-auth real smoke complete. Evidence: %s\n' "$ADMIN_REAL_EVIDENCE_DIR"
