import http from 'http';
import app from './app.js';
import { WebSocketService } from './services/websocket.service.js';
import logger from './utils/logger.js';
import { appEnv } from './config/env.js';
import { getAppAuthConfigStatus } from './utils/app-auth.js';
import { getDb } from './utils/dbPool.js';

const bootstrapLogger = logger.child('ServerBootstrap');

// 优雅关闭：先停止接收新连接，再关闭 WebSocket 与数据库，超时则强制退出
let shuttingDown = false;
const SHUTDOWN_TIMEOUT_MS = 10_000;

async function shutdown(signal, server, wsService) {
  if (shuttingDown) return;
  shuttingDown = true;

  bootstrapLogger.info('Received signal, shutting down gracefully', {
    signal,
  });

  const forceExitTimer = setTimeout(() => {
    bootstrapLogger.error('Graceful shutdown timed out, forcing exit');
    process.exit(1);
  }, SHUTDOWN_TIMEOUT_MS);
  forceExitTimer.unref?.();

  // 1. 停止接受新 HTTP 请求
  await new Promise(resolve => {
    if (!server) return resolve();
    server.close(err => {
      if (err) {
        bootstrapLogger.warn('HTTP server close error', { error: err.message });
      }
      resolve();
    });
  });

  // 2. 停止心跳定时器（连接本身由 server.close 间接关闭）
  try {
    wsService?.stopHeartbeat?.();
  } catch (err) {
    bootstrapLogger.warn('WebSocket heartbeat stop error', {
      error: err.message,
    });
  }

  // 3. 关闭数据库连接
  try {
    const db = getDb();
    db?.close?.();
  } catch {
    // db 未初始化时忽略
  }

  clearTimeout(forceExitTimer);
  bootstrapLogger.info('Graceful shutdown complete');
  process.exit(0);
}

process.on('uncaughtException', err => {
  bootstrapLogger.error('Uncaught exception', err);
  process.exit(1);
});

process.on('unhandledRejection', reason => {
  // 与 uncaughtException 保持一致：避免进程处于未定义状态
  bootstrapLogger.error(
    'Unhandled rejection',
    reason instanceof Error ? reason : { reason }
  );
  process.exit(1);
});

// 端口优先级：PORT（通用） > BACKEND_PORT（专用） > 默认 3000
const PORT = appEnv.port ?? 3000;
const { issue: authConfigIssue } = getAppAuthConfigStatus();

if (authConfigIssue) {
  bootstrapLogger.error(
    'Server startup blocked by invalid auth configuration',
    {
      issue: authConfigIssue,
      environment: appEnv.nodeEnv,
    }
  );
  process.exit(1);
}

// 创建HTTP服务器
const server = http.createServer(app);

// 初始化WebSocket服务
const wsService = new WebSocketService();
wsService.init(server);

// 将WebSocket服务实例存储到app中，供控制器使用
app.set('wsServer', wsService);

server.on('error', err => {
  bootstrapLogger.error('HTTP server error', err);
  process.exit(1);
});

server.listen(PORT, '0.0.0.0', () => {
  bootstrapLogger.info('HTTP server started', {
    httpUrl: `http://localhost:${PORT}`,
    wsUrl: `ws://localhost:${PORT}/ws`,
    uploadDir: 'uploads/wallpapers/',
    environment: appEnv.nodeEnv,
  });
});

// 优雅关闭信号处理
process.on('SIGTERM', () => shutdown('SIGTERM', server, wsService));
process.on('SIGINT', () => shutdown('SIGINT', server, wsService));
