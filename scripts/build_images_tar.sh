#!/usr/bin/env bash

set -euo pipefail

# 在项目根构建 server 与 client 镜像并导出为一个 images.tar.gz
# 用法: scripts/build_images_tar.sh [output.tar.gz]
# 可选环境变量: IMAGE_SERVER_TAG, IMAGE_FRONTEND_TAG

PROJECT_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$PROJECT_ROOT"

OUT="${1:-images.tar.gz}"
IMAGE_SERVER_TAG="${IMAGE_SERVER_TAG:-myweb_server:latest}"
IMAGE_FRONTEND_TAG="${IMAGE_FRONTEND_TAG:-myweb_frontend:latest}"

# 可选的构建参数（从环境传入），会被转成 --build-arg ... 传递给 docker build
BUILD_ARGS=""
if [ -n "${http_proxy:-}" ]; then BUILD_ARGS+=" --build-arg http_proxy=${http_proxy}"; fi
if [ -n "${https_proxy:-}" ]; then BUILD_ARGS+=" --build-arg https_proxy=${https_proxy}"; fi
if [ -n "${no_proxy:-}" ]; then BUILD_ARGS+=" --build-arg no_proxy=${no_proxy}"; fi
if [ -n "${ALPINE_MIRROR:-}" ]; then BUILD_ARGS+=" --build-arg ALPINE_MIRROR=${ALPINE_MIRROR}"; fi

echo "项目根: $PROJECT_ROOT"
echo "Server image: $IMAGE_SERVER_TAG"
echo "Frontend image: $IMAGE_FRONTEND_TAG"
echo "输出文件: $OUT"

# 检查 docker
if ! command -v docker >/dev/null 2>&1; then
  echo "错误: docker 未安装或不可用" >&2
  exit 1
fi

# 构建 server 镜像（使用项目根作为 build context）
if [ -f docker/Dockerfile.server ]; then
  echo "构建 server 镜像..."
  docker build -t "$IMAGE_SERVER_TAG" -f docker/Dockerfile.server .
else
  echo "警告: 未找到 docker/Dockerfile.server，跳过 server 镜像构建"
fi

# 构建 frontend 镜像
if [ -f docker/Dockerfile.client ]; then
  echo "构建 frontend 镜像..."

  # 如果存在运行时上传的 icons，则在构建前临时合并到 client/public/apps/icons
  UPLOAD_ICONS_DIR="server/uploads/apps/icons"
  CLIENT_ICONS_DIR="client/public/apps/icons"
  BACKUP_DIR="/tmp/client_icons_backup_$$"

  if [ -d "$UPLOAD_ICONS_DIR" ] && [ "$(ls -A "$UPLOAD_ICONS_DIR")" ]; then
    echo "检测到运行时上传图标，临时合并到 $CLIENT_ICONS_DIR"
    # 备份原有 client icons（如果存在）
    if [ -d "$CLIENT_ICONS_DIR" ]; then
      mkdir -p "$BACKUP_DIR"
      echo "备份 $CLIENT_ICONS_DIR -> $BACKUP_DIR"
      cp -a "$CLIENT_ICONS_DIR/." "$BACKUP_DIR/" || true
    else
      mkdir -p "$CLIENT_ICONS_DIR"
    fi

    # 将 uploads 中的图标复制到 client 目录（覆盖同名文件）
    cp -a "$UPLOAD_ICONS_DIR/." "$CLIENT_ICONS_DIR/"
    CLEANUP_CLIENT_ICONS=true
  else
    CLEANUP_CLIENT_ICONS=false
  fi

  # 执行构建
  docker build -t "$IMAGE_FRONTEND_TAG" -f docker/Dockerfile.client .

  # 构建完成后还原 client/public/apps/icons（如果之前备份或复制了）
  if [ "$CLEANUP_CLIENT_ICONS" = true ]; then
    echo "还原 client icons 状态..."
    if [ -d "$BACKUP_DIR" ] && [ "$(ls -A "$BACKUP_DIR")" ]; then
      # 清空当前 client icons 再还原备份
      rm -rf "$CLIENT_ICONS_DIR" || true
      mkdir -p "$CLIENT_ICONS_DIR"
      cp -a "$BACKUP_DIR/." "$CLIENT_ICONS_DIR/"
      rm -rf "$BACKUP_DIR"
    else
      # 没有备份，直接删除临时复制的文件
      rm -rf "$CLIENT_ICONS_DIR" || true
    fi
  fi
else
  echo "警告: 未找到 docker/Dockerfile.client，跳过 frontend 镜像构建"
fi

# 导出镜像
TMP_TAR="$(mktemp --tmpdir images.XXXXXX.tar)"

# 只导出已构建的镜像
IMAGES_TO_SAVE=()
if docker image inspect "$IMAGE_SERVER_TAG" >/dev/null 2>&1; then
  IMAGES_TO_SAVE+=("$IMAGE_SERVER_TAG")
fi
if docker image inspect "$IMAGE_FRONTEND_TAG" >/dev/null 2>&1; then
  IMAGES_TO_SAVE+=("$IMAGE_FRONTEND_TAG")
fi

if [ ${#IMAGES_TO_SAVE[@]} -eq 0 ]; then
  echo "错误: 没有可用镜像可导出" >&2
  exit 1
fi

echo "导出镜像: ${IMAGES_TO_SAVE[*]} -> $OUT"

docker save "${IMAGES_TO_SAVE[@]}" -o "$TMP_TAR"

echo "压缩 tar 到: $OUT"
gzip -c "$TMP_TAR" > "$OUT"

# 清理临时文件
rm -f "$TMP_TAR"

echo "完成: $OUT"

exit 0
