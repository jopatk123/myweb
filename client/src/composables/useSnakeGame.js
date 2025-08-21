import { ref, computed } from 'vue';

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
  const snake = ref([
    { x: 10, y: 10 },
    { x: 9, y: 10 },
    { x: 8, y: 10 }
  ]);
  const dir = ref({ x: 1, y: 0 });
  const food = ref({ x: 15, y: 15 });
  const specialFood = ref(null);
  const specialFoodTimer = ref(null);

  // 视觉效果（粒子数据由渲染端使用）
  const particles = ref([]);
  const lastMoveTime = ref(0);

  const boardSize = 400;
  const cell = 20;

  const speed = computed(() => {
    const speeds = {
      easy: 150,
      medium: 120,
      hard: 90,
      extreme: 60
    };
    return Math.max(speeds[difficulty.value] - (level.value - 1) * 5, 30);
  });

  const gridSize = computed(() => boardSize / cell);

  // 初始化最高分
  const savedHighScore = localStorage.getItem('snakeHighScore');
  if (savedHighScore) {
    highScore.value = parseInt(savedHighScore);
  }

  // 工具函数
  function randomPosition() {
    return {
      x: Math.floor(Math.random() * gridSize.value),
      y: Math.floor(Math.random() * gridSize.value)
    };
  }

  function isPositionOccupied(pos) {
    return snake.value.some(segment => segment.x === pos.x && segment.y === pos.y);
  }

  function randomFood() {
    let newFood;
    do {
      newFood = randomPosition();
    } while (isPositionOccupied(newFood));
    food.value = newFood;
  }

  function createSpecialFood() {
    if (Math.random() < 0.1 && !specialFood.value) { // 10% 概率生成特殊食物
      let newSpecialFood;
      do {
        newSpecialFood = randomPosition();
      } while (isPositionOccupied(newSpecialFood) ||
               (newSpecialFood.x === food.value.x && newSpecialFood.y === food.value.y));

      specialFood.value = newSpecialFood;

      // 特殊食物5秒后消失
      specialFoodTimer.value = setTimeout(() => {
        specialFood.value = null;
        specialFoodTimer.value = null;
      }, 5000);
    }
  }

  function addParticles(x, y, color, count = 5) {
    for (let i = 0; i < count; i++) {
      particles.value.push({
        x: x * cell + cell / 2,
        y: y * cell + cell / 2,
        vx: (Math.random() - 0.5) * 4,
        vy: (Math.random() - 0.5) * 4,
        life: 1,
        color: color
      });
    }
  }

  function updateParticles() {
    particles.value = particles.value.filter(particle => {
      particle.x += particle.vx;
      particle.y += particle.vy;
      particle.life -= 0.02;
      return particle.life > 0;
    });
  }

  function checkCollision(head) {
    return snake.value.some(segment => segment.x === head.x && segment.y === head.y);
  }

  function step() {
    if (gameOver.value || paused.value) return;

    const head = {
      x: snake.value[0].x + dir.value.x,
      y: snake.value[0].y + dir.value.y
    };

    // 边界处理 - 穿墙
    head.x = (head.x + gridSize.value) % gridSize.value;
    head.y = (head.y + gridSize.value) % gridSize.value;

    // 检查碰撞
    if (checkCollision(head)) {
      gameOver.value = true;
      gameStarted.value = false;
      addParticles(head.x, head.y, '#ff4757', 10);
      return;
    }

    // 检查是否吃到食物
    let ateFood = false;
    let ateSpecialFood = false;

    if (head.x === food.value.x && head.y === food.value.y) {
      ateFood = true;
      score.value += 10;
      addParticles(food.value.x, food.value.y, '#ff6b6b', 8);
      randomFood();
      createSpecialFood();
    } else if (specialFood.value && head.x === specialFood.value.x && head.y === specialFood.value.y) {
      ateSpecialFood = true;
      score.value += 50;
      addParticles(specialFood.value.x, specialFood.value.y, '#ffd700', 12);
      specialFood.value = null;
      if (specialFoodTimer.value) {
        clearTimeout(specialFoodTimer.value);
        specialFoodTimer.value = null;
      }
    }

    // 更新蛇的位置
    snake.value.unshift(head);
    if (!ateFood && !ateSpecialFood) {
      snake.value.pop();
    }

    // 更新等级
    const newLevel = Math.floor(score.value / 100) + 1;
    if (newLevel > level.value) {
      level.value = newLevel;
      addParticles(head.x, head.y, '#4ade80', 6);
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

    gameStarted.value = false;
    gameOver.value = false;
    paused.value = false;
    score.value = 0;
    level.value = 1;
    particles.value = [];

    snake.value = [
      { x: 10, y: 10 },
      { x: 9, y: 10 },
      { x: 8, y: 10 }
    ];
    dir.value = { x: 1, y: 0 };

    randomFood();
    specialFood.value = null;
  }

  function setDirection(newDir) {
    // 防止直接反向
    if (newDir.x !== undefined && newDir.y !== undefined) {
      if (!(dir.value.x === -newDir.x && dir.value.y === -newDir.y)) {
        dir.value = { x: newDir.x, y: newDir.y };
        if (!gameStarted.value) startGame();
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
    handleCanvasClick
  };
}


