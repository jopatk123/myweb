#!/bin/bash

# 启动前端开发服务器
cd client
npm run dev &
FRONTEND_PID=$!
cd ..

# 启动后端开发服务器
cd server
npm run dev &
BACKEND_PID=$!
cd ..

# 等待两个进程
wait $FRONTEND_PID
wait $BACKEND_PID
