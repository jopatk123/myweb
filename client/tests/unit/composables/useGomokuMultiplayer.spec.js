import { beforeEach, describe, expect, it, vi } from 'vitest';
import { defineComponent, nextTick, ref } from 'vue';
import { mount } from '@vue/test-utils';

const SESSION_ID = 'session_mocked';

describe('useGomokuMultiplayer', () => {
  let useGomokuMultiplayer;
  let sendMock;
  let connectMock;
  let onMessageMock;
  let offMessageMock;
  let messageHandlers;
  let isConnected;
  let TestHost;

  const trigger = (type, payload) => {
    const set = messageHandlers.get(type);
    if (!set || set.size === 0) {
      throw new Error(`No handler registered for ${type}`);
    }
    set.forEach(handler => handler(payload));
  };

  async function mountComposable() {
    const wrapper = mount(TestHost);
    await nextTick();
    await nextTick();
    return { wrapper, state: wrapper.vm.state };
  }

  beforeEach(async () => {
    vi.resetModules();
    vi.useRealTimers();
    vi.clearAllMocks();
    window.localStorage?.clear?.();

    messageHandlers = new Map();
    sendMock = vi.fn();
    isConnected = ref(false);
    connectMock = vi.fn(async () => {
      isConnected.value = true;
      window.localStorage?.setItem?.('sessionId', SESSION_ID);
    });
    onMessageMock = vi.fn((type, handler) => {
      let set = messageHandlers.get(type);
      if (!set) {
        set = new Set();
        messageHandlers.set(type, set);
      }
      set.add(handler);
    });
    offMessageMock = vi.fn((type, handler) => {
      if (!messageHandlers.has(type)) return;
      if (handler) {
        const set = messageHandlers.get(type);
        set.delete(handler);
        if (set.size === 0) messageHandlers.delete(type);
      } else {
        messageHandlers.delete(type);
      }
    });

    vi.doMock('@/composables/useWebSocket.js', () => ({
      useWebSocket: () => ({
        isConnected,
        connect: connectMock,
        send: sendMock,
        onMessage: onMessageMock,
        offMessage: offMessageMock,
      }),
    }));

    const module = await import('@/composables/useGomokuMultiplayer.js');
    useGomokuMultiplayer = module.useGomokuMultiplayer;

    TestHost = defineComponent({
      setup(_, { expose }) {
        const state = useGomokuMultiplayer();
        expose({ state });
        return () => null;
      },
    });
  });

  it('connects on mount and registers websocket handlers', async () => {
    const { wrapper } = await mountComposable();

    const registeredHandlerCount = Array.from(messageHandlers.values()).reduce(
      (count, set) => count + set.size,
      0
    );

    expect(connectMock).toHaveBeenCalledTimes(1);
    expect(registeredHandlerCount).toBeGreaterThan(0);

    wrapper.unmount();
    await nextTick();

    expect(offMessageMock).toHaveBeenCalledTimes(registeredHandlerCount);
  });

  it('creates a room and resolves when confirmation arrives', async () => {
    const { wrapper, state } = await mountComposable();

    const roomPromise = state.createRoom('Alice');

    expect(sendMock).toHaveBeenNthCalledWith(1, {
      type: 'gomoku_create_room',
      data: { playerName: 'Alice' },
    });
    expect(state.loading.value).toBe(true);

    const payload = {
      room: { room_code: 'G123', status: 'waiting' },
      player: { session_id: SESSION_ID, seat: 1, is_ready: false },
    };
    trigger('gomoku_room_created', payload);

    const room = await roomPromise;
    await nextTick();

    expect(room).toMatchObject({ room_code: 'G123' });
    expect(state.currentRoom.value).toMatchObject({ room_code: 'G123' });
    expect(state.isInRoom.value).toBe(true);
    expect(state.loading.value).toBe(false);
    expect(state.mySeat.value).toBe(1);

    state.getRoomList();
    expect(sendMock).toHaveBeenLastCalledWith({
      type: 'gomoku_get_room_list',
      data: {},
    });

    trigger('gomoku_room_list', { rooms: [{ room_code: 'G456' }] });
    await nextTick();
    expect(state.roomList.value).toEqual([{ room_code: 'G456' }]);

    wrapper.unmount();
  });

  it('tracks readiness, starts game and handles actions', async () => {
    const { wrapper, state } = await mountComposable();

    const roomPromise = state.createRoom('Alice');
    trigger('gomoku_room_created', {
      room: { room_code: 'ABCD', status: 'waiting' },
      player: {
        session_id: SESSION_ID,
        seat: 1,
        is_ready: false,
        player_name: 'Alice',
      },
    });
    await roomPromise;
    await nextTick();

    trigger('gomoku_player_joined', {
      player: {
        session_id: 'session_other',
        seat: 2,
        is_ready: false,
        player_name: 'Bob',
      },
      room: { room_code: 'ABCD', status: 'waiting' },
    });
    await nextTick();

    trigger('gomoku_player_ready_changed', {
      player: { session_id: SESSION_ID, is_ready: true, seat: 1 },
    });
    trigger('gomoku_player_ready_changed', {
      player: { session_id: 'session_other', is_ready: true, seat: 2 },
    });
    await nextTick();

    expect(state.players.value).toHaveLength(2);
    expect(state.bothReady.value).toBe(true);
    expect(state.canStart.value).toBe(true);

    trigger('gomoku_game_started', {
      game_state: { board: [[0]], currentPlayer: 1 },
      players: [
        { session_id: SESSION_ID, seat: 1, is_ready: true },
        { session_id: 'session_other', seat: 2, is_ready: true },
      ],
    });
    await nextTick();

    expect(state.gameStatus.value).toBe('playing');

    state.place(3, 4);
    expect(sendMock).toHaveBeenLastCalledWith({
      type: 'gomoku_place_piece',
      data: { roomCode: 'ABCD', row: 3, col: 4 },
    });

    state.leaveRoom();
    expect(sendMock).toHaveBeenLastCalledWith({
      type: 'gomoku_leave_room',
      data: { roomCode: 'ABCD' },
    });
    expect(state.isInRoom.value).toBe(false);
    expect(state.players.value).toHaveLength(0);
    expect(state.currentRoom.value).toBe(null);

    wrapper.unmount();
  });
});
