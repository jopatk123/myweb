/**
 * WebSocket组合式函数
 */
import { ref, onMounted } from 'vue';

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
  // map of type -> Set of handlers
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
          void error;
          console.warn('Invalid VITE_API_BASE URL:', apiBase);
          host = window.location.host;
        }
      }
    } else {
      // 如果没有 VITE_API_BASE，尝试从环境变量或当前 host 推导后端 host:port
      const backendPort = import.meta.env.VITE_BACKEND_PORT || import.meta.env.VITE_PORT || import.meta.env.VITE_BE_PORT;
      if (backendPort) {
        host = window.location.host.replace(/:\d+$/, `:${backendPort}`);
      } else {
        // 默认假设后端与前端相同主机但端口为 3000（常见开发配置），保持相对路径
        host = window.location.host;
      }
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
    return new Promise((resolve, reject) => {
      try {
        let sessionId = localStorage.getItem('sessionId');
        
        // 如果没有sessionId，生成一个
        if (!sessionId) {
          sessionId = 'session_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
          localStorage.setItem('sessionId', sessionId);
          console.debug('[WebSocket] Generated new sessionId:', sessionId);
        }
        
        const wsUrl = getWebSocketUrl();
        if (ws.value && ws.value.readyState === WebSocket.OPEN) {
          resolve();
          return; // 已连接
        }
        ws.value = new WebSocket(wsUrl);

        // 设置会话ID头部（如果支持）
        if (sessionId) {
          ws.value.sessionId = sessionId;
        }

        ws.value.onopen = () => {
          isConnected.value = true;
          reconnectAttempts.value = 0;
          console.debug('[WebSocket] Connected with sessionId:', sessionId);
          send({ type: 'join', sessionId });
          flushQueue();
          resolve();
        };

        ws.value.onmessage = event => {
          try {
            const data = JSON.parse(event.data);
        // 原始日志（可注释）
        // console.debug('[WS][raw]', data);
            handleMessage(data);
        } catch (_error) {
          void _error;
          console.error('WebSocket message parse error');
          }
        };

        ws.value.onclose = () => {
          isConnected.value = false;
          if (reconnectAttempts.value < _maxReconnectAttempts) {
            reconnectAttempts.value++;
            reconnectInterval.value = setTimeout(() => { connect(); }, 3000 * reconnectAttempts.value);
          }
        };

        ws.value.onerror = (error) => {
          console.error('WebSocket connection error:', error);
          reject(error);
        };
      } catch (error) {
        console.error('WebSocket connection setup error:', error);
        reject(error);
      }
    });
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
        console.error('WebSocket handler error', e);
      }
    });
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

  // 组件卸载时不主动断开（保持单例），如需断开请显式调用 disconnect()

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
