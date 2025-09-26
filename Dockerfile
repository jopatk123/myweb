# MyWeb 应用的多阶段构建
# 此 Dockerfile 支持最小化容器构建时间
# 支持 SKIP_SERVER_NPM_INSTALL 和 USE_LOCAL_CLIENT 环境变量

# =================== 构建阶段：客户端 ===================
FROM node:20-alpine AS client-builder

ARG USE_LOCAL_CLIENT=0

# 设置工作目录
WORKDIR /app

# 只有在不使用本地客户端时才构建
RUN if [ "$USE_LOCAL_CLIENT" = "0" ]; then \
        echo "Building client in container..."; \
    else \
        echo "Skipping client build, using local build..."; \
        mkdir -p /app/client/dist; \
        exit 0; \
    fi

# 复制客户端的 package 文件
COPY client/package*.json ./client/
COPY package*.json ./

# 安装客户端构建依赖
RUN if [ "$USE_LOCAL_CLIENT" = "0" ]; then \
        cd client && npm install; \
    fi

# 复制客户端源代码
COPY client/ ./client/

# 构建客户端应用
RUN if [ "$USE_LOCAL_CLIENT" = "0" ]; then \
        cd client && npm run build; \
    fi

# =================== 构建阶段：服务端依赖 ===================
FROM node:20-alpine AS server-deps

ARG SKIP_SERVER_NPM_INSTALL=0

# 设置工作目录
WORKDIR /app

# 安装构建原生模块所需的工具（better-sqlite3 等依赖）
RUN apk add --no-cache python3 make g++ pkgconf

# 只有在不跳过服务端安装时才安装依赖
RUN if [ "$SKIP_SERVER_NPM_INSTALL" = "0" ]; then \
        echo "Installing server dependencies in container..."; \
    else \
        echo "Skipping server npm install..."; \
        mkdir -p /app/server/node_modules; \
        exit 0; \
    fi

# 复制所有 package 文件（支持工作区）
COPY package*.json ./
COPY server/package*.json ./server/
COPY client/package*.json ./client/

# 安装所有依赖（工作区模式）
RUN if [ "$SKIP_SERVER_NPM_INSTALL" = "0" ]; then \
        npm install --omit=dev; \
    fi

# =================== 运行时阶段 ===================
FROM node:20-alpine AS runtime

# 安装 dumb-init 用于正确的信号处理
RUN apk add --no-cache dumb-init

# 创建应用用户以提高安全性
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

# 设置工作目录
WORKDIR /app

# 复制根目录的 package.json 用于工作区配置
COPY package*.json ./

# 复制服务端应用
COPY server/ ./server/

# 获取构建参数
ARG SKIP_SERVER_NPM_INSTALL=0
ARG USE_LOCAL_CLIENT=0

# 复制依赖（工作区模式下依赖在根目录）
COPY --from=server-deps /app/node_modules ./node_modules

# 创建客户端目录并复制构建文件
RUN mkdir -p ./client/dist
COPY --from=client-builder /app/client/dist ./client/dist

# 如果使用本地客户端，创建一个特殊标记文件
RUN if [ "$USE_LOCAL_CLIENT" = "1" ]; then \
        rm -rf ./client/dist/* && \
        echo "Using local client build" > ./client/dist/.use-local-client; \
    fi

# 创建必要的目录并设置权限
RUN mkdir -p server/data server/logs server/uploads && \
    chown -R nodejs:nodejs /app

# 默认使用生产环境配置
ENV NODE_ENV=production

# 切换到非 root 用户
USER nodejs

# 暴露端口
EXPOSE 3000

# 健康检查
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD node server/src/utils/health-check.js || exit 1

# 使用 dumb-init 进行正确的信号处理
ENTRYPOINT ["dumb-init", "--"]

# 启动应用
CMD ["node", "server/src/server.js"]