<template>
  <div class="rooms-section">
    <div class="section-header">
      <h3>🏠 活跃房间 ({{ activeRooms.length }})</h3>
      <div class="room-filters">
        <select v-model="roomFilter" class="filter-select">
          <option value="all">所有房间</option>
          <option value="waiting">等待中</option>
          <option value="playing">游戏中</option>
        </select>
      </div>
    </div>

    <div v-if="loading" class="loading-container">
      <div class="loading-spinner"></div>
      <span>加载房间列表...</span>
    </div>

    <div v-else-if="filteredRooms.length === 0" class="empty-rooms">
      <div class="empty-icon">🏠</div>
      <h4>暂无活跃房间</h4>
      <p>创建一个新房间开始游戏吧！</p>
    </div>

    <div v-else class="rooms-grid">
      <RoomCard
        v-for="room in filteredRooms"
        :key="room.id"
        :room="room"
        :gameModes="gameModes"
        @joinRoom="$emit('joinRoom', $event)"
      >
        <template #room-mode="{ room: slotRoom }">
          <slot name="room-mode" :room="slotRoom"></slot>
        </template>
      </RoomCard>
    </div>
  </div>
</template>

<script setup>
  import { ref, computed } from 'vue';
  import RoomCard from './RoomCard.vue';

  const props = defineProps({
    activeRooms: {
      type: Array,
      required: true,
    },
    gameModes: {
      type: Array,
      required: true,
    },
    loading: {
      type: Boolean,
      default: false,
    },
  });

  defineEmits(['joinRoom']);

  const roomFilter = ref('all');

  const filteredRooms = computed(() => {
    if (roomFilter.value === 'all') {
      return props.activeRooms;
    }
    return props.activeRooms.filter(room => room.status === roomFilter.value);
  });
</script>

<style scoped>
  .rooms-section {
    background: #f8f9fa;
    border-radius: 8px;
    padding: 20px;
    margin-bottom: 20px;
  }

  .section-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 15px;
  }

  .filter-select {
    padding: 6px 10px;
    border: 1px solid #ddd;
    border-radius: 4px;
    font-size: 14px;
  }

  .loading-container {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 10px;
    padding: 40px;
    color: #666;
  }

  .loading-spinner {
    width: 20px;
    height: 20px;
    border: 2px solid #f3f3f3;
    border-top: 2px solid #007bff;
    border-radius: 50%;
    animation: spin 1s linear infinite;
  }

  @keyframes spin {
    0% {
      transform: rotate(0deg);
    }
    100% {
      transform: rotate(360deg);
    }
  }

  .empty-rooms {
    text-align: center;
    padding: 40px;
    color: #666;
  }

  .empty-icon {
    font-size: 48px;
    margin-bottom: 15px;
  }

  .rooms-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
    gap: 15px;
  }
</style>
