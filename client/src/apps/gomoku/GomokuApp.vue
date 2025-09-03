<template>
  <div class="gomoku-app">
    <!-- 模式选择层：首次打开或返回时显示 -->
    <ModeSelect
      v-if="ui.showModeSelect"
      @select-ai="selectAIMode"
      @select-multiplayer="selectMultiplayerMode"
    />

    <!-- 多人模式 -->
    <MultiplayerMode
      v-else-if="ui.mode === 'multiplayer'"
      :mp-form="mpForm"
      :mp-loading="mpLoading"
      :latest-room-code="latestRoomCode"
      @back="backToModeSelect"
      @update:mpForm="updateMpForm"
      @update:mpLoading="mpLoading = $event"
      @update:latestRoomCode="latestRoomCode = $event"
    />

    <!-- AI 模式 -->
    <AIMode v-else />
  </div>
</template>

<script setup>
import ModeSelect from './components/ModeSelect.vue';
import MultiplayerMode from './components/MultiplayerMode.vue';
import AIMode from './components/AIMode.vue';
import { reactive, ref } from 'vue';

const ui = reactive({ showModeSelect: true, mode: 'ai' });
const mpForm = reactive({ playerName: localStorage.getItem('gomoku_mp_name') || '玩家', joinCode: '' });
const mpLoading = ref(false);
const latestRoomCode = ref(null);

function selectAIMode() {
  ui.showModeSelect = false;
  ui.mode = 'ai';
}

function selectMultiplayerMode() {
  ui.showModeSelect = false;
  ui.mode = 'multiplayer';
}

function backToModeSelect() {
  ui.showModeSelect = true;
  ui.mode = 'ai';
}

function updateMpForm(newForm) {
  Object.assign(mpForm, newForm);
}
</script>

<style scoped>
.gomoku-app {
  display: flex;
  flex-direction: column;
  padding: 20px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border-radius: 15px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2);
  font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
  min-height: 600px;
  position: relative;
}

/* 响应式布局 */
@media (max-width: 768px) {
  .gomoku-app {
    padding: 15px;
    min-height: auto;
  }
}

@media (max-width: 576px) {
  .gomoku-app {
    padding: 10px;
  }
}
</style>