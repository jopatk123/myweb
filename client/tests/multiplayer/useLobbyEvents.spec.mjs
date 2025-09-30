import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ref } from 'vue';
import { useLobbyEvents } from '@/composables/multiplayer/lobby/useLobbyEvents.js';

describe('useLobbyEvents', () => {
  let emit;
  let props;
  let localPlayerName;
  let events;
  let utils;
  let eventBus;

  beforeEach(() => {
    emit = vi.fn();
    props = { gameType: 'snake' };
  localPlayerName = ref('Alice');
    utils = {
      validatePlayerName: vi.fn(() => ({ isValid: true, formatted: 'Alice' })),
    };
    eventBus = {
      emit: vi.fn(),
    };
    events = useLobbyEvents({ emit, props, localPlayerName }, { gameUtils: utils, multiplayerEvents: eventBus });
  });

  it('emits refresh event', () => {
    events.refreshRooms();
    expect(emit).toHaveBeenCalledWith('refresh-rooms');
  });

  it('emits clear error event', () => {
    events.clearError();
    expect(emit).toHaveBeenCalledWith('clear-error');
  });

  it('emits create-room when validation passes', () => {
    events.handleCreateRoom({ maxPlayers: 4 });
    expect(emit).toHaveBeenCalledWith('create-room', expect.objectContaining({ playerName: 'Alice', gameType: 'snake', maxPlayers: 4 }));
  });

  it('shows toast when validation fails', () => {
    utils.validatePlayerName.mockImplementation(() => ({ isValid: false, message: 'invalid' }));
    events.handleJoinRoom('ABCD');
    expect(utils.validatePlayerName).toHaveBeenCalled();
    expect(eventBus.emit).toHaveBeenCalledWith('show-toast', expect.objectContaining({ type: 'error', message: 'invalid' }));
    expect(emit).not.toHaveBeenCalledWith('join-room', expect.anything());
  });
});
