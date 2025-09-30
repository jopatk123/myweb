<template>
  <RoomList
    :active-rooms="activeRooms"
    :game-modes="availableGameModes"
    :game-config="gameConfig"
    :loading="loading"
    :empty-message="emptyMessage"
    @join-room="$emit('join-room', $event)"
    @refresh="$emit('refresh')"
  >
    <template #room-mode="slotProps">
      <slot name="room-mode" v-bind="slotProps" />
    </template>

    <template #room-extra="slotProps">
      <slot name="room-extra" v-bind="slotProps" />
    </template>

    <template #room-actions="slotProps">
      <slot name="room-actions" v-bind="slotProps" />
    </template>
  </RoomList>
</template>

<script setup>
  import RoomList from './RoomList.vue';

  defineProps({
    activeRooms: {
      type: Array,
      required: true,
    },
    availableGameModes: {
      type: Array,
      required: true,
    },
    gameConfig: {
      type: Object,
      required: true,
    },
    loading: {
      type: Boolean,
      default: false,
    },
    emptyMessage: {
      type: String,
      required: true,
    },
  });

  defineEmits(['join-room', 'refresh']);
</script>
