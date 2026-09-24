import { defineComponent, h, markRaw, nextTick } from 'vue';
import { describe, expect, it, beforeEach, afterEach, vi } from 'vitest';
import { render } from '@testing-library/vue';

const httpClientMocks = vi.hoisted(() => ({
  getServerOrigin: vi.fn(() => 'http://localhost:3000'),
}));

vi.mock('@/api/httpClient.js', () => ({
  getServerOrigin: httpClientMocks.getServerOrigin,
}));

import { useWebSocket } from '@/composables/useWebSocket.js';
import { resetSessionState } from '@/store/sessionState.js';
import { resetWebSocketState, webSocketState } from '@/store/webSocketState.js';

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
    // 注意：webSocketState.ws 是深度 ref，赋值后实例会被 Vue 包装成响应式 Proxy，
    // 导致 composable 内 `ws.value !== socket` 的守卫恒为真（疑似源码 bug，已单独上报）。
    // 这里 markRaw 让 mock 实例保持原始引用，以便测试消息收发/重连状态机本身。
    markRaw(this);
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

let lastApi = null;

const WebSocketConsumer = defineComponent({
  setup() {
    lastApi = useWebSocket();
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

  it('falls back to window.location when no server origin is available', async () => {
    httpClientMocks.getServerOrigin.mockReturnValue('');

    render(WebSocketConsumer);
    await nextTick();
    await flushPromises();

    expect(MockWebSocket.instances[0].url).toBe(
      'ws://localhost:3000/ws?sessionId=session-1'
    );
  });

  it('falls back to window.location when the origin cannot be parsed', async () => {
    httpClientMocks.getServerOrigin.mockReturnValue('::::not-a-url');

    render(WebSocketConsumer);
    await nextTick();
    await flushPromises();

    expect(MockWebSocket.instances[0].url).toBe(
      'ws://localhost:3000/ws?sessionId=session-1'
    );
  });

  it('queues messages while connecting and flushes them after open', async () => {
    render(WebSocketConsumer);
    await nextTick();
    await flushPromises();

    const socket = MockWebSocket.instances[0];
    expect(lastApi.send({ type: 'chat', body: 'hi' })).toBe(false);
    expect(webSocketState.messageQueue).toHaveLength(1);

    socket.open();
    await flushPromises();

    expect(socket.sentMessages.map(m => JSON.parse(m))).toEqual([
      { type: 'join', sessionId: 'session-1' },
      { type: 'chat', body: 'hi' },
    ]);
    expect(webSocketState.messageQueue).toHaveLength(0);
    expect(lastApi.send({ type: 'chat', body: 'second' })).toBe(true);
    expect(JSON.parse(socket.sentMessages[2])).toEqual({
      type: 'chat',
      body: 'second',
    });
  });

  it('keeps draining the queue when a queued send fails mid-flush', async () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    render(WebSocketConsumer);
    await nextTick();
    await flushPromises();

    const socket = MockWebSocket.instances[0];
    lastApi.send({ type: 'chat', body: 'first' });
    let calls = 0;
    socket.send.mockImplementation(payload => {
      calls += 1;
      if (calls === 2) throw new Error('send failed');
      socket.sentMessages.push(payload);
    });

    socket.open();
    await flushPromises();

    expect(warnSpy).toHaveBeenCalled();
    // 失败的消息已出队，不会阻塞后续队列
    expect(webSocketState.messageQueue).toHaveLength(0);
    warnSpy.mockRestore();
  });

  it('returns the existing socket without reconnecting when already open', async () => {
    render(WebSocketConsumer);
    await nextTick();
    await flushPromises();

    const socket = MockWebSocket.instances[0];
    socket.open();
    await flushPromises();

    await expect(lastApi.connect()).resolves.toBe(socket);
    expect(MockWebSocket.instances).toHaveLength(1);
  });

  it('dispatches parsed messages to handlers and tolerates bad frames', async () => {
    render(WebSocketConsumer);
    await nextTick();
    await flushPromises();

    const socket = MockWebSocket.instances[0];
    socket.open();
    await flushPromises();

    const seen = [];
    lastApi.onMessage('ping', payload => seen.push(['a', payload]));
    lastApi.onMessage('ping', payload => seen.push(['b', payload]));
    lastApi.onMessage('boom', () => {
      throw new Error('handler crash');
    });

    socket.onmessage({
      data: JSON.stringify({ type: 'ping', data: { n: 1 } }),
    });
    expect(seen).toEqual([
      ['a', { n: 1 }],
      ['b', { n: 1 }],
    ]);

    // 无 data 字段时回退为整帧
    socket.onmessage({ data: JSON.stringify({ type: 'ping' }) });
    expect(seen[seen.length - 1][1]).toEqual({ type: 'ping' });

    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    // 处理器异常不阻断其他逻辑
    socket.onmessage({ data: JSON.stringify({ type: 'boom' }) });
    expect(warnSpy).toHaveBeenCalled();
    // 无效 JSON 帧被忽略；两个 ping 处理器各收到一次回退整帧
    socket.onmessage({ data: '{oops' });
    expect(seen).toHaveLength(4);
    warnSpy.mockRestore();
  });

  it('offMessage removes one handler, all handlers, and tolerates unknown types', async () => {
    render(WebSocketConsumer);
    await nextTick();
    await flushPromises();

    const socket = MockWebSocket.instances[0];
    socket.open();
    await flushPromises();

    const seen = [];
    const a = _payload => seen.push('a');
    const b = _payload => seen.push('b');
    lastApi.onMessage('evt', a);
    lastApi.onMessage('evt', b);

    lastApi.offMessage('evt', a);
    socket.onmessage({ data: JSON.stringify({ type: 'evt' }) });
    expect(seen).toEqual(['b']);

    lastApi.offMessage('evt');
    socket.onmessage({ data: JSON.stringify({ type: 'evt' }) });
    expect(seen).toEqual(['b']);

    expect(() => lastApi.offMessage('missing')).not.toThrow();
  });

  it('reconnects with backoff on unexpected close and resets attempts after reopen', async () => {
    vi.useFakeTimers();
    render(WebSocketConsumer);
    await vi.advanceTimersByTimeAsync(0);

    const socket = MockWebSocket.instances[0];
    socket.close(); // 模拟服务端断开：readyState → CLOSED 并触发 onclose

    expect(webSocketState.isConnected.value).toBe(false);
    expect(webSocketState.reconnectAttempts.value).toBe(1);

    await vi.advanceTimersByTimeAsync(30000);
    expect(MockWebSocket.instances).toHaveLength(2);

    MockWebSocket.instances[1].open();
    await vi.advanceTimersByTimeAsync(0);
    expect(webSocketState.reconnectAttempts.value).toBe(0);
    expect(webSocketState.isConnected.value).toBe(true);
  });

  it('stops reconnecting once maxReconnectAttempts is reached', async () => {
    vi.useFakeTimers();
    webSocketState.maxReconnectAttempts = 0;

    render(WebSocketConsumer);
    await vi.advanceTimersByTimeAsync(0);

    MockWebSocket.instances[0].close();
    expect(webSocketState.reconnectAttempts.value).toBe(0);

    await vi.advanceTimersByTimeAsync(30000);
    expect(MockWebSocket.instances).toHaveLength(1);
  });

  it('does not reconnect after an explicit disconnect', async () => {
    vi.useFakeTimers();
    render(WebSocketConsumer);
    await vi.advanceTimersByTimeAsync(0);

    const socket = MockWebSocket.instances[0];
    socket.open();
    await vi.advanceTimersByTimeAsync(0);

    lastApi.disconnect();
    expect(socket.close).toHaveBeenCalledTimes(1);
    expect(webSocketState.ws.value).toBeNull();
    expect(webSocketState.isConnected.value).toBe(false);

    await vi.advanceTimersByTimeAsync(30000);
    expect(MockWebSocket.instances).toHaveLength(1);
    expect(webSocketState.reconnectAttempts.value).toBe(0);
  });

  it('rejects connect when the socket errors before opening', async () => {
    render(WebSocketConsumer);
    await nextTick();
    await flushPromises();

    const socket = MockWebSocket.instances[0];
    const pending = lastApi.connect(); // 复用 CONNECTING 中的 connectPromise
    const failure = new Error('upgrade failed');

    socket.onerror(failure);
    await expect(pending).rejects.toBe(failure);
    expect(webSocketState.connectPromise).toBeNull();
  });

  it('rejects connect when the WebSocket constructor throws', async () => {
    vi.stubGlobal(
      'WebSocket',
      class {
        constructor() {
          throw new Error('no sockets');
        }
      }
    );

    render(WebSocketConsumer);
    await nextTick();
    await flushPromises();

    const error = await lastApi.connect().catch(e => e);
    expect(error).toBeInstanceOf(Error);
    expect(webSocketState.ws.value).toBeNull();
  });
});
