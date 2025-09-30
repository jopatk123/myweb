import { ref, watch, toRefs } from 'vue';

export function useLobbyPlayerState({ props, emit, availableGameModes }) {
  const { playerName, selectedMode } = toRefs(props);

  const localPlayerName = ref(playerName.value);
  const localSelectedMode = ref(selectedMode.value || '');

  watch(playerName, value => {
    localPlayerName.value = value;
  });

  watch(localPlayerName, value => {
    emit('update:player-name', value);
  });

  watch(selectedMode, value => {
    if (value) {
      localSelectedMode.value = value;
    }
  });

  watch(localSelectedMode, value => {
    emit('update:selected-mode', value);
  });

  watch(
    availableGameModes,
    modes => {
      if (!Array.isArray(modes) || modes.length === 0) {
        return;
      }

      if (!localSelectedMode.value) {
        const defaultMode = selectedMode.value || modes[0]?.value || modes[0];
        localSelectedMode.value = defaultMode;
      }
    },
    { immediate: true }
  );

  return {
    localPlayerName,
    localSelectedMode,
  };
}
