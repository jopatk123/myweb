import { WebSocketServer } from 'ws';
import { v4 as uuidv4 } from 'uuid';
import { ConnectionStore } from './websocket/connection-store.js';
import logger from '../utils/logger.js';

const wsLogger = logger.child('WebSocketService');

export class WebSocketService {
  constructor() {
    this.wss = null;
    this.connections = new ConnectionStore();
    this.handlers = [];
  }

  init(server) {
    this.wss = new WebSocketServer({
      server,
      path: '/ws',
    });

    this.wss.on('connection', (socket, req) =>
      this.handleConnection(socket, req)
    );

    return this.wss;
  }

  handleConnection(socket, req) {
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

    socket.on('message', raw => {
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
