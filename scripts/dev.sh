#!/bin/bash

# MyWeb 开发环境启动脚本

echo "🚀 Starting MyWeb Development Environment..."

# 检查是否存在 .env 文件
if [ ! -f .env ]; then
    echo "📝 Creating .env file from .env.example..."
    cp .env.example .env
    echo "✅ Please edit .env file with your configuration"
fi

# 安装依赖
echo "📦 Installing dependencies..."

# 安装根目录依赖
if [ -f package.json ]; then
    npm install
fi

# 安装前端依赖
if [ -f client/package.json ]; then
    echo "📦 Installing client dependencies..."
    cd client && npm install && cd ..
fi

# 安装后端依赖
if [ -f server/package.json ]; then
    echo "📦 Installing server dependencies..."
    cd server && npm install && cd ..
fi

echo "✅ Dependencies installed successfully!"

# 启动开发服务器
echo "🔥 Starting development servers..."

# 使用 trap 确保在脚本退出时杀死所有子进程
trap 'kill $(jobs -p)' EXIT

# 启动后端服务器
echo "🔧 Starting backend server..."
(cd server && npm run dev) &
BACKEND_PID=$!

# 等待后端启动
sleep 3

# 启动前端服务器
echo "🎨 Starting frontend server..."
(cd client && npm run dev) &
FRONTEND_PID=$!

echo ""
echo "🎉 MyWeb is running!"
echo "📱 Frontend: http://localhost:3000"
echo "🔧 Backend:  http://localhost:3002"
echo ""
echo "Press Ctrl+C to stop all servers"

# 等待任一进程结束
wait