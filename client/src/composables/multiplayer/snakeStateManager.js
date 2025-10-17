/**
 * 贪吃蛇多人游戏状态管理器
 * 管理游戏状态的更新和同步
 */

export class SnakeStateManager {
  constructor(refs, utils) {
    this.refs = refs;
    this.utils = utils;
  }

  /**
   * 重置房间状态
   */
  resetRoomState() {
    this.refs.isInRoom.value = false;
    this.refs.currentRoom.value = null;
    this.refs.currentPlayer.value = null;
    this.refs.players.value = [];
    this.refs.gameState.value = null;
    this.refs.gameStatus.value = 'lobby';
    this.refs.votes.value = {};
    this.refs.myVote.value = null;
    this.refs.voteTimeout.value = 0;
    this.utils.clearVoteTimer();
  }

  /**
   * 更新房间信息
   */
  updateRoom(roomData) {
    this.refs.currentRoom.value = roomData;
    this.refs.isInRoom.value = true;

    // 缓存房间码
    const roomCode = roomData.room_code || roomData.roomCode;
    if (roomCode) {
      localStorage.setItem('snakeCurrentRoomCode', roomCode);
    }
  }

  /**
   * 更新玩家信息
   */
  updatePlayer(playerData) {
    this.refs.currentPlayer.value = playerData;
  }

  /**
   * 更新玩家列表
   */
  updatePlayers(playersData) {
    this.refs.players.value = playersData || [];
  }

  /**
   * 更新游戏状态
   */
  updateGameState(gameStateData) {
    this.refs.gameState.value = gameStateData;

    // 根据游戏状态更新游戏状态标识
    if (gameStateData) {
      this.refs.gameStatus.value = gameStateData.status || 'waiting';
    }
  }

  /**
   * 更新投票信息
   */
  updateVotes(votesData) {
    this.refs.votes.value = votesData || {};
  }

  /**
   * 设置我的投票
   */
  setMyVote(direction) {
    this.refs.myVote.value = direction;
  }

  /**
   * 开始投票倒计时
   */
  startVoteCountdown(seconds) {
    this.utils.clearVoteTimer();
    this.refs.voteTimeout.value = seconds;

    this.refs.voteTimer.value = setInterval(() => {
      if (this.refs.voteTimeout.value > 0) {
        this.refs.voteTimeout.value -= 1;
      }
      if (this.refs.voteTimeout.value <= 0) {
        this.utils.clearVoteTimer();
      }
    }, 1000);
  }

  /**
   * 设置错误信息
   */
  setError(errorMessage) {
    this.refs.error.value = errorMessage;
  }

  /**
   * 清除错误信息
   */
  clearError() {
    this.refs.error.value = null;
  }

  /**
   * 设置加载状态
   */
  setLoading(loading) {
    this.refs.loading.value = loading;
  }

  /**
   * 处理房间创建成功
   */
  handleRoomCreated(data) {
    this.updateRoom(data.room);
    this.updatePlayer(data.player);
    this.updatePlayers(data.players);
    this.clearError();
  }

  /**
   * 处理房间加入成功
   */
  handleRoomJoined(data) {
    this.updateRoom(data.room);
    this.updatePlayer(data.player);
    this.updatePlayers(data.players);
    if (data.game_state) {
      this.updateGameState(data.game_state);
    }
    this.clearError();
  }

  /**
   * 处理游戏更新
   */
  handleGameUpdate(data) {
    if (data.game_state) {
      this.updateGameState(data.game_state);
    }
    if (data.players) {
      this.updatePlayers(data.players);
    }
  }

  /**
   * 处理玩家状态更新
   */
  handlePlayerUpdate(data) {
    if (data.players) {
      this.updatePlayers(data.players);
    }
    if (data.player) {
      this.updatePlayer(data.player);
    }
  }

  /**
   * 处理投票更新
   */
  handleVoteUpdate(data) {
    if (data.votes) {
      this.updateVotes(data.votes);
    }
  }

  /**
   * 处理游戏结束
   */
  handleGameEnd(data) {
    this.refs.gameStatus.value = 'finished';
    if (data.game_state) {
      this.updateGameState(data.game_state);
    }
  }

  /**
   * 处理错误
   */
  handleError(error) {
    this.setError(error.message || '发生未知错误');
    this.setLoading(false);
  }
}
