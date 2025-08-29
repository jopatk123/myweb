/**
 * 贪吃蛇多人游戏服务
 */
import { SnakeRoomModel } from '../models/snake-room.model.js';
import { SnakePlayerModel } from '../models/snake-player.model.js';
import { SnakeGameRecordModel } from '../models/snake-game-record.model.js';

export class SnakeMultiplayerService {
  constructor(wsService) {
    this.wsService = wsService;
    this.gameStates = new Map(); // roomId -> gameState
    this.gameTimers = new Map(); // roomId -> timer
    this.voteTimers = new Map(); // roomId -> voteTimer
    
    // 玩家颜色池
    this.playerColors = [
      '#007bff', '#28a745', '#dc3545', '#ffc107',
      '#17a2b8', '#6f42c1', '#e83e8c', '#fd7e14'
    ];
    
    // 游戏常量
    this.GAME_CONFIG = {
      VOTE_TIMEOUT: 3000, // 投票超时时间（毫秒）
      GAME_SPEED: 150, // 游戏速度（毫秒）
      BOARD_SIZE: 20, // 游戏板大小
      INITIAL_SNAKE_LENGTH: 3
    };
  }

  /**
   * 创建游戏房间
   */
  async createRoom(sessionId, playerName, mode, gameSettings = {}) {
    try {
      const roomCode = await SnakeRoomModel.generateRoomCode();
      
      // 创建房间
      const room = await SnakeRoomModel.create({
        room_code: roomCode,
        mode,
        created_by: sessionId,
        game_settings: {
          board_size: this.GAME_CONFIG.BOARD_SIZE,
          game_speed: this.GAME_CONFIG.GAME_SPEED,
          vote_timeout: this.GAME_CONFIG.VOTE_TIMEOUT,
          ...gameSettings
        }
      });

      // 创建房主玩家
      const playerColor = this.getNextPlayerColor(room.id, 0);
      const player = await SnakePlayerModel.create({
        room_id: room.id,
        session_id: sessionId,
        player_name: playerName,
        player_color: playerColor,
        is_ready: false
      });

      // 更新房间玩家数量
      await SnakeRoomModel.update(room.id, { current_players: 1 });

      // 初始化游戏状态
      this.initGameState(room.id, mode);

      return { room, player };
    } catch (error) {
      console.error('创建房间失败:', error);
      throw new Error('创建房间失败');
    }
  }

  /**
   * 加入游戏房间
   */
  async joinRoom(sessionId, playerName, roomCode) {
    try {
      const room = await SnakeRoomModel.findByRoomCode(roomCode);
      if (!room) {
        throw new Error('房间不存在');
      }

      if (room.status === 'finished') {
        throw new Error('游戏已结束');
      }

      // 检查是否已经在房间中
      const existingPlayer = await SnakePlayerModel.findByRoomAndSession(room.id, sessionId);
      if (existingPlayer) {
        // 更新在线状态
        await SnakePlayerModel.update(existingPlayer.id, { is_online: true });
        return { room, player: existingPlayer };
      }

      // 检查房间是否已满
      const currentPlayers = await SnakePlayerModel.getPlayerCount(room.id);
      if (currentPlayers >= room.max_players) {
        throw new Error('房间已满');
      }

      // 创建新玩家
      const playerColor = this.getNextPlayerColor(room.id, currentPlayers);
      const player = await SnakePlayerModel.create({
        room_id: room.id,
        session_id: sessionId,
        player_name: playerName,
        player_color: playerColor,
        is_ready: false
      });

      // 更新房间玩家数量
      await SnakeRoomModel.update(room.id, { 
        current_players: currentPlayers + 1 
      });

      // 通知房间内其他玩家
      await this.broadcastToRoom(room.id, 'player_joined', {
        player: player,
        room: room
      }, sessionId);

      return { room, player };
    } catch (error) {
      console.error('加入房间失败:', error);
      throw error;
    }
  }

  /**
   * 玩家准备/取消准备
   */
  async toggleReady(sessionId, roomCode) {
    try {
      const room = await SnakeRoomModel.findByRoomCode(roomCode);
      if (!room) {
        throw new Error('房间不存在');
      }

      const player = await SnakePlayerModel.findByRoomAndSession(room.id, sessionId);
      if (!player) {
        throw new Error('玩家不在房间中');
      }

      if (room.status === 'playing') {
        throw new Error('游戏进行中，无法更改准备状态');
      }

      // 切换准备状态
      const updatedPlayer = await SnakePlayerModel.update(player.id, {
        is_ready: !player.is_ready
      });

      // 检查是否所有玩家都已准备
      const readyCount = await SnakePlayerModel.getReadyCount(room.id);
      const totalPlayers = await SnakePlayerModel.getPlayerCount(room.id);

      // 通知房间内所有玩家
      await this.broadcastToRoom(room.id, 'player_ready_changed', {
        player: updatedPlayer,
        ready_count: readyCount,
        total_players: totalPlayers,
        can_start: readyCount >= 2 && readyCount === totalPlayers
      });

      // 如果所有玩家都准备好了且人数>=2，自动开始游戏
      if (readyCount >= 2 && readyCount === totalPlayers) {
        setTimeout(() => this.startGame(room.id), 2000);
      }

      return updatedPlayer;
    } catch (error) {
      console.error('切换准备状态失败:', error);
      throw error;
    }
  }

  /**
   * 开始游戏
   */
  async startGame(roomId) {
    try {
      const room = await SnakeRoomModel.findById(roomId);
      if (!room || room.status === 'playing') {
        return;
      }

      const players = await SnakePlayerModel.findOnlineByRoomId(roomId);
      if (players.length < 2) {
        throw new Error('至少需要2个玩家才能开始游戏');
      }

      // 更新房间状态
      await SnakeRoomModel.update(roomId, { status: 'playing' });

      // 初始化游戏状态
      const gameState = this.initGameState(roomId, room.mode);
      
      // 为每个玩家初始化游戏数据
      if (room.mode === 'shared') {
        this.initSharedGame(gameState, players);
      } else if (room.mode === 'competitive') {
        this.initCompetitiveGame(gameState, players);
      }

      // 通知所有玩家游戏开始
      await this.broadcastToRoom(roomId, 'game_started', {
        game_state: gameState,
        players: players
      });

      // 启动游戏循环
      this.startGameLoop(roomId);

      // 通知其他在线用户自动弹出
      await this.notifyAutoPopup(roomId, room.mode);

    } catch (error) {
      console.error('开始游戏失败:', error);
      throw error;
    }
  }

  /**
   * 处理玩家投票（共享模式）
   */
  async handleVote(sessionId, roomCode, direction) {
    try {
      const room = await SnakeRoomModel.findByRoomCode(roomCode);
      if (!room || room.status !== 'playing') {
        return;
      }

      const player = await SnakePlayerModel.findByRoomAndSession(room.id, sessionId);
      if (!player) {
        return;
      }

      const gameState = this.gameStates.get(room.id);
      if (!gameState || room.mode !== 'shared') {
        return;
      }

      // 记录投票
      gameState.votes[sessionId] = {
        direction,
        player_name: player.player_name,
        player_color: player.player_color,
        timestamp: Date.now()
      };

      // 更新玩家投票记录
      await SnakePlayerModel.updateByRoomAndSession(room.id, sessionId, {
        last_vote: direction
      });

      // 通知房间内玩家投票更新
      await this.broadcastToRoom(room.id, 'vote_updated', {
        votes: gameState.votes,
        voter: {
          session_id: sessionId,
          player_name: player.player_name,
          direction
        }
      });

    } catch (error) {
      console.error('处理投票失败:', error);
    }
  }

  /**
   * 处理玩家移动（竞技模式）
   */
  async handleMove(sessionId, roomCode, direction) {
    try {
      const room = await SnakeRoomModel.findByRoomCode(roomCode);
      if (!room || room.status !== 'playing') {
        return;
      }

      const gameState = this.gameStates.get(room.id);
      if (!gameState || room.mode !== 'competitive') {
        return;
      }

      const playerSnake = gameState.snakes[sessionId];
      if (!playerSnake || playerSnake.gameOver) {
        return;
      }

      // 检查方向是否有效（不能与当前方向相反）
      const oppositeDirections = {
        'up': 'down',
        'down': 'up',
        'left': 'right',
        'right': 'left'
      };

      if (oppositeDirections[direction] === playerSnake.direction) {
        return;
      }

      // 设置新方向
      playerSnake.nextDirection = direction;

    } catch (error) {
      console.error('处理移动失败:', error);
    }
  }

  /**
   * 玩家离开房间
   */
  async leaveRoom(sessionId, roomCode) {
    try {
      const room = await SnakeRoomModel.findByRoomCode(roomCode);
      if (!room) {
        return;
      }

      const player = await SnakePlayerModel.findByRoomAndSession(room.id, sessionId);
      if (!player) {
        return;
      }

      // 更新玩家离线状态
      await SnakePlayerModel.update(player.id, { is_online: false });

      // 获取剩余在线玩家数量
      const onlineCount = await SnakePlayerModel.getPlayerCount(room.id);
      
      // 更新房间玩家数量
      await SnakeRoomModel.update(room.id, { current_players: onlineCount });

      // 通知房间内其他玩家
      await this.broadcastToRoom(room.id, 'player_left', {
        player: player,
        online_count: onlineCount
      }, sessionId);

      // 如果房间为空或游戏进行中玩家不足，结束游戏
      if (onlineCount === 0) {
        await this.endGame(room.id, 'empty');
      } else if (room.status === 'playing' && onlineCount < 2) {
        await this.endGame(room.id, 'insufficient_players');
      }

    } catch (error) {
      console.error('离开房间失败:', error);
    }
  }

  /**
   * 初始化游戏状态
   */
  initGameState(roomId, mode) {
    const gameState = {
      roomId,
      mode,
      status: 'waiting',
      startTime: null,
      votes: {}, // sessionId -> {direction, player_name, timestamp}
      snakes: {}, // sessionId -> snake data (for competitive mode)
      sharedSnake: null, // shared mode的共享蛇
      food: null,
      gameOver: false,
      winner: null
    };

    this.gameStates.set(roomId, gameState);
    return gameState;
  }

  /**
   * 初始化共享模式游戏
   */
  initSharedGame(gameState, players) {
    const boardSize = this.GAME_CONFIG.BOARD_SIZE;
    const center = Math.floor(boardSize / 2);
    
    // 创建共享的蛇
    gameState.sharedSnake = {
      body: [
        { x: center, y: center },
        { x: center, y: center + 1 },
        { x: center, y: center + 2 }
      ],
      direction: 'up',
      nextDirection: 'up',
      length: 3,
      score: 0
    };

    // 生成食物
    gameState.food = this.generateFood(gameState.sharedSnake.body, boardSize);
    gameState.status = 'playing';
    gameState.startTime = Date.now();
  }

  /**
   * 初始化竞技模式游戏
   */
  initCompetitiveGame(gameState, players) {
    const boardSize = this.GAME_CONFIG.BOARD_SIZE;
    
    players.forEach((player, index) => {
      const startX = index === 0 ? Math.floor(boardSize / 4) : Math.floor(3 * boardSize / 4);
      const startY = Math.floor(boardSize / 2);
      
      gameState.snakes[player.session_id] = {
        body: [
          { x: startX, y: startY },
          { x: startX, y: startY + 1 },
          { x: startX, y: startY + 2 }
        ],
        direction: 'up',
        nextDirection: 'up',
        length: 3,
        score: 0,
        gameOver: false,
        player: player
      };
    });

    // 为每条蛇生成食物
    gameState.food = {};
    players.forEach(player => {
      const allSnakeBodies = Object.values(gameState.snakes).flatMap(snake => snake.body);
      gameState.food[player.session_id] = this.generateFood(allSnakeBodies, boardSize);
    });

    gameState.status = 'playing';
    gameState.startTime = Date.now();
  }

  /**
   * 启动游戏循环
   */
  startGameLoop(roomId) {
    const gameState = this.gameStates.get(roomId);
    if (!gameState) return;

    const gameSpeed = this.GAME_CONFIG.GAME_SPEED;

    const gameLoop = async () => {
      if (!this.gameStates.has(roomId) || gameState.gameOver) {
        return;
      }

      try {
        if (gameState.mode === 'shared') {
          await this.updateSharedGame(roomId);
        } else if (gameState.mode === 'competitive') {
          await this.updateCompetitiveGame(roomId);
        }

        // 继续游戏循环
        if (!gameState.gameOver) {
          this.gameTimers.set(roomId, setTimeout(gameLoop, gameSpeed));
        }
      } catch (error) {
        console.error('游戏循环错误:', error);
        await this.endGame(roomId, 'error');
      }
    };

    this.gameTimers.set(roomId, setTimeout(gameLoop, gameSpeed));
  }

  /**
   * 更新共享模式游戏
   */
  async updateSharedGame(roomId) {
    const gameState = this.gameStates.get(roomId);
    if (!gameState) return;

    // 处理投票结果
    const winningDirection = this.calculateVoteResult(gameState.votes);
    if (winningDirection) {
      gameState.sharedSnake.nextDirection = winningDirection;
    }

    // 清空投票
    gameState.votes = {};

    // 更新蛇的方向
    gameState.sharedSnake.direction = gameState.sharedSnake.nextDirection;

    // 移动蛇
    const head = { ...gameState.sharedSnake.body[0] };
    switch (gameState.sharedSnake.direction) {
      case 'up': head.y -= 1; break;
      case 'down': head.y += 1; break;
      case 'left': head.x -= 1; break;
      case 'right': head.x += 1; break;
    }

    // 检查碰撞
    const boardSize = this.GAME_CONFIG.BOARD_SIZE;
    if (head.x < 0 || head.x >= boardSize || head.y < 0 || head.y >= boardSize) {
      return await this.endGame(roomId, 'wall_collision');
    }

    for (const segment of gameState.sharedSnake.body) {
      if (head.x === segment.x && head.y === segment.y) {
        return await this.endGame(roomId, 'self_collision');
      }
    }

    // 添加新头部
    gameState.sharedSnake.body.unshift(head);

    // 检查是否吃到食物
    if (head.x === gameState.food.x && head.y === gameState.food.y) {
      gameState.sharedSnake.score += 10;
      gameState.sharedSnake.length++;
      gameState.food = this.generateFood(gameState.sharedSnake.body, boardSize);
    } else {
      gameState.sharedSnake.body.pop();
    }

    // 广播游戏状态更新
    await this.broadcastToRoom(roomId, 'game_update', {
      shared_snake: gameState.sharedSnake,
      food: gameState.food,
      winning_direction: winningDirection
    });

    // 启动新的投票轮
    this.startVoteTimer(roomId);
  }

  /**
   * 更新竞技模式游戏
   */
  async updateCompetitiveGame(roomId) {
    const gameState = this.gameStates.get(roomId);
    if (!gameState) return;

    const boardSize = this.GAME_CONFIG.BOARD_SIZE;
    let gameOverCount = 0;
    let winner = null;

    // 更新每条蛇
    for (const [sessionId, snake] of Object.entries(gameState.snakes)) {
      if (snake.gameOver) {
        gameOverCount++;
        continue;
      }

      // 更新方向
      snake.direction = snake.nextDirection;

      // 移动蛇
      const head = { ...snake.body[0] };
      switch (snake.direction) {
        case 'up': head.y -= 1; break;
        case 'down': head.y += 1; break;
        case 'left': head.x -= 1; break;
        case 'right': head.x += 1; break;
      }

      // 检查碰撞
      if (head.x < 0 || head.x >= boardSize || head.y < 0 || head.y >= boardSize) {
        snake.gameOver = true;
        gameOverCount++;
        continue;
      }

      // 检查与自己碰撞
      for (const segment of snake.body) {
        if (head.x === segment.x && head.y === segment.y) {
          snake.gameOver = true;
          gameOverCount++;
          break;
        }
      }

      if (snake.gameOver) continue;

      // 检查与其他蛇碰撞
      for (const [otherSessionId, otherSnake] of Object.entries(gameState.snakes)) {
        if (otherSessionId === sessionId || otherSnake.gameOver) continue;
        
        for (const segment of otherSnake.body) {
          if (head.x === segment.x && head.y === segment.y) {
            snake.gameOver = true;
            gameOverCount++;
            break;
          }
        }
        if (snake.gameOver) break;
      }

      if (snake.gameOver) continue;

      // 添加新头部
      snake.body.unshift(head);

      // 检查是否吃到食物
      const food = gameState.food[sessionId];
      if (food && head.x === food.x && head.y === food.y) {
        snake.score += 10;
        snake.length++;
        
        // 生成新食物
        const allSnakeBodies = Object.values(gameState.snakes)
          .filter(s => !s.gameOver)
          .flatMap(s => s.body);
        gameState.food[sessionId] = this.generateFood(allSnakeBodies, boardSize);
      } else {
        snake.body.pop();
      }

      // 检查是否成为唯一存活者
      const aliveCount = Object.values(gameState.snakes).filter(s => !s.gameOver).length;
      if (aliveCount === 1) {
        winner = snake.player;
      }
    }

    // 广播游戏状态更新
    await this.broadcastToRoom(roomId, 'competitive_update', {
      snakes: gameState.snakes,
      food: gameState.food
    });

    // 检查游戏是否结束
    const totalPlayers = Object.keys(gameState.snakes).length;
    if (gameOverCount >= totalPlayers - 1) {
      if (!winner && gameOverCount < totalPlayers) {
        // 找到最后存活的玩家
        winner = Object.values(gameState.snakes).find(s => !s.gameOver)?.player;
      }
      await this.endGame(roomId, 'game_complete', winner);
    }
  }

  /**
   * 计算投票结果
   */
  calculateVoteResult(votes) {
    const voteCount = {};
    const validDirections = ['up', 'down', 'left', 'right'];

    // 统计投票
    Object.values(votes).forEach(vote => {
      if (validDirections.includes(vote.direction)) {
        voteCount[vote.direction] = (voteCount[vote.direction] || 0) + 1;
      }
    });

    if (Object.keys(voteCount).length === 0) {
      return null; // 没有投票
    }

    // 找出得票最多的方向
    const maxVotes = Math.max(...Object.values(voteCount));
    const winners = Object.keys(voteCount).filter(dir => voteCount[dir] === maxVotes);

    // 如果有多个方向得票相同，随机选择一个
    return winners[Math.floor(Math.random() * winners.length)];
  }

  /**
   * 启动投票计时器
   */
  startVoteTimer(roomId) {
    // 清除之前的计时器
    if (this.voteTimers.has(roomId)) {
      clearTimeout(this.voteTimers.get(roomId));
    }

    const timer = setTimeout(async () => {
      // 投票时间到，通知客户端
      await this.broadcastToRoom(roomId, 'vote_timeout', {
        message: '投票时间结束'
      });
      this.voteTimers.delete(roomId);
    }, this.GAME_CONFIG.VOTE_TIMEOUT);

    this.voteTimers.set(roomId, timer);
  }

  /**
   * 生成食物位置
   */
  generateFood(snakeBodies, boardSize) {
    const occupiedPositions = new Set(
      snakeBodies.map(segment => `${segment.x},${segment.y}`)
    );

    let food;
    do {
      food = {
        x: Math.floor(Math.random() * boardSize),
        y: Math.floor(Math.random() * boardSize)
      };
    } while (occupiedPositions.has(`${food.x},${food.y}`));

    return food;
  }

  /**
   * 结束游戏
   */
  async endGame(roomId, reason, winner = null) {
    try {
      const gameState = this.gameStates.get(roomId);
      if (!gameState) return;

      gameState.gameOver = true;
      gameState.winner = winner;

      // 清除计时器
      if (this.gameTimers.has(roomId)) {
        clearTimeout(this.gameTimers.get(roomId));
        this.gameTimers.delete(roomId);
      }
      if (this.voteTimers.has(roomId)) {
        clearTimeout(this.voteTimers.get(roomId));
        this.voteTimers.delete(roomId);
      }

      // 更新房间状态
      await SnakeRoomModel.update(roomId, { status: 'finished' });

      // 记录游戏结果
      const gameDuration = Math.floor((Date.now() - gameState.startTime) / 1000);
      const players = await SnakePlayerModel.findOnlineByRoomId(roomId);
      
      let winnerScore = 0;
      if (winner) {
        if (gameState.mode === 'shared') {
          winnerScore = gameState.sharedSnake?.score || 0;
        } else if (gameState.mode === 'competitive') {
          winnerScore = gameState.snakes[winner.session_id]?.score || 0;
        }
      }

      await SnakeGameRecordModel.create({
        room_id: roomId,
        winner_session_id: winner?.session_id || null,
        winner_score: winnerScore,
        game_duration: gameDuration,
        player_count: players.length,
        mode: gameState.mode
      });

      // 通知所有玩家游戏结束
      await this.broadcastToRoom(roomId, 'game_ended', {
        reason,
        winner,
        final_score: winnerScore,
        duration: gameDuration,
        game_state: gameState
      });

      // 清理游戏状态
      this.gameStates.delete(roomId);

    } catch (error) {
      console.error('结束游戏失败:', error);
    }
  }

  /**
   * 获取下一个玩家颜色
   */
  getNextPlayerColor(roomId, playerIndex) {
    return this.playerColors[playerIndex % this.playerColors.length];
  }

  /**
   * 向房间广播消息
   */
  async broadcastToRoom(roomId, type, data, excludeSessionId = null) {
    try {
      const players = await SnakePlayerModel.findOnlineByRoomId(roomId);
      
      players.forEach(player => {
        if (excludeSessionId && player.session_id === excludeSessionId) {
          return;
        }
        
        this.wsService.sendToClient(player.session_id, {
          type: `snake_${type}`,
          data: {
            room_id: roomId,
            ...data
          }
        });
      });
    } catch (error) {
      console.error('房间广播失败:', error);
    }
  }

  /**
   * 通知自动弹出
   */
  async notifyAutoPopup(roomId, mode) {
    try {
      // 获取房间内玩家
      const roomPlayers = await SnakePlayerModel.findOnlineByRoomId(roomId);
      const roomPlayerIds = new Set(roomPlayers.map(p => p.session_id));

      // 向所有其他在线用户发送自动弹出通知
      this.wsService.clients.forEach((client, sessionId) => {
        if (!roomPlayerIds.has(sessionId) && client.readyState === client.OPEN) {
          this.wsService.sendToClient(sessionId, {
            type: 'snake_auto_popup',
            data: {
              room_id: roomId,
              mode,
              player_count: roomPlayers.length,
              message: `有玩家开始了${mode === 'shared' ? '共享' : '竞技'}模式贪吃蛇游戏`
            }
          });
        }
      });
    } catch (error) {
      console.error('自动弹出通知失败:', error);
    }
  }

  /**
   * 获取房间信息
   */
  async getRoomInfo(roomCode) {
    try {
      const room = await SnakeRoomModel.findByRoomCode(roomCode);
      if (!room) {
        return null;
      }

      const players = await SnakePlayerModel.findOnlineByRoomId(room.id);
      const gameState = this.gameStates.get(room.id);

      return {
        room,
        players,
        game_state: gameState || null
      };
    } catch (error) {
      console.error('获取房间信息失败:', error);
      return null;
    }
  }

  /**
   * 清理资源
   */
  cleanup() {
    // 清除所有计时器
    for (const timer of this.gameTimers.values()) {
      clearTimeout(timer);
    }
    for (const timer of this.voteTimers.values()) {
      clearTimeout(timer);
    }
    
    this.gameTimers.clear();
    this.voteTimers.clear();
    this.gameStates.clear();
  }
}
