import { ref, computed, onMounted, onUnmounted, watch } from 'vue';
import { useWebSocket } from './useWebSocket.js';
import { GomokuApiClient } from './multiplayer/gomokuApiClient.js';
import { createGomokuEvents } from './multiplayer/gomokuEvents.js';
import { createGomokuHandlers } from './multiplayer/gomokuHandlers.js';

export function useGomokuMultiplayer(){
  const { isConnected, connect, send, onMessage, offMessage } = useWebSocket();
  const isInRoom = ref(false);
  const currentRoom = ref(null);
  const currentPlayer = ref(null);
  const players = ref([]); // {session_id, player_name, is_ready, seat(1|2)}
  const gameState = ref(null); // { board: number[][], currentPlayer:1|2, winner:null|1|2 }
  const gameStatus = ref('lobby');
  const error = ref(null);
  const loading = ref(false);

  const mySeat = computed(()=> currentPlayer.value?.seat || 1);
  const isReady = computed(()=> !!currentPlayer.value?.is_ready);
  const bothReady = computed(()=> players.value.filter(p=>p.is_ready).length===2);
  const canStart = computed(()=> players.value.length===2 && bothReady.value && gameStatus.value==='waiting');

  const events = createGomokuEvents();
  const api = new GomokuApiClient({ send });

  function registerHandlers(){
    const handlers = createGomokuHandlers({ events, refs:{ currentRoom, currentPlayer, players, gameState, gameStatus, error }, state:{ isInRoom } });
    Object.entries(handlers).forEach(([type, h])=> onMessage(type, h));
  }
  function unregisterHandlers(){
    // 简单：依赖 useWebSocket 提供的 offMessage(全部)不实现；逐个移除
  }

  async function init(){ if(!isConnected.value) await connect(); registerHandlers(); }
  onMounted(()=>{ init(); });
  onUnmounted(()=>{ unregisterHandlers(); });

  function createRoom(playerName){
    loading.value = true; error.value = null;
    try { api.createRoom(playerName); } catch(e){ error.value = e.message; loading.value = false; }
    return waitRoom();
  }
  function joinRoom(playerName, roomCode){
    loading.value = true; error.value = null;
    try { api.joinRoom(playerName, roomCode); } catch(e){ error.value = e.message; loading.value = false; }
    return waitRoom(roomCode);
  }
  function waitRoom(code){ return new Promise((resolve,reject)=>{ const timer=setTimeout(()=>reject(new Error('超时')),8000); const stop=watch(currentRoom,(v)=>{ if(v && (!code || v.room_code===code || v.roomCode===code)){ clearTimeout(timer); stop(); resolve(v); } }); }); }
  function toggleReady(){ const code = currentRoom.value?.room_code || currentRoom.value?.roomCode; if(code) api.toggleReady(code); }
  function leaveRoom(){ const code=currentRoom.value?.room_code||currentRoom.value?.roomCode; if(code) api.leaveRoom(code); isInRoom.value=false; currentRoom.value=null; currentPlayer.value=null; players.value=[]; gameState.value=null; gameStatus.value='lobby'; }
  function startGame(){ const code=currentRoom.value?.room_code||currentRoom.value?.roomCode; if(code) api.startGame(code); }
  function place(row,col){ if(gameStatus.value!=='playing') return; const code=currentRoom.value?.room_code||currentRoom.value?.roomCode; if(!code) return; api.placePiece(code,row,col); }

  return { isConnected, isInRoom, currentRoom, currentPlayer, players, gameState, gameStatus, error, loading, mySeat, isReady, canStart, bothReady, createRoom, joinRoom, toggleReady, leaveRoom, startGame, place, events };
}
