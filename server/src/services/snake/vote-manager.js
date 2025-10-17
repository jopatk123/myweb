/**
 * 投票管理器 - 处理共享模式的投票逻辑
 */
export class VoteManager {
  constructor(snakeGameService) {
    this.service = snakeGameService;
    this.voteTimers = new Map();
    this.VOTE_TIMEOUT = 80; // 毫秒
  }

  /**
   * 处理玩家投票
   */
  handleVote(roomId, sessionId, direction) {
    const gameState = this.service.getGameState(roomId);
    if (!this._isValidVoteContext(gameState)) return;

    const player = this.service.PlayerModel.findByRoomAndSession(
      roomId,
      sessionId
    );
    if (!player) return;

    this._recordVote(gameState, sessionId, direction, player);

    const onlinePlayers =
      this.service.PlayerModel.findOnlineByRoomId(roomId) || [];

    // 单人模式直接处理
    if (this._isSinglePlayerMode(onlinePlayers, gameState)) {
      return this._handleSinglePlayerVote(roomId, gameState, direction);
    }

    // 多人模式处理
    this._handleMultiPlayerVote(roomId, gameState, onlinePlayers);
  }

  /**
   * 验证投票上下文是否有效
   */
  _isValidVoteContext(gameState) {
    return (
      gameState && gameState.mode === 'shared' && gameState.status === 'playing'
    );
  }

  /**
   * 记录投票
   */
  _recordVote(gameState, sessionId, direction, player) {
    gameState.votes[sessionId] = {
      direction,
      player_name: player.player_name,
      player_color: player.player_color,
      timestamp: Date.now(),
    };
  }

  /**
   * 检查是否为单人模式
   */
  _isSinglePlayerMode(onlinePlayers, gameState) {
    return onlinePlayers.length === 1 && gameState.sharedSnake;
  }

  /**
   * 处理单人投票
   */
  _handleSinglePlayerVote(roomId, gameState, direction) {
    if (
      this.service.isValidDirectionChange(
        gameState.sharedSnake.direction,
        direction
      )
    ) {
      gameState.sharedSnake.nextDirection = direction;
      gameState.sharedSnake.isWaitingForFirstVote = false;
    }

    this._clearVoteState(roomId, gameState);
    this._broadcastGameUpdate(roomId, gameState);
  }

  /**
   * 处理多人投票
   */
  _handleMultiPlayerVote(roomId, gameState, onlinePlayers) {
    // 处理首次投票
    if (gameState.sharedSnake && gameState.sharedSnake.isWaitingForFirstVote) {
      this._handleFirstVote(gameState);
    }

    // 广播投票更新
    this.service.broadcastToRoom(roomId, 'vote_updated', {
      room_id: roomId,
      votes: gameState.votes,
    });

    // 开始投票计时器
    if (!gameState.voteStartTime) {
      this.startVoteTimer(roomId);
    }

    // 检查是否所有人都投票了
    this._checkAllPlayersVoted(roomId, onlinePlayers, gameState);
  }

  /**
   * 处理首次投票逻辑
   */
  _handleFirstVote(gameState) {
    const firstVote = Object.values(gameState.votes)[0];
    if (
      firstVote &&
      this.service.isValidDirectionChange(
        gameState.sharedSnake.direction,
        firstVote.direction
      )
    ) {
      gameState.sharedSnake.nextDirection = firstVote.direction;
    }
  }

  /**
   * 检查是否所有玩家都投票
   */
  _checkAllPlayersVoted(roomId, onlinePlayers, gameState) {
    try {
      const totalOnline = onlinePlayers.length;
      const voteCount = Object.keys(gameState.votes).length;

      if (totalOnline > 1 && voteCount === totalOnline) {
        this._clearVoteTimer(roomId);
        this.processVotes(roomId);
      }
    } catch (error) {
      console.error('检查投票状态失败:', error);
    }
  }

  /**
   * 开始投票计时器
   */
  startVoteTimer(roomId) {
    const gameState = this.service.getGameState(roomId);
    if (!gameState) return;

    gameState.voteStartTime = Date.now();
    const timeout = gameState.config?.vote_timeout ?? this.VOTE_TIMEOUT;

    const timer = setTimeout(() => this.processVotes(roomId), timeout);
    this.voteTimers.set(roomId, timer);
  }

  /**
   * 处理投票结果
   */
  processVotes(roomId) {
    const gameState = this.service.getGameState(roomId);
    if (!gameState || !gameState.sharedSnake) return;

    const winningDirection = this._calculateWinningDirection(gameState);

    if (
      this.service.isValidDirectionChange(
        gameState.sharedSnake.direction,
        winningDirection
      )
    ) {
      gameState.sharedSnake.nextDirection = winningDirection;
    }

    this._clearVoteState(roomId, gameState);
    this._broadcastGameUpdate(roomId, gameState);
  }

  /**
   * 计算获胜方向
   */
  _calculateWinningDirection(gameState) {
    const voteCounts = {};

    Object.values(gameState.votes).forEach(vote => {
      voteCounts[vote.direction] = (voteCounts[vote.direction] || 0) + 1;
    });

    let winningDirection = gameState.sharedSnake.direction;
    let maxVotes = 0;

    Object.entries(voteCounts).forEach(([direction, count]) => {
      if (count > maxVotes) {
        maxVotes = count;
        winningDirection = direction;
      }
    });

    return winningDirection;
  }

  /**
   * 清理投票状态
   */
  _clearVoteState(roomId, gameState) {
    gameState.votes = {};
    gameState.voteStartTime = null;
    this._clearVoteTimer(roomId);
  }

  /**
   * 清理投票计时器
   */
  _clearVoteTimer(roomId) {
    if (this.voteTimers.has(roomId)) {
      clearTimeout(this.voteTimers.get(roomId));
      this.voteTimers.delete(roomId);
    }
  }

  /**
   * 广播游戏更新
   */
  _broadcastGameUpdate(roomId, gameState) {
    this.service.broadcastToRoom(roomId, 'game_update', {
      room_id: roomId,
      game_state: gameState,
      shared_snake: gameState.sharedSnake,
      food: gameState.food,
    });
  }

  /**
   * 清理资源
   */
  cleanup(roomId) {
    this._clearVoteTimer(roomId);
  }

  /**
   * 清理所有资源
   */
  cleanupAll() {
    for (const roomId of this.voteTimers.keys()) {
      this._clearVoteTimer(roomId);
    }
  }
}
