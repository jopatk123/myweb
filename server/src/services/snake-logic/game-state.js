/**
 * 游戏状态管理
 */

export function initGameState(roomId, mode, config) {
  return {
    roomId,
    mode,
    status: 'waiting',
    startTime: null,
    votes: {}, // sessionId -> {direction, player_name, timestamp}
    snakes: {}, // sessionId -> snake data (for competitive mode)
    sharedSnake: null, // shared mode的共享蛇
    food: null,
    gameOver: false,
    winner: null,
    config
  };
}

export function initSharedGame(gameState, players) {
  const boardSize = gameState.config.BOARD_SIZE;
  const center = Math.floor(boardSize / 2);
  
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

  gameState.food = generateFood(gameState.sharedSnake.body, boardSize);
  gameState.status = 'playing';
  gameState.startTime = Date.now();
}

export function initCompetitiveGame(gameState, players) {
  const boardSize = gameState.config.BOARD_SIZE;
  
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

  gameState.food = {};
  players.forEach(player => {
    const allSnakeBodies = Object.values(gameState.snakes).flatMap(snake => snake.body);
    gameState.food[player.session_id] = generateFood(allSnakeBodies, boardSize);
  });

  gameState.status = 'playing';
  gameState.startTime = Date.now();
}

export function generateFood(snakeBodies, boardSize) {
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
