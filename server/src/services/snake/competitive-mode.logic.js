// 竞技模式核心逻辑
export function initCompetitivePlayers(service, roomId, players) {
  const gameState = service.getGameState(roomId);
  if (!gameState) return;
  // 使用动态大小（可能已在生命周期中调整）
  const size = gameState.config?.BOARD_SIZE || service.SNAKE_CONFIG.BOARD_SIZE;
  gameState.snakes = {};
  // 预定义 8 个起始点（均匀分布在圆周/矩形周边区域）
  const centers = [
    { x: Math.floor(size / 4), y: Math.floor(size / 4) },
    { x: Math.floor((3 * size) / 4), y: Math.floor((3 * size) / 4) },
    { x: Math.floor((3 * size) / 4), y: Math.floor(size / 4) },
    { x: Math.floor(size / 4), y: Math.floor((3 * size) / 4) },
    { x: Math.floor(size / 2), y: Math.floor(size / 4) },
    { x: Math.floor(size / 2), y: Math.floor((3 * size) / 4) },
    { x: Math.floor(size / 4), y: Math.floor(size / 2) },
    { x: Math.floor((3 * size) / 4), y: Math.floor(size / 2) },
  ];
  players.forEach((p, idx) => {
    const c = centers[idx] || centers[0];
    // 初始蛇竖直向上
    const body = [
      { x: c.x, y: c.y },
      { x: c.x, y: c.y + 1 },
      { x: c.x, y: c.y + 2 },
    ];
    gameState.snakes[p.session_id] = {
      body,
      direction: 'up',
      nextDirection: 'up',
      score: 0,
      gameOver: false,
      player: p,
    };
  });
  gameState.foods = generateCompetitiveFoods(service, gameState);
  gameState.loser = null;
  gameState.winners = [];
}

export function generateCompetitiveFoods(service, gameState) {
  const foods = [];
  const bodies = Object.values(gameState.snakes).flatMap(s => s.body);
  const size = gameState.config?.BOARD_SIZE || service.SNAKE_CONFIG.BOARD_SIZE;
  for (let i = 0; i < Object.keys(gameState.snakes).length; i++) {
    foods.push(service.generateRandomPosition(size, bodies));
  }
  return foods;
}

export function updateCompetitiveGameTick(service, roomId) {
  const gameState = service.getGameState(roomId);
  if (!gameState) return;
  const size = gameState.config?.BOARD_SIZE || service.SNAKE_CONFIG.BOARD_SIZE;
  try {
    service.RoomModel.update(roomId, {
      /* tick touch */
    });
  } catch (e) {
    console.warn('competitive tick touch failed', e);
  }
  if (gameState.loser) {
    // 已经确定输家，等待 lifecycle endGame 调用（防抖）
    return;
  }
  let loserDetected = null;
  Object.entries(gameState.snakes).forEach(([sid, snake]) => {
    if (loserDetected || snake.gameOver) return; // 一旦发现输家停止进一步计算，保持首个事件
    snake.direction = snake.nextDirection || snake.direction;
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
    // 边界穿越继续包裹（保持原逻辑）
    if (head.x < 0) head.x = size - 1;
    else if (head.x >= size) head.x = 0;
    if (head.y < 0) head.y = size - 1;
    else if (head.y >= size) head.y = 0;
    // 自撞判负（包含头撞到自己身体）
    if (
      !loserDetected &&
      snake.body.some(seg => seg.x === head.x && seg.y === head.y)
    ) {
      loserDetected = snake;
    }
    // 撞到他人
    Object.entries(gameState.snakes).forEach(([oid, other]) => {
      if (loserDetected || oid === sid || other.gameOver) return;
      if (other.body.some(seg => seg.x === head.x && seg.y === head.y)) {
        loserDetected = snake;
      }
    });
    if (loserDetected) return;
    // 正常前进
    snake.body.unshift(head);
    let ate = false;
    gameState.foods.forEach((food, idx) => {
      if (!ate && head.x === food.x && head.y === food.y) {
        ate = true;
        snake.score += 10;
        const allBodies = Object.values(gameState.snakes).flatMap(s => s.body);
        gameState.foods[idx] = service.generateRandomPosition(size, allBodies);
      }
    });
    if (!ate) snake.body.pop();
  });

  if (loserDetected) {
    loserDetected.gameOver = true;
    gameState.loser = loserDetected.player;
    // 赢家列表 = 其他所有玩家
    gameState.winners = Object.values(gameState.snakes)
      .filter(s => s !== loserDetected)
      .map(s => s.player);
    // 排行需要分数，服务端不再推迟，立即结束
    service.broadcastToRoom(roomId, 'competitive_update', {
      game_state: gameState,
      snakes: gameState.snakes,
      foods: gameState.foods,
    });
    service.endGame(roomId, 'competitive_finished');
    return;
  }

  service.broadcastToRoom(roomId, 'competitive_update', {
    game_state: gameState,
    snakes: gameState.snakes,
    foods: gameState.foods,
  });
}
