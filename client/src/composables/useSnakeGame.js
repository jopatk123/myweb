import { ref, computed } from 'vue';
import { GAME_CONFIG, INITIAL_GAME_STATE } from '../apps/snake/constants/gameConstants.js';
import { 
  GameUtils, 
  SnakeMovement, 
  FoodManager, 
  ParticleManager, 
  GameStateManager, 
  CollisionDetector 
} from '../apps/snake/utils/gameLogic.js';

export default function useSnakeGame() {
  // 游戏状态
  const gameStarted = ref(false);
  const gameOver = ref(false);
  const paused = ref(false);
  const score = ref(0);
  const highScore = ref(0);
  const level = ref(1);
  const difficulty = ref('medium');

  // 蛇和食物
  // 初始蛇与方向取自 INITIAL_GAME_STATE
  const snake = ref([...INITIAL_GAME_STATE.SNAKE]);
  const dir = ref({ ...INITIAL_GAME_STATE.DIRECTION });
  const food = ref({ x: 15, y: 15 });
  const specialFood = ref(null);
  const specialFoodTimer = ref(null);

  // 视觉效果
  const particles = ref([]);
  const lastMoveTime = ref(0);

  const speed = computed(() => {
    return GameStateManager.calculateSpeed(difficulty.value, level.value);
  });

  const gridSize = computed(() => GameUtils.getGridSize());

  // 初始化最高分
  const savedHighScore = localStorage.getItem('snakeHighScore');
  if (savedHighScore) {
    highScore.value = parseInt(savedHighScore);
  }

  // 工具函数
  function randomFood() {
    const excludePositions = [...snake.value, food.value];
    food.value = FoodManager.generateFood(excludePositions, gridSize.value);
  }

  function createSpecialFood() {
    if (!specialFood.value) {
      const excludePositions = [...snake.value, food.value];
      const newSpecialFood = FoodManager.createSpecialFood(excludePositions, gridSize.value);
      
      if (newSpecialFood) {
        specialFood.value = newSpecialFood;
        
        // 特殊食物定时消失
        specialFoodTimer.value = setTimeout(() => {
          specialFood.value = null;
          specialFoodTimer.value = null;
        }, GAME_CONFIG.SPECIAL_FOOD_TIMEOUT);
      }
    }
  }

  function addParticles(x, y, color, count = 5) {
    const newParticles = ParticleManager.createParticles(x, y, color, count);
    particles.value.push(...newParticles);
  }

  function updateParticles() {
    particles.value = ParticleManager.updateParticles(particles.value);
  }

  function checkCollision(head) {
    return GameUtils.checkSelfCollision(head, snake.value);
  }

  function step() {
    if (gameOver.value || paused.value) return;

    const nextHead = SnakeMovement.getNextHead(snake.value[0], dir.value);
    const wrappedHead = GameUtils.wrapPosition(nextHead, gridSize.value);

    // 检查自身碰撞
    if (checkCollision(wrappedHead)) {
      gameOver.value = true;
      gameStarted.value = false;
      addParticles(wrappedHead.x, wrappedHead.y, '#ff4757', 10);
      return;
    }

    // 检查食物碰撞
    const collisionResult = CollisionDetector.processCollisions(
      wrappedHead, 
      food.value, 
      specialFood.value
    );

    // 更新蛇的位置
    const ateAnyFood = collisionResult.ateFood || collisionResult.ateSpecialFood;
    snake.value = SnakeMovement.moveSnake(snake.value, dir.value, gridSize.value, ateAnyFood);

    // 处理食物碰撞结果
    if (collisionResult.ateFood) {
      score.value += collisionResult.scoreIncrease;
      addParticles(food.value.x, food.value.y, '#ff6b6b', 8);
      randomFood();
      createSpecialFood();
    }

    if (collisionResult.ateSpecialFood) {
      addParticles(specialFood.value.x, specialFood.value.y, '#ffd700', 12);
      specialFood.value = null;
      if (specialFoodTimer.value) {
        clearTimeout(specialFoodTimer.value);
        specialFoodTimer.value = null;
      }
    }

    // 更新等级
    const newLevel = GameStateManager.calculateLevel(score.value);
    if (newLevel > level.value) {
      level.value = newLevel;
      addParticles(wrappedHead.x, wrappedHead.y, '#4ade80', 6);
    }

    // 更新最高分
    if (score.value > highScore.value) {
      highScore.value = score.value;
      localStorage.setItem('snakeHighScore', highScore.value);
    }
  }

  function startGame() {
    if (gameStarted.value && !gameOver.value) return;
    if (gameOver.value) {
      restartGame();
    }
    gameStarted.value = true;
    gameOver.value = false;
    paused.value = false;
  }

  function pauseGame() {
    if (!gameStarted.value || gameOver.value) return;
    paused.value = !paused.value;
  }

  function restartGame() {
    if (specialFoodTimer.value) {
      clearTimeout(specialFoodTimer.value);
      specialFoodTimer.value = null;
    }

    // 重置游戏状态
    const initialState = GameStateManager.getInitialGameState();
    gameStarted.value = initialState.gameStarted;
    gameOver.value = initialState.gameOver;
    paused.value = initialState.paused;
    score.value = initialState.score;
    level.value = initialState.level;
    
    // 重置游戏对象
    snake.value = [...initialState.snake];
    dir.value = { ...initialState.direction };
    particles.value = [];
    specialFood.value = null;

    randomFood();
  }

  function setDirection(newDir) {
    if (newDir.x !== undefined && newDir.y !== undefined) {
      if (GameUtils.isValidDirectionChange(dir.value, newDir)) {
        dir.value = { x: newDir.x, y: newDir.y };
        if (!gameStarted.value && !gameOver.value) startGame();
      }
    }
  }

  function handleCanvasClick() {
    if (!gameStarted.value && !gameOver.value) {
      startGame();
    }
  }

  return {
    // state
    gameStarted,
    gameOver,
    paused,
    score,
    highScore,
    level,
    difficulty,
    snake,
    dir,
    food,
    specialFood,
    specialFoodTimer,
    particles,
    lastMoveTime,
    // computed
    speed,
    gridSize,
    // methods
    randomFood,
    createSpecialFood,
    addParticles,
    updateParticles,
    checkCollision,
    step,
    startGame,
    pauseGame,
    restartGame,
    setDirection,
    handleCanvasClick,
  };
}
