#!/bin/bash
#---------------------重要提示---------------------#
#!!!完整镜像复制到/root/images.tar.gz，然后运行此脚本进行部署，否则使用deploy.sh

set -e  # 遇到错误时退出脚本

# 1. 创建自定义网络（若不存在）
echo "创建网络 myweb_net..."
docker network create myweb_net || true

# 2. 创建所需目录结构并设置权限
echo "准备目录结构和权限..."
mkdir -p /opt/myweb/server/{data,uploads/apps/icons,logs}
chown -R 1001:1001 /opt/myweb/server
chmod -R 775 /opt/myweb/server

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
  -v /opt/myweb/server/data:/app/data:rw \
  -v /opt/myweb/server/uploads:/app/uploads:rw \
  -v /opt/myweb/server/logs:/app/logs:rw \
  myweb_server:latest

# 6. 启动前端服务容器
echo "启动前端服务..."
docker run -d \
  --name myweb-frontend \
  --network myweb_net --network-alias frontend \
  -p 10010:80 \
  --restart always \
  -e NGINX_ENVSUBST_TEMPLATE_SUFFIX=.template \
  -v /opt/myweb/server/uploads:/usr/share/nginx/uploads:ro \
  myweb_frontend:latest

# 7. 显示部署结果
echo "部署完成！"
echo "后端服务：容器名 myweb-backend，映射端口 3302"
echo "前端服务：容器名 myweb-frontend，映射端口 10010"
echo "可通过 http://宿主机IP:10010 访问应用"
echo "日志文件位于 /opt/myweb/server/logs 目录"
echo "上传文件位于 /opt/myweb/server/uploads 目录"
