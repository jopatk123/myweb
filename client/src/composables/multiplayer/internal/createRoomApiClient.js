import { getApiBase } from '@/api/httpClient.js';

const TRAILING_SLASH_REGEX = /\/+$/;

const normalizeApiPrefix = (rawPrefix, gameType) => {
  const prefix = rawPrefix ?? `/${gameType}-multiplayer`;
  if (/^https?:/i.test(prefix)) {
    return prefix.replace(TRAILING_SLASH_REGEX, '');
  }

  const base = getApiBase();
  const suffix = prefix.startsWith('/') ? prefix : `/${prefix}`;
  return `${base}${suffix}`.replace(TRAILING_SLASH_REGEX, '');
};

export function createRoomApiClient({
  gameType,
  apiPrefix,
  defaultConfig,
  loading,
  error,
  sendMessage,
}) {
  const normalizedApiPrefix = normalizeApiPrefix(apiPrefix, gameType);

  const apiRequest = async (endpoint, options = {}) => {
    const suffix = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
    const url = `${normalizedApiPrefix}${suffix}`;

    const config = {
      headers: {
        'Content-Type': 'application/json',
        ...(options.headers || {}),
      },
      ...options,
    };

    const response = await fetch(url, config);

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(
        errorData.message || `HTTP ${response.status}: ${response.statusText}`
      );
    }

    return response.json();
  };

  const createRoom = async (playerName, roomConfig = {}) => {
    try {
      loading.value = true;
      error.value = null;

      const config = { ...defaultConfig, ...roomConfig };
      const data = await apiRequest('/rooms', {
        method: 'POST',
        body: JSON.stringify({
          player_name: playerName,
          game_type: gameType,
          ...config,
        }),
      });

      sendMessage('join_room', {
        room_code: data.room.room_code,
        player_name: playerName,
      });

      return data;
    } catch (err) {
      error.value = err.message;
      throw err;
    } finally {
      loading.value = false;
    }
  };

  const joinRoom = async (playerName, roomCode) => {
    try {
      loading.value = true;
      error.value = null;

      sendMessage('join_room', {
        room_code: roomCode,
        player_name: playerName,
      });
    } catch (err) {
      error.value = err.message;
      throw err;
    } finally {
      loading.value = false;
    }
  };

  const getRoomList = async (filters = {}) => {
    const queryParams = new URLSearchParams({
      game_type: gameType,
      ...filters,
    });

    return apiRequest(`/rooms?${queryParams.toString()}`);
  };

  return {
    normalizedApiPrefix,
    apiRequest,
    createRoom,
    joinRoom,
    getRoomList,
  };
}
