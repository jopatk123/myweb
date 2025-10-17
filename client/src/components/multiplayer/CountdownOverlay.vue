<template>
  <div v-if="countdown > 0" class="countdown-overlay">
    <div class="countdown-content">
      <div class="countdown-number">{{ countdown }}</div>
      <div class="countdown-text">游戏即将开始...</div>
    </div>
  </div>
</template>

<script>
  export default {
    name: 'CountdownOverlay',
    props: { countdown: { type: Number, default: 0 } },
  };
</script>

<style scoped>
  .countdown-overlay {
    position: absolute;
    inset: 0;
    background: rgba(0, 0, 0, 0.8);
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 12px;
    z-index: 10;
  }
  .countdown-content {
    text-align: center;
    color: #fff;
  }
  .countdown-number {
    font-size: 72px;
    font-weight: 900;
    margin-bottom: 16px;
    animation: countdownPulse 1s ease-in-out;
    text-shadow: 0 0 20px rgba(255, 255, 255, 0.5);
  }
  .countdown-text {
    font-size: 18px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 2px;
  }
  @keyframes countdownPulse {
    0% {
      transform: scale(0.8);
      opacity: 0.5;
    }
    50% {
      transform: scale(1.2);
      opacity: 1;
    }
    100% {
      transform: scale(1);
      opacity: 0.9;
    }
  }
  @media (max-width: 600px) {
    .countdown-number {
      font-size: 56px;
    }
    .countdown-text {
      font-size: 16px;
    }
  }
</style>
