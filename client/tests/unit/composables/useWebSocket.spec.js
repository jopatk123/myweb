import { defineComponent, h, nextTick } from 'vue';
import { describe, expect, it, beforeEach, afterEach, vi } from 'vitest';
import { render } from '@testing-library/vue';

vi.mock('@/api/httpClient.js', () => ({
  getServerOrigin: () => 'http://localhost:3000',
}));

import { useWebSocket } from '@/composables/useWebSocket.js';
import { resetSessionState } from '@/store/sessionState.js';
import { resetWebSocketState } from '@/store/webSocketState.js';

const flushPromises = () => new Promise(resolve => setTimeout(resolve, 0));

function createMemoryStorage() {
  const data = new Map();

  return {
    getItem(key) {
      return data.has(String(key)) ? data.get(String(key)) : null;
    },
    setItem(key, value) {
      data.set(String(key), String(value));
    },
    removeItem(key) {
      data.delete(String(key));
    },
    clear() {
      data.clear();
    },
  };
}

class MockWebSocket {
  static instances = [];
  static CONNECTING = 0;
  static OPEN = 1;
  static CLOSING = 2;
  static CLOSED = 3;

  constructor(url) {
    this.url = url;
    this.readyState = MockWebSocket.CONNECTING;
    this.sentMessages = [];
    this.onopen = null;
    this.onmessage = null;
    this.onclose = null;
    this.onerror = null;
    this.close = vi.fn(() => {
      this.readyState = MockWebSocket.CLOSED;
      if (typeof this.onclose === 'function') {
        this.onclose();
      }
    });
    this.send = vi.fn(payload => {
      this.sentMessages.push(payload);
    });
    MockWebSocket.instances.push(this);
  }

  open() {
    this.readyState = MockWebSocket.OPEN;
    if (typeof this.onopen === 'function') {
      this.onopen();
    }
  }
}

const WebSocketConsumer = defineComponent({
  setup() {
    useWebSocket();
    return () => h('div');
  },
});

describe('useWebSocket', () => {
  beforeEach(() => {
    MockWebSocket.instances = [];
    vi.stubGlobal('WebSocket', MockWebSocket);
    vi.stubGlobal('localStorage', createMemoryStorage());
    resetSessionState();
    resetWebSocketState();
    localStorage.clear();
    localStorage.setItem('sessionId', 'session-1');
  });

  afterEach(() => {
    localStorage.clear();
    vi.unstubAllGlobals();
  });

  it('reuses a connecting socket and disconnects after the last consumer unmounts', async () => {
    const first = render(WebSocketConsumer);
    await nextTick();
    await flushPromises();

    expect(MockWebSocket.instances).toHaveLength(1);
    const socket = MockWebSocket.instances[0];
    expect(socket.url).toContain('sessionId=session-1');

    const second = render(WebSocketConsumer);
    await nextTick();
    await flushPromises();

    expect(MockWebSocket.instances).toHaveLength(1);

    socket.open();
    await flushPromises();

    expect(socket.readyState).toBe(MockWebSocket.OPEN);

    first.unmount();
    expect(socket.close).not.toHaveBeenCalled();

    second.unmount();
    expect(socket.close).toHaveBeenCalledTimes(1);
  });
});
