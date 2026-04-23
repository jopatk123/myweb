/**
 * WebSocket组合式函数
 */
import { onMounted, onScopeDispose } from 'vue';
import { getServerOrigin } from '@/api/httpClient.js';
import { ensureSessionId } from '@/store/sessionState.js';
import { webSocketState } from '@/store/webSocketState.js';

const { ws, isConnected, reconnectAttempts, reconnectTimer, messageHandlers } =
  webSocketState;

export function useWebSocket() {
  webSocketState.consumerCount += 1;

  // 获取WebSocket URL
  const getWebSocketUrl = () => {
    const origin = getServerOrigin();
    try {
      const parsed = origin ? new URL(origin) : new URL(window.location.origin);
      const wsProtocol = parsed.protocol === 'https:' ? 'wss:' : 'ws:';
      return `${wsProtocol}//${parsed.host}/ws`;
    } catch (error) {
      void error;
      const fallbackProtocol =
        typeof window !== 'undefined' && window.location.protocol === 'https:'
          ? 'wss:'
          : 'ws:';
      const fallbackHost =
        typeof window !== 'undefined' ? window.location.host : 'localhost:3000';
      return `${fallbackProtocol}//${fallbackHost}/ws`;
    }
  };

  // 连接WebSocket
  const flushQueue = () => {
    if (!ws.value || ws.value.readyState !== WebSocket.OPEN) return;
    while (webSocketState.messageQueue.length) {
      const msg = webSocketState.messageQueue.shift();
      try {
        ws.value.send(JSON.stringify(msg));
      } catch (e) {
        console.warn('[WebSocket] 发送队列消息失败', e);
      }
    }
  };

  const connect = async () => {
    const sessionId = ensureSessionId();

    const baseUrl = getWebSocketUrl();
    // 将 sessionId 作为查询参数传入，服务端可在升级阶段验证身份
    const wsUrl = `${baseUrl}?sessionId=${encodeURIComponent(sessionId)}`;

    if (ws.value && ws.value.readyState === WebSocket.OPEN) {
      return ws.value;
    }

    if (
      ws.value &&
      ws.value.readyState === WebSocket.CONNECTING &&
      webSocketState.connectPromise
    ) {
      return webSocketState.connectPromise;
    }

    webSocketState.manualDisconnect = false;
    webSocketState.connectPromise = new Promise((resolve, reject) => {
      try {
        const socket = new WebSocket(wsUrl);
        ws.value = socket;

        socket.onopen = () => {
          if (ws.value !== socket) return;
          isConnected.value = true;
          reconnectAttempts.value = 0;
          send({ type: 'join', sessionId });
          flushQueue();
          webSocketState.connectPromise = null;
          resolve(socket);
        };

        socket.onmessage = event => {
          if (ws.value !== socket) return;
          try {
            const data = JSON.parse(event.data);
            handleMessage(data);
          } catch (_error) {
            console.warn('[WebSocket] 收到无效消息帧，已忽略', _error);
          }
        };

        socket.onclose = () => {
          if (ws.value !== socket) return;
          isConnected.value = false;
          if (webSocketState.manualDisconnect) {
            webSocketState.manualDisconnect = false;
            webSocketState.connectPromise = null;
            return;
          }
          if (reconnectAttempts.value < webSocketState.maxReconnectAttempts) {
            reconnectAttempts.value++;
            reconnectTimer.value = setTimeout(() => {
              connect();
            }, 3000 * reconnectAttempts.value);
          }
        };

        socket.onerror = error => {
          if (ws.value !== socket) return;
          void error;
          webSocketState.connectPromise = null;
          reject(error);
        };
      } catch (error) {
        void error;
        webSocketState.connectPromise = null;
        reject(error);
      }
    });

    return webSocketState.connectPromise;
  };

  // 处理接收到的消息
  const handleMessage = data => {
    const { type } = data;

    if (!messageHandlers.has(type)) return;
    const handlers = messageHandlers.get(type);
    if (!handlers) return;
    const payload = data.data || data;
    // 调用所有注册的处理器
    handlers.forEach(h => {
      try {
        h(payload);
      } catch (e) {
        console.warn('[WebSocket] 消息处理器异常', e);
      }
    });
  };

  // 发送消息
  const send = message => {
    if (ws.value && ws.value.readyState === WebSocket.OPEN) {
      ws.value.send(JSON.stringify(message));
      return true;
    }
    // 未连接时加入队列
    webSocketState.messageQueue.push(message);
    return false;
  };

  // 注册消息处理器（支持多订阅者）
  const onMessage = (type, handler) => {
    if (!messageHandlers.has(type)) {
      messageHandlers.set(type, new Set());
    }
    messageHandlers.get(type).add(handler);
  };

  // 移除消息处理器：如果提供 handler，则移除该 handler；否则移除该 type 的所有处理器
  const offMessage = (type, handler) => {
    if (!messageHandlers.has(type)) return;
    if (handler) {
      messageHandlers.get(type).delete(handler);
      if (messageHandlers.get(type).size === 0) messageHandlers.delete(type);
    } else {
      messageHandlers.delete(type);
    }
  };

  // 断开连接
  const disconnect = () => {
    webSocketState.manualDisconnect = true;

    if (reconnectTimer.value) {
      clearTimeout(reconnectTimer.value);
      reconnectTimer.value = null;
    }

    webSocketState.connectPromise = null;

    if (ws.value) {
      ws.value.close();
      ws.value = null;
    }

    isConnected.value = false;
    reconnectAttempts.value = 0;
  };

  // 组件挂载时连接
  onMounted(() => {
    connect();
  });

  // 组件卸载时不主动断开（保持单例），如需断开请显式调用 disconnect()

  onScopeDispose(() => {
    webSocketState.consumerCount = Math.max(
      0,
      webSocketState.consumerCount - 1
    );
    if (webSocketState.consumerCount === 0) {
      disconnect();
    }
  });

  return {
    ws,
    isConnected,
    connect,
    disconnect,
    send,
    onMessage,
    offMessage,
  };
}

export { resetWebSocketState } from '@/store/webSocketState.js';
