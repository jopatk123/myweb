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
  // timerRef.current holds the ID returned by setTimeout when logic is running
  const timerRef = { current: null };
  // rafId for the rendering loop
  let rafId = null;

  function clearTimer() {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }

  function startLogicLoop() {
    // avoid duplicate loops
    if (timerRef.current) return;

    const tick = () => {
      // run one logic tick
      try {
        gameStep();
        updateParticles();
      } catch (e) {
        console.error('snake logic tick error', e);
      }

      // draw after logic update
      try {
        snakeCanvasRef.value?.draw();
      } catch (e) {
        // swallow render errors to avoid breaking loop
      }

      // schedule next tick if still running
      if (timerRef.current !== null) {
        timerRef.current = setTimeout(tick, speed.value);
      }
    };

    // schedule first tick
    timerRef.current = setTimeout(tick, speed.value);
  }

  function stopLogicLoop() {
    clearTimer();
  }

  function renderLoop() {
    snakeCanvasRef.value?.draw();
    rafId = requestAnimationFrame(renderLoop);
  }

  function startRenderLoop() {
    if (!rafId) {
      rafId = requestAnimationFrame(renderLoop);
    }
  }

  function stopRenderLoop() {
    if (rafId) {
      cancelAnimationFrame(rafId);
      rafId = null;
    }
  }

  function start() {
    startGame();
    stopLogicLoop();
    startLogicLoop();
    startRenderLoop();
  }

  function pause() {
    pauseGame();
    if (paused.value) {
      stopLogicLoop();
    } else {
      // resume logic loop if applicable
      stopLogicLoop();
      startLogicLoop();
    }
    // keep rendering running so UI remains responsive; renderer is cheap when static
    startRenderLoop();
  }

  function restart() {
    stopLogicLoop();
    restartGame();
    // render immediate frame
    snakeCanvasRef.value?.draw();
  }

  function updateSpeed() {
    // if logic loop is active and game is running, restart with new speed
    if (timerRef.current && gameStarted.value && !paused.value && !gameOver.value) {
      stopLogicLoop();
      startLogicLoop();
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
      startLogicLoop();
    }
    startRenderLoop();
  }

  function bindEvents() {
    window.addEventListener('keydown', handleKey);
    startRenderLoop();
  }

  function unbindEvents() {
    window.removeEventListener('keydown', handleKey);
    stopLogicLoop();
    stopRenderLoop();
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
