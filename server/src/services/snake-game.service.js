/**
 * 贪吃蛇游戏特定服务
 * 继承自房间管理服务，专注于贪吃蛇游戏逻辑
 */
import { RoomManagerService } from './multiplayer/room-manager.service.js';
import { SnakeRoomModel } from '../models/snake-room.model.js';
import { SnakePlayerModel } from '../models/snake-player.model.js';
import { SnakeGameRecordModel } from '../models/snake-game-record.model.js';

export class SnakeGameService extends RoomManagerService {
  constructor(wsService) {
    super(wsService, SnakeRoomModel, SnakePlayerModel, {
      gameType: 'snake',
      defaultGameConfig: {
        maxPlayers: 999,
        minPlayers: 1,
        gameSpeed: 150,
        timeout: 3000
      }
    });
    
    this.voteTimers = new Map(); // roomId -> voteTimer
    
    // 贪吃蛇游戏配置
    this.SNAKE_CONFIG = {
      VOTE_TIMEOUT: 80, // 投票超时时间（毫秒）原3000，缩短以降低延迟
      GAME_SPEED: 100, // 游戏速度（毫秒）
      BOARD_SIZE: 20, // 游戏板大小
      INITIAL_SNAKE_LENGTH: 3
    };
  }

  /**
   * 创建贪吃蛇游戏房间
   */
  async createSnakeRoom(sessionId, playerName, mode, gameSettings = {}) {
    const roomData = {
      mode,
      max_players: mode === 'shared' ? 999 : 2, // 共享模式支持更多玩家
      status: 'waiting'
    };

    const gameConfig = {
      board_size: this.SNAKE_CONFIG.BOARD_SIZE,
      game_speed: this.SNAKE_CONFIG.GAME_SPEED,
      vote_timeout: this.SNAKE_CONFIG.VOTE_TIMEOUT,
      ...gameSettings
    };

    return this.createRoom(sessionId, playerName, roomData, gameConfig);
  }

  /**
   * 初始化贪吃蛇游戏状态
   */
  initGameState(roomId, mode, config = {}) {
    const gameState = {
      mode,
      status: 'waiting',
      votes: {},
      voteStartTime: null,
      createdAt: Date.now(),
      config: { ...this.SNAKE_CONFIG, ...config }
    };

    if (mode === 'shared') {
      gameState.sharedSnake = this.createInitialSnake();
      gameState.food = this.generateFood(gameState.sharedSnake.body);
    } else if (mode === 'competitive') {
      gameState.snakes = {};
      gameState.foods = [];
    }

    this.gameStates.set(roomId, gameState);
    console.log(`游戏状态已初始化: 房间 ${roomId}, 模式: ${mode}`);
  }

  /**
   * 创建初始蛇
   */
  createInitialSnake() {
    const centerX = Math.floor(this.SNAKE_CONFIG.BOARD_SIZE / 2);
    const centerY = Math.floor(this.SNAKE_CONFIG.BOARD_SIZE / 2);

    return {
      body: [
        { x: centerX, y: centerY },
        { x: centerX, y: centerY + 1 },
        { x: centerX, y: centerY + 2 }
      ],
      direction: 'right', // 改为向右，这样更安全
      nextDirection: 'right',
      score: 0,
      length: this.SNAKE_CONFIG.INITIAL_SNAKE_LENGTH,
      isWaitingForFirstVote: true // 标记等待第一次投票
    };
  }

  /**
   * 生成食物
   */
  generateFood(excludePositions = []) {
    return this.generateRandomPosition(this.SNAKE_CONFIG.BOARD_SIZE, excludePositions);
  }



  /**
   * 重写父类的开始游戏方法，支持贪吃蛇特殊逻辑
   * @param {number} roomId - 房间ID
   * @param {string} hostSessionId - 房主会话ID（可选，适配器调用时可能不传）
   * @returns {object} 开始结果
   */
  startGame(roomId, hostSessionId = null) {
    try {
      const room = SnakeRoomModel.findById(roomId);
      if (!room) {
        throw new Error('房间不存在');
      }

      // 检查游戏是否已经在进行中，避免重复启动
      if (room.status === 'playing') {
        console.log(`游戏已在进行中: 房间 ${roomId}`);
        return { success: true, players: SnakePlayerModel.findOnlineByRoomId(roomId) };
      }

      // 如果提供了hostSessionId，检查权限
      if (hostSessionId && room.created_by !== hostSessionId) {
        throw new Error('只有房主可以开始游戏');
      }

      const players = SnakePlayerModel.findOnlineByRoomId(roomId);
      
      // 检查是否可以开始游戏
      if (players.length === 0) {
        throw new Error('房间内没有玩家');
      }

      // 共享模式允许单人开始，竞技模式需要所有玩家准备
      if (room.mode === 'competitive') {
        const readyPlayers = players.filter(p => p.is_ready);
        if (readyPlayers.length !== players.length || players.length < 2) {
          throw new Error('竞技模式需要至少2名玩家且所有玩家都准备就绪');
        }
      } else if (room.mode === 'shared') {
        // 共享模式只需要至少1名玩家，不要求所有人准备
        if (players.length < 1) {
          throw new Error('至少需要1名玩家才能开始游戏');
        }
      }

      const gameState = this.getGameState(roomId);
      if (!gameState) {
        throw new Error('游戏状态不存在');
      }

      // 检查游戏循环是否已经在运行，避免重复启动
      if (this.gameTimers.has(roomId)) {
        console.log(`游戏循环已在运行: 房间 ${roomId}`);
        return { success: true, players: players };
      }

      // 更新房间状态
      SnakeRoomModel.update(roomId, { status: 'playing' });
      
      // 更新游戏状态
      this.updateGameState(roomId, { 
        status: 'playing',
        startTime: Date.now()
      });

      // 模式初始化 & 启动游戏循环
      if (gameState.mode === 'shared') {
        // 共享模式共享蛇已初始化于 initGameState
        // 如果当前只有1名玩家，直接跳过首次投票等待，立即开始移动
        try {
          gameState.playerCount = players.length; // 记录玩家数
          if (players.length === 1 && gameState.sharedSnake) {
            gameState.sharedSnake.isWaitingForFirstVote = false;
            gameState.votes = {}; // 清空残留投票
            if (!gameState.startTime) gameState.startTime = Date.now();
          }
        } catch (e) { /* ignore */ }
        this.startSharedGameLoop(roomId);
      } else if (gameState.mode === 'competitive') {
        // 初始化玩家蛇
        this.initCompetitivePlayers(roomId, players);
        this.startCompetitiveGameLoop(roomId);
      }

  // 广播游戏开始（注意：broadcastToRoom 会自动加 snake_ 前缀，这里不要再加）
  this.broadcastToRoom(roomId, 'game_started', {
        room_id: roomId,
        game_state: this.getGameState(roomId),
        players: players
      });

      console.log(`贪吃蛇游戏开始: 房间 ${roomId}, 模式: ${room.mode}, 玩家数: ${players.length}`);
      return { success: true, players: players };

    } catch (error) {
      console.error('开始贪吃蛇游戏失败:', error);
      throw error;
    }
  }

  /**
   * 处理投票（共享模式）
   */
  handleVote(roomId, sessionId, direction) {
    try {
      const gameState = this.getGameState(roomId);
      if (!gameState || gameState.mode !== 'shared' || gameState.status !== 'playing') {
        return;
      }

      const player = SnakePlayerModel.findByRoomAndSession(roomId, sessionId);
      if (!player) {
        return;
      }

      console.log(`收到投票: 房间 ${roomId}, 玩家 ${player.player_name}, 方向 ${direction}`);

      // 记录投票
      gameState.votes[sessionId] = {
        direction,
        player_name: player.player_name,
        player_color: player.player_color,
        timestamp: Date.now()
      };

      // 单人共享模式：立即应用方向，跳过投票周期
      const onlinePlayers = SnakePlayerModel.findOnlineByRoomId(roomId) || [];
      const singlePlayer = onlinePlayers.length === 1;
      if (singlePlayer && gameState.sharedSnake) {
        if (this.isValidDirectionChange(gameState.sharedSnake.direction, direction)) {
          gameState.sharedSnake.nextDirection = direction;
          gameState.sharedSnake.isWaitingForFirstVote = false;
        }
        // 立即清理投票状态（避免 UI 长时间显示）
        gameState.votes = {};
        gameState.voteStartTime = null;
        if (this.voteTimers.has(roomId)) {
          clearTimeout(this.voteTimers.get(roomId));
          this.voteTimers.delete(roomId);
        }
        // 立即广播一次更新（方向提示更快反馈）
        this.broadcastToRoom(roomId, 'game_update', {
          room_id: roomId,
          game_state: gameState,
          shared_snake: gameState.sharedSnake,
          food: gameState.food
        });
        return; // 不进入后续常规投票逻辑
      }

      // 如果这是第一次投票，立即应用方向
      if (gameState.sharedSnake && gameState.sharedSnake.isWaitingForFirstVote) {
        if (this.isValidDirectionChange(gameState.sharedSnake.direction, direction)) {
          gameState.sharedSnake.nextDirection = direction;
          console.log(`应用第一次投票方向: ${direction}`);
        }
      }

  // 广播投票更新
  this.broadcastToRoom(roomId, 'vote_updated', {
        room_id: roomId,
        votes: gameState.votes
      });

      // 如果还没有开始投票倒计时，启动它（使用配置中的超时）
      if (!gameState.voteStartTime) {
        this.startVoteTimer(roomId);
      }

      // 如果所有在线玩家都已投票，立即结算（减少等待）
      try {
        const onlinePlayersQuick = SnakePlayerModel.findOnlineByRoomId(roomId) || [];
        const totalOnline = onlinePlayersQuick.length;
        const voteCount = Object.keys(gameState.votes).length;
        if (totalOnline > 1 && voteCount === totalOnline) {
          if (this.voteTimers.has(roomId)) {
            clearTimeout(this.voteTimers.get(roomId));
            this.voteTimers.delete(roomId);
          }
          this.processVotes(roomId);
        }
      } catch (e) { /* ignore */ }

    } catch (error) {
      console.error('处理投票失败:', error);
    }
  }

  /**
   * 启动投票计时器
   */
  startVoteTimer(roomId) {
    const gameState = this.getGameState(roomId);
    if (!gameState) return;

    gameState.voteStartTime = Date.now();
    const timeoutMs = gameState.config?.vote_timeout ?? this.SNAKE_CONFIG.VOTE_TIMEOUT;
    const timer = setTimeout(() => {
      this.processVotes(roomId);
    }, timeoutMs);

    this.voteTimers.set(roomId, timer);
  }

  /**
   * 处理投票结果
   */
  processVotes(roomId) {
    const gameState = this.getGameState(roomId);
    if (!gameState || !gameState.sharedSnake) return;

    const votes = gameState.votes;
    const voteCounts = {};
    
    // 统计投票
    Object.values(votes).forEach(vote => {
      voteCounts[vote.direction] = (voteCounts[vote.direction] || 0) + 1;
    });

    // 获取得票最多的方向
    let winningDirection = gameState.sharedSnake.direction;
    let maxVotes = 0;
    
    Object.entries(voteCounts).forEach(([direction, count]) => {
      if (count > maxVotes) {
        maxVotes = count;
        winningDirection = direction;
      }
    });

    // 更新蛇的下一步方向
    if (this.isValidDirectionChange(gameState.sharedSnake.direction, winningDirection)) {
      gameState.sharedSnake.nextDirection = winningDirection;
    }

  // 清理投票
  gameState.votes = {};
  gameState.voteStartTime = null;

    if (this.voteTimers.has(roomId)) {
      clearTimeout(this.voteTimers.get(roomId));
      this.voteTimers.delete(roomId);
    }

    // 立即广播更新以降低方向反馈延迟
    this.broadcastToRoom(roomId, 'game_update', {
      room_id: roomId,
      game_state: gameState,
      shared_snake: gameState.sharedSnake,
      food: gameState.food
    });
  }

  /**
   * 检查方向变化是否有效
   */
  isValidDirectionChange(currentDirection, newDirection) {
    const opposites = {
      'up': 'down',
      'down': 'up',
      'left': 'right',
      'right': 'left'
    };
    return opposites[currentDirection] !== newDirection;
  }

  /**
   * 启动共享模式游戏循环
   */
  startSharedGameLoop(roomId) {
    // 检查是否已经有游戏循环在运行
    if (this.gameTimers.has(roomId)) {
      console.log(`游戏循环已存在，跳过启动: 房间 ${roomId}`);
      return;
    }

    console.log(`启动共享模式游戏循环: 房间 ${roomId}`);
    
    // 延迟启动游戏循环，给客户端一些时间准备
    setTimeout(() => {
      // 再次检查，确保在延迟期间没有被其他地方启动
      if (this.gameTimers.has(roomId)) {
        console.log(`游戏循环在延迟期间已启动，跳过: 房间 ${roomId}`);
        return;
      }

      const gameLoop = setInterval(() => {
        this.updateSharedGame(roomId);
      }, this.SNAKE_CONFIG.GAME_SPEED);

      this.gameTimers.set(roomId, gameLoop);
      console.log(`游戏循环已启动: 房间 ${roomId}`);
    }, 1000); // 延迟1秒启动
  }

  /**
   * 更新共享游戏状态
   */
  updateSharedGame(roomId) {
    try {
      const gameState = this.getGameState(roomId);
      if (!gameState) {
        console.log(`游戏状态不存在，停止游戏循环: 房间 ${roomId}`);
        // 清理游戏循环
        if (this.gameTimers.has(roomId)) {
          clearInterval(this.gameTimers.get(roomId));
          this.gameTimers.delete(roomId);
        }
        return;
      }

      if (!gameState.sharedSnake || gameState.status !== 'playing') {
        console.log(`游戏状态检查失败: 房间 ${roomId}, 状态: ${gameState?.status}, 蛇存在: ${!!gameState.sharedSnake}`);
        return;
      }

      const snake = gameState.sharedSnake;
      
      // 如果还在等待第一次投票，暂停移动
      if (snake.isWaitingForFirstVote) {
        // 确保 startTime 存在（兼容旧状态）
        if (!gameState.startTime) gameState.startTime = Date.now();
        const waitBase = gameState.startTime || gameState.createdAt || Date.now();
        const waitTime = Date.now() - waitBase;
        // 条件：收到投票 或 超时(5s) 或 只有一名玩家
        const hasVotes = Object.keys(gameState.votes).length > 0;
        const singlePlayer = typeof gameState.playerCount === 'number' ? gameState.playerCount === 1 : false;
        if (hasVotes || waitTime > 5000 || singlePlayer) {
          snake.isWaitingForFirstVote = false;
          console.log(`开始移动: 房间 ${roomId}, 原因: ${hasVotes ? '收到投票' : (singlePlayer ? '单人模式自动开始' : '等待超时')}`);
        } else {
          // 还没有投票，继续等待，但广播当前状态
          this.broadcastToRoom(roomId, 'game_update', {
            room_id: roomId,
            game_state: gameState,
            // 兼容旧前端字段
            shared_snake: gameState.sharedSnake,
            food: gameState.food,
            waiting_for_vote: true
          });
          return;
        }
      }
      
      // 更新方向（只有在有新方向时才更新）
      if (snake.nextDirection && snake.nextDirection !== snake.direction) {
        snake.direction = snake.nextDirection;
      }
      
      // 移动蛇头
      const head = { ...snake.body[0] };
      switch (snake.direction) {
        case 'up': head.y -= 1; break;
        case 'down': head.y += 1; break;
        case 'left': head.x -= 1; break;
        case 'right': head.x += 1; break;
      }

      // 处理墙壁：改为穿越（环绕）
      const size = this.SNAKE_CONFIG.BOARD_SIZE;
      if (head.x < 0) head.x = size - 1;
      else if (head.x >= size) head.x = 0;
      if (head.y < 0) head.y = size - 1;
      else if (head.y >= size) head.y = 0;

      // 自身碰撞仍然结束
      if (this.checkSelfCollision(head, snake.body)) {
        console.log(`游戏结束: 房间 ${roomId}, 原因: 自身碰撞, 位置: (${head.x}, ${head.y})`);
        this.endGame(roomId, 'self_collision');
        return;
      }

      // 检查是否吃到食物
      const ateFood = head.x === gameState.food.x && head.y === gameState.food.y;
      
      snake.body.unshift(head);
      
      if (ateFood) {
        snake.score += 10;
        snake.length += 1;
        gameState.food = this.generateFood(snake.body);
        console.log(`吃到食物: 房间 ${roomId}, 分数: ${snake.score}`);
      } else {
        snake.body.pop();
      }

  // 广播游戏状态更新
      this.broadcastToRoom(roomId, 'game_update', {
        room_id: roomId,
        game_state: gameState,
        shared_snake: gameState.sharedSnake,
        food: gameState.food
      });
    } catch (error) {
      console.error(`更新游戏状态失败: 房间 ${roomId}`, error);
    }
  }

  /**
   * 检查墙壁碰撞
   */
  checkWallCollision(position) {
    return position.x < 0 || position.x >= this.SNAKE_CONFIG.BOARD_SIZE ||
           position.y < 0 || position.y >= this.SNAKE_CONFIG.BOARD_SIZE;
  }

  /**
   * 检查自身碰撞
   */
  checkSelfCollision(head, body) {
    return body.some(segment => segment.x === head.x && segment.y === head.y);
  }

  /**
   * 结束游戏
   */
  endGame(roomId, reason = 'finished') {
    try {
      const gameState = this.getGameState(roomId);
      if (!gameState) return;

      console.log(`结束游戏: 房间 ${roomId}, 原因: ${reason}`);

      // 停止游戏循环
      if (this.gameTimers.has(roomId)) {
        clearInterval(this.gameTimers.get(roomId));
        this.gameTimers.delete(roomId);
      }

      // 停止投票计时器
      if (this.voteTimers.has(roomId)) {
        clearTimeout(this.voteTimers.get(roomId));
        this.voteTimers.delete(roomId);
      }

      // 更新游戏状态
      this.updateGameState(roomId, { 
        status: 'finished',
        endTime: Date.now(),
        endReason: reason
      });

      // 更新房间状态为等待，而不是finished，这样玩家可以重新开始
      SnakeRoomModel.update(roomId, { status: 'waiting' });

      // 保存游戏记录
      this.saveGameRecord(roomId, gameState, reason);

  // 广播游戏结束
  this.broadcastToRoom(roomId, 'game_ended', {
        room_id: roomId,
        reason,
        final_score: gameState.sharedSnake?.score || 0,
        game_state: gameState
      });

      // 重新初始化游戏状态，准备下一轮游戏
      setTimeout(() => {
        const room = SnakeRoomModel.findById(roomId);
        if (room) {
          this.initGameState(roomId, room.mode);
          
          // 广播游戏重置完成
          this.broadcastToRoom(roomId, 'game_reset', {
            room_id: roomId,
            game_state: this.getGameState(roomId)
          });
          
          console.log(`游戏状态已重置: 房间 ${roomId}`);
        }
      }, 2000);

    } catch (error) {
      console.error('结束游戏失败:', error);
    }
  }

  /**
   * 保存游戏记录
   */
  saveGameRecord(roomId, gameState, endReason) {
    try {
      const room = SnakeRoomModel.findById(roomId);
      if (!room) return;

      const players = SnakePlayerModel.findByRoomId(roomId);
      const finalScore = gameState.sharedSnake?.score || 0;
      const duration = Date.now() - gameState.startTime;

      // 在共享模式中，所有玩家都是"获胜者"
      if (gameState.mode === 'shared') {
        for (const player of players) {
          SnakeGameRecordModel.create({
            room_id: roomId,
            mode: gameState.mode,
            winner_session_id: player.session_id,
            winner_score: finalScore,
            game_duration: duration,
            end_reason: endReason,
            player_count: players.length
          });
        }
      }

    } catch (error) {
      console.error('保存游戏记录失败:', error);
    }
  }

  /**
   * 清理游戏资源（重写父类方法）
   */
  cleanupGameResources(roomId) {
    super.cleanupGameResources(roomId);
    
    // 清理投票计时器
    if (this.voteTimers.has(roomId)) {
      clearTimeout(this.voteTimers.get(roomId));
      this.voteTimers.delete(roomId);
    }
  }

  /**
   * 启动竞技模式游戏循环（占位符）
   */
  startCompetitiveGameLoop(roomId) {
    const tick = () => {
      const gameState = this.getGameState(roomId);
      if (!gameState || gameState.status !== 'playing' || gameState.mode !== 'competitive') return;
      this.updateCompetitiveGame(roomId);
      this.gameTimers.set(roomId, setTimeout(tick, this.SNAKE_CONFIG.GAME_SPEED));
    };
    this.gameTimers.set(roomId, setTimeout(tick, this.SNAKE_CONFIG.GAME_SPEED));
  }

  /**
   * 初始化竞技模式玩家蛇 & 食物
   */
  initCompetitivePlayers(roomId, players) {
    const gameState = this.getGameState(roomId);
    if (!gameState) return;
    const size = this.SNAKE_CONFIG.BOARD_SIZE;
    gameState.snakes = {};
    players.forEach((p, idx) => {
      const startX = idx % 2 === 0 ? Math.floor(size / 4) : Math.floor(3 * size / 4);
      const startY = Math.floor(size / 2);
      gameState.snakes[p.session_id] = {
        body: [
          { x: startX, y: startY },
          { x: startX, y: startY + 1 },
          { x: startX, y: startY + 2 }
        ],
        direction: 'up',
        nextDirection: 'up',
        score: 0,
        gameOver: false,
        player: p
      };
    });
    // 初始化统一食物集合
    gameState.foods = this.generateCompetitiveFoods(gameState);
  }

  generateCompetitiveFoods(gameState) {
    const foods = [];
    const bodies = Object.values(gameState.snakes).flatMap(s => s.body);
    for (let i = 0; i < Object.keys(gameState.snakes).length; i++) {
      foods.push(this.generateRandomPosition(this.SNAKE_CONFIG.BOARD_SIZE, bodies));
    }
    return foods;
  }

  /**
   * 更新竞技模式
   */
  updateCompetitiveGame(roomId) {
    const gameState = this.getGameState(roomId);
    if (!gameState) return;
    const size = this.SNAKE_CONFIG.BOARD_SIZE;
    let alive = 0; let survivor = null;
    Object.entries(gameState.snakes).forEach(([sid, snake]) => {
      if (snake.gameOver) return;
      // 应用下一方向
      snake.direction = snake.nextDirection || snake.direction;
      const head = { ...snake.body[0] };
      switch (snake.direction) {
        case 'up': head.y -= 1; break;
        case 'down': head.y += 1; break;
        case 'left': head.x -= 1; break;
        case 'right': head.x += 1; break;
      }
      // 墙体穿越
      if (head.x < 0) head.x = size - 1; else if (head.x >= size) head.x = 0;
      if (head.y < 0) head.y = size - 1; else if (head.y >= size) head.y = 0;
      // 自撞
      if (snake.body.some(seg => seg.x === head.x && seg.y === head.y)) {
        snake.gameOver = true; return;
      }
      // 互撞检测
      Object.entries(gameState.snakes).forEach(([oid, other]) => {
        if (oid === sid || other.gameOver) return;
        if (other.body.some(seg => seg.x === head.x && seg.y === head.y)) {
          snake.gameOver = true;
        }
      });
      if (snake.gameOver) return;
      snake.body.unshift(head);
      // 食物判定
      let ate = false;
      gameState.foods.forEach((food, idx) => {
        if (!ate && head.x === food.x && head.y === food.y) {
          ate = true;
          snake.score += 10;
          // 重新生成该食物
          const allBodies = Object.values(gameState.snakes).flatMap(s => s.body);
          gameState.foods[idx] = this.generateRandomPosition(size, allBodies);
        }
      });
      if (!ate) snake.body.pop();
      if (!snake.gameOver) { alive++; survivor = snake.player; }
    });
    // 广播状态（附带兼容字段）
    this.broadcastToRoom(roomId, 'competitive_update', {
      game_state: gameState,
      snakes: gameState.snakes,
      foods: gameState.foods
    });
    if (alive <= 1) {
      this.endGame(roomId, 'competitive_finished');
    }
  }

  /**
   * 处理竞技模式移动
   */
  handleCompetitiveMove(roomId, sessionId, direction) {
    const gameState = this.getGameState(roomId);
    if (!gameState || gameState.mode !== 'competitive') return;
    const snake = gameState.snakes?.[sessionId];
    if (!snake || snake.gameOver) return;
    const opposites = { up: 'down', down: 'up', left: 'right', right: 'left' };
    if (opposites[snake.direction] === direction) return; // 禁止反向
    snake.nextDirection = direction;
  }

  /**
   * 玩家离开房间
   * @override
   */
  async leaveRoom(sessionId, roomId) {
    try {
      const result = await super.leaveRoom(sessionId, roomId);
      
      // 检查房间是否为空，如果为空则删除
      const remainingPlayers = await this.PlayerModel.getPlayerCount(roomId);
      if (remainingPlayers === 0) {
        console.log(`房间 ${roomId} 已空，正在删除...`);
        
        // 先清理游戏资源（包括定时器）
        this.cleanupGameResources(roomId);
        
        // 删除房间
        await this.RoomModel.delete(roomId);
        
        // 广播房间列表已更新
        this.wsService.broadcast('snake_room_list_updated');
      }
      
      return result;
    } catch (error) {
      console.error(`玩家离开房间失败: ${sessionId}, 房间: ${roomId}`, error);
      // 即使出错也要尝试清理资源
      try {
        this.cleanupGameResources(roomId);
      } catch (cleanupError) {
        console.error(`清理游戏资源失败: 房间 ${roomId}`, cleanupError);
      }
      throw error;
    }
  }
}
