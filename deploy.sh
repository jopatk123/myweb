#!/usr/bin/env bash

set -euo pipefail

# 自动化 Docker 部署脚本
# - 在项目根以 docker-compose 方式部署
# - 支持重试/二次执行（拉代码、重建、零停机重启）
# - 健康检查端口: 使用 FRONTEND_HOST_PORT（默认为 10010），可在 `.env` 中覆盖
# - 自动处理权限问题

APP_NAME="myweb"
IMAGE_NAME="myweb:latest"
COMPOSE_FILE="docker/docker-compose.yml"
# HOST_IP / FRONTEND_HOST_PORT 可通过 .env 覆盖（见 .env/.env.example）
# (HOST_IP/HOST_PORT 将在加载 .env 后初始化，这样 FRONTEND_HOST_PORT 可以被 .env 覆盖)

# 固定 Compose 项目名以隔离不同项目，允许通过环境变量覆盖
COMPOSE_PROJECT_NAME="${COMPOSE_PROJECT_NAME:-myweb}"
export COMPOSE_PROJECT_NAME

log()  { echo -e "\033[1;34m[INFO]\033[0m $*"; }
ok()   { echo -e "\033[1;32m[SUCCESS]\033[0m $*"; }
warn() { echo -e "\033[1;33m[WARN]\033[0m $*"; }
err()  { echo -e "\033[1;31m[ERROR]\033[0m $*"; }

need_cmd() {
  if ! command -v "$1" >/dev/null 2>&1; then
    err "缺少命令: $1"
    exit 1
  fi
}

# 尝试加载项目根目录下的 .env（如果存在），以便脚本能读取 FRONTEND_HOST_PORT、容器名等覆盖项
# 使用 set -a 将变量导出到环境中，然后再取消自动导出
if [ -f .env ]; then
  # shellcheck disable=SC1090
  set -a
  . .env
  set +a
fi

# 在加载 .env 后设置 HOST_IP/HOST_PORT 的默认值（若 .env 中未设置）
HOST_IP="${HOST_IP:-43.163.120.212}"
HOST_PORT="${FRONTEND_HOST_PORT:-10010}"

# 设置目录权限的函数
setup_permissions() {
  # 允许通过环境变量覆盖默认 UID/GID（容器内运行的 node 用户为 1001:1001）
  local PERM_UID=${PERM_UID:-1001}
  local PERM_GID=${PERM_GID:-1001}

  # 需要创建和授予权限的目录（包含上传的各子目录）
  local dirs=(
    "server/uploads"
    "server/uploads/wallpapers"
    "server/uploads/apps"
    "server/uploads/apps/icons"
    "server/uploads/files"
    "server/uploads/novels"
    "server/data"
    "server/logs"
  )
  
  log "设置目录权限 (uid=${PERM_UID} gid=${PERM_GID})..."
  
  for dir in "${dirs[@]}"; do
    # 确保目录存在
    mkdir -p "$dir" || true

    # 设置归属（优先不使用 sudo，失败再回退）
    if ! chown -R "${PERM_UID}:${PERM_GID}" "$dir" 2>/dev/null; then
      if command -v sudo >/dev/null 2>&1; then
        log "使用sudo设置 $dir 权限归属"
        sudo chown -R "${PERM_UID}:${PERM_GID}" "$dir" || {
          err "无法设置 $dir 权限归属，请检查 sudo 权限"
          return 1
        }
      else
        err "无法设置 $dir 权限归属，且系统没有 sudo 命令"
        return 1
      fi
    fi

    # 设置读写执行权限（目录 775）
    chmod -R 775 "$dir" 2>/dev/null || {
      if command -v sudo >/dev/null 2>&1; then
        sudo chmod -R 775 "$dir" || {
          err "无法设置 $dir 权限"
          return 1
        }
      else
        err "无法设置 $dir 权限"
        return 1
      fi
    }
  done
  
  ok "目录权限设置完成"
}

# 健康检查函数
health_check() {
  log "等待服务就绪..."
  sleep 3
  
  if command -v curl >/dev/null 2>&1; then
    # 后端 health 路由位于 /health（非 /api/health），通过 Nginx 检查 /health
  if curl --noproxy 127.0.0.1 -sSf -m 8 "http://127.0.0.1:${HOST_PORT}/health" >/dev/null 2>&1; then
      ok "部署完成。入口: http://${HOST_IP}:${HOST_PORT}  | 健康检查: http://${HOST_IP}:${HOST_PORT}/health"
      return 0
    else
      warn "健康检查失败"
      return 1
    fi
  else
    # 本机没有 curl：如果不存在 .env.production，则创建一个空的 VITE_API_BASE（生产构建使用相对路径）
    if [ ! -f client/.env.production ]; then
      log "创建 client/.env.production with empty VITE_API_BASE (use relative paths)"
      mkdir -p client
      cat > client/.env.production <<EOF
VITE_API_BASE=
EOF
    fi
    ok "部署完成。入口: http://${HOST_IP}:${HOST_PORT}（本机没有 curl 可用，无法执行健康检查）"
    return 0
  fi
}

detect_compose() {
  if command -v docker >/dev/null 2>&1 && docker compose version >/dev/null 2>&1; then
    echo "docker compose"
    return
  fi
  if command -v docker-compose >/dev/null 2>&1; then
    echo "docker-compose"
    return
  fi
  err "未检测到 docker compose，请安装 Docker 并启用 compose 插件"
  exit 1
}

main() {
  log "检查依赖..."
  need_cmd git
  need_cmd docker

  local DC
  DC=$(detect_compose)
  log "使用 compose 命令: $DC"

  # 跳过自动拉取远程仓库的逻辑，改为由用户手动决定是否更新代码
  # 原因: 部署脚本不应在没有人工确认的情况下自动更改工作树或切换分支
  log "已跳过自动拉取仓库更新。若需要更新，请在部署前手动执行 'git fetch && git pull'。"

  # 如果有 docker/Dockerfile，先构建备用镜像；否则交由 compose 构建
  if [ -f docker/Dockerfile ]; then
    log "构建镜像: $IMAGE_NAME via docker/Dockerfile"
    docker build -t "$IMAGE_NAME" -f docker/Dockerfile .
  else
    log "未检测到 docker/Dockerfile，交由 compose 根据配置构建（如果需要）"
  fi

  # 在使用 docker compose 构建 frontend 镜像之前，确保 client/.env.production 存在并包含 VITE_API_BASE
  # 这样在 Dockerfile.client 的构建阶段，Vite 会读取正确的 API 根路径
  if [ -n "${DEPLOY_VITE_API_BASE:-}" ]; then
    log "为 frontend 构建创建 client/.env.production with VITE_API_BASE=${DEPLOY_VITE_API_BASE}"
    mkdir -p client
    cat > client/.env.production <<EOF
VITE_API_BASE=${DEPLOY_VITE_API_BASE}
EOF
  else
    if [ ! -f client/.env.production ]; then
      log "创建 client/.env.production with default VITE_API_BASE=/api"
      mkdir -p client
      cat > client/.env.production <<EOF
VITE_API_BASE=/api
EOF
    fi
  fi

  log "启动/更新服务: $APP_NAME (使用 $COMPOSE_FILE)"
  
  # 设置目录权限
  setup_permissions || {
    err "权限设置失败，部署终止"
    exit 1
  }
  
  # 启动服务（构建镜像并启动容器）
  log "启动容器与服务（首次启动会自动进行 schema 初始化与 ensure 兜底）..."
  # 控制是否删除 orphan 容器：默认不删除，可通过环境变量 REMOVE_ORPHANS=true 启用
  if [ "${REMOVE_ORPHANS:-false}" = "true" ]; then
    log "使用 --remove-orphans（环境变量 REMOVE_ORPHANS=true）"
    $DC -f "$COMPOSE_FILE" up -d --build --remove-orphans
  else
    log "不使用 --remove-orphans（默认），保留现有未在 compose 文件中的容器"
    $DC -f "$COMPOSE_FILE" up -d --build
  fi

  # 检查数据库状态（由后端 initDatabase 执行 schema+ensure 初始化）
  log "检查数据库状态..."
  $DC -f "$COMPOSE_FILE" exec -T backend npm run db:check || {
    err "数据库检查失败"
    $DC -f "$COMPOSE_FILE" logs --tail 50 backend || true
    exit 1
  }
  ok "数据库检查通过"

  log "等待服务就绪..."
  sleep 3
  $DC -f "$COMPOSE_FILE" ps || true
  # 健康检查
  health_check || {
    warn "健康检查未通过，正在输出关键容器日志以供排查："
    $DC -f "$COMPOSE_FILE" logs --tail 200 --no-color || true
    exit 1
  }
}

main "$@"
