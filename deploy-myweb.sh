#!/bin/bash
#---------------------重要提示---------------------#
#完整镜像复制到/root/images.tar.gz，然后运行此脚本进行部署，否则使用deploy.sh

set -e  # 遇到错误时退出脚本

# 1. 创建自定义网络（若不存在）
echo "创建网络 myweb_net..."
docker network create myweb_net || true

# 2. 使用 Docker 命名卷管理数据，避免直接操作项目目录
echo "准备 Docker 命名卷..."
docker volume create myweb_data || true
docker volume create myweb_uploads || true
docker volume create myweb_logs || true
docker volume create myweb_preset_icons || true

# 可选：如果需要将已有宿主机数据迁移到命名卷，请设置环境变量 DOCKER_VOLUME_MIGRATE=true
# 并确保环境变量 HOST_DATA_PATH 指向旧数据根路径（默认 /opt/myweb/server）
DOCKER_VOLUME_MIGRATE=${DOCKER_VOLUME_MIGRATE:-false}
HOST_DATA_PATH=${HOST_DATA_PATH:-/opt/myweb/server}
if [ "$DOCKER_VOLUME_MIGRATE" = "true" ]; then
  echo "开始将宿主机现有数据从 $HOST_DATA_PATH 迁移到 Docker 命名卷（请先确保相关容器已停止）..."
  # data
  if [ -d "$HOST_DATA_PATH/data" ]; then
    docker run --rm -v "$HOST_DATA_PATH/data":/from -v myweb_data:/to alpine sh -c "cp -a /from/. /to/"
  fi
  # uploads
  if [ -d "$HOST_DATA_PATH/uploads" ]; then
    docker run --rm -v "$HOST_DATA_PATH/uploads":/from -v myweb_uploads:/to alpine sh -c "cp -a /from/. /to/"
  fi
  # logs
  if [ -d "$HOST_DATA_PATH/logs" ]; then
    docker run --rm -v "$HOST_DATA_PATH/logs":/from -v myweb_logs:/to alpine sh -c "cp -a /from/. /to/"
  fi
  # preset icons
  if [ -d "$HOST_DATA_PATH/../client/public/apps/icons" ]; then
    docker run --rm -v "$HOST_DATA_PATH/../client/public/apps/icons":/from -v myweb_preset_icons:/to alpine sh -c "cp -a /from/. /to/"
  fi
  echo "迁移完成。你可以检查命名卷内容，确认无误后再删除宿主机上的旧数据。"
fi

# 3. 加载镜像（如果有本地镜像包）
if [ -f "/root/images.tar.gz" ]; then
  echo "加载镜像文件..."
  docker load -i /root/images.tar.gz
else
  echo "未找到 /root/images.tar.gz，跳过镜像加载步骤"
fi

# 4. 检查是否存在相关镜像
echo "检查必要镜像..."
if ! docker images | grep -q "myweb_server"; then
  echo "警告：未找到 myweb_server 镜像，请确保镜像已正确加载或可从仓库拉取"
fi

if ! docker images | grep -q "myweb_frontend"; then
  echo "警告：未找到 myweb_frontend 镜像，请确保镜像已正确加载或可从仓库拉取"
fi

# 5. 启动后端服务容器
echo "启动后端服务..."
docker run -d \
  --name myweb-backend \
  --network myweb_net --network-alias backend \
  -p 3302:3302 \
  --restart always \
  -e NODE_ENV=production \
  -e PORT=3302 \
  -e DB_PATH=/app/data/myweb.db \
  -e CORS_ORIGIN="http://175.178.47.135:10010" \
  -v myweb_data:/app/data \
  -v myweb_uploads:/app/uploads \
  -v myweb_logs:/app/logs \
  myweb_server:latest

# 6. 启动前端服务容器
echo "启动前端服务..."
docker run -d \
  --name myweb-frontend \
  --network myweb_net --network-alias frontend \
  -p 10010:80 \
  --restart always \
  -e NGINX_ENVSUBST_TEMPLATE_SUFFIX=.template \
  -v myweb_uploads:/usr/share/nginx/uploads:ro \
  myweb_frontend:latest

# 7. 显示部署结果
echo "部署完成！"
echo "后端服务：容器名 myweb-backend，映射端口 3302"
echo "前端服务：容器名 myweb-frontend，映射端口 10010"
echo "可通过 http://宿主机IP:10010 访问应用"
echo "上传文件与日志已使用 Docker 命名卷管理（myweb_uploads, myweb_logs）"
echo "若需要在宿主机上访问数据，可使用 'docker run --rm -v myweb_uploads:/data alpine ls -la /data' 等命令来查看卷内容"
