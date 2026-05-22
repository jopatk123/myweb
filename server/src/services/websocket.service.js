import { WebSocketServer } from 'ws';
import { v4 as uuidv4 } from 'uuid';
import { ConnectionStore } from './websocket/connection-store.js';
import { authenticateUpgrade } from './websocket/auth.js';
import { MessageRateLimiter } from './websocket/rate-limiter.js';
import { HeartbeatMonitor } from './websocket/heartbeat.js';
import logger from '../utils/logger.js';

const wsLogger = logger.child('WebSocketService');

/** 最大并发连接数（防止内存耗尽 DoS） */
const MAX_CONNECTIONS = Number(process.env.WS_MAX_CONNECTIONS) || 200;

/** 消息频率限制：每个连接每秒最多处理的消息数 */
const MSG_RATE_LIMIT = Number(process.env.WS_MSG_RATE_LIMIT) || 30;

/** 心跳间隔（ms）：服务器主动发送 ping，客户端须在此时间内回 pong */
const HEARTBEAT_INTERVAL_MS =
  Number(process.env.WS_HEARTBEAT_INTERVAL) || 30_000;

export class WebSocketService {
  constructor() {
    this.wss = null;
    this.connections = new ConnectionStore();
    this.handlers = [];
    this.rateLimiter = new MessageRateLimiter(MSG_RATE_LIMIT);
    this.heartbeat = new HeartbeatMonitor({
      connections: this.connections,
      intervalMs: HEARTBEAT_INTERVAL_MS,
    });
  }

  init(server) {
    this.wss = new WebSocketServer({
      server,
      path: '/ws',
    });

    this.wss.on('connection', (socket, req) =>
      this.handleConnection(socket, req)
    );

    this.heartbeat.start();
    return this.wss;
  }

  /** 测试或关闭时停止心跳定时器。 */
  stopHeartbeat() {
    this.heartbeat.stop();
  }

  handleConnection(socket, req) {
    if (!authenticateUpgrade(socket, req)) return;

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
    const clientSessionIdFromUrl = this._extractClientSessionId(req);

    this.connections.register(serverSessionId, socket);

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

    socket.on('pong', () => this.heartbeat.acknowledge(socket));

    socket.on('message', raw => {
      if (this.rateLimiter.isLimited(serverSessionId)) {
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
      this.rateLimiter.forget(serverSessionId);
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
      this.rateLimiter.forget(serverSessionId);
      this.handleDisconnect(serverSessionId).catch(err => {
        wsLogger.error('WebSocket disconnect handling failed', {
          serverSessionId,
          error: err,
        });
      });
    });
  }

  _extractClientSessionId(req) {
    try {
      const url = new URL(req.url, 'http://localhost');
      const candidate = (url.searchParams.get('sessionId') || '').trim();
      if (candidate && candidate.length <= 200) {
        return candidate;
      }
    } catch {
      // URL 解析失败时忽略
    }
    return '';
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
    if (socket) socket._clientSessionId = providedSessionId;

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

  broadcastToRoom(_roomId, _eventType, _data) {
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
