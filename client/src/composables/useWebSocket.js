/**
 * WebSocket组合式函数
 */
import { ref, onMounted, onUnmounted } from 'vue';

export function useWebSocket() {
  const ws = ref(null);
  const isConnected = ref(false);
  const reconnectAttempts = ref(0);
  const maxReconnectAttempts = 5;
  const reconnectInterval = ref(null);

  const messageHandlers = new Map();

  // 获取WebSocket URL
  const getWebSocketUrl = () => {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';

    // 处理 VITE_API_BASE 的情况
    let host;
    if (import.meta.env.VITE_API_BASE) {
      const apiBase = import.meta.env.VITE_API_BASE;
      // 如果是相对路径（以 / 开头），使用当前域名
      if (apiBase.startsWith('/')) {
        host = window.location.host;
      } else {
        // 如果是完整URL，提取host
        try {
          host = new URL(apiBase).host;
        } catch (error) {
          console.warn('Invalid VITE_API_BASE URL:', apiBase);
          host = window.location.host;
        }
      }
    } else {
      // 开发环境端口映射
      host = window.location.host.replace(':3000', ':3302');
    }

    return `${protocol}//${host}/ws`;
  };

  // 连接WebSocket
  const connect = () => {
    try {
      const sessionId = localStorage.getItem('sessionId');
      const wsUrl = getWebSocketUrl();

      ws.value = new WebSocket(wsUrl);

      // 设置会话ID头部（如果支持）
      if (sessionId) {
        ws.value.sessionId = sessionId;
      }

      ws.value.onopen = () => {
        console.log('WebSocket connected');
        isConnected.value = true;
        reconnectAttempts.value = 0;

        // 发送加入消息
        send('join', { sessionId });
      };

      ws.value.onmessage = event => {
        try {
          const data = JSON.parse(event.data);
          handleMessage(data);
        } catch (error) {
          console.error('WebSocket message parse error:', error);
        }
      };

      ws.value.onclose = () => {
        console.log('WebSocket disconnected');
        isConnected.value = false;

        // 自动重连
        if (reconnectAttempts.value < maxReconnectAttempts) {
          reconnectAttempts.value++;
          console.log(
            `Attempting to reconnect... (${reconnectAttempts.value}/${maxReconnectAttempts})`
          );

          reconnectInterval.value = setTimeout(() => {
            connect();
          }, 3000 * reconnectAttempts.value); // 递增延迟
        }
      };

      ws.value.onerror = error => {
        console.error('WebSocket error:', error);
      };
    } catch (error) {
      console.error('WebSocket connection error:', error);
    }
  };

  // 处理接收到的消息
  const handleMessage = data => {
    const { type } = data;

    if (messageHandlers.has(type)) {
      const handler = messageHandlers.get(type);
      handler(data.data || data);
    }
  };

  // 发送消息
  const send = (type, data = {}) => {
    if (ws.value && ws.value.readyState === WebSocket.OPEN) {
      ws.value.send(JSON.stringify({ type, ...data }));
      return true;
    }
    return false;
  };

  // 注册消息处理器
  const onMessage = (type, handler) => {
    messageHandlers.set(type, handler);
  };

  // 移除消息处理器
  const offMessage = type => {
    messageHandlers.delete(type);
  };

  // 断开连接
  const disconnect = () => {
    if (reconnectInterval.value) {
      clearTimeout(reconnectInterval.value);
      reconnectInterval.value = null;
    }

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

  // 组件卸载时断开连接
  onUnmounted(() => {
    disconnect();
  });

  return {
    isConnected,
    connect,
    disconnect,
    send,
    onMessage,
    offMessage,
  };
}
