#!/usr/bin/env bash
set -euo pipefail

usage() {
  cat <<'EOF'
Usage: deploy.sh [options]

One-click deployment helper for the MyWeb stack using Docker Compose.

Options:
  --env-file FILE          Load additional environment variables from FILE
  --no-build               Skip image build step (use existing local images)
  --force-recreate         Force container recreation (passes --force-recreate)
  --skip-health-check      Do not run the HTTP health probe after startup
  --health-timeout SECONDS Timeout in seconds for the health probe (default: 120)
  --health-url URL         Override the health probe URL (default derived from compose port)
  --compose-cmd CMD        Override docker compose invocation (default: "docker compose")
  --setup-permissions      Force local server directory permission fixes before deployment
  --skip-db-check          Skip running the server db:check script after containers start
  -h, --help               Show this help message and exit

Environment:
  DEPLOY_HEALTH_TIMEOUT    Default timeout (seconds) for health check loop
  DOCKER_HOST              Standard Docker setting, honoured automatically

Examples:
  ./deploy.sh --env-file .env.production
  ./deploy.sh --no-build --skip-health-check
EOF
}

log()  { printf '\033[1;34m[INFO]\033[0m %s\n' "$*"; }
ok()   { printf '\033[1;32m[SUCCESS]\033[0m %s\n' "$*"; }
warn() { printf '\033[1;33m[WARN]\033[0m %s\n' "$*"; }
err()  { printf '\033[1;31m[ERROR]\033[0m %s\n' "$*"; }

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$SCRIPT_DIR"
COMPOSE_FILE="$PROJECT_ROOT/docker-compose.yml"

if [[ ! -f "$COMPOSE_FILE" ]]; then
  err "docker-compose.yml not found in $PROJECT_ROOT"
  exit 1
fi

if [[ -f "$PROJECT_ROOT/.env" ]]; then
  # shellcheck disable=SC1090
  set -a
  . "$PROJECT_ROOT/.env"
  set +a
fi

COMPOSE_CMD="docker compose"
NO_BUILD=0
FORCE_RECREATE=0
SKIP_HEALTH=0
HEALTH_TIMEOUT=${DEPLOY_HEALTH_TIMEOUT:-120}
HEALTH_URL=""
ENV_FILE=""
PORT_MAPPING=""
HOST_PART=""
PORT_PART=""
FORCE_SETUP_PERMS=0
SKIP_DB_CHECK=0

while [[ $# -gt 0 ]]; do
  case "$1" in
    --env-file)
  [[ $# -lt 2 ]] && { err "--env-file requires a value"; exit 1; }
      ENV_FILE="$2"
      shift 2
      ;;
    --no-build)
      NO_BUILD=1
      shift
      ;;
    --force-recreate)
      FORCE_RECREATE=1
      shift
      ;;
    --skip-health-check)
      SKIP_HEALTH=1
      shift
      ;;
    --health-timeout)
  [[ $# -lt 2 ]] && { err "--health-timeout requires a value"; exit 1; }
      HEALTH_TIMEOUT="$2"
      shift 2
      ;;
    --health-url)
  [[ $# -lt 2 ]] && { err "--health-url requires a value"; exit 1; }
      HEALTH_URL="$2"
      shift 2
      ;;
    --compose-cmd)
  [[ $# -lt 2 ]] && { err "--compose-cmd requires a value"; exit 1; }
      COMPOSE_CMD="$2"
      shift 2
      ;;
    --setup-permissions)
      FORCE_SETUP_PERMS=1
      shift
      ;;
    --skip-db-check)
      SKIP_DB_CHECK=1
      shift
      ;;
    -h|--help)
      usage
      exit 0
      ;;
    *)
      echo "Unknown option: $1" >&2
      usage
      exit 1
      ;;
  esac
done

check_command() {
  if ! command -v "$1" >/dev/null 2>&1; then
    err "'$1' command not found. Please install it before running deploy.sh."
    exit 1
  fi
}

check_command docker

# Verify Docker daemon connectivity
if ! docker info >/dev/null 2>&1; then
  err "Docker daemon is not reachable. Ensure Docker is running and you have permission."
  exit 1
fi

detect_compose() {
  if command -v docker >/dev/null 2>&1 && docker compose version >/dev/null 2>&1; then
    echo "docker compose"
    return
  fi
  if command -v docker-compose >/dev/null 2>&1; then
    echo "docker-compose"
    return
  fi
  echo ""
}

if [[ "$COMPOSE_CMD" == "docker compose" ]]; then
  detected=$(detect_compose)
  if [[ -n "$detected" ]]; then
    COMPOSE_CMD="$detected"
  fi
fi

# Check docker compose availability
if ! $COMPOSE_CMD version >/dev/null 2>&1; then
  err "'$COMPOSE_CMD' is not available. Install Docker Compose v2 (docker CLI plugin)."
  exit 1
fi

if ! command -v curl >/dev/null 2>&1 && [[ "$SKIP_HEALTH" -eq 0 ]]; then
  warn "curl not found; health check will be skipped."
  SKIP_HEALTH=1
fi

setup_permissions() {
  local perm_uid=${PERM_UID:-1001}
  local perm_gid=${PERM_GID:-1001}
  local dirs=(
    "$PROJECT_ROOT/server/uploads"
    "$PROJECT_ROOT/server/uploads/wallpapers"
    "$PROJECT_ROOT/server/uploads/apps"
    "$PROJECT_ROOT/server/uploads/apps/icons"
    "$PROJECT_ROOT/server/uploads/files"
    "$PROJECT_ROOT/server/uploads/novels"
    "$PROJECT_ROOT/server/data"
    "$PROJECT_ROOT/server/logs"
  )

  log "Fixing permissions for server writable directories (uid=${perm_uid} gid=${perm_gid})"

  for dir in "${dirs[@]}"; do
    mkdir -p "$dir"
    if ! chown -R "${perm_uid}:${perm_gid}" "$dir" 2>/dev/null; then
      if command -v sudo >/dev/null 2>&1; then
        sudo chown -R "${perm_uid}:${perm_gid}" "$dir"
      else
        warn "Failed to chown $dir (sudo unavailable). Continuing without adjusting owner."
      fi
    fi
    if ! chmod -R 775 "$dir" 2>/dev/null; then
      if command -v sudo >/dev/null 2>&1; then
        sudo chmod -R 775 "$dir"
      else
        warn "Failed to chmod $dir (sudo unavailable)."
      fi
    fi
  done

  ok "Writable directories ensured"
}

ensure_client_env() {
  local client_env="$PROJECT_ROOT/client/.env.production"
  local desired_base=""

  if [[ -n "${DEPLOY_VITE_API_BASE:-}" ]]; then
    desired_base="$DEPLOY_VITE_API_BASE"
  elif [[ -n "${VITE_API_BASE:-}" ]]; then
    desired_base="$VITE_API_BASE"
  fi

  if [[ -f "$client_env" && -z "$desired_base" ]]; then
    desired_base=$(grep -E '^VITE_API_BASE=' "$client_env" | tail -n1 | cut -d'=' -f2- || true)
  fi

  if [[ -z "$desired_base" ]]; then
    desired_base="/api"
  fi

  mkdir -p "$(dirname "$client_env")"

  local current_base=""
  if [[ -f "$client_env" ]]; then
    current_base=$(grep -E '^VITE_API_BASE=' "$client_env" | tail -n1 | cut -d'=' -f2- || true)
  fi

  if [[ "$current_base" == "$desired_base" && -n "$current_base" ]]; then
    log "client/.env.production already set (VITE_API_BASE=$current_base)"
    return
  fi

  cat >"$client_env" <<EOF
VITE_API_BASE=$desired_base
EOF
  log "client/.env.production updated (VITE_API_BASE=$desired_base)"
}

compose_args=(-f "$COMPOSE_FILE")
if [[ -n "$ENV_FILE" ]]; then
  if [[ ! -f "$ENV_FILE" ]]; then
    err "Specified env file '$ENV_FILE' does not exist."
    exit 1
  fi
  compose_args+=(--env-file "$ENV_FILE")
fi

services=(myweb)

compose_up_flags=(-d)
if [[ "$NO_BUILD" -eq 0 ]]; then
  compose_up_flags+=(--build)
fi
if [[ "$FORCE_RECREATE" -eq 1 ]]; then
  compose_up_flags+=(--force-recreate)
fi
if [[ "${REMOVE_ORPHANS:-false}" == "true" ]]; then
  compose_up_flags+=(--remove-orphans)
fi

SKIP_LOCAL_DIR_SETUP=${SKIP_LOCAL_DIR_SETUP:-true}
if [[ "$FORCE_SETUP_PERMS" -eq 1 ]]; then
  setup_permissions
elif [[ "$SKIP_LOCAL_DIR_SETUP" == "false" ]]; then
  setup_permissions
fi

ensure_client_env

export DOCKER_BUILDKIT=${DOCKER_BUILDKIT:-1}

printf '==> Bringing up services: %s\n' "${services[*]}"
$COMPOSE_CMD "${compose_args[@]}" up "${compose_up_flags[@]}" "${services[@]}"

printf '==> Current container status\n'
$COMPOSE_CMD "${compose_args[@]}" ps

if [[ "$SKIP_DB_CHECK" -eq 0 ]]; then
  log "Running database integrity check (server/db:check)..."
  if ! $COMPOSE_CMD "${compose_args[@]}" exec -T myweb node server/src/utils/db-check.js; then
    err "Database check failed. Inspecting recent logs..."
    $COMPOSE_CMD "${compose_args[@]}" logs --tail 80 myweb || true
    exit 1
  fi
  ok "Database check passed"
fi

if [[ "$SKIP_HEALTH" -eq 1 ]]; then
  log "Health check was skipped."
  exit 0
fi

# Determine health check URL
if [[ -z "$HEALTH_URL" ]]; then
  PORT_MAPPING=$($COMPOSE_CMD "${compose_args[@]}" port myweb 3000 2>/dev/null || true)
  if [[ -n "$PORT_MAPPING" ]]; then
    # format host:port
    HOST_PART="${PORT_MAPPING%:*}"
    PORT_PART="${PORT_MAPPING##*:}"
    if [[ "$HOST_PART" == "0.0.0.0" || "$HOST_PART" == "::" ]]; then
      HOST_PART="127.0.0.1"
    fi
    HEALTH_URL="http://${HOST_PART}:${PORT_PART}/health"
  else
    TARGET_PORT=${PORT:-3000}
    HEALTH_URL="http://127.0.0.1:${TARGET_PORT}/health"
  fi
fi

printf '==> Waiting for health endpoint %s (timeout: %ss)\n' "$HEALTH_URL" "$HEALTH_TIMEOUT"
DEADLINE=$((SECONDS + HEALTH_TIMEOUT))
SUCCESS=0
while (( SECONDS < DEADLINE )); do
  if curl --fail --silent --show-error --max-time 5 "$HEALTH_URL" >/dev/null; then
    SUCCESS=1
    break
  fi
  sleep 3
done

if [[ "$SUCCESS" -eq 1 ]]; then
  echo "✅ Deployment succeeded and service is healthy."
else
  echo "❌ Deployment completed but health check did not pass within ${HEALTH_TIMEOUT}s." >&2
  echo "   Check container logs with: $COMPOSE_CMD ${compose_args[*]} logs --tail 50 myweb" >&2
  exit 1
fi

printf '\nAccess URLs:\n'
if [[ -n "$PORT_MAPPING" ]]; then
  echo "  Web UI : http://${HOST_PART}:${PORT_PART}/"
  echo "  Health : $HEALTH_URL"
else
  if [[ -n "${PORT:-}" ]]; then
    echo "  Web UI : http://127.0.0.1:${PORT}/"
  else
    echo "  Web UI : http://127.0.0.1:3000/"
  fi
  echo "  Health : $HEALTH_URL"
fi
