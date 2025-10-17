// 共享模式核心逻辑
export function createInitialSnake(boardSize) {
  const centerX = Math.floor(boardSize / 2);
  const centerY = Math.floor(boardSize / 2);
  return {
    body: [
      { x: centerX, y: centerY },
      { x: centerX, y: centerY + 1 },
      { x: centerX, y: centerY + 2 },
    ],
    direction: 'right',
    nextDirection: 'right',
    score: 0,
    length: 3,
    isWaitingForFirstVote: true,
  };
}

export function updateSharedGameTick(service, roomId) {
  const gameState = service.getGameState(roomId);
  if (!gameState || !gameState.sharedSnake || gameState.status !== 'playing')
    return;
  // 触发一次房间更新时间，避免被视为空闲
  try {
    service.RoomModel.update(roomId, {
      /* touch timestamp */
    });
  } catch (e) {
    console.warn('shared tick touch failed', e);
  }
  const snake = gameState.sharedSnake;
  if (snake.isWaitingForFirstVote) {
    if (!gameState.startTime) gameState.startTime = Date.now();
    const waitBase = gameState.startTime || gameState.createdAt || Date.now();
    const waitTime = Date.now() - waitBase;
    const hasVotes = Object.keys(gameState.votes || {}).length > 0;
    const singlePlayer = gameState.playerCount === 1;
    if (hasVotes || waitTime > 5000 || singlePlayer) {
      snake.isWaitingForFirstVote = false;
    } else {
      service.broadcastToRoom(roomId, 'game_update', {
        room_id: roomId,
        game_state: gameState,
        shared_snake: snake,
        food: gameState.food,
        waiting_for_vote: true,
      });
      return;
    }
  }
  if (snake.nextDirection && snake.nextDirection !== snake.direction) {
    snake.direction = snake.nextDirection;
  }
  const head = { ...snake.body[0] };
  switch (snake.direction) {
    case 'up':
      head.y--;
      break;
    case 'down':
      head.y++;
      break;
    case 'left':
      head.x--;
      break;
    case 'right':
      head.x++;
      break;
  }
  const size = service.SNAKE_CONFIG.BOARD_SIZE;
  if (head.x < 0) head.x = size - 1;
  else if (head.x >= size) head.x = 0;
  if (head.y < 0) head.y = size - 1;
  else if (head.y >= size) head.y = 0;
  if (service.checkSelfCollision(head, snake.body)) {
    service.endGame(roomId, 'self_collision');
    return;
  }
  const ate = head.x === gameState.food.x && head.y === gameState.food.y;
  snake.body.unshift(head);
  if (ate) {
    snake.score += 10;
    snake.length += 1;
    gameState.food = service.generateFood(snake.body);
  } else {
    snake.body.pop();
  }
  service.broadcastToRoom(roomId, 'game_update', {
    room_id: roomId,
    game_state: gameState,
    shared_snake: snake,
    food: gameState.food,
  });
}
