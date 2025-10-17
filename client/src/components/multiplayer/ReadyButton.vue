<template>
  <div class="player-ready-section" :class="{ 'host-section': isHost }">
    <button
      class="ready-btn"
      :class="{
        'ready-active': isReady,
        'ready-inactive': !isReady,
        'host-ready-btn': isHost,
      }"
      @click="onClick"
      :disabled="disabled || gameStarted"
    >
      <span class="ready-icon">{{ isReady ? '✅' : '⏳' }}</span>
      <span class="ready-text">
        {{
          isHost
            ? isReady
              ? '房主已准备'
              : '房主准备'
            : isReady
              ? readyActiveText
              : readyText
        }}
      </span>
    </button>
    <div class="ready-hint">{{ hint }}</div>
  </div>
</template>

<script>
  export default {
    name: 'ReadyButton',
    props: {
      isReady: { type: Boolean, default: false },
      disabled: { type: Boolean, default: false },
      gameStarted: { type: Boolean, default: false },
      isHost: { type: Boolean, default: false },
      readyText: { type: String, default: '准备' },
      readyActiveText: { type: String, default: '已准备' },
      hint: { type: String, default: '' },
    },
    emits: ['toggle-ready'],
    methods: {
      onClick() {
        if (this.disabled || this.gameStarted) return;
        this.$emit('toggle-ready');
      },
    },
  };
</script>

<style scoped>
  .player-ready-section {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }
  .ready-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 12px;
    padding: 16px 32px;
    border: none;
    border-radius: 8px;
    font-size: 16px;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.3s;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    min-height: 56px;
  }
  .ready-btn.ready-inactive {
    background: linear-gradient(135deg, #ffc107, #ffca2c);
    color: #212529;
    box-shadow: 0 4px 12px rgba(255, 193, 7, 0.3);
  }
  .ready-btn.ready-inactive:hover:not(:disabled) {
    background: linear-gradient(135deg, #ffca2c, #ffd43b);
    transform: translateY(-2px);
    box-shadow: 0 6px 20px rgba(255, 193, 7, 0.4);
  }
  .ready-btn.ready-active {
    background: linear-gradient(135deg, #28a745, #34ce57);
    color: #fff;
    box-shadow: 0 4px 12px rgba(40, 167, 69, 0.3);
  }
  .ready-btn.ready-active:hover:not(:disabled) {
    background: linear-gradient(135deg, #34ce57, #28a745);
    transform: translateY(-2px);
    box-shadow: 0 6px 20px rgba(40, 167, 69, 0.4);
  }
  .host-ready-btn {
    background: linear-gradient(135deg, #007bff, #0056b3);
    color: #fff;
  }
  .host-ready-btn:hover:not(:disabled) {
    background: linear-gradient(135deg, #0056b3, #004085);
  }
  .ready-icon {
    font-size: 20px;
  }
  .ready-hint {
    text-align: center;
    font-size: 14px;
    color: #6c757d;
    font-style: italic;
  }
  .ready-btn:disabled {
    opacity: 0.6;
    cursor: not-allowed;
    transform: none !important;
    box-shadow: none !important;
  }
  @media (max-width: 600px) {
    .ready-btn {
      padding: 12px 24px;
      font-size: 14px;
      min-height: 48px;
    }
    .ready-icon {
      font-size: 18px;
    }
  }
</style>
