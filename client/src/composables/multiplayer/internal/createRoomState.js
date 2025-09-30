import { ref } from 'vue';

export function createRoomState() {
  const isConnected = ref(false);
  const error = ref(null);
  const loading = ref(false);
  const connecting = ref(false);
  const currentRoom = ref(null);
  const currentPlayer = ref(null);
  const players = ref([]);
  const gameStatus = ref('waiting');
  const gameData = ref({});

  const resetState = () => {
    currentRoom.value = null;
    currentPlayer.value = null;
    players.value = [];
    gameStatus.value = 'waiting';
    gameData.value = {};
    error.value = null;
    loading.value = false;
  };

  return {
    isConnected,
    error,
    loading,
    connecting,
    currentRoom,
    currentPlayer,
    players,
    gameStatus,
    gameData,
    resetState,
  };
}
