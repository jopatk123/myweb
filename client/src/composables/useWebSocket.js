/**
 * WebSocket组合式函数
 */
import { ref, onMounted, onUnmounted } from 'vue';

// --- 单例状态（模块级） ---
let _wsRef;          // WebSocket 实例 ref
let _isConnected;    // 连接状态 ref
let _reconnectAttempts;
let _reconnectTimerRef;
let _messageHandlers; // Map
let _initialized = false;
let _maxReconnectAttempts = 5;
let _messageQueue = []; // 在未连接时暂存要发送的消息

function initSingleton() {
  if (_initialized) return;
  _wsRef = ref(null);
  _isConnected = ref(false);
  _reconnectAttempts = ref(0);
  _reconnectTimerRef = ref(null);
  _messageHandlers = new Map();
  _initialized = true;
}

export function useWebSocket() {
  initSingleton();
  const ws = _wsRef;
  const isConnected = _isConnected;
  const reconnectAttempts = _reconnectAttempts;
  const reconnectInterval = _reconnectTimerRef;
  const messageHandlers = _messageHandlers;

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
  const flushQueue = () => {
    if (!ws.value || ws.value.readyState !== WebSocket.OPEN) return;
    while (_messageQueue.length) {
      const msg = _messageQueue.shift();
      try { ws.value.send(JSON.stringify(msg)); } catch(e) { console.warn('Queued msg send failed', e); }
    }
  };

  const connect = () => {
    try {
      const sessionId = localStorage.getItem('sessionId');
      const wsUrl = getWebSocketUrl();
      if (ws.value && ws.value.readyState === WebSocket.OPEN) return; // 已连接
      ws.value = new WebSocket(wsUrl);

      // 设置会话ID头部（如果支持）
      if (sessionId) {
        ws.value.sessionId = sessionId;
      }

      ws.value.onopen = () => {
        isConnected.value = true;
        reconnectAttempts.value = 0;
        send({ type: 'join', sessionId });
        flushQueue();
      };

    ws.value.onmessage = event => {
        try {
          const data = JSON.parse(event.data);
      // 原始日志（可注释）
      // console.debug('[WS][raw]', data);
          handleMessage(data);
        } catch (error) {
          console.error('WebSocket message parse error:', error);
        }
      };

      ws.value.onclose = () => {
        isConnected.value = false;
        if (reconnectAttempts.value < maxReconnectAttempts) {
          reconnectAttempts.value++;
          reconnectInterval.value = setTimeout(() => { connect(); }, 3000 * reconnectAttempts.value);
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
  const send = (message) => {
    if (ws.value && ws.value.readyState === WebSocket.OPEN) {
      ws.value.send(JSON.stringify(message));
      return true;
    }
    // 未连接时加入队列
    _messageQueue.push(message);
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
  onMounted(() => { connect(); });

  // 组件卸载时断开连接
  // 不在卸载时主动断开，让单例长存，除非显式调用 disconnect()
  onUnmounted(() => {});

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
