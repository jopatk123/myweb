import { describe, it, expect, vi, beforeEach } from 'vitest';
import { reactive, ref, nextTick } from 'vue';
import { useLobbyPlayerState } from '@/composables/multiplayer/lobby/useLobbyPlayerState.js';

describe('useLobbyPlayerState', () => {
  let emit;
  let props;
  let modes;

  beforeEach(() => {
    emit = vi.fn();
    props = reactive({
      playerName: 'Alice',
      selectedMode: '',
    });
    modes = ref([{ value: 'competitive' }, { value: 'shared' }]);
  });

  it('syncs player name changes to emit', async () => {
    const { localPlayerName } = useLobbyPlayerState({ props, emit, availableGameModes: modes });

    localPlayerName.value = 'Bob';
    await nextTick();

    expect(emit).toHaveBeenCalledWith('update:player-name', 'Bob');
  });

  it('defaults selected mode based on available modes', async () => {
    const { localSelectedMode } = useLobbyPlayerState({ props, emit, availableGameModes: modes });
    await nextTick();
    expect(localSelectedMode.value).toBe('competitive');
  });

  it('updates local mode when prop changes', async () => {
    const { localSelectedMode } = useLobbyPlayerState({ props, emit, availableGameModes: modes });
    props.selectedMode = 'shared';
    await nextTick();
    expect(localSelectedMode.value).toBe('shared');
  });
});
