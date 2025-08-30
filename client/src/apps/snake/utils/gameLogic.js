/**
 * 贪吃蛇游戏核心逻辑工具
 * 将游戏逻辑从 composable 中分离出来
 */
import { GAME_CONFIG, INITIAL_GAME_STATE, DIRECTIONS } from '../constants/gameConstants.js';

/**
 * 位置和碰撞检测工具
 */
export class GameUtils {
    static getGridSize(boardSize = GAME_CONFIG.BOARD_SIZE, cellSize = GAME_CONFIG.CELL_SIZE) {
        return boardSize / cellSize;
    }

    static randomPosition(gridSize) {
        return {
            x: Math.floor(Math.random() * gridSize),
            y: Math.floor(Math.random() * gridSize),
        };
    }

    static isPositionOccupied(pos, occupiedPositions) {
        return occupiedPositions.some(
            occupied => occupied.x === pos.x && occupied.y === pos.y
        );
    }

    static generateSafePosition(gridSize, excludePositions = []) {
        let newPosition;
        let attempts = 0;
        const maxAttempts = gridSize * gridSize;

        do {
            newPosition = this.randomPosition(gridSize);
            attempts++;
        } while (
            this.isPositionOccupied(newPosition, excludePositions) &&
            attempts < maxAttempts
        );

        return newPosition;
    }

    static checkSelfCollision(head, body) {
        return body.some(segment => segment.x === head.x && segment.y === head.y);
    }

    static isValidDirectionChange(currentDir, newDir) {
        // 防止直接反向
        return !(currentDir.x === -newDir.x && currentDir.y === -newDir.y);
    }

    static wrapPosition(pos, gridSize) {
        return {
            x: (pos.x + gridSize) % gridSize,
            y: (pos.y + gridSize) % gridSize,
        };
    }
}

/**
 * 蛇移动逻辑
 */
export class SnakeMovement {
    static getNextHead(currentHead, direction) {
        return {
            x: currentHead.x + direction.x,
            y: currentHead.y + direction.y,
        };
    }

    static moveSnake(snake, direction, gridSize, ateFood = false) {
        const head = this.getNextHead(snake[0], direction);
        const wrappedHead = GameUtils.wrapPosition(head, gridSize);

        const newSnake = [wrappedHead, ...snake];

        // 如果没吃到食物，移除尾部
        if (!ateFood) {
            newSnake.pop();
        }

        return newSnake;
    }
}

/**
 * 食物管理
 */
export class FoodManager {
    static generateFood(excludePositions, gridSize) {
        return GameUtils.generateSafePosition(gridSize, excludePositions);
    }

    static shouldCreateSpecialFood() {
        return Math.random() < GAME_CONFIG.SPECIAL_FOOD_PROBABILITY;
    }

    static createSpecialFood(excludePositions, gridSize) {
        if (!this.shouldCreateSpecialFood()) {
            return null;
        }

        return GameUtils.generateSafePosition(gridSize, excludePositions);
    }
}

/**
 * 粒子效果管理
 */
export class ParticleManager {
    static createParticles(x, y, color, count = 5, cellSize = GAME_CONFIG.CELL_SIZE) {
        const particles = [];

        for (let i = 0; i < count; i++) {
            particles.push({
                x: x * cellSize + cellSize / 2,
                y: y * cellSize + cellSize / 2,
                vx: (Math.random() - 0.5) * 4,
                vy: (Math.random() - 0.5) * 4,
                life: 1,
                color: color,
            });
        }

        return particles;
    }

    static updateParticles(particles) {
        return particles.filter(particle => {
            particle.x += particle.vx;
            particle.y += particle.vy;
            particle.life -= GAME_CONFIG.PARTICLE_DECAY_RATE;
            return particle.life > 0;
        });
    }
}

/**
 * 游戏状态管理
 */
export class GameStateManager {
    static calculateSpeed(difficulty, level) {
        const baseSpeed = GAME_CONFIG.SPEEDS[difficulty] || GAME_CONFIG.SPEEDS.medium;
        const speedReduction = (level - 1) * GAME_CONFIG.SPEED_INCREASE_PER_LEVEL;
        return Math.max(baseSpeed - speedReduction, GAME_CONFIG.MIN_SPEED);
    }

    static calculateLevel(score) {
        return Math.floor(score / GAME_CONFIG.LEVEL_UP_SCORE) + 1;
    }

    static getInitialGameState() {
        return {
            snake: [...INITIAL_GAME_STATE.SNAKE],
            direction: { ...INITIAL_GAME_STATE.DIRECTION },
            score: INITIAL_GAME_STATE.SCORE,
            level: INITIAL_GAME_STATE.LEVEL,
            gameStarted: false,
            gameOver: false,
            paused: false,
        };
    }
}

/**
 * 碰撞检测和游戏事件处理
 */
export class CollisionDetector {
    static checkFoodCollision(head, food) {
        return head.x === food.x && head.y === food.y;
    }

    static checkSpecialFoodCollision(head, specialFood) {
        if (!specialFood) return false;
        return head.x === specialFood.x && head.y === specialFood.y;
    }

    static processCollisions(head, food, specialFood) {
        const result = {
            ateFood: false,
            ateSpecialFood: false,
            scoreIncrease: 0,
        };

        if (this.checkFoodCollision(head, food)) {
            result.ateFood = true;
            result.scoreIncrease += 10;
        }

        if (this.checkSpecialFoodCollision(head, specialFood)) {
            result.ateSpecialFood = true;
            result.scoreIncrease += 50;
        }

        return result;
    }
}