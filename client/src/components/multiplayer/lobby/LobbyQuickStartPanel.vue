<template>
  <QuickStart
    v-if="preset.showCreateRoom"
    v-model:player-name="playerNameModel"
    v-model:selected-mode="selectedModeModel"
    :player-name-placeholder="playerNamePlaceholder"
    :game-modes="availableGameModes"
    :loading="loading"
    :show-mode-selector="preset.showModeSelector"
    :show-player-count="preset.showPlayerCount"
    :show-create-room="preset.showCreateRoom"
    :game-config="gameConfig"
    @show-create-room="$emit('open-create-room')"
  >
    <template #mode-selector="slotProps">
      <slot name="mode-selector" v-bind="slotProps" />
    </template>

    <template #extra-controls>
      <slot name="quick-start-controls" />
    </template>
  </QuickStart>
</template>

<script setup>
  import { computed } from 'vue';
  import QuickStart from './QuickStart.vue';

  const props = defineProps({
    preset: {
      type: Object,
      required: true,
    },
    playerName: {
      type: String,
      required: true,
    },
    selectedMode: {
      type: String,
      default: '',
    },
    playerNamePlaceholder: {
      type: String,
      required: true,
    },
    availableGameModes: {
      type: Array,
      required: true,
    },
    loading: {
      type: Boolean,
      default: false,
    },
    gameConfig: {
      type: Object,
      required: true,
    },
  });

  const emit = defineEmits([
    'update:player-name',
    'update:selected-mode',
    'open-create-room',
  ]);

  const playerNameModel = computed({
    get: () => props.playerName,
    set: value => emit('update:player-name', value),
  });

  const selectedModeModel = computed({
    get: () => props.selectedMode,
    set: value => emit('update:selected-mode', value),
  });
</script>
