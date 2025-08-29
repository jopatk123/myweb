export default function useSnakeController({
  gameStep,
  updateParticles,
  speed,
  snakeCanvasRef,
  startGame,
  pauseGame,
  restartGame,
  setDirection,
  composableHandleCanvasClick,
  gameStarted,
  paused,
  gameOver,
}) {
  const timerRef = { current: null };

  function clearTimer() {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }

  function start() {
    startGame();
    clearTimer();
    timerRef.current = setInterval(() => {
      gameStep();
      updateParticles();
      snakeCanvasRef.value?.draw();
    }, speed.value);
  }

  function pause() {
    pauseGame();
    if (paused.value) {
      clearTimer();
    } else {
      clearTimer();
      timerRef.current = setInterval(() => {
        gameStep();
        updateParticles();
        snakeCanvasRef.value?.draw();
      }, speed.value);
    }
  }

  function restart() {
    clearTimer();
    restartGame();
    snakeCanvasRef.value?.draw();
  }

  function updateSpeed() {
    if (timerRef.current && gameStarted.value && !paused.value && !gameOver.value) {
      clearTimer();
      timerRef.current = setInterval(() => {
        gameStep();
        updateParticles();
        snakeCanvasRef.value?.draw();
      }, speed.value);
    }
  }

  function handleKey(e) {
    if (gameOver.value) return;
    switch (e.key) {
      case 'ArrowUp':
      case 'w':
      case 'W':
        setDirection({ x: 0, y: -1 });
        break;
      case 'ArrowDown':
      case 's':
      case 'S':
        setDirection({ x: 0, y: 1 });
        break;
      case 'ArrowLeft':
      case 'a':
      case 'A':
        setDirection({ x: -1, y: 0 });
        break;
      case 'ArrowRight':
      case 'd':
      case 'D':
        setDirection({ x: 1, y: 0 });
        break;
      case ' ':
        e.preventDefault();
        pause();
        break;
    }
  }

  function handleCanvasClick() {
    composableHandleCanvasClick();
    if (gameStarted.value && !timerRef.current) {
      timerRef.current = setInterval(() => {
        gameStep();
        updateParticles();
        snakeCanvasRef.value?.draw();
      }, speed.value);
    }
  }

  function bindEvents() {
    window.addEventListener('keydown', handleKey);
  }

  function unbindEvents() {
    window.removeEventListener('keydown', handleKey);
    clearTimer();
  }

  return {
    start,
    pause,
    restart,
    updateSpeed,
    handleCanvasClick,
    bindEvents,
    unbindEvents,
  };
}
