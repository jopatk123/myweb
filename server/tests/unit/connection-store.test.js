import { jest } from '@jest/globals';
import { ConnectionStore } from '../../src/services/websocket/connection-store.js';

// Mock WebSocket module - 使用 OPEN 常量
const WS_OPEN = 1;
const WS_CLOSED = 3;

function createMockSocket(readyState = WS_OPEN) {
  return {
    readyState,
    send: jest.fn(),
    terminate: jest.fn(),
    _serverSessionId: null,
  };
}

// Mock ws module so WebSocket.OPEN is available
jest.unstable_mockModule('ws', () => ({
  WebSocket: { OPEN: WS_OPEN, CLOSED: WS_CLOSED },
}));

describe('ConnectionStore', () => {
  let store;

  beforeEach(() => {
    store = new ConnectionStore();
  });

  describe('register / unregister', () => {
    it('registers a client', () => {
      const socket = createMockSocket();
      store.register('server-1', socket);

      expect(store.size).toBe(1);
      expect(store.getSocket('server-1')).toBe(socket);
      expect(socket._serverSessionId).toBe('server-1');
    });

    it('ignores register with missing params', () => {
      store.register(null, createMockSocket());
      store.register('s1', null);
      expect(store.size).toBe(0);
    });

    it('unregisters a client and terminates socket', () => {
      const socket = createMockSocket();
      store.register('server-1', socket);
      store.unregister('server-1');

      expect(store.size).toBe(0);
      expect(store.getSocket('server-1')).toBeNull();
      expect(socket.terminate).toHaveBeenCalled();
    });

    it('unregister cleans up session mappings', () => {
      const socket = createMockSocket();
      store.register('server-1', socket);
      store.associate('server-1', 'client-1');

      store.unregister('server-1');

      expect(store.getClientSessionId('server-1')).toBeNull();
      expect(store.getServerSessionId('client-1')).toBeNull();
    });

    it('unregister handles missing serverSessionId gracefully', () => {
      expect(() => store.unregister(null)).not.toThrow();
      expect(() => store.unregister('nonexistent')).not.toThrow();
    });
  });

  describe('associate', () => {
    it('maps server session to client session', () => {
      store.associate('server-1', 'client-1');

      expect(store.getClientSessionId('server-1')).toBe('client-1');
      expect(store.getServerSessionId('client-1')).toBe('server-1');
    });

    it('ignores associate with missing params', () => {
      store.associate(null, 'client-1');
      store.associate('server-1', null);

      expect(store.getClientSessionId('server-1')).toBeNull();
      expect(store.getServerSessionId('client-1')).toBeNull();
    });
  });

  describe('send', () => {
    it('sends JSON message to socket by server session id', () => {
      const socket = createMockSocket();
      store.register('server-1', socket);

      const result = store.send('server-1', { type: 'test' });

      expect(result).toBe(true);
      expect(socket.send).toHaveBeenCalledWith('{"type":"test"}');
    });

    it('sends string message as-is', () => {
      const socket = createMockSocket();
      store.register('server-1', socket);

      store.send('server-1', 'raw-string');

      expect(socket.send).toHaveBeenCalledWith('raw-string');
    });

    it('resolves client session id to server session id', () => {
      const socket = createMockSocket();
      store.register('server-1', socket);
      store.associate('server-1', 'client-1');

      const result = store.send('client-1', { type: 'test' });

      expect(result).toBe(true);
      expect(socket.send).toHaveBeenCalled();
    });

    it('returns false and cleans up for closed sockets', () => {
      const socket = createMockSocket(WS_CLOSED);
      store.register('server-1', socket);

      const result = store.send('server-1', { type: 'test' });

      expect(result).toBe(false);
      expect(store.size).toBe(0);
    });

    it('returns false when socket does not exist', () => {
      const result = store.send('nonexistent', { type: 'test' });
      expect(result).toBe(false);
    });

    it('handles send error by unregistering', () => {
      const socket = createMockSocket();
      socket.send.mockImplementation(() => {
        throw new Error('send failed');
      });
      store.register('server-1', socket);

      const result = store.send('server-1', { type: 'test' });

      expect(result).toBe(false);
      expect(store.size).toBe(0);
    });
  });

  describe('broadcast', () => {
    it('sends message to all connected clients', () => {
      const socket1 = createMockSocket();
      const socket2 = createMockSocket();
      store.register('server-1', socket1);
      store.register('server-2', socket2);

      store.broadcast({ type: 'update' });

      expect(socket1.send).toHaveBeenCalledWith('{"type":"update"}');
      expect(socket2.send).toHaveBeenCalledWith('{"type":"update"}');
    });

    it('broadcasts string messages as-is', () => {
      const socket = createMockSocket();
      store.register('server-1', socket);

      store.broadcast('raw-broadcast');

      expect(socket.send).toHaveBeenCalledWith('raw-broadcast');
    });

    it('skips closed sockets and unregisters them', () => {
      const open = createMockSocket(WS_OPEN);
      const closed = createMockSocket(WS_CLOSED);
      store.register('server-1', open);
      store.register('server-2', closed);

      store.broadcast({ type: 'test' });

      expect(open.send).toHaveBeenCalled();
      expect(closed.send).not.toHaveBeenCalled();
      expect(store.size).toBe(1);
    });

    it('uses predicate to filter recipients', () => {
      const socket1 = createMockSocket();
      const socket2 = createMockSocket();
      store.register('server-1', socket1);
      store.register('server-2', socket2);
      store.associate('server-1', 'client-a');

      store.broadcast({ type: 'targeted' }, (serverId, clientId) => {
        return clientId === 'client-a';
      });

      expect(socket1.send).toHaveBeenCalled();
      expect(socket2.send).not.toHaveBeenCalled();
    });

    it('handles broadcast send error gracefully', () => {
      const socket = createMockSocket();
      socket.send.mockImplementation(() => {
        throw new Error('broadcast fail');
      });
      store.register('server-1', socket);

      expect(() => store.broadcast({ type: 'test' })).not.toThrow();
      expect(store.size).toBe(0);
    });
  });

  describe('size', () => {
    it('returns current number of connected clients', () => {
      expect(store.size).toBe(0);

      store.register('s1', createMockSocket());
      store.register('s2', createMockSocket());
      expect(store.size).toBe(2);

      store.unregister('s1');
      expect(store.size).toBe(1);
    });
  });
});
