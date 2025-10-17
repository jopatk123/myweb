/**
 * 竞技模式游戏逻辑
 */
import { generateFood } from './game-state.js';

export async function updateCompetitiveGame(roomId, service) {
  const gameState = service.gameStates.get(roomId);
  if (!gameState) return;

  const boardSize = gameState.config.BOARD_SIZE;
  let gameOverCount = 0;
  let winner = null;

  for (const [sessionId, snake] of Object.entries(gameState.snakes)) {
    if (snake.gameOver) {
      gameOverCount++;
      continue;
    }

    snake.direction = snake.nextDirection;

    const head = { ...snake.body[0] };
    switch (snake.direction) {
      case 'up':
        head.y -= 1;
        break;
      case 'down':
        head.y += 1;
        break;
      case 'left':
        head.x -= 1;
        break;
      case 'right':
        head.x += 1;
        break;
    }

    if (
      head.x < 0 ||
      head.x >= boardSize ||
      head.y < 0 ||
      head.y >= boardSize
    ) {
      snake.gameOver = true;
      gameOverCount++;
      continue;
    }

    for (const segment of snake.body) {
      if (head.x === segment.x && head.y === segment.y) {
        snake.gameOver = true;
        gameOverCount++;
        break;
      }
    }
    if (snake.gameOver) continue;

    for (const [otherSessionId, otherSnake] of Object.entries(
      gameState.snakes
    )) {
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

    snake.body.unshift(head);

    const food = gameState.food[sessionId];
    if (food && head.x === food.x && head.y === food.y) {
      snake.score += 10;
      snake.length++;
      const allSnakeBodies = Object.values(gameState.snakes)
        .filter(s => !s.gameOver)
        .flatMap(s => s.body);
      gameState.food[sessionId] = generateFood(allSnakeBodies, boardSize);
    } else {
      snake.body.pop();
    }

    const aliveCount = Object.values(gameState.snakes).filter(
      s => !s.gameOver
    ).length;
    if (aliveCount === 1) {
      winner = snake.player;
    }
  }

  await service.broadcastToRoom(roomId, 'competitive_update', {
    snakes: gameState.snakes,
    food: gameState.food,
  });

  const totalPlayers = Object.keys(gameState.snakes).length;
  if (gameOverCount >= totalPlayers - 1) {
    if (!winner && gameOverCount < totalPlayers) {
      winner = Object.values(gameState.snakes).find(s => !s.gameOver)?.player;
    }
    await service.endGame(roomId, 'game_complete', winner);
  }
}
