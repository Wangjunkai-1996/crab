#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
ROOT_DIR="$(cd "$PROJECT_DIR/.." && pwd)"
BACKEND_SCRIPTS_DIR="/Users/gy-vip/Desktop/KK_Crab-backend/scripts"
DEFAULT_ENV_FILE="$PROJECT_DIR/.env.real-admin-auth.example"
LOCAL_ENV_FILE="$PROJECT_DIR/.env.real-admin-auth.local"
VERIFY_BUILD=0

while [[ $# -gt 0 ]]; do
  case "$1" in
    --verify-build)
      VERIFY_BUILD=1
      ;;
    -h|--help)
      cat <<INFO
Usage:
  bash ./scripts/check-admin-web-publish-status.sh [--verify-build]

Options:
  --verify-build   额外执行 typecheck + build，验证本地静态产物可生成
INFO
      exit 0
      ;;
    *)
      echo "Unknown arg: $1" >&2
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

if [[ -f "$LOCAL_ENV_FILE" ]]; then
  set -a
  source "$LOCAL_ENV_FILE"
  set +a
fi

ADMIN_WEB_BASE_URL="${ADMIN_WEB_BASE_URL:-}"
ADMIN_WEB_BASE_URL="${ADMIN_WEB_BASE_URL%/}"
ADMIN_WEB_LOGIN_PATH="${ADMIN_WEB_LOGIN_PATH:-/login}"
ADMIN_WEB_LOGIN_PATH="/${ADMIN_WEB_LOGIN_PATH#/}"
ADMIN_WEB_LOGIN_URL="${ADMIN_WEB_BASE_URL}${ADMIN_WEB_LOGIN_PATH}"
ADMIN_WEB_ENTRY_URL="${ADMIN_WEB_BASE_URL}/"

has_command() {
  command -v "$1" >/dev/null 2>&1
}

has_env_value() {
  local name="$1"
  [[ -n "${!name:-}" ]]
}

latest_local_admin_layout_chunk() {
  ls -t "$PROJECT_DIR"/dist/assets/AdminLayout-*.js 2>/dev/null | head -1
}

extract_entry_script_src() {
  local html_file="$1"
  python3 - "$html_file" <<'PY'
from pathlib import Path
import re, sys
text = Path(sys.argv[1]).read_text()
match = re.search(r'<script type="module" crossorigin src="([^"]+)"', text)
print(match.group(1) if match else '')
PY
}

extract_admin_layout_chunk_name() {
  local js_file="$1"
  python3 - "$js_file" <<'PY'
from pathlib import Path
import re, sys
text = Path(sys.argv[1]).read_text()
match = re.search(r'AdminLayout-[A-Za-z0-9_-]+\.js', text)
print(match.group(0) if match else '')
PY
}

contains_text() {
  local file="$1"
  local needle="$2"
  python3 - "$file" "$needle" <<'PY'
from pathlib import Path
import sys
text = Path(sys.argv[1]).read_text()
needle = sys.argv[2]
print("yes" if needle in text else "no")
PY
}

find_publish_auth_source() {
  if has_env_value TENCENTCLOUD_SECRETID && has_env_value TENCENTCLOUD_SECRETKEY; then
    echo "env:TENCENTCLOUD_SECRETID/TENCENTCLOUD_SECRETKEY"
    return 0
  fi

  if has_env_value TENCENT_SECRET_ID && has_env_value TENCENT_SECRET_KEY; then
    echo "env:TENCENT_SECRET_ID/TENCENT_SECRET_KEY"
    return 0
  fi

  if find "$HOME/.config" -maxdepth 3 \( -iname '*cloudbase*' -o -iname '*tcb*' -o -iname '*tccli*' \) -print 2>/dev/null | grep -q .; then
    echo "local-config"
    return 0
  fi

  echo "none"
}

latest_snapshot_file() {
  ls -t "$PROJECT_DIR"/.playwright-cli/*.yml 2>/dev/null | head -1
}

find_risk_confirm_ref() {
  local file="$1"
  python3 - "$file" <<'PY'
import pathlib, re, sys
text = pathlib.Path(sys.argv[1]).read_text().splitlines()
pattern = re.compile(r'button "确定访问(?: \(\d+s\))?"(?: \[disabled\])? \[ref=([^\]]+)\]')
for line in text:
    match = pattern.search(line)
    if match:
        print(match.group(1))
        break
PY
}

build_status="skipped"
if [[ $VERIFY_BUILD -eq 1 ]]; then
  (cd "$PROJECT_DIR" && npm run typecheck >/tmp/admin-web-typecheck.log && npm run build >/tmp/admin-web-build.log)
  if [[ -f "$PROJECT_DIR/dist/index.html" ]]; then
    build_status="verified"
  else
    build_status="failed"
  fi
else
  if [[ -f "$PROJECT_DIR/dist/index.html" ]]; then
    build_status="dist-present"
  else
    build_status="not-verified"
  fi
fi

has_manager_node="no"
if [[ -d "$BACKEND_SCRIPTS_DIR/node_modules/@cloudbase/manager-node" ]]; then
  has_manager_node="yes"
fi

has_cloudbase_cli="no"
if has_command tcb || has_command cloudbase; then
  has_cloudbase_cli="yes"
fi

publish_auth_source="$(find_publish_auth_source)"
local_publish_capability="missing-auth"
if [[ "$publish_auth_source" != "none" ]]; then
  local_publish_capability="ready"
fi

global_publish_status="unknown"
global_status_reason="未配置正式访问地址"
direct_login_http_status="unknown"
browser_gate_present="unknown"
browser_login_ready="unknown"
browser_final_url="unknown"
browser_final_title="unknown"
entry_script_src="unknown"
deployed_admin_layout_chunk="unknown"
local_admin_layout_chunk="unknown"
publish_version_consistency="unknown"
publish_version_reason="未执行版本一致性校验"
missing_local_markers=""

PWCLI=""
if [[ -x "$HOME/.agents/skills/playwright/scripts/playwright_cli.sh" ]]; then
  PWCLI="$HOME/.agents/skills/playwright/scripts/playwright_cli.sh"
elif [[ -x "$HOME/.codex/skills/playwright/scripts/playwright_cli.sh" ]]; then
  PWCLI="$HOME/.codex/skills/playwright/scripts/playwright_cli.sh"
fi

if [[ -n "$ADMIN_WEB_BASE_URL" ]]; then
  global_publish_status="已发布"
  global_status_reason="已从 R24 会议纪要同步正式 ADMIN_WEB_BASE_URL 与真实 /login 入口"

  if has_command curl; then
    direct_login_http_status="$(curl -L -s -o /tmp/admin-web-login.html -w '%{http_code}' "$ADMIN_WEB_LOGIN_URL" || true)"
  fi

  if [[ -n "$PWCLI" ]]; then
    "$PWCLI" close-all >/dev/null 2>&1 || true
    "$PWCLI" open "$ADMIN_WEB_ENTRY_URL" >/dev/null
    sleep 3
    "$PWCLI" snapshot > /tmp/admin-web-browser-before.txt
    SNAPSHOT_FILE="$(latest_snapshot_file)"
    REF=""
    if [[ -n "$SNAPSHOT_FILE" ]]; then
      REF="$(find_risk_confirm_ref "$SNAPSHOT_FILE")"
    fi

    if [[ -n "$REF" ]]; then
      browser_gate_present="yes"
      "$PWCLI" click "$REF" >/dev/null || true
      sleep 1
    else
      browser_gate_present="no"
    fi

    "$PWCLI" snapshot > /tmp/admin-web-browser-after.txt
    browser_final_url="$(python3 - <<'PY'
from pathlib import Path
import re
text = Path('/tmp/admin-web-browser-after.txt').read_text()
match = re.search(r'- Page URL: (.+)', text)
print(match.group(1).strip() if match else 'unknown')
PY
)"
    browser_final_title="$(python3 - <<'PY'
from pathlib import Path
import re
text = Path('/tmp/admin-web-browser-after.txt').read_text()
match = re.search(r'- Page Title: (.+)', text)
print(match.group(1).strip() if match else 'unknown')
PY
)"

    if [[ "$browser_final_title" == "多米通告 V1 运营后台" ]] && [[ "$browser_final_url" == *"/login"* ]]; then
      browser_login_ready="yes"
    else
      browser_login_ready="no"
    fi
  fi
fi

if [[ -n "$ADMIN_WEB_BASE_URL" ]] && [[ -f "$PROJECT_DIR/dist/index.html" ]]; then
  local_admin_layout_chunk="$(latest_local_admin_layout_chunk)"

  if has_command curl; then
    curl -L -s -o /tmp/admin-web-publish-root.html "$ADMIN_WEB_ENTRY_URL" || true
    entry_script_src="$(extract_entry_script_src /tmp/admin-web-publish-root.html)"

    if [[ -n "$entry_script_src" ]]; then
      curl -L -s -o /tmp/admin-web-publish-entry.js "${ADMIN_WEB_BASE_URL}${entry_script_src}" || true
      deployed_admin_layout_chunk="$(extract_admin_layout_chunk_name /tmp/admin-web-publish-entry.js)"
    fi
  fi

  if [[ -n "$local_admin_layout_chunk" ]] && [[ -n "$deployed_admin_layout_chunk" && "$deployed_admin_layout_chunk" != "unknown" ]]; then
    remote_admin_layout_url="${ADMIN_WEB_BASE_URL}/assets/${deployed_admin_layout_chunk}"
    curl -L -s -o /tmp/admin-web-publish-admin-layout.js "$remote_admin_layout_url" || true

    markers=(
      "markPasswordResetCompleted"
      "资料刷新失败"
      "请根据表单提示修正后重试"
    )

    missing_markers=()
    for marker in "${markers[@]}"; do
      if [[ "$(contains_text "$local_admin_layout_chunk" "$marker")" == "yes" ]] && [[ "$(contains_text /tmp/admin-web-publish-admin-layout.js "$marker")" != "yes" ]]; then
        missing_markers+=("$marker")
      fi
    done

    if [[ ${#missing_markers[@]} -eq 0 ]]; then
      publish_version_consistency="aligned"
      publish_version_reason="线上 AdminLayout chunk 已命中本地最新关键收口标记"
    else
      publish_version_consistency="stale"
      publish_version_reason="线上 AdminLayout chunk 缺少本地最新关键收口标记"
      missing_local_markers="${missing_markers[*]}"
    fi
  elif [[ -z "$local_admin_layout_chunk" ]]; then
    publish_version_consistency="unknown"
    publish_version_reason="本地 dist 中未找到 AdminLayout chunk"
  else
    publish_version_consistency="unknown"
    publish_version_reason="未能从线上入口包解析 AdminLayout chunk"
  fi
fi

cat <<INFO
[admin-web publish status]
- branch: $(cd "$ROOT_DIR" && git branch --show-current 2>/dev/null || echo unknown)
- project_dir: $PROJECT_DIR
- verify_build: $VERIFY_BUILD
- build_status: $build_status
- dist_index: $(if [[ -f "$PROJECT_DIR/dist/index.html" ]]; then echo present; else echo missing; fi)
- admin_web_base_url: ${ADMIN_WEB_BASE_URL:-<missing>}
- default_login_path: $ADMIN_WEB_LOGIN_PATH
- login_url: ${ADMIN_WEB_LOGIN_URL:-<missing>}
- entry_url: ${ADMIN_WEB_ENTRY_URL:-<missing>}
- direct_login_http_status: $direct_login_http_status
- browser_gate_present: $browser_gate_present
- browser_login_ready: $browser_login_ready
- browser_final_url: $browser_final_url
- browser_final_title: $browser_final_title
- entry_script_src: $entry_script_src
- local_admin_layout_chunk: $local_admin_layout_chunk
- deployed_admin_layout_chunk: $deployed_admin_layout_chunk
- publish_version_consistency: $publish_version_consistency
- publish_version_reason: $publish_version_reason
- publish_version_missing_markers: ${missing_local_markers:-none}
- global_publish_status: $global_publish_status
- global_status_reason: $global_status_reason
- local_publish_capability: $local_publish_capability
- target_env_hint: cloud1-4grxqg018586792d
- cloudbase_cli: $has_cloudbase_cli
- manager_node_sdk: $has_manager_node
- publish_auth_source: $publish_auth_source
INFO
