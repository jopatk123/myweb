#!/bin/bash

# MyWeb 生产构建脚本

echo "🏗️  Building MyWeb for production..."

# 检查环境变量
if [ ! -f .env ]; then
    echo "❌ .env file not found. Please create it from .env.example"
    exit 1
fi

# 构建前端
echo "📦 Building frontend..."
cd client
npm run build
if [ $? -ne 0 ]; then
    echo "❌ Frontend build failed"
    exit 1
fi
cd ..

# 创建生产目录
echo "📁 Creating production directory..."
mkdir -p dist
mkdir -p dist/client
mkdir -p dist/server

# 复制前端构建文件
echo "📋 Copying frontend build..."
cp -r client/dist/* dist/client/

# 复制后端文件
echo "📋 Copying backend files..."
cp -r server/src dist/server/
cp server/package.json dist/server/
cp .env dist/

# 安装生产依赖
echo "📦 Installing production dependencies..."
cd dist/server
npm install --production
cd ../..

echo "✅ Build completed successfully!"
echo "📁 Production files are in ./dist/"