import {
  gameUtils,
  multiplayerEvents,
} from '@/components/multiplayer/index.js';

export function useLobbyEvents(
  { emit, props, localPlayerName },
  dependencies = {}
) {
  const utils = dependencies.gameUtils ?? gameUtils;
  const eventBus = dependencies.multiplayerEvents ?? multiplayerEvents;

  const refreshRooms = () => {
    emit('refresh-rooms');
  };

  const clearError = () => {
    emit('clear-error');
  };

  const validatePlayerName = () => {
    const validation = utils.validatePlayerName(localPlayerName.value);
    if (!validation.isValid) {
      eventBus.emit('show-toast', {
        type: 'error',
        message: validation.message,
      });
      return null;
    }
    return validation.formatted;
  };

  const handleCreateRoom = config => {
    const formattedName = validatePlayerName();
    if (!formattedName) {
      return;
    }

    emit('create-room', {
      playerName: formattedName,
      gameType: props.gameType,
      ...config,
    });
  };

  const handleJoinRoom = roomCode => {
    const formattedName = validatePlayerName();
    if (!formattedName) {
      return;
    }

    emit('join-room', {
      playerName: formattedName,
      roomCode,
      gameType: props.gameType,
    });
  };

  return {
    refreshRooms,
    clearError,
    handleCreateRoom,
    handleJoinRoom,
  };
}
