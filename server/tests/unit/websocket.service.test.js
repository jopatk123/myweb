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

const { WebSocketService } =
  await import('../../src/services/websocket.service.js');

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
        headers: { 'x-session-id': 'custom-session-id' },
      };

      service.handleConnection(mockSocket, mockReq);

      expect(mockSocket.send).toHaveBeenCalledWith(
        JSON.stringify({ type: 'connected', sessionId: 'custom-session-id' })
      );
      expect(mockSocket.on).toHaveBeenCalledWith(
        'message',
        expect.any(Function)
      );
      expect(mockSocket.on).toHaveBeenCalledWith('close', expect.any(Function));
      expect(mockSocket.on).toHaveBeenCalledWith('error', expect.any(Function));
    });

    it('generates UUID when no x-session-id header', () => {
      const mockSocket = {
        send: jest.fn(),
        on: jest.fn(),
        readyState: 1,
      };
      const mockReq = { headers: {} };

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
});
