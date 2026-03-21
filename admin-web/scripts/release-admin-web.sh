#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
BACKEND_SCRIPTS_DIR="/Users/gy-vip/Desktop/KK_Crab-backend/scripts"
DEFAULT_PUBLISH_ENV_FILE="${HOME}/.config/kk-crab/admin-web-publish.env"
PUBLISH_ENV_FILE="${KK_CRAB_PUBLISH_ENV_FILE:-$DEFAULT_PUBLISH_ENV_FILE}"
WITH_SMOKE=0
DRY_RUN=0
SKIP_BUILD=0
SKIP_CHECK=0

trim() {
  local value="$1"
  value="${value#"${value%%[![:space:]]*}"}"
  value="${value%"${value##*[![:space:]]}"}"
  printf '%s' "$value"
}

load_env_file_if_unset() {
  local file="$1"
  [[ -f "$file" ]] || return 0

  while IFS= read -r raw_line || [[ -n "$raw_line" ]]; do
    local line
    line="$(trim "$raw_line")"
    [[ -z "$line" || "$line" == \#* ]] && continue
    [[ "$line" == *=* ]] || continue

    local key="${line%%=*}"
    local value="${line#*=}"
    key="$(trim "$key")"
    value="$(trim "$value")"

    if [[ "$value" == \"*\" && "$value" == *\" ]]; then
      value="${value:1:${#value}-2}"
    elif [[ "$value" == \'*\' && "$value" == *\' ]]; then
      value="${value:1:${#value}-2}"
    fi

    [[ -n "$key" ]] || continue
    if [[ -z "${!key:-}" ]]; then
      export "$key=$value"
    fi
  done < "$file"
}

print_help() {
  cat <<'INFO'
Usage:
  bash ./scripts/release-admin-web.sh [options]

Options:
  --dry-run      仅输出将要执行的动作，不真正 build / publish / check
  --with-smoke   发布成功后继续执行首次改密 smoke
  --skip-build   跳过 build（默认会先 build）
  --skip-check   跳过部署指纹核查
  -h, --help     显示帮助

One-time local credential file:
  ~/.config/kk-crab/admin-web-publish.env
INFO
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --dry-run)
      DRY_RUN=1
      ;;
    --with-smoke)
      WITH_SMOKE=1
      ;;
    --skip-build)
      SKIP_BUILD=1
      ;;
    --skip-check)
      SKIP_CHECK=1
      ;;
    -h|--help)
      print_help
      exit 0
      ;;
    *)
      echo "Unknown arg: $1" >&2
      exit 1
      ;;
  esac
  shift
done

load_env_file_if_unset "$PUBLISH_ENV_FILE"

CLOUDBASE_ENV_ID_VALUE="${CLOUDBASE_ENV_ID:-${CLOUDBASE_ENV_ID_DEV:-}}"
ADMIN_WEB_BASE_URL_VALUE="${ADMIN_WEB_BASE_URL:-}"
CHECK_OUTPUT_FILE="$PROJECT_DIR/release/admin-web-deploy-check.latest.json"

if [[ $DRY_RUN -eq 1 ]]; then
  cat <<INFO
[admin-web release dry-run]
- project_dir: $PROJECT_DIR
- backend_scripts_dir: $BACKEND_SCRIPTS_DIR
- publish_env_file: $PUBLISH_ENV_FILE
- publish_env_file_present: $(if [[ -f "$PUBLISH_ENV_FILE" ]]; then echo yes; else echo no; fi)
- cloudbase_env_id: ${CLOUDBASE_ENV_ID_VALUE:-<missing>}
- admin_web_base_url: ${ADMIN_WEB_BASE_URL_VALUE:-<missing>}
- will_build: $(if [[ $SKIP_BUILD -eq 1 ]]; then echo no; else echo yes; fi)
- will_check: $(if [[ $SKIP_CHECK -eq 1 ]]; then echo no; else echo yes; fi)
- will_smoke: $(if [[ $WITH_SMOKE -eq 1 ]]; then echo yes; else echo no; fi)
INFO
  exit 0
fi

if [[ -z "$CLOUDBASE_ENV_ID_VALUE" ]]; then
  echo "缺少 CLOUDBASE_ENV_ID / CLOUDBASE_ENV_ID_DEV；请先在本机发布凭据文件中配置。" >&2
  exit 1
fi

if [[ $SKIP_BUILD -ne 1 ]]; then
  echo "[release-admin-web] building latest dist..."
  (
    cd "$PROJECT_DIR"
    npm run build
  )
fi

echo "[release-admin-web] publishing latest dist to CloudBase Hosting..."
(
  cd "$BACKEND_SCRIPTS_DIR"
  npm run publish:admin-web -- \
    --env "$CLOUDBASE_ENV_ID_VALUE" \
    --dist "$PROJECT_DIR/dist" \
    --credential-file "$PUBLISH_ENV_FILE"
)

if [[ $SKIP_CHECK -ne 1 ]]; then
  if [[ -z "$ADMIN_WEB_BASE_URL_VALUE" ]]; then
    echo "[release-admin-web] skip deploy fingerprint check: ADMIN_WEB_BASE_URL missing"
  else
    mkdir -p "$(dirname "$CHECK_OUTPUT_FILE")"
    echo "[release-admin-web] checking deployed fingerprint..."
    (
      cd "$BACKEND_SCRIPTS_DIR"
      npm run check:admin-web-deploy -- \
        --base-url "$ADMIN_WEB_BASE_URL_VALUE" \
        --marker markPasswordResetCompleted \
        --local-dist "$PROJECT_DIR/dist" \
        --output "$CHECK_OUTPUT_FILE"
    )
  fi
fi

if [[ $WITH_SMOKE -eq 1 ]]; then
  echo "[release-admin-web] running first-reset smoke..."
  (
    cd "$PROJECT_DIR"
    npm run smoke:admin-auth:real:first-reset
  )
fi

echo "[release-admin-web] done."
