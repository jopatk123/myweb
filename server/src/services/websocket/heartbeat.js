import logger from '../../utils/logger.js';

const heartbeatLogger = logger.child('WebSocketHeartbeat');

/**
 * 周期性向所有连接发送 ping，若客户端在下一个心跳周期前未回 pong 则强制断开。
 */
export class HeartbeatMonitor {
  constructor({ connections, intervalMs }) {
    this.connections = connections;
    this.intervalMs = intervalMs;
    this._timer = null;
  }

  start() {
    if (this._timer) return;
    this._timer = setInterval(() => this._tick(), this.intervalMs);
    if (this._timer.unref) this._timer.unref();
  }

  stop() {
    if (this._timer) {
      clearInterval(this._timer);
      this._timer = null;
    }
  }

  /** 收到 pong 后调用，清除等待标记。 */
  acknowledge(socket) {
    if (socket) socket._waitingForPong = false;
  }

  _tick() {
    this.connections.clients.forEach((socket, serverSessionId) => {
      if (socket._waitingForPong) {
        heartbeatLogger.warn('WebSocket heartbeat timeout, terminating', {
          serverSessionId,
        });
        socket.terminate();
        this.connections.unregister(serverSessionId);
        return;
      }
      socket._waitingForPong = true;
      try {
        socket.ping();
      } catch {
        // socket 已断开，忽略
      }
    });
  }
}
