/**
 * WebSocket服务
 */
import { WebSocketServer } from 'ws';
import { v4 as uuidv4 } from 'uuid';
import { SnakeMultiplayerService } from './snake-multiplayer.service.js';

export class WebSocketService {
  constructor() {
    this.clients = new Map();
    this.wss = null;
  }

  init(server) {
    this.wss = new WebSocketServer({
      server,
      path: '/ws',
    });

    this.wss.on('connection', (ws, req) => {
      const sessionId = req.headers['x-session-id'] || uuidv4();

      this.clients.set(sessionId, ws);
      console.log(`WebSocket client connected: ${sessionId}`);

      ws.send(
        JSON.stringify({
          type: 'connected',
          sessionId,
        })
      );

      ws.on('message', data => {
        try {
          const message = JSON.parse(data.toString());
          this.handleMessage(sessionId, message);
        } catch (error) {
          console.error('WebSocket message parse error:', error);
        }
      });

      ws.on('close', () => {
        this.clients.delete(sessionId);
        console.log(`WebSocket client disconnected: ${sessionId}`);
      });

      ws.on('error', error => {
        console.error(`WebSocket error for ${sessionId}:`, error);
        this.clients.delete(sessionId);
      });
    });

    return this.wss;
  }

  handleMessage(sessionId, message) {
    switch (message.type) {
      case 'ping':
        this.sendToClient(sessionId, { type: 'pong' });
        break;
      case 'join':
        console.log(`Client ${sessionId} joined message board`);
        break;
    }
  }

  sendToClient(sessionId, data) {
    const client = this.clients.get(sessionId);
    if (client && client.readyState === client.OPEN) {
      client.send(JSON.stringify(data));
      return true;
    }
    return false;
  }

  broadcast(type, data) {
    const message = JSON.stringify({ type, data });

    this.clients.forEach((client, sessionId) => {
      if (client.readyState === client.OPEN) {
        client.send(message);
      } else {
        this.clients.delete(sessionId);
      }
    });
  }

  getOnlineCount() {
    return this.clients.size;
  }
}
