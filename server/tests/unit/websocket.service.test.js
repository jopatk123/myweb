import { jest } from '@jest/globals';

// Mock dependencies before importing the service
jest.unstable_mockModule('ws', () => ({
  WebSocketServer: jest.fn().mockImplementation(() => ({
    on: jest.fn(),
  })),
  WebSocket: { OPEN: 1, CLOSED: 3 },
}));

jest.unstable_mockModule('uuid', () => ({
  v4: jest.fn(() => 'mock-uuid-1234'),
}));

jest.unstable_mockModule('../../src/utils/logger.js', () => {
  const noop = () => {};
  const childLogger = {
    debug: noop,
    info: noop,
    warn: noop,
    error: noop,
    child: () => childLogger,
  };
  return { default: childLogger, logger: childLogger };
});

const { WebSocketService } = await import(
  '../../src/services/websocket.service.js'
);

describe('WebSocketService', () => {
  let service;

  beforeEach(() => {
    service = new WebSocketService();
  });

  describe('constructor', () => {
    it('initializes with null wss and empty connections', () => {
      expect(service.wss).toBeNull();
      expect(service.handlers).toEqual([]);
      expect(service.connections).toBeDefined();
      expect(service.getOnlineCount()).toBe(0);
    });
  });

  describe('init', () => {
    it('creates a WebSocketServer and attaches connection listener', () => {
      const mockServer = {};
      const wss = service.init(mockServer);

      expect(wss).toBeDefined();
      expect(service.wss).toBe(wss);
    });
  });

  describe('handleConnection', () => {
    it('registers client and sends connected message', () => {
      const mockSocket = {
        send: jest.fn(),
        on: jest.fn(),
        readyState: 1,
      };
      const mockReq = {
        url: '/ws?sessionId=custom-session-id',
        headers: {},
      };

      service.handleConnection(mockSocket, mockReq);

      // Server always sends back its own generated UUID as serverSessionId
      expect(mockSocket.send).toHaveBeenCalledWith(
        JSON.stringify({ type: 'connected', sessionId: 'mock-uuid-1234' })
      );
      // Client sessionId from URL is pre-associated
      expect(service.connections.getClientSessionId('mock-uuid-1234')).toBe(
        'custom-session-id'
      );
      expect(mockSocket.on).toHaveBeenCalledWith(
        'message',
        expect.any(Function)
      );
      expect(mockSocket.on).toHaveBeenCalledWith('close', expect.any(Function));
      expect(mockSocket.on).toHaveBeenCalledWith('error', expect.any(Function));
    });

    it('generates UUID when no sessionId in URL', () => {
      const mockSocket = {
        send: jest.fn(),
        on: jest.fn(),
        readyState: 1,
      };
      const mockReq = { url: '/ws', headers: {} };

      service.handleConnection(mockSocket, mockReq);

      expect(mockSocket.send).toHaveBeenCalledWith(
        JSON.stringify({ type: 'connected', sessionId: 'mock-uuid-1234' })
      );
    });
  });

  describe('handleMessage', () => {
    it('responds to ping with pong', async () => {
      // Register a mock socket
      const mockSocket = {
        send: jest.fn(),
        readyState: 1,
        terminate: jest.fn(),
      };
      service.connections.register('server-1', mockSocket);

      await service.handleMessage('server-1', { type: 'ping' });

      expect(mockSocket.send).toHaveBeenCalledWith('{"type":"pong"}');
    });

    it('handles join message correctly', async () => {
      const mockSocket = {
        send: jest.fn(),
        readyState: 1,
        terminate: jest.fn(),
      };
      service.connections.register('server-1', mockSocket);

      await service.handleMessage('server-1', {
        type: 'join',
        sessionId: 'client-session-1',
      });

      expect(service.connections.getClientSessionId('server-1')).toBe(
        'client-session-1'
      );
      expect(mockSocket._clientSessionId).toBe('client-session-1');
    });

    it('ignores messages without type', async () => {
      await expect(service.handleMessage('s1', {})).resolves.toBeUndefined();
      await expect(service.handleMessage('s1', null)).resolves.toBeUndefined();
      await expect(
        service.handleMessage('s1', { type: 123 })
      ).resolves.toBeUndefined();
    });

    it('dispatches to registered handler', async () => {
      const handler = {
        canHandle: jest.fn(type => type === 'customEvent'),
        handle: jest.fn(),
      };
      service.handlers.push(handler);

      await service.handleMessage('server-1', {
        type: 'customEvent',
        data: 'test',
      });

      expect(handler.canHandle).toHaveBeenCalledWith('customEvent');
      expect(handler.handle).toHaveBeenCalledWith('server-1', {
        type: 'customEvent',
        data: 'test',
      });
    });

    it('uses client session id when associated', async () => {
      const handler = {
        canHandle: jest.fn(() => true),
        handle: jest.fn(),
      };
      service.handlers.push(handler);
      service.connections.associate('server-1', 'client-1');

      await service.handleMessage('server-1', { type: 'test' });

      expect(handler.handle).toHaveBeenCalledWith('client-1', { type: 'test' });
    });
  });

  describe('handleJoin', () => {
    it('associates sessions and stores client id on socket', () => {
      const mockSocket = {
        send: jest.fn(),
        readyState: 1,
        terminate: jest.fn(),
      };
      service.connections.register('server-1', mockSocket);

      service.handleJoin('server-1', 'my-client-id');

      expect(service.connections.getClientSessionId('server-1')).toBe(
        'my-client-id'
      );
      expect(mockSocket._clientSessionId).toBe('my-client-id');
    });

    it('does nothing when no session id provided', () => {
      service.handleJoin('server-1', null);
      expect(service.connections.getClientSessionId('server-1')).toBeNull();
    });
  });

  describe('handleDisconnect', () => {
    it('calls handleDisconnect on all handlers and unregisters', async () => {
      const handler = {
        canHandle: jest.fn(),
        handle: jest.fn(),
        handleDisconnect: jest.fn(),
      };
      service.handlers.push(handler);

      const mockSocket = {
        send: jest.fn(),
        readyState: 1,
        terminate: jest.fn(),
      };
      service.connections.register('server-1', mockSocket);
      service.connections.associate('server-1', 'client-1');

      await service.handleDisconnect('server-1');

      expect(handler.handleDisconnect).toHaveBeenCalledWith('client-1');
      expect(service.getOnlineCount()).toBe(0);
    });

    it('works with handlers that lack handleDisconnect', async () => {
      const handler = { canHandle: jest.fn(), handle: jest.fn() };
      service.handlers.push(handler);

      await expect(
        service.handleDisconnect('server-1')
      ).resolves.toBeUndefined();
    });
  });

  describe('broadcast', () => {
    it('broadcasts with type and data', () => {
      const mockSocket = {
        send: jest.fn(),
        readyState: 1,
        terminate: jest.fn(),
      };
      service.connections.register('server-1', mockSocket);

      service.broadcast('eventType', { key: 'value' });

      expect(mockSocket.send).toHaveBeenCalledWith(
        JSON.stringify({ type: 'eventType', data: { key: 'value' } })
      );
    });

    it('broadcasts with object payload', () => {
      const mockSocket = {
        send: jest.fn(),
        readyState: 1,
        terminate: jest.fn(),
      };
      service.connections.register('server-1', mockSocket);

      service.broadcast({ type: 'raw', info: 'x' });

      expect(mockSocket.send).toHaveBeenCalledWith(
        JSON.stringify({ type: 'raw', info: 'x' })
      );
    });
  });

  describe('getOnlineCount', () => {
    it('reflects connection count', () => {
      expect(service.getOnlineCount()).toBe(0);

      const s = { send: jest.fn(), readyState: 1, terminate: jest.fn() };
      service.connections.register('s1', s);
      expect(service.getOnlineCount()).toBe(1);
    });
  });

  describe('session map accessors', () => {
    it('exposes serverToClient and clientToServer maps', () => {
      service.connections.associate('s1', 'c1');
      expect(service.serverToClient.get('s1')).toBe('c1');
      expect(service.clientToServer.get('c1')).toBe('s1');
    });
  });

  describe('连接数限制', () => {
    it('超出最大连接数时拒绝新连接并调用 close', () => {
      // 填满连接池
      for (let i = 0; i < 200; i++) {
        const s = {
          send: jest.fn(),
          on: jest.fn(),
          readyState: 1,
          terminate: jest.fn(),
        };
        service.connections.register(`server-${i}`, s);
      }

      const newSocket = {
        send: jest.fn(),
        on: jest.fn(),
        close: jest.fn(),
        readyState: 1,
        terminate: jest.fn(),
      };
      const req = { url: '/ws', headers: {} };

      service.handleConnection(newSocket, req);

      // 拒绝：socket.close 被调用，socket 未注册到 connections
      expect(newSocket.close).toHaveBeenCalledWith(1013, 'Server overloaded');
      // 连接数保持 200，没有增加
      expect(service.getOnlineCount()).toBe(200);
    });

    it('未超出最大连接数时正常接受连接', () => {
      const socket = {
        send: jest.fn(),
        on: jest.fn(),
        close: jest.fn(),
        readyState: 1,
        terminate: jest.fn(),
      };
      const req = { url: '/ws', headers: {} };

      service.handleConnection(socket, req);

      expect(socket.close).not.toHaveBeenCalled();
      expect(service.getOnlineCount()).toBe(1);
    });
  });

  describe('消息频率限制', () => {
    it('_isRateLimited 在限额内返回 false', () => {
      const id = 'rate-test-1';
      // 连续调用 MSG_RATE_LIMIT 次（30 次），应全部不限流
      for (let i = 0; i < 30; i++) {
        expect(service._isRateLimited(id)).toBe(false);
      }
    });

    it('_isRateLimited 超过限额后返回 true', () => {
      const id = 'rate-test-2';
      for (let i = 0; i < 30; i++) {
        service._isRateLimited(id); // 消耗配额
      }
      // 第 31 次应超限
      expect(service._isRateLimited(id)).toBe(true);
    });

    it('超出消息频率的消息不被处理', async () => {
      const handler = {
        canHandle: jest.fn(() => true),
        handle: jest.fn(),
      };
      service.handlers.push(handler);

      const socket = {
        send: jest.fn(),
        on: jest.fn(),
        close: jest.fn(),
        readyState: 1,
        terminate: jest.fn(),
      };
      const req = { url: '/ws', headers: {} };
      service.handleConnection(socket, req);

      const serverSessionId = 'mock-uuid-1234';

      // 强制耗尽配额
      for (let i = 0; i < 30; i++) {
        service._isRateLimited(serverSessionId);
      }

      // 直接调用 handleMessage，此时应因限流不处理
      // 通过 on('message') 触发——找到对应的 message 监听器并调用
      const messageListener = socket.on.mock.calls.find(
        c => c[0] === 'message'
      )?.[1];
      if (messageListener) {
        messageListener(JSON.stringify({ type: 'customEvent' }));
      }

      // handler.handle 不应被调用（被限流）
      expect(handler.handle).not.toHaveBeenCalled();
    });
  });

  describe('心跳机制', () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });

    afterEach(() => {
      service.stopHeartbeat();
      jest.useRealTimers();
    });

    it('stopHeartbeat 清除定时器', () => {
      const mockServer = {};
      service.init(mockServer);
      expect(service._heartbeatTimer).not.toBeNull();
      service.stopHeartbeat();
      expect(service._heartbeatTimer).toBeNull();
    });

    it('心跳发送 ping 并标记 _waitingForPong', () => {
      const socket = {
        send: jest.fn(),
        on: jest.fn(),
        close: jest.fn(),
        readyState: 1,
        terminate: jest.fn(),
        ping: jest.fn(),
      };
      service.connections.register('heartbeat-test', socket);

      const mockServer = {};
      service.init(mockServer);

      // 触发一次心跳
      jest.advanceTimersByTime(30_000);

      expect(socket._waitingForPong).toBe(true);
      expect(socket.ping).toHaveBeenCalled();
    });

    it('连续两次心跳未收到 pong 时强制断开', () => {
      const socket = {
        send: jest.fn(),
        on: jest.fn(),
        close: jest.fn(),
        readyState: 1,
        terminate: jest.fn(),
        ping: jest.fn(),
      };
      service.connections.register('zombie-conn', socket);

      const mockServer = {};
      service.init(mockServer);

      // 第一次心跳：标记等待 pong
      jest.advanceTimersByTime(30_000);
      expect(socket._waitingForPong).toBe(true);

      // 第二次心跳：没有 pong 回来，应终止连接
      jest.advanceTimersByTime(30_000);

      expect(socket.terminate).toHaveBeenCalled();
      expect(service.getOnlineCount()).toBe(0);
    });

    it('收到 pong 后清除等待标记', () => {
      const socket = {
        send: jest.fn(),
        on: jest.fn(),
        close: jest.fn(),
        readyState: 1,
        terminate: jest.fn(),
        ping: jest.fn(),
      };
      const req = { url: '/ws', headers: {} };
      service.handleConnection(socket, req);

      const mockServer = {};
      service.init(mockServer);

      // 触发心跳，标记等待 pong
      jest.advanceTimersByTime(30_000);
      expect(socket._waitingForPong).toBe(true);

      // 找到 pong 监听器并触发
      const pongListener = socket.on.mock.calls.find(c => c[0] === 'pong')?.[1];
      expect(pongListener).toBeDefined();
      pongListener();

      // 标记应被清除
      expect(socket._waitingForPong).toBe(false);
    });
  });
});
