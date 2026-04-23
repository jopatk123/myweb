import { ref } from 'vue';

export const webSocketState = {
  ws: ref(null),
  isConnected: ref(false),
  reconnectAttempts: ref(0),
  reconnectTimer: ref(null),
  messageHandlers: new Map(),
  messageQueue: [],
  connectPromise: null,
  consumerCount: 0,
  manualDisconnect: false,
  maxReconnectAttempts: 5,
};

export function resetWebSocketState() {
  if (webSocketState.reconnectTimer.value) {
    clearTimeout(webSocketState.reconnectTimer.value);
  }

  webSocketState.ws.value = null;
  webSocketState.isConnected.value = false;
  webSocketState.reconnectAttempts.value = 0;
  webSocketState.reconnectTimer.value = null;
  webSocketState.messageHandlers.clear();
  webSocketState.messageQueue = [];
  webSocketState.connectPromise = null;
  webSocketState.consumerCount = 0;
  webSocketState.manualDisconnect = false;
  webSocketState.maxReconnectAttempts = 5;
}
