import { WebSocketServer } from 'ws';
import { v4 as uuidv4 } from 'uuid';
import { ConnectionStore } from './websocket/connection-store.js';
import { SnakeMessageHandler } from './websocket/handlers/snake-handler.js';
import { GomokuMessageHandler } from './websocket/handlers/gomoku-handler.js';
import logger from '../utils/logger.js';

const wsLogger = logger.child('WebSocketService');

export class WebSocketService {
  constructor() {
    this.wss = null;
    this.connections = new ConnectionStore();
    this.snakeHandler = new SnakeMessageHandler(this);
    this.gomokuHandler = new GomokuMessageHandler(this);
    this.handlers = [this.snakeHandler, this.gomokuHandler];
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
    const serverSessionId = req.headers['x-session-id'] || uuidv4();

    this.connections.register(serverSessionId, socket);

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
    if (typeof this.snakeHandler.broadcastToRoom === 'function') {
      return this.snakeHandler.broadcastToRoom(roomId, eventType, data);
    }
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
