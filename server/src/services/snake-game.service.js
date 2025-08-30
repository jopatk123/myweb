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
    super(wsService, SnakeRoomModel, SnakePlayerModel);
    
    this.voteTimers = new Map(); // roomId -> voteTimer
    
    // 贪吃蛇游戏配置
    this.SNAKE_CONFIG = {
      VOTE_TIMEOUT: 3000, // 投票超时时间（毫秒）
      GAME_SPEED: 150, // 游戏速度（毫秒）
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
  initGameState(roomId, mode) {
    const gameState = {
      mode,
      status: 'waiting',
      votes: {},
      voteStartTime: null,
      createdAt: Date.now()
    };

    if (mode === 'shared') {
      gameState.sharedSnake = this.createInitialSnake();
      gameState.food = this.generateFood(gameState.sharedSnake.body);
    } else if (mode === 'competitive') {
      gameState.snakes = {};
      gameState.foods = [];
    }

    this.gameStates.set(roomId, gameState);
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
      direction: 'up',
      nextDirection: 'up',
      score: 0,
      length: this.SNAKE_CONFIG.INITIAL_SNAKE_LENGTH
    };
  }

  /**
   * 生成食物
   */
  generateFood(excludePositions = []) {
    return this.generateRandomPosition(this.SNAKE_CONFIG.BOARD_SIZE, excludePositions);
  }

  /**
   * 开始游戏
   */
  startGame(roomId) {
    try {
      const gameState = this.getGameState(roomId);
      if (!gameState) {
        throw new Error('游戏状态不存在');
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
        this.startSharedGameLoop(roomId);
      } else if (gameState.mode === 'competitive') {
        // 初始化玩家蛇
        const players = SnakePlayerModel.findOnlineByRoomId(roomId);
        this.initCompetitivePlayers(roomId, players);
        this.startCompetitiveGameLoop(roomId);
      }

      // 广播游戏开始
      this.broadcastToRoom(roomId, 'snake_game_started', {
        room_id: roomId,
        game_state: this.getGameState(roomId)
      });

    } catch (error) {
      console.error('开始游戏失败:', error);
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

      // 记录投票
      gameState.votes[sessionId] = {
        direction,
        player_name: player.player_name,
        player_color: player.player_color,
        timestamp: Date.now()
      };

      // 广播投票更新
      this.broadcastToRoom(roomId, 'snake_vote_updated', {
        room_id: roomId,
        votes: gameState.votes
      });

      // 如果还没有开始投票倒计时，启动它
      if (!gameState.voteStartTime) {
        this.startVoteTimer(roomId);
      }

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
    
    const timer = setTimeout(() => {
      this.processVotes(roomId);
    }, this.SNAKE_CONFIG.VOTE_TIMEOUT);

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
    const gameLoop = setInterval(() => {
      this.updateSharedGame(roomId);
    }, this.SNAKE_CONFIG.GAME_SPEED);

    this.gameTimers.set(roomId, gameLoop);
  }

  /**
   * 更新共享游戏状态
   */
  updateSharedGame(roomId) {
    const gameState = this.getGameState(roomId);
    if (!gameState || !gameState.sharedSnake || gameState.status !== 'playing') {
      return;
    }

    const snake = gameState.sharedSnake;
    
    // 更新方向
    snake.direction = snake.nextDirection;
    
    // 移动蛇头
    const head = { ...snake.body[0] };
    switch (snake.direction) {
      case 'up': head.y -= 1; break;
      case 'down': head.y += 1; break;
      case 'left': head.x -= 1; break;
      case 'right': head.x += 1; break;
    }

    // 检查碰撞
    if (this.checkWallCollision(head) || this.checkSelfCollision(head, snake.body)) {
      this.endGame(roomId, 'collision');
      return;
    }

    // 检查是否吃到食物
    const ateFood = head.x === gameState.food.x && head.y === gameState.food.y;
    
    snake.body.unshift(head);
    
    if (ateFood) {
      snake.score += 10;
      snake.length += 1;
      gameState.food = this.generateFood(snake.body);
    } else {
      snake.body.pop();
    }

    // 广播游戏状态更新
    this.broadcastToRoom(roomId, 'snake_game_update', {
      room_id: roomId,
      game_state: gameState
    });
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

      // 更新房间状态
      SnakeRoomModel.update(roomId, { status: 'finished' });

      // 保存游戏记录
      this.saveGameRecord(roomId, gameState, reason);

      // 广播游戏结束
      this.broadcastToRoom(roomId, 'snake_game_ended', {
        room_id: roomId,
        reason,
        final_score: gameState.sharedSnake?.score || 0,
        game_state: gameState
      });

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
      // 碰墙/自撞
      if (head.x < 0 || head.x >= size || head.y < 0 || head.y >= size || snake.body.some(seg => seg.x === head.x && seg.y === head.y)) {
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
    // 广播状态
    this.broadcastToRoom(roomId, 'competitive_updated', { game_state: gameState });
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
    const result = await super.leaveRoom(sessionId, roomId);
    
    // 检查房间是否为空，如果为空则删除
    const remainingPlayers = await this.PlayerModel.getPlayerCount(roomId);
    if (remainingPlayers === 0) {
      console.log(`房间 ${roomId} 已空，正在删除...`);
      await this.RoomModel.delete(roomId);
      // 广播房间列表已更新
      this.wsService.broadcast('snake_room_list_updated');
    }
    
    return result;
  }
}
