<template>
  <div class="multiplayer-mode">
    <!-- 大厅界面 -->
    <SnakeLobby
      v-if="multiplayerView === 'lobby'"
      @join-room="$emit('join-room')"
      @create-room="$emit('create-room')"
    />

    <!-- 房间界面 -->
    <SnakeRoom
      v-else-if="multiplayerView === 'room'"
      @leave-room="$emit('leave-room')"
      @game-update="$emit('game-update', $event)"
    />

    <!-- 返回按钮 -->
    <div class="multiplayer-back">
      <button class="btn btn-secondary" @click="$emit('back-to-menu')">
        返回主菜单
      </button>
    </div>
  </div>
</template>

<script setup>
  import SnakeLobby from '../SnakeLobby.vue';
  import SnakeRoom from '../SnakeRoom.vue';

  defineProps({
    multiplayerView: {
      type: String,
      required: true,
      validator: value => ['lobby', 'room'].includes(value),
    },
  });

  defineEmits([
    'back-to-menu',
    'join-room',
    'create-room',
    'leave-room',
    'game-update',
  ]);
</script>

<style scoped>
  .multiplayer-mode {
    display: flex;
    flex-direction: column;
    min-height: 500px;
  }

  .multiplayer-back {
    display: flex;
    justify-content: center;
    padding: 1rem;
    margin-top: auto;
  }

  .btn {
    padding: 0.75rem 1.5rem;
    border: none;
    border-radius: 8px;
    font-size: 1rem;
    cursor: pointer;
    transition: all 0.3s ease;
  }

  .btn-secondary {
    background-color: #6b7280;
    color: white;
  }

  .btn-secondary:hover {
    background-color: #4b5563;
    transform: translateY(-2px);
  }
</style>
