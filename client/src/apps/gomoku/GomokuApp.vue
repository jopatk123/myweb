<template>
  <div class="gomoku-app">
    <!-- 模式选择层：首次打开或返回时显示 -->
    <div v-if="ui.showModeSelect" class="mode-select-overlay">
      <h2>选择模式</h2>
      <div class="mode-buttons">
        <button @click="selectAIMode">AI模式</button>
        <button @click="selectMultiplayerMode">多人模式</button>
      </div>
    </div>

    <!-- 多人模式：房间大厅/对战 -->
    <div v-else-if="ui.mode==='multiplayer'" class="gomoku-mp-wrapper">
      <!-- 使用 currentRoom 作为更可靠的空房间判断 -->
    <div v-if="showLobby" class="gomoku-room-lobby">
        <h3>五子棋多人模式</h3>
        <div class="form-row">
            <label>玩家昵称</label>
            <input v-model="mpForm.playerName" placeholder="玩家昵称" />
        </div>
        <div class="form-row">
            <label>房间码（可选）</label>
            <input v-model="mpForm.joinCode" placeholder="输入房间码加入" />
        </div>
        <div class="form-row buttons">
          <button @click="createRoom" :disabled="mpLoading">创建房间</button>
          <button @click="joinRoom" :disabled="mpLoading">加入房间</button>
          <button @click="backToModeSelect">返回</button>
        </div>
        <p class="error" v-if="mp.error">{{ mp.error }}</p>
      </div>

      <div v-else class="gomoku-room">
        <div class="room-header">
          <div>
            房间: {{ (mp.currentRoom?.room_code||mp.currentRoom?.roomCode) }}
            <span v-if="latestRoomCode" style="margin-left:8px;font-size:12px;color:#ffd">(已创建: {{ latestRoomCode }})</span>
          </div>
          <!-- 调试：可展开查看房间对象 -->
          <div v-if="false" class="room-debug" style="font-size:12px;color:#ddd">{{ roomDebug }}</div>
          <div>
            <button @click="copyRoomCode" :disabled="!(latestRoomCode||mp.currentRoom)">复制房间码</button>
            <button @click="leaveRoom">离开</button>
            <button @click="backToModeSelect">返回</button>
          </div>
        </div>
        <div class="players">
            <div v-for="p in seatSlots" :key="p.seat" :class="['player', {me: p.session_id===mp.currentPlayer?.session_id}]">
              <strong>{{ p.player_name || ('玩家' + p.seat) }}</strong>
              <span>座位: {{ p.seat||'?'}} / {{ p.is_ready? '已准备':'未准备'}}</span>
            </div>
        </div>
        <!-- 仅在需要调试时打开以下内容 -->
        <div v-if="false" style="font-size:12px;color:#bbb;margin-top:8px;">
          <div>playersDebug: {{ playersDebug }}</div>
          <div>wsDebug: {{ wsDebug }}</div>
        </div>
        <div class="actions" v-if="mp.isInRoom">
          <button @click="toggleReady">{{ mp.isReady? '取消准备':'准备' }}</button>
          <button @click="startGame" :disabled="!mp.canStart">开始对局</button>
          <div style="margin-top: 8px; font-size: 12px; color: #999;">
            Debug: gameStatus={{ unref(mp.gameStatus) }}, isInRoom={{ mp.isInRoom }}, players={{ mp.players?.length }}
          </div>
        </div>
        <div v-if="showGameBoard" class="mp-board-wrapper">
          <GomokuBoard
            ref="gomokuBoard"
            :board="mpBoard.board"
            :current-player="mpBoard.currentPlayer"
            :game-over="!!mpBoard.winner"
            :last-move="mpBoard.lastMove"
            :restrict-to-player-one="false"
            :my-player-number="unref(mp.mySeat) || 1"
            @move="onMpMove"
          />
          <div class="mp-status">
            <div>当前轮到: {{ mpBoard.currentPlayer===1? '黑':'白' }}</div>
            <div v-if="mpBoard.winner">胜者: {{ mpBoard.winner===1? '黑':'白' }}</div>
            <button v-if="unref(mp.gameStatus)==='finished'" @click="startGame" :disabled="!mp.canStart">再来一局</button>
            <div style="margin-top: 8px; font-size: 12px; color: #999;">
              Game Debug: Status={{ unref(mp.gameStatus) }}, MySeat={{ unref(mp.mySeat) }}, Board={{ mpBoard.board?.[0]?.[0] !== undefined ? 'loaded' : 'empty' }}
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 原 AI 模式界面 -->
    <div v-else>
    <!-- AI配置面板 -->
    <SimpleAIConfig
      v-if="showAIConfig"
      @close="showAIConfig = false"
      @start-game="handleConfiguredStart"
      @config-saved="handleConfigSaved"
    />

    <!-- AI违规提示模态框 -->
    <ViolationModal
      v-if="showViolation"
      :violation-data="violationData"
      :visible="showViolation"
      @close="handleViolationClose"
    />

    <!-- 游戏头部 -->
    <GomokuHeader
      :current-player="currentPlayer"
      :move-count="moveCount"
      :player-wins="playerWins"
      :total-games="totalGames"
      :game-over="gameOver"
    />

    <!-- 主游戏区域 -->
    <div class="main-game-area">
      <!-- 左侧：AI思考面板 -->
      <div class="left-panel">
        <AIThinkingPanel
          :current-thinking="currentThinking"
          :thinking-history="thinkingHistory"
          @clear-history="clearThinkingHistory"
        />
      </div>

      <!-- 中间：游戏棋盘 -->
      <div class="center-panel">
        <div class="game-container">
          <GomokuBoard
            ref="gomokuBoard"
            :board="board"
            :current-player="currentPlayer"
            :game-over="gameOver"
            :last-move="lastMove"
            @move="handlePlayerMove"
          />

          <GomokuOverlays
            :game-started="gameStarted"
            :game-over="gameOver && !hideGameOverOverlay"
            :winner="winner"
            :current-player="currentPlayer"
            :move-count="moveCount"
            :show-hint="showHint"
            :hint-position="hintPosition"
            :is-ai-thinking="isAIThinking"
            :ai-thinking-text="getAIThinkingText()"
            :game-mode="gameMode"
            :player1-name="getPlayerName(1)"
            :player2-name="getPlayerName(2)"
            @start="handleStartGame"
            @restart="handleRestartGame"
            @close-hint="closeHint"
            @config-ai="showAIConfig = true"
            @close-gameover="hideGameOverOverlay = true"
          />
        </div>

        <!-- 游戏控制 -->
        <GomokuControls
          :game-started="gameStarted"
          :game-over="gameOver"
          :current-player="currentPlayer"
          :can-undo="canUndo"
          :game-mode="gameMode"
          :is-a-i-auto-playing="isAIAutoPlaying"
          @start="handleStartGame"
          @restart="handleRestartGame"
          @undo="handleUndoMove"
          @hint="handleShowHint"
          @config-ai="showAIConfig = true"
          @stop-ai="stopAIAutoPlay()"
          @resume-ai="resumeAIAutoPlay()"
        />
      </div>

      <!-- 右侧：游戏状态面板 -->
      <div class="right-panel">
        <GameStatusPanel
          :game-mode="gameMode"
          :current-player="currentPlayer"
          :game-over="gameOver"
          :is-ai-thinking="isAIThinking"
          :current-ai-player="currentAIPlayer"
          :player1-name="getPlayerName(1)"
          :player2-name="getPlayerName(2)"
          :move-count="moveCount"
          :player-wins="playerWins"
          :total-games="totalGames"
          :last-move="lastMoveWithReasoning"
          :game-mode-info="gameModeInfo"
        />
      </div>
    </div>
  </div>
  </div>
</template>

<script setup>
import GomokuHeader from './GomokuHeader.vue';
import GomokuBoard from './GomokuBoard.vue';
import GomokuControls from './GomokuControls.vue';
import GomokuOverlays from './GomokuOverlays.vue';
import SimpleAIConfig from './components/SimpleAIConfig.vue';
import AIThinkingPanel from './components/AIThinkingPanel.vue';
import GameStatusPanel from './components/GameStatusPanel.vue';
import ViolationModal from './components/ViolationModal.vue';
import { useGomokuApp } from './composables/useGomokuApp.js';
import { useGomokuMultiplayer } from '@/composables/useGomokuMultiplayer.js';
import { reactive, ref, computed, unref, watch } from 'vue';

const app = useGomokuApp();
const mp = useGomokuMultiplayer();
const ui = reactive({ showModeSelect: true, mode: 'ai' });
const mpForm = reactive({ playerName: localStorage.getItem('gomoku_mp_name') || '玩家', joinCode: '' });
const mpBoard = reactive({ board: Array.from({length:15},()=>Array(15).fill(0)), currentPlayer:1, lastMove:null, winner:null });
const mpLoading = ref(false);
const latestRoomCode = ref(null);
const latestRoomCopied = ref(false);
// 固定两个座位槽位，优先填充来自 mp.players 的数据
const seatSlots = computed(() => {
  const slots = [ { seat:1, player_name: null, session_id: null, is_ready:false }, { seat:2, player_name: null, session_id: null, is_ready:false } ];
  try{
    const players = unref(mp.players) || [];
    console.debug('[GomokuApp] seatSlots update, players:', players);
    players.forEach(p=>{ 
      if(p && p.seat && p.seat>=1 && p.seat<=2){ 
        slots[p.seat-1] = { ...slots[p.seat-1], ...p }; 
        console.debug('[GomokuApp] Updated slot', p.seat-1, 'with player:', p);
      } 
    });
  }catch(e){
    console.error('[GomokuApp] seatSlots error:', e);
  }
  return slots;
});

// 调试用：安全地序列化 ref/响应式对象
const roomDebug = computed(() => {
  try {
    const r = unref(mp.currentRoom);
    return JSON.stringify(r || null);
  } catch (e) { return String(unref(mp.currentRoom)); }
});
const playersDebug = computed(() => {
  try { return JSON.stringify(unref(mp.players) || []); } catch (e) { return String(unref(mp.players)); }
});
const wsDebug = computed(() => {
  try { return `connected=${String(unref(mp.isConnected))} isInRoom=${String(unref(mp.isInRoom))} currentPlayer=${JSON.stringify(unref(mp.currentPlayer) || null)}`; }
  catch(e){ return '' }
});

const showLobby = computed(() => {
  try {
    const inRoom = unref(mp.isInRoom);
    const room = unref(mp.currentRoom);
    const players = unref(mp.players) || [];
    return !inRoom && (!room || players.length === 0);
  } catch (e) { return true; }
});

const showGameBoard = computed(() => {
  try {
    const status = unref(mp.gameStatus);
    return status === 'playing' || status === 'finished';
  } catch (e) { return false; }
});

function selectAIMode(){ ui.showModeSelect=false; ui.mode='ai'; }
function selectMultiplayerMode(){ ui.showModeSelect=false; ui.mode='multiplayer'; }
function backToModeSelect(){ ui.showModeSelect=true; ui.mode='ai'; }

async function createRoom(){
  mpLoading.value = true;
  try{
    const room = await mp.createRoom(mpForm.playerName);
    latestRoomCode.value = room?.room_code || room?.roomCode || null;
    console.debug('[GomokuApp] Room created successfully:', latestRoomCode.value);
  }catch(e){ 
    console.error('[GomokuApp] Failed to create room:', e);
  }
  finally{ 
    mpLoading.value=false; 
    localStorage.setItem('gomoku_mp_name', mpForm.playerName); 
  }
}
async function joinRoom(){ 
  if(!mpForm.joinCode) return; 
  mpLoading.value=true; 
  try{ 
    const room = await mp.joinRoom(mpForm.playerName, mpForm.joinCode); 
    latestRoomCode.value = room?.room_code || room?.roomCode || null; 
    console.debug('[GomokuApp] Joined room successfully:', latestRoomCode.value);
  }catch(e){
    console.error('[GomokuApp] Failed to join room:', e);
  } 
  finally{ 
    mpLoading.value=false; 
    localStorage.setItem('gomoku_mp_name', mpForm.playerName); 
  } 
}
function toggleReady(){ 
  console.debug('[GomokuApp] toggleReady called');
  mp.toggleReady(); 
}
function startGame(){ 
  console.debug('[GomokuApp] startGame called');
  mp.startGame(); 
}
function leaveRoom(){ mp.leaveRoom(); }
function onMpMove(row,col){ 
  const code = unref(mp.currentRoom)?.room_code || unref(mp.currentRoom)?.roomCode; 
  console.debug('[GomokuApp] Move attempt:', row, col, 'roomCode:', code);
  if(!code) {
    console.warn('[GomokuApp] No room code available for move');
    return; 
  }
  mp.place(row,col); 
}

function copyRoomCode(){ const code = latestRoomCode.value || mp.currentRoom?.room_code || mp.currentRoom?.roomCode; if(!code || !navigator?.clipboard) return; navigator.clipboard.writeText(code).then(()=>{ latestRoomCopied.value=true; setTimeout(()=>{ latestRoomCopied.value=false; },2000); }).catch(()=>{}); }

// 监听游戏状态变化
watch(() => mp.gameStatus, (newStatus, oldStatus) => {
  console.debug('[GomokuApp] gameStatus changed from', oldStatus, 'to', newStatus);
}, { immediate: true });

// 监听游戏板显示状态变化
watch(showGameBoard, (newShow, oldShow) => {
  console.debug('[GomokuApp] showGameBoard changed from', oldShow, 'to', newShow);
  console.debug('[GomokuApp] Current gameStatus:', unref(mp.gameStatus));
}, { immediate: true });

// 监听服务器 gameState 更新
mp.events.onGameUpdate(data=>{ 
  console.debug('[GomokuApp] GameUpdate event received:', data);
  if(!data) return; 
  const gs = data.game_state || data; 
  console.debug('[GomokuApp] Game state:', gs);
  if(gs?.board){ 
    mpBoard.board = gs.board; 
    console.debug('[GomokuApp] Updated board:', gs.board);
  } 
  if(gs?.currentPlayer) {
    mpBoard.currentPlayer = gs.currentPlayer;
    console.debug('[GomokuApp] Updated currentPlayer:', gs.currentPlayer);
  }
  mpBoard.lastMove = gs.lastMove || null; 
  mpBoard.winner = gs.winner || null;
  console.debug('[GomokuApp] Updated mpBoard:', mpBoard);
});

// 解构以便模板使用（保留原有的变量名以兼容模板）
const {
  gomokuBoard,
  showAIConfig,
  handleConfiguredStart,
  handleConfigSaved,
  showViolation,
  violationData,
  currentPlayer,
  moveCount,
  playerWins,
  totalGames,
  gameOver,
  gameStarted,
  currentThinking,
  thinkingHistory,
  clearThinkingHistory,
  board,
  lastMove,
  handlePlayerMove,
  hideGameOverOverlay,
  winner,
  showHint,
  hintPosition,
  isAIThinking,
  getAIThinkingText,
  gameMode,
  getPlayerName,
  handleStartGame,
  handleRestartGame,
  closeHint,
  stopAIAutoPlay,
  resumeAIAutoPlay,
  canUndo,
  isAIAutoPlaying,
  currentAIPlayer,
  lastMoveWithReasoning,
  gameModeInfo,
  handleUndoMove,
  handleShowHint,
  handleViolationClose
} = app;
// 逻辑已迁移到组合函数 useGomokuApp.js
</script>

<style scoped>
.gomoku-app {
/* 模式选择 */
.mode-select-overlay { position:absolute; inset:0; display:flex; flex-direction:column; align-items:center; justify-content:center; backdrop-filter: blur(6px); background:rgba(0,0,0,0.4); color:#fff; gap:20px; }
.mode-select-overlay .mode-buttons { display:flex; gap:20px; }
.mode-select-overlay button { padding:12px 28px; font-size:16px; border:none; border-radius:8px; cursor:pointer; background:#4a67ff; color:#fff; }
.gomoku-mp-wrapper { position:relative; min-height:540px; }
.gomoku-room-lobby { display:flex; flex-direction:column; gap:12px; background:rgba(255,255,255,0.15); padding:24px; border-radius:12px; }
.gomoku-room-lobby input { padding:8px 12px; border-radius:6px; border:1px solid #ccc; }
.gomoku-room-lobby .buttons { display:flex; gap:12px; }
.gomoku-room { display:flex; flex-direction:column; gap:12px; }
.room-header { display:flex; justify-content:space-between; align-items:center; background:rgba(255,255,255,0.12); padding:8px 12px; border-radius:8px; }
.players { display:flex; gap:12px; flex-wrap:wrap; }
.player { background:rgba(255,255,255,0.15); padding:8px 10px; border-radius:6px; display:flex; flex-direction:column; font-size:12px; }
.player.me { outline:2px solid #ffd24d; }
.actions { display:flex; gap:12px; }
.mp-board-wrapper { display:flex; flex-direction:column; align-items:center; gap:8px; }
.mp-status { color:#fff; display:flex; flex-direction:column; gap:6px; }
.error { color:#ff8080; }
  display: flex;
  flex-direction: column;
  padding: 20px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border-radius: 15px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2);
  font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
  min-height: 600px;
  position: relative;
}

.main-game-area {
  display: grid;
  grid-template-columns: 1fr 2fr 1fr;
  gap: 20px;
  align-items: start;
  flex: 1;
}

.left-panel,
.right-panel {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.center-panel {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 20px;
}

.game-container {
  position: relative;
  display: flex;
  justify-content: center;
}

/* 响应式布局 */
@media (max-width: 1200px) {
  .main-game-area {
    grid-template-columns: 1fr 1.5fr 1fr;
    gap: 15px;
  }
}

@media (max-width: 992px) {
  .main-game-area {
    grid-template-columns: 1fr;
    gap: 20px;
  }
  
  .left-panel,
  .right-panel {
    order: 2;
  }
  
  .center-panel {
    order: 1;
  }
}

@media (max-width: 768px) {
  .gomoku-app {
    padding: 15px;
    min-height: auto;
  }
  
  .main-game-area {
    gap: 15px;
  }
  
  .left-panel,
  .right-panel {
    gap: 15px;
  }
  
  .center-panel {
    gap: 15px;
  }
}

@media (max-width: 576px) {
  .gomoku-app {
    padding: 10px;
  }
  
  .main-game-area {
    gap: 10px;
  }
}

/* 确保面板在小屏幕上的可读性 */
@media (max-width: 480px) {
  .left-panel,
  .right-panel {
    font-size: 0.9rem;
  }
}
</style>