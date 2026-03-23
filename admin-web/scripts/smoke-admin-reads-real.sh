#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
DEFAULT_ENV_FILE="$PROJECT_DIR/.env.real-admin-auth.local"

if [[ -f "$DEFAULT_ENV_FILE" ]]; then
  set -a
  source "$DEFAULT_ENV_FILE"
  set +a
fi

ADMIN_REAL_READS_ROUND="${ADMIN_REAL_READS_ROUND:-r51}"
EVIDENCE_DIR_DEFAULT="$PROJECT_DIR/evidence/${ADMIN_REAL_READS_ROUND}/real-admin-reads"

if [[ -x "$HOME/.agents/skills/playwright/scripts/playwright_cli.sh" ]]; then
  PWCLI="$HOME/.agents/skills/playwright/scripts/playwright_cli.sh"
elif [[ -x "$HOME/.codex/skills/playwright/scripts/playwright_cli.sh" ]]; then
  PWCLI="$HOME/.codex/skills/playwright/scripts/playwright_cli.sh"
else
  echo "Missing playwright wrapper. Expected ~/.agents/skills/playwright/scripts/playwright_cli.sh or ~/.codex/skills/playwright/scripts/playwright_cli.sh" >&2
  exit 1
fi

command -v npx >/dev/null 2>&1 || {
  echo "npx is required. Install Node.js/npm first." >&2
  exit 1
}
command -v python3 >/dev/null 2>&1 || {
  echo "python3 is required for ref extraction." >&2
  exit 1
}

if [[ -z "${PLAYWRIGHT_CLI_SESSION:-}" ]]; then
  export PLAYWRIGHT_CLI_SESSION="dmreads$(date +%H%M%S)$$"
fi

ADMIN_WEB_BASE_URL="${ADMIN_WEB_BASE_URL:-}"
ADMIN_WEB_BASE_URL="${ADMIN_WEB_BASE_URL%/}"
ADMIN_WEB_LOGIN_PATH="${ADMIN_WEB_LOGIN_PATH:-/login}"
ADMIN_WEB_LOGIN_PATH="/${ADMIN_WEB_LOGIN_PATH#/}"
ADMIN_WEB_LOGIN_URL="${ADMIN_WEB_BASE_URL}${ADMIN_WEB_LOGIN_PATH}"
ADMIN_WEB_ENTRY_URL="${ADMIN_WEB_BASE_URL}/"

ADMIN_REAL_STANDARD_USERNAME="${ADMIN_REAL_STANDARD_USERNAME:-}"
ADMIN_REAL_STANDARD_PASSWORD="${ADMIN_REAL_STANDARD_PASSWORD:-}"
ADMIN_REAL_REVIEW_TASK_ID="${ADMIN_REAL_REVIEW_TASK_ID:-}"
ADMIN_REAL_REPORT_ID="${ADMIN_REAL_REPORT_ID:-}"
ADMIN_REAL_READS_EVIDENCE_DIR="${ADMIN_REAL_READS_EVIDENCE_DIR:-$EVIDENCE_DIR_DEFAULT}"

SCREENSHOT_DIR="$ADMIN_REAL_READS_EVIDENCE_DIR/screenshots"
LOG_DIR="$ADMIN_REAL_READS_EVIDENCE_DIR/logs"
SUMMARY_FILE="$ADMIN_REAL_READS_EVIDENCE_DIR/summary.md"
mkdir -p "$SCREENSHOT_DIR" "$LOG_DIR"

MUST_RESET_LOCKED=0
DASHBOARD_OK=0
DASHBOARD_LOAD_ERROR=0
DASHBOARD_COPY_OK=0
LOGS_OK=0
REVIEW_PAGE_OK=0
REVIEW_EMPTY_OK=0
REPORT_PAGE_OK=0
REPORT_EMPTY_OK=0
REVIEW_DETAIL_OK=0
REPORT_DETAIL_OK=0
BLACKLIST_OK=0
LOGS_FORMATTED_ACTION_OK=0
LOGS_FORMATTED_TARGET_OK=0
BLACKLIST_FORMATTED_LABEL_OK=0
REVIEW_DETAIL_CONTENT_OK=0
REPORT_DETAIL_CONTENT_OK=0
CONSOLE_ONLY_WHITELISTED=0
CONSOLE_UNEXPECTED_ERROR_COUNT=0

missing_vars=()
add_missing_var() {
  local candidate="$1"
  local existing
  for existing in "${missing_vars[@]:-}"; do
    [[ "$existing" == "$candidate" ]] && return 0
  done
  missing_vars+=("$candidate")
}

[[ -n "$ADMIN_WEB_BASE_URL" ]] || add_missing_var "ADMIN_WEB_BASE_URL"
[[ -n "$ADMIN_REAL_STANDARD_USERNAME" ]] || add_missing_var "ADMIN_REAL_STANDARD_USERNAME"
[[ -n "$ADMIN_REAL_STANDARD_PASSWORD" ]] || add_missing_var "ADMIN_REAL_STANDARD_PASSWORD"

if [[ ${#missing_vars[@]} -gt 0 ]]; then
  cat <<INFO
[admin real reads smoke]
- base_url: ${ADMIN_WEB_BASE_URL:-<missing>}
- login_url: ${ADMIN_WEB_LOGIN_URL:-<missing>}
- evidence_dir: $ADMIN_REAL_READS_EVIDENCE_DIR
- missing_vars: ${missing_vars[*]}
INFO
  exit 1
fi

pw() {
  "$PWCLI" "$@" >/dev/null
}

cleanup_playwright_artifacts() {
  rm -f "$PROJECT_DIR"/.playwright-cli/*.yml 2>/dev/null || true
  rm -f "$PROJECT_DIR"/.playwright-cli/*.png 2>/dev/null || true
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

js_string() {
  local value="$1"
  python3 - "$value" <<'PY'
import json, sys
print(json.dumps(sys.argv[1]))
PY
}

snapshot_contains_text() {
  local snapshot_file="$1"
  local text="$2"
  python3 - "$snapshot_file" "$text" <<'PY'
import pathlib, sys
snapshot_file = pathlib.Path(sys.argv[1])
text = sys.argv[2]
content = snapshot_file.read_text() if snapshot_file.exists() else ""
print("yes" if text in content else "")
PY
}

write_snapshot_log() {
  local stage="$1"
  local raw_output="$2"
  local snapshot_file="$3"
  local target_file="$LOG_DIR/${stage}-snapshot.txt"
  {
    echo "# stage: $stage"
    echo "# time: $(date '+%Y-%m-%d %H:%M:%S')"
    echo "## snapshot"
    cat "$snapshot_file"
    echo
    echo "## raw"
    cat "$raw_output"
  } > "$target_file"
}

capture_stage() {
  local stage="$1"
  local raw_output snapshot_file screenshot_file
  raw_output="$(mktemp)"
  snapshot_raw "$raw_output"
  snapshot_file="$(latest_snapshot)"
  write_snapshot_log "$stage" "$raw_output" "$snapshot_file"
  pw screenshot
  screenshot_file="$(latest_png)"
  cp "$screenshot_file" "$SCREENSHOT_DIR/${stage}.png"
  rm -f "$raw_output"
}

assert_stage_contains() {
  local stage="$1"
  local text="$2"
  local snapshot_file="$LOG_DIR/${stage}-snapshot.txt"
  if ! grep -q "$text" "$snapshot_file"; then
    echo "stage '$stage' missing expected marker: $text" >&2
    exit 1
  fi
}

stage_contains() {
  local stage="$1"
  local text="$2"
  local snapshot_file="$LOG_DIR/${stage}-snapshot.txt"
  if grep -q "$text" "$snapshot_file"; then
    echo "yes"
  else
    echo "no"
  fi
}

stage_contains_any() {
  local stage="$1"
  shift

  local candidate
  for candidate in "$@"; do
    if [[ "$(stage_contains "$stage" "$candidate")" == "yes" ]]; then
      echo "yes"
      return 0
    fi
  done

  echo "no"
}

stage_not_contains() {
  local stage="$1"
  local text="$2"
  local snapshot_file="$LOG_DIR/${stage}-snapshot.txt"
  if grep -q "$text" "$snapshot_file"; then
    echo "no"
  else
    echo "yes"
  fi
}

stage_not_contains_any() {
  local stage="$1"
  shift

  local candidate
  for candidate in "$@"; do
    if [[ "$(stage_not_contains "$stage" "$candidate")" != "yes" ]]; then
      echo "no"
      return 0
    fi
  done

  echo "yes"
}

count_stage_marker_hits() {
  local stage="$1"
  shift

  local count=0
  local candidate
  for candidate in "$@"; do
    if [[ "$(stage_contains "$stage" "$candidate")" == "yes" ]]; then
      count=$((count + 1))
    fi
  done

  echo "$count"
}

stage_has_heading() {
  local stage="$1"
  local heading_text="$2"
  local snapshot_file="$LOG_DIR/${stage}-snapshot.txt"
  if grep -q "heading \"$heading_text\"" "$snapshot_file"; then
    echo "yes"
  else
    echo "no"
  fi
}

spa_navigate() {
  local target_url="$1"
  local target_url_js
  target_url_js="$(js_string "$target_url")"

  pw run-code "await page.evaluate((nextUrl) => { const targetUrl = new URL(nextUrl); window.history.pushState({}, '', targetUrl.pathname + targetUrl.search); window.dispatchEvent(new PopStateEvent('popstate')); }, $target_url_js)"
  pw run-code "await page.waitForTimeout(1200)" || true
}

open_first_detail_or_fallback() {
  local fallback_url="$1"
  local raw_output snapshot_file detail_ref

  raw_output="$(mktemp)"
  snapshot_raw "$raw_output"
  snapshot_file="$(latest_snapshot)"
  detail_ref="$(find_ref_contains "$snapshot_file" "button" "查看详情")"
  rm -f "$raw_output"

  if [[ -n "$detail_ref" ]]; then
    pw click "$detail_ref"
  else
    spa_navigate "$fallback_url"
  fi
}

navigate_from_sidebar() {
  local menu_label="$1"
  local fallback_url="$2"
  local raw_output snapshot_file menu_ref

  raw_output="$(mktemp)"
  snapshot_raw "$raw_output"
  snapshot_file="$(latest_snapshot)"
  menu_ref="$(find_ref_contains "$snapshot_file" "menuitem" "$menu_label")"
  rm -f "$raw_output"

  if [[ -n "$menu_ref" ]]; then
    pw click "$menu_ref"
  else
    spa_navigate "$fallback_url"
  fi
}

open_direct_url() {
  local target_url="$1"
  spa_navigate "$target_url"
}

open_entry_and_pass_risk_gate_if_needed() {
  local raw_output snapshot_file confirm_ref
  pw open "$ADMIN_WEB_ENTRY_URL"
  pw resize 1440 900
  raw_output="$(mktemp)"
  snapshot_raw "$raw_output"
  snapshot_file="$(latest_snapshot)"
  confirm_ref="$(find_ref_contains "$snapshot_file" "button" "确定访问")"
  write_snapshot_log "entry" "$raw_output" "$snapshot_file"
  rm -f "$raw_output"

  if [[ -n "$confirm_ref" ]]; then
    pw click "$confirm_ref"
    pw run-code "await page.waitForTimeout(1200)"
    capture_stage "entry-after-risk-gate"
  fi
}

login_standard() {
  local raw_output snapshot_file username_ref password_ref login_ref confirm_ref
  raw_output="$(mktemp)"
  snapshot_raw "$raw_output"
  snapshot_file="$(latest_snapshot)"
  write_snapshot_log "login" "$raw_output" "$snapshot_file"
  confirm_ref="$(find_ref_contains "$snapshot_file" "button" "确定访问")"
  rm -f "$raw_output"

  if [[ -n "$confirm_ref" ]]; then
    pw click "$confirm_ref"
    pw run-code "await page.waitForTimeout(1200)"
    capture_stage "login-after-risk-gate"
    raw_output="$(mktemp)"
    snapshot_raw "$raw_output"
    snapshot_file="$(latest_snapshot)"
    write_snapshot_log "login-form" "$raw_output" "$snapshot_file"
    rm -f "$raw_output"
  fi

  username_ref="$(find_ref_contains "$snapshot_file" "textbox" "用户名")"
  password_ref="$(find_ref_contains "$snapshot_file" "textbox" "密码")"
  login_ref="$(find_ref_contains "$snapshot_file" "button" "登录")"

  if [[ -z "$username_ref" || -z "$password_ref" || -z "$login_ref" ]]; then
    pw open "$ADMIN_WEB_ENTRY_URL"
    pw resize 1440 900
    raw_output="$(mktemp)"
    snapshot_raw "$raw_output"
    snapshot_file="$(latest_snapshot)"
    write_snapshot_log "login-reentry" "$raw_output" "$snapshot_file"
    confirm_ref="$(find_ref_contains "$snapshot_file" "button" "确定访问")"
    rm -f "$raw_output"

    if [[ -n "$confirm_ref" ]]; then
      pw click "$confirm_ref"
      pw run-code "await page.waitForTimeout(1200)"
      capture_stage "login-reentry-after-risk-gate"
      raw_output="$(mktemp)"
      snapshot_raw "$raw_output"
      snapshot_file="$(latest_snapshot)"
      write_snapshot_log "login-form" "$raw_output" "$snapshot_file"
      rm -f "$raw_output"
    fi

    username_ref="$(find_ref_contains "$snapshot_file" "textbox" "用户名")"
    password_ref="$(find_ref_contains "$snapshot_file" "textbox" "密码")"
    login_ref="$(find_ref_contains "$snapshot_file" "button" "登录")"
  fi

  [[ -n "$username_ref" ]] || { echo "username input ref missing" >&2; exit 1; }
  [[ -n "$password_ref" ]] || { echo "password input ref missing" >&2; exit 1; }
  [[ -n "$login_ref" ]] || { echo "login button ref missing" >&2; exit 1; }

  pw fill "$username_ref" "$ADMIN_REAL_STANDARD_USERNAME"
  pw fill "$password_ref" "$ADMIN_REAL_STANDARD_PASSWORD"
  pw click "$login_ref"
  pw run-code "await page.waitForTimeout(1800)"
  capture_stage "dashboard"
  if [[ "$(stage_has_heading "dashboard" "工作台")" == "yes" ]]; then
    DASHBOARD_OK=1
  fi
  if [[ "$(stage_contains "dashboard" "数据加载失败")" == "yes" ]]; then
    DASHBOARD_LOAD_ERROR=1
  fi
  if [[ "$(stage_contains "dashboard" "确认修改")" == "yes" ]]; then
    MUST_RESET_LOCKED=1
  fi
  if [[ "$(stage_not_contains_any "dashboard" "permissionSummary.pageAccess" "service / model" "transport" "availableActions")" == "yes" ]]; then
    DASHBOARD_COPY_OK=1
  fi
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

save_runtime_logs() {
  persist_playwright_runtime_log "$LOG_DIR/network.log" network
  persist_playwright_runtime_log "$LOG_DIR/console.log" console error
}

append_console_whitelist_summary() {
  local summary_file="$LOG_DIR/console-summary.md"
  local console_file="$LOG_DIR/console.log"
  local root_404_count favicon_404_count total_error_count unexpected_count

  root_404_count="$(grep -F -c "@ ${ADMIN_WEB_BASE_URL}/:0" "$console_file" || true)"
  favicon_404_count="$(grep -F -c "@ ${ADMIN_WEB_BASE_URL}/favicon.ico:0" "$console_file" || true)"
  total_error_count="$(grep -F -c "[ERROR]" "$console_file" || true)"
  unexpected_count=$((total_error_count - root_404_count - favicon_404_count))

  if [[ "$unexpected_count" -lt 0 ]]; then
    unexpected_count=0
  fi

  CONSOLE_UNEXPECTED_ERROR_COUNT="$unexpected_count"
  if [[ "$unexpected_count" -eq 0 ]]; then
    CONSOLE_ONLY_WHITELISTED=1
  fi

  cat >> "$summary_file" <<MD

### Whitelist
- root_404_count: $root_404_count
- favicon_404_count: $favicon_404_count
- unexpected_error_count: $unexpected_count
- conclusion: $([[ $CONSOLE_ONLY_WHITELISTED -eq 1 ]] && echo "only_whitelisted_static_404s" || echo "has_unexpected_errors")
MD
}

visit_logs_page() {
  if ! navigate_from_sidebar "操作日志" "${ADMIN_WEB_BASE_URL}/logs"; then
    return 0
  fi
  pw run-code "await page.waitForTimeout(1200)" || true
  if ! capture_stage "logs"; then
    return 0
  fi
  [[ "$(stage_has_heading "logs" "操作日志")" == "yes" ]] && LOGS_OK=1

  if [[ "$(stage_contains_any "logs" "管理员登录成功" "管理员主动登出" "领取举报" "审核通过" "新增处罚" "解除处罚")" == "yes" ]]; then
    LOGS_FORMATTED_ACTION_OK=1
  fi
  if [[ "$(stage_contains_any "logs" "管理员会话" "审核任务" "举报单" "处罚记录" "通告")" == "yes" ]]; then
    LOGS_FORMATTED_TARGET_OK=1
  fi
}

visit_review_list_page() {
  if ! navigate_from_sidebar "审核列表" "${ADMIN_WEB_BASE_URL}/review/list"; then
    return 0
  fi
  pw run-code "await page.waitForTimeout(1200)" || true
  if ! capture_stage "review-list"; then
    return 0
  fi
  if [[ "$(stage_has_heading "review-list" "审核列表")" == "yes" ]]; then
    REVIEW_PAGE_OK=1
  fi
}

visit_review_list_empty_state() {
  local raw_output snapshot_file query_ref
  open_direct_url "${ADMIN_WEB_BASE_URL}/review/list?taskStatus=completed&reviewStage=resubmission_review&city=%E6%9D%AD%E5%B7%9E&identityType=company&riskLevel=high&pageSize=10"
  raw_output="$(mktemp)"
  snapshot_raw "$raw_output"
  snapshot_file="$(latest_snapshot)"
  query_ref="$(find_ref_contains "$snapshot_file" "button" "查询")"
  rm -f "$raw_output"
  if [[ -n "$query_ref" ]]; then
    pw click "$query_ref"
    pw run-code "await page.waitForTimeout(1500)" || true
  fi
  if ! capture_stage "review-list-empty"; then
    return 0
  fi

  if [[ "$(stage_has_heading "review-list-empty" "审核列表")" == "yes" ]] \
    && [[ "$(stage_contains "review-list-empty" "当前筛选条件下没有审核任务。")" == "yes" ]]; then
    REVIEW_EMPTY_OK=1
  fi
}

visit_blacklist_page() {
  if ! navigate_from_sidebar "黑名单与处罚" "${ADMIN_WEB_BASE_URL}/blacklist"; then
    return 0
  fi
  pw run-code "await page.waitForTimeout(1200)" || true
  if ! capture_stage "blacklist"; then
    return 0
  fi
  if [[ "$(stage_has_heading "blacklist" "黑名单与处罚列表")" == "yes" ]]; then
    BLACKLIST_OK=1
  fi

  local restriction_type_hits status_hits total_hits
  restriction_type_hits="$(count_stage_marker_hits "blacklist" "观察名单" "限制发布" "限制报名" "全量封禁")"
  status_hits="$(count_stage_marker_hits "blacklist" "生效中" "已解除")"
  total_hits=$((restriction_type_hits + status_hits))
  if [[ "$total_hits" -ge 2 ]]; then
    BLACKLIST_FORMATTED_LABEL_OK=1
  fi
}

visit_report_list_page() {
  if ! navigate_from_sidebar "举报列表" "${ADMIN_WEB_BASE_URL}/report/list"; then
    return 0
  fi
  pw run-code "await page.waitForTimeout(1200)" || true
  if ! capture_stage "report-list"; then
    return 0
  fi
  if [[ "$(stage_has_heading "report-list" "举报列表")" == "yes" ]]; then
    REPORT_PAGE_OK=1
  fi
}

visit_report_list_empty_state() {
  local raw_output snapshot_file query_ref
  open_direct_url "${ADMIN_WEB_BASE_URL}/report/list?status=__smoke_forced_empty__&pageSize=10"
  raw_output="$(mktemp)"
  snapshot_raw "$raw_output"
  snapshot_file="$(latest_snapshot)"
  query_ref="$(find_ref_contains "$snapshot_file" "button" "查询")"
  rm -f "$raw_output"
  if [[ -n "$query_ref" ]]; then
    pw click "$query_ref"
    pw run-code "await page.waitForTimeout(1500)" || true
  fi
  if ! capture_stage "report-list-empty"; then
    return 0
  fi

  if [[ "$(stage_has_heading "report-list-empty" "举报列表")" == "yes" ]] \
    && [[ "$(stage_contains "report-list-empty" "当前筛选条件下没有举报记录。")" == "yes" ]]; then
    REPORT_EMPTY_OK=1
  fi
}

visit_review_detail_page() {
  [[ -n "$ADMIN_REAL_REVIEW_TASK_ID" ]] || return 0

  open_first_detail_or_fallback "${ADMIN_WEB_BASE_URL}/review/${ADMIN_REAL_REVIEW_TASK_ID}"
  pw run-code "await page.waitForTimeout(1200)" || true
  if ! capture_stage "review-detail"; then
    return 0
  fi

  if [[ "$(stage_has_heading "review-detail" "审核详情")" == "yes" ]] && [[ "$(stage_contains "review-detail" "审核动作区")" == "yes" ]]; then
    REVIEW_DETAIL_OK=1
  fi

  if [[ "$(stage_contains "review-detail" "历史处理记录")" == "yes" ]] \
    && [[ "$(stage_contains "review-detail" "审核动作区")" == "yes" ]] \
    && [[ "$(stage_contains "review-detail" "当前已开启真实读取，提交类操作暂未开放，请先查看详情与历史记录。")" == "yes" ]] \
    && [[ "$(stage_contains "review-detail" "微信 /")" == "yes" ]] \
    && [[ "$(stage_not_contains "review-detail" "wechat /")" == "yes" ]]; then
    REVIEW_DETAIL_CONTENT_OK=1
  fi
}

visit_report_detail_page() {
  [[ -n "$ADMIN_REAL_REPORT_ID" ]] || return 0

  open_first_detail_or_fallback "${ADMIN_WEB_BASE_URL}/report/${ADMIN_REAL_REPORT_ID}"
  pw run-code "await page.waitForTimeout(1200)" || true
  if ! capture_stage "report-detail"; then
    return 0
  fi

  if [[ "$(stage_has_heading "report-detail" "举报详情")" == "yes" ]] && [[ "$(stage_contains "report-detail" "处理动作区")" == "yes" ]]; then
    REPORT_DETAIL_OK=1
  fi

  if [[ "$(stage_contains "report-detail" "历史举报记录")" == "yes" ]] \
    && [[ "$(stage_contains "report-detail" "历史处罚记录")" == "yes" ]] \
    && [[ "$(stage_contains "report-detail" "处理动作区")" == "yes" ]] \
    && [[ "$(stage_contains "report-detail" "当前已开启真实读取，提交类操作暂未开放，请先查看详情与历史记录。")" == "yes" ]] \
    && [[ "$(stage_contains "report-detail" "小红书")" == "yes" ]] \
    && [[ "$(stage_not_contains_any "report-detail" "xiaohongshu /" "pending_review")" == "yes" ]]; then
    REPORT_DETAIL_CONTENT_OK=1
  fi
}

echo "[reads-smoke] open entry"
open_entry_and_pass_risk_gate_if_needed
echo "[reads-smoke] login"
login_standard
echo "[reads-smoke] logs page"
visit_logs_page
echo "[reads-smoke] review list page"
visit_review_list_page
echo "[reads-smoke] review detail page"
visit_review_detail_page
echo "[reads-smoke] review list empty evidence"
visit_review_list_empty_state
echo "[reads-smoke] report list page"
visit_report_list_page
echo "[reads-smoke] report detail page"
visit_report_detail_page
echo "[reads-smoke] report list empty evidence"
visit_report_list_empty_state
echo "[reads-smoke] blacklist page"
visit_blacklist_page
echo "[reads-smoke] runtime logs"
save_runtime_logs
append_console_whitelist_summary

cat > "$SUMMARY_FILE" <<MD
# 后台页面级真实读 smoke 摘要

- 执行时间：$(date '+%Y-%m-%d %H:%M:%S')
- 轮次：$ADMIN_REAL_READS_ROUND
- base_url：$ADMIN_WEB_BASE_URL
- login_url：$ADMIN_WEB_LOGIN_URL
- evidence_dir：$ADMIN_REAL_READS_EVIDENCE_DIR
- 开关约束：VITE_ENABLE_REAL_ADMIN_READS=true / VITE_ENABLE_REAL_ADMIN_WRITES=false
- 首次改密弹层锁定：$([[ $MUST_RESET_LOCKED -eq 1 ]] && echo yes || echo no)

## 页面级结果

1. dashboard：$([[ $DASHBOARD_OK -eq 1 ]] && echo "已进入工作台" || echo "未稳定进入工作台（见证据）")，关键展示（状态文案+页面提示）=$([[ $DASHBOARD_COPY_OK -eq 1 ]] && echo "yes" || echo "no")，见：
   - $LOG_DIR/dashboard-snapshot.txt
   - $SCREENSHOT_DIR/dashboard.png
2. operationLogList：$([[ $LOGS_OK -eq 1 ]] && echo "已进入操作日志页" || echo "未稳定进入操作日志页（见证据）")，关键展示（动作中文标签+对象类型中文）=$([[ $LOGS_FORMATTED_ACTION_OK -eq 1 && $LOGS_FORMATTED_TARGET_OK -eq 1 ]] && echo "yes" || echo "no")，见：
   - $LOG_DIR/logs-snapshot.txt
   - $SCREENSHOT_DIR/logs.png
3. review list：$([[ $REVIEW_PAGE_OK -eq 1 ]] && echo "已进入审核列表" || echo "未稳定进入审核列表（见证据）")，稳定空态证据=$([[ $REVIEW_EMPTY_OK -eq 1 ]] && echo "yes" || echo "no")，见：
   - $LOG_DIR/review-list-snapshot.txt
   - $SCREENSHOT_DIR/review-list.png
   - $LOG_DIR/review-list-empty-snapshot.txt
   - $SCREENSHOT_DIR/review-list-empty.png
4. review detail：$([[ -z "$ADMIN_REAL_REVIEW_TASK_ID" ]] && echo "未执行（缺少 ADMIN_REAL_REVIEW_TASK_ID）" || ([[ $REVIEW_DETAIL_OK -eq 1 ]] && echo "已进入审核详情页" || echo "未稳定进入审核详情页（见证据）"))，关键展示（历史区块+动作区只读提示+联系方式中文）=$([[ -z "$ADMIN_REAL_REVIEW_TASK_ID" ]] && echo "n/a" || ([[ $REVIEW_DETAIL_CONTENT_OK -eq 1 ]] && echo "yes" || echo "no"))，见：
   - $LOG_DIR/review-detail-snapshot.txt
   - $SCREENSHOT_DIR/review-detail.png
5. report list：$([[ $REPORT_PAGE_OK -eq 1 ]] && echo "已进入举报列表" || echo "未稳定进入举报列表（见证据）")，稳定空态证据=$([[ $REPORT_EMPTY_OK -eq 1 ]] && echo "yes" || echo "no")，见：
   - $LOG_DIR/report-list-snapshot.txt
   - $SCREENSHOT_DIR/report-list.png
   - $LOG_DIR/report-list-empty-snapshot.txt
   - $SCREENSHOT_DIR/report-list-empty.png
6. report detail：$([[ -z "$ADMIN_REAL_REPORT_ID" ]] && echo "未执行（缺少 ADMIN_REAL_REPORT_ID）" || ([[ $REPORT_DETAIL_OK -eq 1 ]] && echo "已进入举报详情页" || echo "未稳定进入举报详情页（见证据）"))，关键展示（历史区块+动作区只读提示+对象摘要中文）=$([[ -z "$ADMIN_REAL_REPORT_ID" ]] && echo "n/a" || ([[ $REPORT_DETAIL_CONTENT_OK -eq 1 ]] && echo "yes" || echo "no"))，见：
   - $LOG_DIR/report-detail-snapshot.txt
   - $SCREENSHOT_DIR/report-detail.png
7. blacklist：$([[ $BLACKLIST_OK -eq 1 ]] && echo "已进入黑名单与处罚列表" || echo "未稳定进入黑名单与处罚列表（见证据）")，关键展示（至少 2 类限制类型/状态文案）=$([[ $BLACKLIST_FORMATTED_LABEL_OK -eq 1 ]] && echo "yes" || echo "no")，见：
   - $LOG_DIR/blacklist-snapshot.txt
   - $SCREENSHOT_DIR/blacklist.png

## 运行日志

- network：$LOG_DIR/network.log
- console(error)：$LOG_DIR/console.log
- console_whitelist_only：$([[ $CONSOLE_ONLY_WHITELISTED -eq 1 ]] && echo "yes" || echo "no")
- console_unexpected_error_count：$CONSOLE_UNEXPECTED_ERROR_COUNT
- dashboard_load_error：$([[ $DASHBOARD_LOAD_ERROR -eq 1 ]] && echo "yes" || echo "no")
MD

failed_checks=()
[[ $DASHBOARD_OK -eq 1 ]] || failed_checks+=("dashboard_unreachable")
[[ $DASHBOARD_COPY_OK -eq 1 ]] || failed_checks+=("dashboard_copy_unmatched")
[[ $LOGS_OK -eq 1 ]] || failed_checks+=("logs_unreachable")
[[ $LOGS_FORMATTED_ACTION_OK -eq 1 ]] || failed_checks+=("logs_action_label_unmatched")
[[ $LOGS_FORMATTED_TARGET_OK -eq 1 ]] || failed_checks+=("logs_target_type_unmatched")
[[ $REVIEW_PAGE_OK -eq 1 ]] || failed_checks+=("review_list_unreachable")
[[ $REVIEW_EMPTY_OK -eq 1 ]] || failed_checks+=("review_list_empty_evidence_unmatched")
[[ $REPORT_PAGE_OK -eq 1 ]] || failed_checks+=("report_list_unreachable")
[[ $REPORT_EMPTY_OK -eq 1 ]] || failed_checks+=("report_list_empty_evidence_unmatched")
[[ $BLACKLIST_OK -eq 1 ]] || failed_checks+=("blacklist_unreachable")
[[ $BLACKLIST_FORMATTED_LABEL_OK -eq 1 ]] || failed_checks+=("blacklist_label_unmatched")

if [[ -n "$ADMIN_REAL_REVIEW_TASK_ID" ]]; then
  [[ $REVIEW_DETAIL_OK -eq 1 ]] || failed_checks+=("review_detail_unreachable")
  [[ $REVIEW_DETAIL_CONTENT_OK -eq 1 ]] || failed_checks+=("review_detail_content_unmatched")
fi

if [[ -n "$ADMIN_REAL_REPORT_ID" ]]; then
  [[ $REPORT_DETAIL_OK -eq 1 ]] || failed_checks+=("report_detail_unreachable")
  [[ $REPORT_DETAIL_CONTENT_OK -eq 1 ]] || failed_checks+=("report_detail_content_unmatched")
fi

if [[ ${#failed_checks[@]} -gt 0 ]]; then
  echo "admin real reads smoke failed checks: ${failed_checks[*]}" >&2
  echo "admin real reads smoke complete with failures. Evidence: $ADMIN_REAL_READS_EVIDENCE_DIR"
  exit 1
fi

echo "admin real reads smoke complete. Evidence: $ADMIN_REAL_READS_EVIDENCE_DIR"
