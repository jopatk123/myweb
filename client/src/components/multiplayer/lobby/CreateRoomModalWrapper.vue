<template>
  <CreateRoomModal
    v-if="show"
    :game-modes="availableGameModes"
    :game-config="gameConfig"
    :loading="loading"
    :initial-config="initialConfig"
    :player-name="playerName"
    @close="$emit('close')"
    @create-room="$emit('create-room', $event)"
  >
    <template #create-room-form="slotProps">
      <slot name="create-room-form" v-bind="slotProps" />
    </template>

    <template #advanced-settings="slotProps">
      <slot name="advanced-settings" v-bind="slotProps" />
    </template>
  </CreateRoomModal>
</template>

<script setup>
  import CreateRoomModal from './CreateRoomModal.vue';

  const props = defineProps({
    show: {
      type: Boolean,
      default: false,
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
    initialConfig: {
      type: Object,
      default: () => ({}),
    },
    playerName: {
      type: String,
      required: true,
    },
  });

  defineEmits(['close', 'create-room']);

  // 暴露给父组件访问当前配置
  const getInitialConfig = () => props.initialConfig;

  defineExpose({
    getInitialConfig,
  });
</script>
