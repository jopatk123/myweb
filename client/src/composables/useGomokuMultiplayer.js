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
  const roomList = ref([]); // 活跃房间列表

  // 不要在 currentPlayer 不存在时默认返回 1，返回 null 更安全，避免把未加入的用户识别为1号位
  const mySeat = computed(()=> {
    const s = currentPlayer.value && currentPlayer.value.seat;
    return s === undefined ? null : s;
  });
  const isReady = computed(()=> !!currentPlayer.value?.is_ready);
  const bothReady = computed(()=> players.value.filter(p=>p.is_ready).length===2);
  const canStart = computed(()=> players.value.length===2 && bothReady.value && gameStatus.value==='waiting');

  const events = createGomokuEvents();
  const api = new GomokuApiClient({ send });

  // register/unregister handlers helpers
  function registerHandlers(){
    if(registerHandlers._registered) {
      console.debug('[GomokuMP] Handlers already registered, skipping');
      return;
    }
    const handlers = createGomokuHandlers({ events, refs:{ currentRoom, currentPlayer, players, gameState, gameStatus, error }, state:{ isInRoom } });
    registerHandlers._handlers = handlers;
    Object.entries(handlers).forEach(([type, h])=> onMessage(type, h));
    registerHandlers._registered = true;
    console.debug('[GomokuMP] Handlers registered successfully');
  }

  function unregisterHandlers(){
    const handlers = registerHandlers._handlers;
    if(!handlers) return;
    Object.entries(handlers).forEach(([type, h])=> {
      try{
        offMessage(type, h);
      }catch (err){
        console.debug('[GomokuMP] Failed to remove handler', type, err);
      }
    });
    registerHandlers._registered = false;
    registerHandlers._handlers = null;
    console.debug('[GomokuMP] Handlers unregistered');
  }

  async function init(){ if(!isConnected.value) await connect(); registerHandlers(); }
  onMounted(()=>{ init(); });
  // 页面或组件卸载时尝试主动离开房间并注销消息处理器
  onUnmounted(()=>{ 
    try { 
      const code = currentRoom.value?.room_code || currentRoom.value?.roomCode; 
      if(code) { 
        try{ 
          api.leaveRoom(code); 
        }catch (err){
          console.debug('[GomokuMP] Failed during unmount leaveRoom call', err);
        }
      }
    } catch (err) {
      console.debug('[GomokuMP] Error while cleaning up on unmount', err);
    }
    unregisterHandlers(); 
  });

  // 如果用户关闭或刷新页面，尽量发送离开房间请求，减少服务器端残留房间
  if (typeof window !== 'undefined') {
    const beforeUnloadHandler = () => {
      try {
        const code = currentRoom.value?.room_code || currentRoom.value?.roomCode;
        if (code) {
          api.leaveRoom(code);
        }
      } catch (err){
        console.debug('[GomokuMP] beforeunload leaveRoom failed', err);
      }
    };
    window.addEventListener('beforeunload', beforeUnloadHandler);
    // 清理 listener（当组合式函数被销毁时）
    onUnmounted(() => { window.removeEventListener('beforeunload', beforeUnloadHandler); });
  }

  // 监听房间列表更新
  events.onRoomListUpdate((rooms) => {
    roomList.value = rooms;
    console.debug('[GomokuMP] Room list updated:', rooms.length, 'rooms');
  });

  function getRoomList() {
    console.debug('[GomokuMP] Requesting room list');
    api.getRoomList();
  }

  function createRoom(playerName){
    console.debug('[GomokuMP] createRoom called with playerName:', playerName);
    loading.value = true; 
    error.value = null;
    
    // 清理之前的状态
    resetRoomState();
    
    try { 
      console.debug('[GomokuMP] Sending createRoom API call');
      api.createRoom(playerName); 
    } catch(e){ 
      console.error('[GomokuMP] Failed to send create room:', e);
      error.value = e.message; 
      loading.value = false; 
      return Promise.reject(e);
    }
    console.debug('[GomokuMP] Waiting for room operation result');
    return waitRoomOperation('create');
  }
  
  function joinRoom(playerName, roomCode){
    console.debug('[GomokuMP] Joining room:', roomCode, 'for player:', playerName);
    loading.value = true; 
    error.value = null;
    
    // 清理之前的状态（除了roomList）
    resetRoomState();
    
    try { 
      api.joinRoom(playerName, roomCode); 
    } catch(e){ 
      console.error('[GomokuMP] Failed to send join room:', e);
      error.value = e.message; 
      loading.value = false; 
      return Promise.reject(e);
    }
    return waitRoomOperation('join', roomCode);
  }

  function resetRoomState() {
    console.debug('[GomokuMP] Resetting room state');
    isInRoom.value = false;
    currentRoom.value = null;
    currentPlayer.value = null;
    players.value = [];
    gameState.value = null;
    gameStatus.value = 'lobby';
    // 清理错误状态，但不清理loading状态（由操作函数自己控制）
    error.value = null;
  }

  function waitRoomOperation(operation, expectedRoomCode) {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        loading.value = false;
        const errorMsg = `${operation === 'create' ? '创建房间' : '加入房间'}超时，请重试`;
        console.error('[GomokuMP]', errorMsg);
        reject(new Error(errorMsg));
      }, 10000); // 增加到10秒

      // 监听房间状态变化
      const stopWatchRoom = watch(currentRoom, (room) => {
        if (room && (
          !expectedRoomCode || 
          room.room_code === expectedRoomCode || 
          room.roomCode === expectedRoomCode
        )) {
          console.debug('[GomokuMP] Room operation successful:', operation, room.room_code || room.roomCode);
          clearTimeout(timer);
          stopWatchRoom();
          loading.value = false;
          resolve(room);
        }
      });

      // 也监听isInRoom状态，作为备用指标
      const stopWatchInRoom = watch(isInRoom, (inRoom) => {
        if (inRoom && currentRoom.value) {
          console.debug('[GomokuMP] In room status confirmed');
          // 给currentRoom的watch一点时间先处理
          setTimeout(() => {
            if (currentRoom.value && (
              !expectedRoomCode || 
              currentRoom.value.room_code === expectedRoomCode || 
              currentRoom.value.roomCode === expectedRoomCode
            )) {
              clearTimeout(timer);
              stopWatchRoom();
              stopWatchInRoom();
              loading.value = false;
              resolve(currentRoom.value);
            }
          }, 100);
        }
      });
    });
  }
  function toggleReady(){ const code = currentRoom.value?.room_code || currentRoom.value?.roomCode; if(code) api.toggleReady(code); }
  function leaveRoom(){ 
    const code=currentRoom.value?.room_code||currentRoom.value?.roomCode; 
    console.debug('[GomokuMP] Leaving room:', code);
    
    if(code) {
      try {
        api.leaveRoom(code); 
      } catch(e) {
        console.error('[GomokuMP] Failed to send leave room:', e);
      }
    }
    
    // 完全重置状态
    resetRoomState();
    console.debug('[GomokuMP] Room state reset after leaving');
  }
  function startGame(){ const code=currentRoom.value?.room_code||currentRoom.value?.roomCode; if(code) api.startGame(code); }
  
  // expose debug-friendly variants
  function debugToggleReady(){ const code = currentRoom.value?.room_code || currentRoom.value?.roomCode; console.debug('[GomokuMP] toggleReady called, room=', code); if(code) return api.toggleReady(code); return false; }
  function debugStartGame(){ const code=currentRoom.value?.room_code||currentRoom.value?.roomCode; console.debug('[GomokuMP] startGame called, room=', code); if(code) return api.startGame(code); return false; }
  function place(row,col){ 
    console.debug('[GomokuMP] place called:', row, col, 'gameStatus:', gameStatus.value);
    if(gameStatus.value!=='playing') {
      console.warn('[GomokuMP] Game not in playing status:', gameStatus.value);
      return; 
    }
    const code=currentRoom.value?.room_code||currentRoom.value?.roomCode; 
    if(!code) {
      console.warn('[GomokuMP] No room code for place');
      return; 
    }
    console.debug('[GomokuMP] Sending place piece:', code, row, col);
    api.placePiece(code,row,col); 
  }

  return { isConnected, isInRoom, currentRoom, currentPlayer, players, gameState, gameStatus, error, loading, roomList, mySeat, isReady, canStart, bothReady, createRoom, joinRoom, toggleReady, leaveRoom, startGame, place, getRoomList, events, debugToggleReady, debugStartGame };
}
