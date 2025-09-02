/**
 * 共享模式游戏逻辑
 */
import { generateFood } from './game-state.js';

export async function updateSharedGame(roomId, service) {
  const gameState = service.gameStates.get(roomId);
  if (!gameState) return;

  if (!gameState.sharedSnake) {
    console.warn(`[shared-game] room ${roomId} missing sharedSnake, skipping update`);
    return;
  }

  gameState.sharedSnake.direction = gameState.sharedSnake.nextDirection;

  const head = { ...gameState.sharedSnake.body[0] };
  switch (gameState.sharedSnake.direction) {
    case 'up': head.y -= 1; break;
    case 'down': head.y += 1; break;
    case 'left': head.x -= 1; break;
    case 'right': head.x += 1; break;
  }

  const boardSize = gameState.config.BOARD_SIZE;
  if (head.x < 0 || head.x >= boardSize || head.y < 0 || head.y >= boardSize) {
    return await service.endGame(roomId, 'wall_collision');
  }

  for (const segment of gameState.sharedSnake.body) {
    if (head.x === segment.x && head.y === segment.y) {
      return await service.endGame(roomId, 'self_collision');
    }
  }

  gameState.sharedSnake.body.unshift(head);

  if (head.x === gameState.food.x && head.y === gameState.food.y) {
    gameState.sharedSnake.score += 10;
    gameState.sharedSnake.length++;
    gameState.food = generateFood(gameState.sharedSnake.body, boardSize);
  } else {
    gameState.sharedSnake.body.pop();
  }

  await service.broadcastToRoom(roomId, 'game_update', {
    shared_snake: gameState.sharedSnake,
    food: gameState.food
  });
}

export function startVoteProcessingLoop(roomId, service) {
  const gameState = service.gameStates.get(roomId);
  if (!gameState || gameState.gameOver) {
    return;
  }

  const voteLoop = async () => {
    if (!service.gameStates.has(roomId) || service.gameStates.get(roomId).gameOver) {
      return;
    }

    const winningDirection = calculateVoteResult(gameState.votes);
    if (winningDirection) {
      const oppositeDirections = { 'up': 'down', 'down': 'up', 'left': 'right', 'right': 'left' };
      if (oppositeDirections[winningDirection] !== gameState.sharedSnake.direction) {
        gameState.sharedSnake.nextDirection = winningDirection;
      }
    }

    gameState.votes = {};

    await service.broadcastToRoom(roomId, 'vote_processed', {
      winning_direction: winningDirection
    });

    service.voteTimers.set(roomId, setTimeout(voteLoop, gameState.config.VOTE_TIMEOUT));
  };

  service.voteTimers.set(roomId, setTimeout(voteLoop, gameState.config.VOTE_TIMEOUT));
}

function calculateVoteResult(votes) {
  const voteCount = {};
  const validDirections = ['up', 'down', 'left', 'right'];

  Object.values(votes).forEach(vote => {
    if (validDirections.includes(vote.direction)) {
      voteCount[vote.direction] = (voteCount[vote.direction] || 0) + 1;
    }
  });

  if (Object.keys(voteCount).length === 0) {
    return null;
  }

  const maxVotes = Math.max(...Object.values(voteCount));
  const winners = Object.keys(voteCount).filter(dir => voteCount[dir] === maxVotes);

  return winners[Math.floor(Math.random() * winners.length)];
}
