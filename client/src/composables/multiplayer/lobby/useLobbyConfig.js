import { computed, toRefs } from 'vue';
import {
  gameUtils,
  COMPONENT_PRESETS,
  DEFAULT_GAME_MODES,
} from '@/components/multiplayer/index.js';

export function useLobbyConfig(props) {
  const {
    gameType,
    title,
    gameModes,
    preset: presetProp,
    theme,
  } = toRefs(props);

  const gameConfig = computed(() => gameUtils.getGameConfig(gameType.value));

  const computedTitle = computed(() => {
    return title.value || `${gameConfig.value.name}多人游戏`;
  });

  const availableGameModes = computed(() => {
    if (gameModes.value && Array.isArray(gameModes.value)) {
      return gameModes.value;
    }
    return gameUtils.getAvailableModes(gameType.value, DEFAULT_GAME_MODES);
  });

  const preset = computed(() => {
    const basePreset =
      typeof presetProp.value === 'string'
        ? COMPONENT_PRESETS[presetProp.value] || COMPONENT_PRESETS.quickStart
        : presetProp.value || {};

    return {
      ...COMPONENT_PRESETS.quickStart,
      ...basePreset,
    };
  });

  const themeClass = computed(() => `theme-${theme.value}`);

  const emptyRoomsMessage = computed(() => {
    return `暂无${gameConfig.value.name}房间，点击"创建房间"开始游戏`;
  });

  return {
    gameConfig,
    computedTitle,
    availableGameModes,
    preset,
    themeClass,
    emptyRoomsMessage,
  };
}
