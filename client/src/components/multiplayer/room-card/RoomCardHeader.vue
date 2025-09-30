<template>
  <div class="room-header">
    <span class="room-code">{{ room.room_code }}</span>
    <span class="room-mode" :class="modeClass">
      <slot name="mode-icon" :mode="room.mode">
        {{ modeIcon }}
      </slot>
      {{ modeLabel }}
    </span>
  </div>
</template>

<script setup>
  defineProps({
    room: {
      type: Object,
      required: true,
    },
    modeClass: {
      type: String,
      required: true,
    },
    modeIcon: {
      type: String,
      required: true,
    },
    modeLabel: {
      type: String,
      required: true,
    },
  });
</script>

<style scoped>
  .room-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 12px;
  }

  .room-code {
    font-size: 18px;
    font-weight: bold;
    color: #212529;
    font-family: 'Monaco', 'Menlo', monospace;
    background: #f8f9fa;
    padding: 4px 8px;
    border-radius: 6px;
    border: 1px solid #dee2e6;
  }

  .room-mode {
    font-size: 12px;
    font-weight: 600;
    padding: 4px 8px;
    border-radius: 12px;
    color: white;
    text-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
  }

  .mode-shared {
    background: linear-gradient(45deg, #007bff, #0056b3);
  }

  .mode-competitive {
    background: linear-gradient(45deg, #dc3545, #c82333);
  }
</style>
