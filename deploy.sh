#!/usr/bin/env bash

set -euo pipefail

# 自动化 Docker 部署脚本（参考用户提供示例）
# - 在项目根以 docker-compose 方式部署
# - 支持重试/二次执行（拉代码、重建、零停机重启）
# - 健康检查端口: 10010

APP_NAME="myweb"
IMAGE_NAME="myweb:latest"
COMPOSE_FILE="docker/docker-compose.yml"
HOST_IP="43.163.120.212"
HOST_PORT="10010"

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

  log "同步代码..."
  if [ -d .git ]; then
    git fetch --all --prune
    # 尽量保持在 main 分支
    if git rev-parse --abbrev-ref HEAD | grep -q "main"; then
      git pull --rebase
    else
      warn "当前不在 main 分支，尝试拉取更新但不强制切换"
      git pull --rebase || true
    fi
  else
    warn "未检测到 .git 目录，跳过拉取"
  fi

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
  # 确保必要目录存在并授权给容器内用户（nodejs:nodejs -> 1001:1001）
  mkdir -p server/uploads/apps/icons server/data server/logs || true
  # node:18-alpine Dockerfile.server 中创建的用户为 uid=1001,gid=1001
  chown -R 1001:1001 server/uploads server/data server/logs 2>/dev/null || true
  chmod -R 775 server/uploads server/data server/logs 2>/dev/null || true
  $DC -f "$COMPOSE_FILE" up -d --build --remove-orphans

  log "等待服务就绪..."
  sleep 3
  $DC -f "$COMPOSE_FILE" ps || true

    # Ensure client/.env.production contains VITE_API_BASE when building frontend inside Dockerfile.client
    # Allow override via environment variable DEPLOY_VITE_API_BASE; default to '/api'
    if [ -n "${DEPLOY_VITE_API_BASE:-}" ]; then
      log "创建 client/.env.production with VITE_API_BASE=${DEPLOY_VITE_API_BASE}"
      mkdir -p client
      cat > client/.env.production <<EOF
VITE_API_BASE=${DEPLOY_VITE_API_BASE}
EOF
    else
      # If not explicitly provided, set to '/api' so production build uses relative API/uploads paths
      if [ ! -f client/.env.production ]; then
        log "创建 client/.env.production with default VITE_API_BASE=/api"
        mkdir -p client
        cat > client/.env.production <<EOF
VITE_API_BASE=/api
EOF
      fi
    fi
  # 健康检查（本机 127.0.0.1:${HOST_PORT}，由 Nginx/反代映射到宿主端口）
  if command -v curl >/dev/null 2>&1; then
    if curl -sSf -m 8 "http://127.0.0.1:${HOST_PORT}/health" >/dev/null 2>&1; then
      ok "部署完成。入口: http://${HOST_IP}:${HOST_PORT}  | 健康检查: http://${HOST_IP}:${HOST_PORT}/health"
    else
      warn "健康检查未通过，正在输出关键容器日志以供排查："
      $DC -f "$COMPOSE_FILE" logs --tail 200 --no-color || true
      exit 1
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
  fi
}

main "$@"
