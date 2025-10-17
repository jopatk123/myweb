<template>
  <div class="modal-overlay" @click.self="$emit('close')">
    <div class="modal-content">
      <div class="modal-header">
        <h3>创建新房间</h3>
        <button class="modal-close" @click="$emit('close')">&times;</button>
      </div>

      <div class="modal-body">
        <slot
          name="create-room-form"
          :roomConfig="localRoomConfig"
          :onConfigChange="handleConfigChange"
        >
          <div class="form-group">
            <label>游戏模式</label>
            <select v-model="localRoomConfig.mode" class="form-control">
              <option
                v-for="mode in gameModes"
                :key="mode.value"
                :value="mode.value"
              >
                {{ mode.icon }} {{ mode.label }}
              </option>
            </select>
          </div>

          <div class="form-group">
            <label>最大玩家数</label>
            <input
              v-model.number="localRoomConfig.maxPlayers"
              type="number"
              min="2"
              max="8"
              class="form-control"
            />
          </div>
        </slot>
      </div>

      <div class="modal-footer">
        <button class="btn-secondary" @click="$emit('close')">取消</button>
        <button class="btn-primary" @click="createRoom" :disabled="loading">
          创建房间
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
  import { ref, watch } from 'vue';

  const props = defineProps({
    gameModes: Array,
    loading: Boolean,
    initialConfig: Object,
  });

  const emit = defineEmits(['createRoom', 'close']);

  const localRoomConfig = ref({ ...props.initialConfig });

  watch(
    () => props.initialConfig,
    newConfig => {
      localRoomConfig.value = { ...newConfig };
    },
    { deep: true }
  );

  const handleConfigChange = (key, value) => {
    localRoomConfig.value[key] = value;
  };

  const createRoom = () => {
    emit('createRoom', localRoomConfig.value);
  };
</script>

<style scoped>
  .modal-overlay {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background-color: rgba(0, 0, 0, 0.5);
    display: flex;
    justify-content: center;
    align-items: center;
    z-index: 1000;
  }

  .modal-content {
    background: white;
    border-radius: 8px;
    width: 90%;
    max-width: 500px;
    max-height: 80vh;
    overflow-y: auto;
  }

  .modal-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 20px;
    border-bottom: 1px solid #e0e0e0;
  }

  .modal-close {
    background: none;
    border: none;
    font-size: 24px;
    cursor: pointer;
  }

  .modal-body {
    padding: 20px;
  }

  .modal-footer {
    display: flex;
    justify-content: flex-end;
    gap: 10px;
    padding: 20px;
    border-top: 1px solid #e0e0e0;
  }

  .form-group {
    margin-bottom: 15px;
  }

  .form-group label {
    display: block;
    margin-bottom: 5px;
    font-weight: bold;
  }

  .form-control {
    width: 100%;
    padding: 8px 12px;
    border: 1px solid #ddd;
    border-radius: 4px;
    font-size: 14px;
  }

  .btn-primary,
  .btn-secondary {
    padding: 8px 16px;
    border: none;
    border-radius: 4px;
    cursor: pointer;
    font-size: 14px;
    transition: background-color 0.2s ease;
  }

  .btn-primary {
    background-color: #007bff;
    color: white;
  }

  .btn-primary:hover {
    background-color: #0056b3;
  }

  .btn-secondary {
    background-color: #6c757d;
    color: white;
  }

  .btn-secondary:hover {
    background-color: #545b62;
  }

  .btn-primary:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
</style>
