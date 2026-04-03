import { WebSocketServer } from 'ws';
import { v4 as uuidv4 } from 'uuid';
import { ConnectionStore } from './websocket/connection-store.js';
import logger from '../utils/logger.js';

const wsLogger = logger.child('WebSocketService');

/** 最大并发连接数（防止内存耗尽 DoS） */
const MAX_CONNECTIONS = Number(process.env.WS_MAX_CONNECTIONS) || 200;

/** 消息频率限制：每个连接每秒最多处理的消息数 */
const MSG_RATE_LIMIT = Number(process.env.WS_MSG_RATE_LIMIT) || 30;

/** 心跳间隔（ms）：服务器主动发送 ping，客户端须在此时间内回 pong */
const HEARTBEAT_INTERVAL_MS =
  Number(process.env.WS_HEARTBEAT_INTERVAL) || 30_000;

/** 心跳超时（ms）：超过此时间未收到 pong，强制断开 */
const HEARTBEAT_TIMEOUT_MS = Number(process.env.WS_HEARTBEAT_TIMEOUT) || 10_000;

export class WebSocketService {
  constructor() {
    this.wss = null;
    this.connections = new ConnectionStore();
    this.handlers = [];
    /** 消息计数器 Map：serverSessionId -> { count, resetAt } */
    this._rateLimitMap = new Map();
    /** 心跳定时器 */
    this._heartbeatTimer = null;
  }

  init(server) {
    this.wss = new WebSocketServer({
      server,
      path: '/ws',
    });

    this.wss.on('connection', (socket, req) =>
      this.handleConnection(socket, req)
    );

    // 启动服务端心跳检测
    this._startHeartbeat();

    return this.wss;
  }

  /**
   * 服务端心跳：周期性向所有连接发 ping，若客户端未在超时时间内回 pong 则强制断开
   */
  _startHeartbeat() {
    this._heartbeatTimer = setInterval(() => {
      this.connections.clients.forEach((socket, serverSessionId) => {
        if (socket._waitingForPong) {
          // 上次 ping 未收到 pong，视为僵尸连接，强制断开
          wsLogger.warn('WebSocket heartbeat timeout, terminating', {
            serverSessionId,
          });
          socket.terminate();
          this.connections.unregister(serverSessionId);
          return;
        }
        // 标记等待 pong
        socket._waitingForPong = true;
        try {
          socket.ping();
        } catch {
          // socket 已断开，忽略
        }
      });
    }, HEARTBEAT_INTERVAL_MS);

    // 避免心跳定时器阻止进程退出
    if (this._heartbeatTimer.unref) {
      this._heartbeatTimer.unref();
    }
  }

  /**
   * 停止心跳定时器（测试或关闭时调用）
   */
  stopHeartbeat() {
    if (this._heartbeatTimer) {
      clearInterval(this._heartbeatTimer);
      this._heartbeatTimer = null;
    }
  }

  /**
   * 检查消息频率是否超限
   * @param {string} serverSessionId
   * @returns {boolean} true 表示超限
   */
  _isRateLimited(serverSessionId) {
    const now = Date.now();
    let state = this._rateLimitMap.get(serverSessionId);
    if (!state || now >= state.resetAt) {
      state = { count: 0, resetAt: now + 1000 };
      this._rateLimitMap.set(serverSessionId, state);
    }
    state.count += 1;
    return state.count > MSG_RATE_LIMIT;
  }

  handleConnection(socket, req) {
    // 超出最大连接数，立即拒绝
    if (this.connections.size >= MAX_CONNECTIONS) {
      wsLogger.warn('WebSocket max connections reached, rejecting new client', {
        current: this.connections.size,
        max: MAX_CONNECTIONS,
      });
      try {
        socket.close(1013, 'Server overloaded');
      } catch {
        // ignore
      }
      return;
    }

    const serverSessionId = uuidv4();

    // 从 URL 查询参数中提取客户端 sessionId（客户端连接时附加: /ws?sessionId=xxx）
    let clientSessionIdFromUrl = '';
    try {
      const url = new URL(req.url, 'http://localhost');
      const candidate = (url.searchParams.get('sessionId') || '').trim();
      // 仅接受合理长度的 sessionId（防止超长输入）
      if (candidate && candidate.length <= 200) {
        clientSessionIdFromUrl = candidate;
      }
    } catch {
      // URL 解析失败时忽略，仍允许连接
    }

    this.connections.register(serverSessionId, socket);

    // 若 URL 中已带有 sessionId，立即完成关联，无需等待 join 消息
    if (clientSessionIdFromUrl) {
      this.connections.associate(serverSessionId, clientSessionIdFromUrl);
      const s = this.connections.getSocket(serverSessionId);
      if (s) s._clientSessionId = clientSessionIdFromUrl;
      wsLogger.info('Client pre-associated from URL param', {
        serverSessionId,
        clientSessionId: clientSessionIdFromUrl,
      });
    }

    socket.send(
      JSON.stringify({
        type: 'connected',
        sessionId: serverSessionId,
      })
    );

    // 处理心跳 pong 回包
    socket.on('pong', () => {
      socket._waitingForPong = false;
    });

    socket.on('message', raw => {
      // 消息频率限制
      if (this._isRateLimited(serverSessionId)) {
        wsLogger.warn('WebSocket message rate limit exceeded', {
          serverSessionId,
        });
        return;
      }

      let message;
      try {
        message = JSON.parse(raw.toString());
      } catch (error) {
        wsLogger.warn('WebSocket message parse error', {
          serverSessionId,
          error,
        });
        return;
      }

      this.handleMessage(serverSessionId, message).catch(err => {
        wsLogger.error('WebSocket message handling failed', {
          serverSessionId,
          messageType: message?.type,
          error: err,
        });
      });
    });

    socket.on('close', () => {
      this._rateLimitMap.delete(serverSessionId);
      this.handleDisconnect(serverSessionId).catch(err => {
        wsLogger.error('WebSocket disconnect handling failed', {
          serverSessionId,
          error: err,
        });
      });
      wsLogger.info('WebSocket client disconnected', { serverSessionId });
    });

    socket.on('error', error => {
      wsLogger.error('WebSocket socket error', {
        serverSessionId,
        error,
      });
      this._rateLimitMap.delete(serverSessionId);
      this.handleDisconnect(serverSessionId).catch(err => {
        wsLogger.error('WebSocket disconnect handling failed', {
          serverSessionId,
          error: err,
        });
      });
    });
  }

  async handleMessage(serverSessionId, message) {
    if (!message || typeof message.type !== 'string') return;

    const clientSessionId =
      this.connections.getClientSessionId(serverSessionId) || serverSessionId;

    if (message.type === 'ping') {
      this.sendToClient(serverSessionId, { type: 'pong' });
      return;
    }

    if (message.type === 'join') {
      this.handleJoin(serverSessionId, message.sessionId);
      return;
    }

    const handler = this.handlers.find(h => h.canHandle(message.type));
    if (handler) {
      await handler.handle(clientSessionId, message);
    }
  }

  handleJoin(serverSessionId, providedSessionId) {
    if (!providedSessionId) return;

    this.connections.associate(serverSessionId, providedSessionId);

    const socket = this.connections.getSocket(serverSessionId);
    if (socket) {
      socket._clientSessionId = providedSessionId;
    }

    wsLogger.info('Client joined websocket session', {
      serverSessionId,
      clientSessionId: providedSessionId,
    });
  }

  async handleDisconnect(serverSessionId) {
    const clientSessionId =
      this.connections.getClientSessionId(serverSessionId) || serverSessionId;

    const tasks = this.handlers
      .filter(handler => typeof handler.handleDisconnect === 'function')
      .map(handler => handler.handleDisconnect(clientSessionId));

    await Promise.allSettled(tasks);

    this.connections.unregister(serverSessionId);
  }

  sendToClient(sessionId, data) {
    return this.connections.send(sessionId, data);
  }

  broadcast(type, data) {
    if (typeof type === 'object' && data === undefined) {
      this.connections.broadcast(type);
      return;
    }

    this.connections.broadcast({ type, data });
  }

  broadcastToRoom(roomId, eventType, data) {
    return undefined;
  }

  getOnlineCount() {
    return this.connections.size;
  }

  get serverToClient() {
    return this.connections.serverToClient;
  }

  get clientToServer() {
    return this.connections.clientToServer;
  }
}
