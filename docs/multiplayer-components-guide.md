# 多人游戏通用组件库使用指南

## 📖 目录

- [概述](#概述)
- [快速开始](#快速开始)
- [架构设计](#架构设计)
- [服务端组件](#服务端组件)
- [前端组件](#前端组件)
- [使用示例](#使用示例)
- [最佳实践](#最佳实践)
- [故障排除](#故障排除)

## 🎯 概述

本多人游戏通用组件库提供了一套完整的多人游戏开发解决方案，支持：

- **多种游戏类型**：贪吃蛇、五子棋、象棋、坦克大战等
- **多种游戏模式**：竞技模式、共享模式、合作模式、大逃杀模式
- **实时通信**：基于WebSocket的实时数据同步
- **房间管理**：创建、加入、离开房间
- **玩家管理**：在线状态、准备状态、断线重连
- **统计系统**：游戏记录、排行榜、玩家统计

### ✨ 核心特性

- 🎮 **高复用性** - 一套代码支持多种游戏
- 🔧 **高可配置** - 灵活的配置系统
- 📱 **响应式设计** - 支持桌面和移动端
- 🚀 **高性能** - 优化的数据库查询和内存管理
- 🛡️ **高可靠性** - 完善的错误处理和恢复机制

## 🚀 快速开始

### 1. 服务端集成

#### 1.1 注册游戏类型

```javascript
// server/src/app.js
import { gameServiceFactory, registerPredefinedGames } from './services/multiplayer/game-service-factory.js';

// 方式1: 使用预定义游戏
registerPredefinedGames();

// 方式2: 自定义游戏
gameServiceFactory.register('my-game', {
  minPlayers: 2,
  maxPlayers: 4,
  modes: ['competitive', 'cooperative'],
  features: ['spectating', 'chat']
});
```

#### 1.2 创建游戏服务

```javascript
// server/src/controllers/my-game.controller.js
import { createGameService } from '../services/multiplayer/game-service-factory.js';

export class MyGameController {
  constructor(wsService) {
    this.gameService = createGameService('my-game', wsService);
  }

  async createRoom(req, res) {
    try {
      const { player_name, mode, ...config } = req.body;
      const sessionId = req.sessionID;
      
      const result = await this.gameService.createRoom(
        sessionId, 
        player_name, 
        { mode }, 
        config
      );
      
      res.json(result);
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  }
}
```

### 2. 前端集成

#### 2.1 基础使用

```vue
<!-- MyGameLobby.vue -->
<template>
  <GameLobby
    title="我的游戏大厅"
    game-type="my-game"
    :game-modes="gameModes"
    :is-connected="isConnected"
    :loading="loading"
    :error="error"
    :active-rooms="activeRooms"
    @quick-join="handleQuickJoin"
    @create-room="handleCreateRoom"
    @join-room="handleJoinRoom"
    @refresh-rooms="handleRefreshRooms"
  />
</template>

<script setup>
import { ref } from 'vue';
import { GameLobby, useMultiplayerRoom } from '@/components/multiplayer';

const gameModes = [
  { value: 'competitive', label: '竞技模式', icon: '⚔️' },
  { value: 'cooperative', label: '合作模式', icon: '🤝' }
];

const {
  isConnected,
  loading,
  error,
  createRoom,
  joinRoom,
  quickJoin,
  getRoomList
} = useMultiplayerRoom({ gameType: 'my-game' });

const activeRooms = ref([]);

const handleQuickJoin = async (data) => {
  await quickJoin(data.playerName, data.mode);
};

const handleCreateRoom = async (data) => {
  await createRoom(data.playerName, data);
};

const handleJoinRoom = async (data) => {
  await joinRoom(data.playerName, data.roomCode);
};

const handleRefreshRooms = async () => {
  const rooms = await getRoomList();
  activeRooms.value = rooms;
};
</script>
```

## 🏗️ 架构设计

### 分层架构

```
┌─────────────────────────────────────────────┐
│                前端组件层                    │
├─────────────────────────────────────────────┤
│                组合式函数层                  │
├─────────────────────────────────────────────┤
│                WebSocket层                   │
├─────────────────────────────────────────────┤
│                控制器层                      │
├─────────────────────────────────────────────┤
│                服务层                        │
├─────────────────────────────────────────────┤
│                数据模型层                    │
├─────────────────────────────────────────────┤
│                数据库层                      │
└─────────────────────────────────────────────┘
```

### 服务端架构

```
BaseMultiplayerService (基础服务)
         ↓
RoomManagerService (房间管理服务)
         ↓
GameSpecificService (游戏特定服务)
```

### 前端架构

```
GameLobby (游戏大厅)
    ├── QuickStart (快速开始)
    ├── RoomList (房间列表)
    └── CreateRoomModal (创建房间)

GameRoom (游戏房间)
    ├── PlayerList (玩家列表)
    ├── ReadyControls (准备控制)
    └── GamePanel (游戏面板)
```

## 🛠️ 服务端组件

### BaseMultiplayerService

基础多人游戏服务，提供核心功能：

```javascript
export class BaseMultiplayerService {
  constructor(wsService, options = {}) {
    this.wsService = wsService;
    this.gameStates = new Map();
    this.gameTimers = new Map();
    this.options = { ...defaultOptions, ...options };
  }

  // 核心方法
  broadcastToRoom(roomId, eventType, data) { /* ... */ }
  sendToPlayer(sessionId, eventType, data) { /* ... */ }
  initGameState(roomId, mode, config) { /* ... */ }
  cleanupGameResources(roomId) { /* ... */ }
}
```

**主要功能：**
- WebSocket消息广播
- 游戏状态管理
- 定时器管理
- 资源清理

### RoomManagerService

房间管理服务，继承自BaseMultiplayerService：

```javascript
export class RoomManagerService extends BaseMultiplayerService {
  constructor(wsService, RoomModel, PlayerModel, options = {}) {
    super(wsService, options);
    this.RoomModel = RoomModel;
    this.PlayerModel = PlayerModel;
  }

  // 房间操作
  createRoom(sessionId, playerName, roomData, gameConfig) { /* ... */ }
  joinRoom(sessionId, playerName, roomCode) { /* ... */ }
  leaveRoom(sessionId, roomId) { /* ... */ }
  
  // 游戏控制
  startGame(roomId, hostSessionId) { /* ... */ }
  endGame(roomId, gameResult) { /* ... */ }
}
```

**主要功能：**
- 房间创建、加入、离开
- 玩家状态管理
- 游戏生命周期控制
- 自动清理机制

### GameServiceFactory

游戏服务工厂，管理多种游戏类型：

```javascript
// 注册游戏类型
gameServiceFactory.register('snake', {
  minPlayers: 1,
  maxPlayers: 8,
  modes: ['shared', 'competitive'],
  features: ['voting', 'spectating']
});

// 获取游戏服务
const snakeService = gameServiceFactory.getService('snake', wsService);
```

**主要功能：**
- 游戏类型注册
- 服务实例管理
- 数据表自动创建
- 配置管理

### 数据模型

#### 通用房间模型

```javascript
export class GenericRoomModel extends AbstractRoomModel {
  static create(roomData) { /* ... */ }
  static findByRoomCode(roomCode) { /* ... */ }
  static update(roomId, updates) { /* ... */ }
  static getActiveRooms(filters) { /* ... */ }
}
```

#### 通用玩家模型

```javascript
export class GenericPlayerModel extends AbstractPlayerModel {
  static create(playerData) { /* ... */ }
  static findByRoomAndSession(roomId, sessionId) { /* ... */ }
  static getPlayerStats(sessionId) { /* ... */ }
  static getLeaderboard(options) { /* ... */ }
}
```

## 🎨 前端组件

### GameLobby 游戏大厅

主要的大厅组件，支持高度定制：

```vue
<GameLobby
  title="游戏大厅"
  game-type="snake"
  :game-modes="gameModes"
  :preset="'full'"
  :theme="'dark'"
  :auto-refresh="true"
  @quick-join="handleQuickJoin"
  @create-room="handleCreateRoom"
>
  <!-- 自定义模式选择器 -->
  <template #mode-selector="{ selectedMode, onModeChange }">
    <CustomModeSelector 
      :selected="selectedMode" 
      @change="onModeChange" 
    />
  </template>
  
  <!-- 自定义房间信息 -->
  <template #room-extra="{ room }">
    <div class="room-difficulty">
      难度: {{ room.game_settings.difficulty }}
    </div>
  </template>
</GameLobby>
```

**Props：**
- `title`: 大厅标题
- `gameType`: 游戏类型
- `gameModes`: 游戏模式列表
- `preset`: 组件预设 (`minimal` | `quickStart` | `full`)
- `theme`: 主题 (`light` | `dark` | `auto`)
- `autoRefresh`: 自动刷新房间列表

**插槽：**
- `mode-selector`: 自定义模式选择器
- `room-extra`: 房间额外信息
- `room-actions`: 房间操作按钮
- `header-actions`: 头部操作按钮

### useMultiplayerRoom 组合式函数

核心的房间管理钩子：

```javascript
const {
  // 状态
  isConnected,
  loading,
  error,
  currentRoom,
  currentPlayer,
  players,
  gameStatus,
  gameData,
  
  // 计算属性
  isHost,
  canStartGame,
  roomInfo,
  
  // 方法
  createRoom,
  joinRoom,
  leaveRoom,
  toggleReady,
  startGame,
  sendGameMessage,
  
  // 扩展API
  registerHandler,
  unregisterHandler
} = useMultiplayerRoom({
  gameType: 'snake',
  autoConnect: true,
  reconnectDelay: 1000
});
```

**选项：**
- `gameType`: 游戏类型
- `apiPrefix`: API前缀
- `autoConnect`: 自动连接
- `reconnectDelay`: 重连延迟
- `defaultConfig`: 默认房间配置

### 其他组件

#### RoomCard 房间卡片

```vue
<RoomCard
  :room="room"
  :game-config="gameConfig"
  @join="handleJoin"
/>
```

#### PlayerList 玩家列表

```vue
<PlayerList
  :players="players"
  :current-player="currentPlayer"
  :show-ready-status="true"
  :show-scores="true"
/>
```

#### ReadyControls 准备控制

```vue
<ReadyControls
  :is-ready="currentPlayer?.is_ready"
  :can-start="canStartGame"
  :is-host="isHost"
  @toggle-ready="toggleReady"
  @start-game="startGame"
/>
```

## 📚 使用示例

### 示例1：创建贪吃蛇游戏

#### 服务端

```javascript
// 1. 注册游戏类型
gameServiceFactory.register('snake', {
  minPlayers: 1,
  maxPlayers: 8,
  modes: ['shared', 'competitive'],
  defaultGameConfig: {
    boardSize: 20,
    gameSpeed: 150,
    voteTimeout: 3000
  }
});

// 2. 创建控制器
export class SnakeController {
  constructor(wsService) {
    this.gameService = createGameService('snake', wsService);
  }

  async createRoom(req, res) {
    const { player_name, mode, board_size = 20 } = req.body;
    const result = await this.gameService.createRoom(
      req.sessionID,
      player_name,
      { mode },
      { boardSize: board_size }
    );
    res.json(result);
  }
}

// 3. WebSocket处理
wsService.on('snake_move', (data, sessionId) => {
  const gameService = createGameService('snake', wsService);
  gameService.handleMove(data.roomId, sessionId, data.direction);
});
```

#### 前端

```vue
<!-- SnakeGame.vue -->
<template>
  <div class="snake-game">
    <!-- 大厅模式 -->
    <GameLobby
      v-if="mode === 'lobby'"
      title="贪吃蛇多人游戏"
      game-type="snake"
      :game-modes="snakeModes"
      :is-connected="isConnected"
      :loading="loading"
      :error="error"
      :active-rooms="activeRooms"
      @quick-join="handleQuickJoin"
      @create-room="handleCreateRoom"
      @join-room="handleJoinRoom"
    >
      <template #create-room-form="{ roomConfig, onConfigChange }">
        <div class="snake-settings">
          <label>棋盘大小:</label>
          <select 
            :value="roomConfig.boardSize" 
            @change="onConfigChange('boardSize', $event.target.value)"
          >
            <option value="15">15x15</option>
            <option value="20">20x20</option>
            <option value="25">25x25</option>
          </select>
        </div>
      </template>
    </GameLobby>

    <!-- 房间模式 -->
    <div v-else-if="mode === 'room'" class="game-room">
      <div class="room-header">
        <h3>房间: {{ roomInfo?.code }}</h3>
        <button @click="leaveRoom">离开房间</button>
      </div>

      <div class="room-content">
        <PlayerList
          :players="players"
          :current-player="currentPlayer"
          :show-ready-status="true"
        />

        <ReadyControls
          :is-ready="currentPlayer?.is_ready"
          :can-start="canStartGame"
          :is-host="isHost"
          @toggle-ready="toggleReady"
          @start-game="startGame"
        />

        <SnakeGameBoard
          v-if="gameStatus === 'playing'"
          :game-data="gameData"
          @move="handleMove"
        />
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue';
import { 
  GameLobby, 
  PlayerList, 
  ReadyControls, 
  useMultiplayerRoom 
} from '@/components/multiplayer';

const mode = ref('lobby');

const snakeModes = [
  { value: 'shared', label: '共享模式', icon: '🤝', description: '多人控制一条蛇' },
  { value: 'competitive', label: '竞技模式', icon: '⚔️', description: '双蛇对战' }
];

const {
  isConnected,
  loading,
  error,
  currentRoom,
  currentPlayer,
  players,
  gameStatus,
  gameData,
  isHost,
  canStartGame,
  roomInfo,
  createRoom,
  joinRoom,
  leaveRoom,
  toggleReady,
  startGame,
  sendGameMessage,
  registerHandler
} = useMultiplayerRoom({ gameType: 'snake' });

// 处理游戏特定消息
registerHandler('snake_update', (data) => {
  gameData.value = { ...gameData.value, ...data };
});

registerHandler('room_joined', () => {
  mode.value = 'room';
});

registerHandler('room_left', () => {
  mode.value = 'lobby';
});

const handleMove = (direction) => {
  sendGameMessage('snake_move', { direction });
};

const handleQuickJoin = async (data) => {
  await quickJoin(data.playerName, data.mode);
};

const handleCreateRoom = async (data) => {
  await createRoom(data.playerName, data);
};

const handleJoinRoom = async (data) => {
  await joinRoom(data.playerName, data.roomCode);
};
</script>
```

### 示例2：创建五子棋游戏

#### 服务端

```javascript
// 1. 注册五子棋游戏
gameServiceFactory.register('gomoku', {
  minPlayers: 2,
  maxPlayers: 2,
  modes: ['competitive'],
  features: ['spectating', 'undo'],
  defaultGameConfig: {
    boardSize: 15,
    timeLimit: 300,
    allowUndo: true
  },
  extraRoomColumns: 'board_size INTEGER DEFAULT 15, time_limit INTEGER',
  extraPlayerColumns: 'moves_count INTEGER DEFAULT 0, time_used INTEGER DEFAULT 0'
});

// 2. 创建五子棋特定服务
export class GomokuGameService extends RoomManagerService {
  constructor(wsService) {
    const RoomModel = gameServiceFactory.createRoomModel('gomoku');
    const PlayerModel = gameServiceFactory.createPlayerModel('gomoku');
    super(wsService, RoomModel, PlayerModel, { gameType: 'gomoku' });
  }

  async placePiece(roomId, sessionId, x, y) {
    const gameState = this.getGameState(roomId);
    if (!gameState || gameState.status !== 'playing') {
      throw new Error('游戏未进行中');
    }

    // 验证落子合法性
    if (gameState.board[y][x] !== 0) {
      throw new Error('该位置已有棋子');
    }

    // 更新游戏状态
    const player = await this.PlayerModel.findByRoomAndSession(roomId, sessionId);
    const pieceType = player.player_color === '#000000' ? 1 : 2; // 黑白棋
    
    gameState.board[y][x] = pieceType;
    gameState.currentPlayer = gameState.currentPlayer === 1 ? 2 : 1;

    // 检查胜利条件
    const winner = this.checkWinner(gameState.board, x, y, pieceType);
    if (winner) {
      await this.endGame(roomId, { winner: sessionId, type: 'five_in_row' });
    } else {
      // 广播落子
      this.broadcastToRoom(roomId, 'piece_placed', {
        x, y, pieceType, 
        currentPlayer: gameState.currentPlayer,
        board: gameState.board
      });
    }
  }

  checkWinner(board, x, y, pieceType) {
    // 实现五子连珠检测逻辑
    const directions = [
      [0, 1], [1, 0], [1, 1], [1, -1] // 水平、垂直、对角线
    ];

    for (const [dx, dy] of directions) {
      let count = 1;
      
      // 正方向计数
      for (let i = 1; i < 5; i++) {
        const nx = x + dx * i;
        const ny = y + dy * i;
        if (nx < 0 || nx >= 15 || ny < 0 || ny >= 15) break;
        if (board[ny][nx] !== pieceType) break;
        count++;
      }
      
      // 反方向计数
      for (let i = 1; i < 5; i++) {
        const nx = x - dx * i;
        const ny = y - dy * i;
        if (nx < 0 || nx >= 15 || ny < 0 || ny >= 15) break;
        if (board[ny][nx] !== pieceType) break;
        count++;
      }
      
      if (count >= 5) return true;
    }
    
    return false;
  }

  initGameState(roomId, mode, config) {
    const gameState = super.initGameState(roomId, mode, config);
    gameState.board = Array(15).fill().map(() => Array(15).fill(0));
    gameState.currentPlayer = 1; // 黑子先手
    gameState.moveHistory = [];
    return gameState;
  }
}

// 3. 注册自定义服务
gameServiceFactory.register('gomoku', 
  PREDEFINED_GAMES.gomoku, 
  GomokuGameService
);
```

#### 前端

```vue
<!-- GomokuGame.vue -->
<template>
  <div class="gomoku-game">
    <GameLobby
      v-if="mode === 'lobby'"
      title="五子棋对战"
      game-type="gomoku"
      :game-modes="gomokuModes"
      preset="minimal"
      :is-connected="isConnected"
      @quick-join="handleQuickJoin"
      @join-room="handleJoinRoom"
    />

    <div v-else class="gomoku-room">
      <div class="game-info">
        <div class="current-player">
          当前回合: {{ currentPlayerColor }}
        </div>
        <div class="timer">
          剩余时间: {{ formatTime(timeRemaining) }}
        </div>
      </div>

      <GomokuBoard
        :board="gameData.board"
        :current-player="gameData.currentPlayer"
        :disabled="!isMyTurn"
        @place-piece="handlePlacePiece"
      />

      <PlayerList
        :players="players"
        :current-player="currentPlayer"
        :show-scores="false"
      />
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue';
import { GameLobby, PlayerList, useMultiplayerRoom } from '@/components/multiplayer';

const mode = ref('lobby');

const gomokuModes = [
  { value: 'competitive', label: '对战模式', icon: '⚔️' }
];

const {
  isConnected,
  currentPlayer,
  players,
  gameData,
  sendGameMessage,
  registerHandler
} = useMultiplayerRoom({ gameType: 'gomoku' });

const isMyTurn = computed(() => {
  const playerIndex = players.value.findIndex(p => p.session_id === currentPlayer.value?.session_id);
  return gameData.value.currentPlayer === playerIndex + 1;
});

const currentPlayerColor = computed(() => {
  return gameData.value.currentPlayer === 1 ? '黑子' : '白子';
});

const handlePlacePiece = ({ x, y }) => {
  if (isMyTurn.value) {
    sendGameMessage('place_piece', { x, y });
  }
};

registerHandler('piece_placed', (data) => {
  gameData.value = { ...gameData.value, ...data };
});

registerHandler('room_joined', () => {
  mode.value = 'room';
});
</script>
```

## 🎯 最佳实践

### 1. 服务端最佳实践

#### 错误处理

```javascript
export class GameController {
  async createRoom(req, res) {
    try {
      // 验证输入
      const validation = this.validateCreateRoomInput(req.body);
      if (!validation.isValid) {
        return res.status(400).json({ 
          error: '输入验证失败', 
          details: validation.errors 
        });
      }

      const result = await this.gameService.createRoom(/*...*/);
      res.json(result);
    } catch (error) {
      console.error('创建房间失败:', error);
      res.status(500).json({ 
        error: '创建房间失败', 
        message: error.message 
      });
    }
  }

  validateCreateRoomInput(data) {
    const errors = [];
    
    if (!data.player_name || data.player_name.trim().length === 0) {
      errors.push('玩家名称不能为空');
    }
    
    if (data.player_name && data.player_name.length > 20) {
      errors.push('玩家名称不能超过20个字符');
    }
    
    return {
      isValid: errors.length === 0,
      errors
    };
  }
}
```

#### 资源管理

```javascript
export class GameService extends RoomManagerService {
  constructor(wsService, RoomModel, PlayerModel, options) {
    super(wsService, RoomModel, PlayerModel, options);
    
    // 设置清理定时器
    this.setupCleanupTimers();
  }

  setupCleanupTimers() {
    // 每5分钟清理一次空房间
    setInterval(() => {
      this.cleanupEmptyRooms();
    }, 5 * 60 * 1000);

    // 每小时清理一次非活跃玩家
    setInterval(() => {
      this.PlayerModel.cleanupInactivePlayers(24);
    }, 60 * 60 * 1000);

    // 每天清理一次历史记录
    setInterval(() => {
      this.RoomModel.cleanupOldRooms(7 * 24);
    }, 24 * 60 * 60 * 1000);
  }
}
```

#### 性能优化

```javascript
export class OptimizedGameService extends RoomManagerService {
  constructor(wsService, RoomModel, PlayerModel, options) {
    super(wsService, RoomModel, PlayerModel, options);
    
    // 缓存活跃房间列表
    this.roomListCache = null;
    this.roomListCacheTime = 0;
    this.cacheTimeout = 10000; // 10秒缓存
  }

  async getActiveRooms(filters = {}) {
    const now = Date.now();
    
    // 使用缓存
    if (this.roomListCache && (now - this.roomListCacheTime) < this.cacheTimeout) {
      return this.roomListCache.filter(room => this.matchesFilters(room, filters));
    }
    
    // 重新获取
    this.roomListCache = await super.getActiveRooms();
    this.roomListCacheTime = now;
    
    return this.roomListCache.filter(room => this.matchesFilters(room, filters));
  }

  invalidateRoomListCache() {
    this.roomListCache = null;
  }

  // 重写房间操作方法以使缓存失效
  async createRoom(...args) {
    const result = await super.createRoom(...args);
    this.invalidateRoomListCache();
    return result;
  }
}
```

### 2. 前端最佳实践

#### 组件解耦

```vue
<!-- 好的做法：使用组合式函数 -->
<template>
  <GameLobby v-bind="lobbyProps" v-on="lobbyEvents" />
</template>

<script setup>
import { useGameLobby } from '@/composables/useGameLobby';

const { lobbyProps, lobbyEvents } = useGameLobby('snake');
</script>
```

```javascript
// composables/useGameLobby.js
export function useGameLobby(gameType) {
  const {
    isConnected,
    loading,
    error,
    createRoom,
    joinRoom,
    quickJoin,
    getRoomList
  } = useMultiplayerRoom({ gameType });

  const activeRooms = ref([]);

  const lobbyProps = computed(() => ({
    gameType,
    isConnected: isConnected.value,
    loading: loading.value,
    error: error.value,
    activeRooms: activeRooms.value
  }));

  const lobbyEvents = {
    'quick-join': handleQuickJoin,
    'create-room': handleCreateRoom,
    'join-room': handleJoinRoom,
    'refresh-rooms': handleRefreshRooms
  };

  return { lobbyProps, lobbyEvents };
}
```

#### 错误处理

```javascript
// composables/useErrorHandler.js
export function useErrorHandler() {
  const error = ref(null);
  const loading = ref(false);

  const handleAsync = async (asyncFn, errorMessage = '操作失败') => {
    try {
      loading.value = true;
      error.value = null;
      return await asyncFn();
    } catch (err) {
      console.error(errorMessage, err);
      error.value = err.message || errorMessage;
      throw err;
    } finally {
      loading.value = false;
    }
  };

  const clearError = () => {
    error.value = null;
  };

  return {
    error: readonly(error),
    loading: readonly(loading),
    handleAsync,
    clearError
  };
}
```

#### 状态管理

```javascript
// stores/gameStore.js
import { defineStore } from 'pinia';

export const useGameStore = defineStore('game', () => {
  const currentGame = ref(null);
  const gameHistory = ref([]);

  const setCurrentGame = (game) => {
    currentGame.value = game;
  };

  const addGameRecord = (record) => {
    gameHistory.value.unshift(record);
    // 只保留最近100条记录
    if (gameHistory.value.length > 100) {
      gameHistory.value = gameHistory.value.slice(0, 100);
    }
  };

  const getGameStats = computed(() => {
    return gameHistory.value.reduce((stats, game) => {
      stats.totalGames++;
      if (game.result === 'win') stats.wins++;
      stats.totalScore += game.score || 0;
      return stats;
    }, { totalGames: 0, wins: 0, totalScore: 0 });
  });

  return {
    currentGame: readonly(currentGame),
    gameHistory: readonly(gameHistory),
    gameStats: getGameStats,
    setCurrentGame,
    addGameRecord
  };
});
```

### 3. 通用最佳实践

#### 配置管理

```javascript
// config/games.js
export const GAME_CONFIGS = {
  snake: {
    name: '贪吃蛇',
    minPlayers: 1,
    maxPlayers: 8,
    modes: ['shared', 'competitive'],
    settings: {
      boardSize: { type: 'select', options: [15, 20, 25], default: 20 },
      gameSpeed: { type: 'range', min: 50, max: 300, default: 150 },
      enablePowerUps: { type: 'boolean', default: false }
    }
  },
  
  gomoku: {
    name: '五子棋',
    minPlayers: 2,
    maxPlayers: 2,
    modes: ['competitive'],
    settings: {
      timeLimit: { type: 'select', options: [60, 300, 600], default: 300 },
      allowUndo: { type: 'boolean', default: true },
      boardSize: { type: 'select', options: [15, 19], default: 15 }
    }
  }
};
```

#### 数据验证

```javascript
// utils/validation.js
export class GameValidator {
  static validatePlayerName(name) {
    const trimmed = name.trim();
    const errors = [];

    if (trimmed.length === 0) {
      errors.push('玩家名称不能为空');
    }

    if (trimmed.length > 20) {
      errors.push('玩家名称不能超过20个字符');
    }

    if (!/^[\u4e00-\u9fa5a-zA-Z0-9_-]+$/.test(trimmed)) {
      errors.push('玩家名称只能包含中文、英文、数字、下划线和连字符');
    }

    return {
      isValid: errors.length === 0,
      errors,
      value: trimmed
    };
  }

  static validateRoomConfig(gameType, config) {
    const gameConfig = GAME_CONFIGS[gameType];
    if (!gameConfig) {
      return { isValid: false, errors: ['不支持的游戏类型'] };
    }

    const errors = [];
    const validatedConfig = {};

    Object.entries(gameConfig.settings).forEach(([key, setting]) => {
      const value = config[key];
      
      switch (setting.type) {
        case 'select':
          if (value !== undefined && !setting.options.includes(value)) {
            errors.push(`${key} 的值必须是 ${setting.options.join(', ')} 之一`);
          }
          validatedConfig[key] = value || setting.default;
          break;
          
        case 'range':
          if (value !== undefined && (value < setting.min || value > setting.max)) {
            errors.push(`${key} 的值必须在 ${setting.min} 到 ${setting.max} 之间`);
          }
          validatedConfig[key] = value || setting.default;
          break;
          
        case 'boolean':
          validatedConfig[key] = value !== undefined ? Boolean(value) : setting.default;
          break;
      }
    });

    return {
      isValid: errors.length === 0,
      errors,
      validatedConfig
    };
  }
}
```

## 🐛 故障排除

### 常见问题

#### 1. WebSocket连接失败

**问题：** 前端无法连接到WebSocket服务器

**解决方案：**
```javascript
// 检查WebSocket URL配置
const wsUrl = process.env.NODE_ENV === 'production' 
  ? 'wss://your-domain.com/ws'
  : 'ws://localhost:3000/ws';

// 添加重连逻辑
const connectWithRetry = async (maxRetries = 5) => {
  for (let i = 0; i < maxRetries; i++) {
    try {
      await connect();
      break;
    } catch (error) {
      console.log(`连接失败，${3}秒后重试 (${i + 1}/${maxRetries})`);
      await new Promise(resolve => setTimeout(resolve, 3000));
    }
  }
};
```

#### 2. 房间状态不同步

**问题：** 客户端房间状态与服务器不一致

**解决方案：**
```javascript
// 服务端：确保广播消息
this.broadcastToRoom(roomId, 'room_updated', {
  room: updatedRoom,
  players: updatedPlayers,
  timestamp: Date.now()
});

// 客户端：处理状态同步
registerHandler('room_updated', (data) => {
  currentRoom.value = data.room;
  players.value = data.players;
  lastSync.value = data.timestamp;
});

// 定期同步检查
setInterval(() => {
  if (Date.now() - lastSync.value > 30000) {
    // 30秒未收到更新，请求同步
    sendMessage('request_sync', { roomId: currentRoom.value.id });
  }
}, 10000);
```

#### 3. 内存泄漏

**问题：** 长时间运行后内存使用过高

**解决方案：**
```javascript
// 服务端：及时清理资源
export class LeakFreeGameService extends RoomManagerService {
  cleanupGameResources(roomId) {
    // 清理游戏状态
    super.cleanupGameResources(roomId);
    
    // 清理事件监听器
    this.wsService.removeAllListeners(`room_${roomId}`);
    
    // 清理定时器
    const timers = this.gameTimers.get(roomId);
    if (timers) {
      Object.values(timers).forEach(timer => {
        if (timer) clearInterval(timer);
      });
    }
    
    // 强制垃圾回收（开发环境）
    if (process.env.NODE_ENV === 'development' && global.gc) {
      global.gc();
    }
  }
}

// 客户端：清理组件
onUnmounted(() => {
  // 移除所有事件监听器
  Object.keys(coreHandlers).forEach(event => {
    offMessage(event);
  });
  
  // 断开连接
  disconnect();
  
  // 清理定时器
  if (refreshTimer.value) {
    clearInterval(refreshTimer.value);
  }
});
```

#### 4. 性能问题

**问题：** 大量玩家时性能下降

**解决方案：**
```javascript
// 服务端：批量处理和限流
export class OptimizedBroadcast {
  constructor() {
    this.messageQueue = new Map(); // roomId -> messages[]
    this.batchInterval = 50; // 50ms批量发送
    this.setupBatchSending();
  }

  queueBroadcast(roomId, eventType, data) {
    if (!this.messageQueue.has(roomId)) {
      this.messageQueue.set(roomId, []);
    }
    
    this.messageQueue.get(roomId).push({ eventType, data, timestamp: Date.now() });
  }

  setupBatchSending() {
    setInterval(() => {
      for (const [roomId, messages] of this.messageQueue) {
        if (messages.length > 0) {
          // 合并相同类型的消息
          const merged = this.mergeMessages(messages);
          merged.forEach(msg => {
            this.wsService.broadcastToRoom(roomId, msg.eventType, msg.data);
          });
          
          this.messageQueue.set(roomId, []);
        }
      }
    }, this.batchInterval);
  }
}

// 客户端：虚拟列表和防抖
import { debounce } from 'lodash-es';

const debouncedRefresh = debounce(() => {
  refreshRooms();
}, 1000);

// 使用虚拟列表渲染大量房间
const virtualizedRooms = computed(() => {
  const startIndex = Math.max(0, scrollTop.value - bufferSize);
  const endIndex = Math.min(activeRooms.value.length, startIndex + visibleCount + bufferSize);
  return activeRooms.value.slice(startIndex, endIndex);
});
```

### 调试技巧

#### 1. 开启详细日志

```javascript
// 服务端
export class DebugGameService extends RoomManagerService {
  constructor(wsService, RoomModel, PlayerModel, options) {
    super(wsService, RoomModel, PlayerModel, {
      ...options,
      enableDebug: process.env.NODE_ENV === 'development'
    });
  }

  broadcastToRoom(roomId, eventType, data) {
    if (this.options.enableDebug) {
      console.log(`[DEBUG] 广播到房间 ${roomId}:`, { eventType, data });
    }
    super.broadcastToRoom(roomId, eventType, data);
  }
}

// 客户端
const debugMode = ref(process.env.NODE_ENV === 'development');

if (debugMode.value) {
  // 记录所有消息
  const originalRegisterHandler = registerHandler;
  registerHandler = (event, handler) => {
    originalRegisterHandler(event, (data) => {
      console.log(`[DEBUG] 收到消息 ${event}:`, data);
      handler(data);
    });
  };
}
```

#### 2. 状态检查工具

```javascript
// 开发者工具
if (process.env.NODE_ENV === 'development') {
  window.gameDebug = {
    // 获取当前游戏状态
    getGameState: () => ({
      isConnected: isConnected.value,
      currentRoom: currentRoom.value,
      players: players.value,
      gameStatus: gameStatus.value,
      gameData: gameData.value
    }),
    
    // 强制重连
    forceReconnect: () => {
      disconnect();
      setTimeout(connectToServer, 1000);
    },
    
    // 模拟网络延迟
    simulateLatency: (ms) => {
      const originalSend = sendMessage;
      sendMessage = (type, data) => {
        setTimeout(() => originalSend(type, data), ms);
      };
    }
  };
}
```

## 📖 总结

通过本指南，你应该能够：

1. **理解架构** - 掌握多人游戏组件库的整体架构
2. **快速上手** - 使用现有组件快速构建多人游戏
3. **自定义扩展** - 根据需求扩展和定制组件
4. **最佳实践** - 遵循推荐的开发模式
5. **问题排查** - 解决常见的开发和运行问题

这套组件库设计为高度可复用和可扩展的，可以支持各种类型的多人游戏开发。通过合理使用这些组件和模式，可以大大减少重复开发工作，提高开发效率。

如有问题或建议，欢迎参与贡献和改进！
