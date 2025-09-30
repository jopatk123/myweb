import { describe, it, expect } from 'vitest';
import { useLobbyConfig } from '@/composables/multiplayer/lobby/useLobbyConfig.js';
import { COMPONENT_PRESETS } from '@/components/multiplayer/index.js';
import { reactive } from 'vue';

describe('useLobbyConfig', () => {
  const createConfig = (overrides = {}) => {
    const props = reactive({
      gameType: 'snake',
      title: null,
      gameModes: null,
      preset: 'quickStart',
      theme: 'light',
      ...overrides,
    });

    return useLobbyConfig(props);
  };

  it('provides default computed title', () => {
    const { computedTitle } = createConfig();
    expect(computedTitle.value).toContain('多人游戏');
  });

  it('respects explicit title', () => {
    const { computedTitle } = createConfig({ title: 'Test Lobby' });
    expect(computedTitle.value).toBe('Test Lobby');
  });

  it('merges preset overrides', () => {
    const customPreset = { showCreateRoom: false };
    const { preset } = createConfig({ preset: customPreset });
    expect(preset.value.showCreateRoom).toBe(false);
    expect(preset.value.showModeSelector).toBe(
      COMPONENT_PRESETS.quickStart.showModeSelector
    );
  });

  it('uses provided game modes when available', () => {
    const modes = [{ value: 'arcade' }];
    const { availableGameModes } = createConfig({ gameModes: modes });
    expect(availableGameModes.value).toEqual(modes);
  });
});
