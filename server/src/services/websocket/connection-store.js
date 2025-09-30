import { WebSocket } from 'ws';

/**
 * 管理 WebSocket 连接、会话映射与消息发送
 */
export class ConnectionStore {
  constructor() {
    this.clients = new Map();
    this.serverToClient = new Map();
    this.clientToServer = new Map();
  }

  register(serverSessionId, socket) {
    if (!serverSessionId || !socket) return;
    this.clients.set(serverSessionId, socket);
    socket._serverSessionId = serverSessionId;
  }

  unregister(serverSessionId) {
    if (!serverSessionId) return;

    const clientSessionId = this.serverToClient.get(serverSessionId);
    if (clientSessionId) {
      this.clientToServer.delete(clientSessionId);
    }

    this.serverToClient.delete(serverSessionId);
    const socket = this.clients.get(serverSessionId);
    if (socket) {
      try {
        socket.terminate?.();
      } catch (error) {
        void error;
      }
    }
    this.clients.delete(serverSessionId);
  }

  associate(serverSessionId, clientSessionId) {
    if (!serverSessionId || !clientSessionId) return;
    this.serverToClient.set(serverSessionId, clientSessionId);
    this.clientToServer.set(clientSessionId, serverSessionId);
  }

  getSocket(serverSessionId) {
    return this.clients.get(serverSessionId) || null;
  }

  getClientSessionId(serverSessionId) {
    return this.serverToClient.get(serverSessionId) || null;
  }

  getServerSessionId(clientSessionId) {
    return this.clientToServer.get(clientSessionId) || null;
  }

  send(sessionId, payload) {
    const serverId = this.getServerSessionId(sessionId) || sessionId;
    const socket = this.clients.get(serverId);
    if (!socket || socket.readyState !== WebSocket.OPEN) {
      this.unregister(serverId);
      return false;
    }

    const message =
      typeof payload === 'string' ? payload : JSON.stringify(payload);

    try {
      socket.send(message);
      return true;
    } catch (error) {
      console.warn('[ConnectionStore] send failed', error);
      this.unregister(serverId);
      return false;
    }
  }

  broadcast(payload, predicate) {
    const message =
      typeof payload === 'string' ? payload : JSON.stringify(payload);

    this.clients.forEach((socket, serverId) => {
      if (!socket || socket.readyState !== WebSocket.OPEN) {
        this.unregister(serverId);
        return;
      }

      const clientId = this.serverToClient.get(serverId) || null;
      if (typeof predicate === 'function' && !predicate(serverId, clientId)) {
        return;
      }

      try {
        socket.send(message);
      } catch (error) {
        console.warn('[ConnectionStore] broadcast failed', error);
        this.unregister(serverId);
      }
    });
  }

  get size() {
    return this.clients.size;
  }
}
