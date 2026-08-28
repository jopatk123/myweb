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

# 复制客户端的 package 文件与根 lockfile（lockfile 已入库，保证确定性安装）
COPY package*.json ./
COPY client/package*.json ./client/

# 仅安装 client workspace 依赖（workspace 模式下依赖装到根目录）；
# USE_LOCAL_CLIENT=1 时跳过安装，直接透传本地已构建产物
RUN if [ "$USE_LOCAL_CLIENT" = "0" ]; then \
    npm ci --workspace=client --silent; \
    else \
    echo "Skipping client deps install, using local build..."; \
    fi

# 复制共享代码和客户端源代码（@shared alias 依赖）
COPY shared/ ./shared/
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

# 安装构建原生模块所需的工具（better-sqlite3 等依赖）仅在构建阶段
RUN apk add --no-cache python3 make g++ pkgconf

# 只有不跳过服务端安装时才安装依赖
# （workspace 模式下依赖装到 /app/node_modules，skip 分支需创建同路径空目录供 runtime COPY）
RUN if [ "$SKIP_SERVER_NPM_INSTALL" = "0" ]; then \
    echo "Installing server dependencies in container..."; \
    else \
    echo "Skipping server npm install..."; \
    mkdir -p /app/node_modules; \
    exit 0; \
    fi

# 复制所有 package 文件（支持工作区）
COPY package*.json ./
COPY server/package*.json ./server/
COPY client/package*.json ./client/

# 在构建环境中禁用 husky 的 prepare 钩子，避免在无 git 或未安装 husky 时失败
ENV HUSKY=0
ENV SKIP_HUSKY=1

# 在构建环境中安装 server 依赖（lockfile 已入库，使用 npm ci 确保与 package.json 严格一致）
RUN if [ "$SKIP_SERVER_NPM_INSTALL" = "0" ]; then \
    npm ci --workspace=server --omit=dev; \
    fi

# =================== 运行时阶段 ===================
FROM node:20-alpine AS runtime

# 安装运行期依赖：dumb-init 用于信号处理；ffmpeg 供音频转码/压缩功能使用；
# tzdata 供 TZ 环境变量解析时区名（下班计时器依赖服务器本地日期聚合统计）
RUN apk add --no-cache dumb-init ffmpeg tzdata

# 创建应用用户以提高安全性
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

# 设置工作目录
WORKDIR /app

# 复制根目录的 package.json 用于工作区配置
COPY package*.json ./

# 复制服务端应用
COPY server/ ./server/

# 复制运行时需要的共享模块（后端 seeding 会直接导入）
COPY shared/ ./shared/

# 获取构建参数
ARG SKIP_SERVER_NPM_INSTALL=0

# 复制依赖（工作区模式下依赖在根目录）
# 在 server-deps 阶段我们安装了依赖到 /app/node_modules
COPY --from=server-deps /app/node_modules ./node_modules

# 创建客户端目录并复制构建文件（USE_LOCAL_CLIENT=1 时，client-builder 阶段
# 直接透传本地已构建的 client/dist；=0 时透传容器内构建产物，两者路径一致）
RUN mkdir -p ./client/dist
COPY --from=client-builder /app/client/dist ./client/dist

# 创建必要的目录并设置权限
RUN mkdir -p server/data server/logs server/uploads && \
    chown -R nodejs:nodejs /app

# 默认使用生产环境配置
ENV NODE_ENV=production

# 切换到非 root 用户
USER nodejs

# 暴露端口
EXPOSE 3000

# 健康检查（timeout 需大于 health-check.js 内部的 5s 请求超时）
HEALTHCHECK --interval=30s --timeout=8s --start-period=5s --retries=3 \
    CMD node server/src/utils/health-check.js || exit 1

# 使用 dumb-init 进行正确的信号处理
ENTRYPOINT ["dumb-init", "--"]

# 启动应用
CMD ["node", "server/src/server.js"]