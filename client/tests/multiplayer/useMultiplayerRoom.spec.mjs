import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { mount } from '@vue/test-utils';
import { ref } from 'vue';

const connectMock = vi.fn(() => Promise.resolve());
const disconnectMock = vi.fn();
const sendMock = vi.fn();
const onMessageMock = vi.fn();
const offMessageMock = vi.fn();
const wsConnected = ref(false);

vi.mock('@/composables/useWebSocket.js', () => {
  return {
    useWebSocket: () => ({
      connect: connectMock,
      disconnect: disconnectMock,
      send: sendMock,
      onMessage: onMessageMock,
      offMessage: offMessageMock,
      isConnected: wsConnected,
    }),
  };
});

import { useMultiplayerRoom } from '@/composables/multiplayer/useMultiplayerRoom.js';

const withSetup = (callback) => {
  let result;
  const Comp = {
    setup() {
      result = callback();
      return () => null;
    },
  };
  mount(Comp);
  return result;
};

describe('useMultiplayerRoom', () => {
  beforeEach(() => {
    connectMock.mockClear();
    disconnectMock.mockClear();
    sendMock.mockClear();
    onMessageMock.mockClear();
    offMessageMock.mockClear();
    wsConnected.value = false;
    global.fetch = vi.fn(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ room: { room_code: 'ABCD' } }),
      }),
    );
  });

  afterEach(() => {
    delete global.fetch;
  });

  it('connects to server manually', async () => {
    const api = withSetup(() => useMultiplayerRoom({ autoConnect: false }));
    await api.connectToServer();
    expect(connectMock).toHaveBeenCalled();
  });

  it('creates room via API and sends join message', async () => {
    const api = withSetup(() => useMultiplayerRoom({ autoConnect: false }));
    await api.createRoom('Alice', { maxPlayers: 4 });
    expect(global.fetch).toHaveBeenCalledWith(expect.stringContaining('/rooms'), expect.any(Object));
    expect(sendMock).toHaveBeenCalledWith('join_room', expect.objectContaining({ player_name: 'Alice' }));
  });

  it('sends game message with room id', async () => {
    const api = withSetup(() => useMultiplayerRoom({ autoConnect: false }));
    api.currentRoom.value = { id: 1 };
    api.sendGameMessage('custom_event', { foo: 'bar' });
    expect(sendMock).toHaveBeenCalledWith('custom_event', expect.objectContaining({ room_id: 1, foo: 'bar' }));
  });
});
