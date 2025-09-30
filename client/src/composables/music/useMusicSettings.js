import { reactive, watch } from 'vue';
import { clamp, loadSettings, saveSettings } from './utils.js';

export function useMusicSettings({ volume, repeatMode, shuffle }) {
  const settings = reactive({
    volume: 0.8,
    repeatMode: 'none',
    shuffle: false,
  });

  function restoreSettings() {
    const loaded = loadSettings();
    if (typeof loaded.volume === 'number') {
      const nextVolume = clamp(loaded.volume, 0, 1);
      volume.value = nextVolume;
      settings.volume = nextVolume;
    }
    if (typeof loaded.shuffle === 'boolean') {
      shuffle.value = loaded.shuffle;
      settings.shuffle = loaded.shuffle;
    }
    if (typeof loaded.repeatMode === 'string') {
      repeatMode.value = loaded.repeatMode;
      settings.repeatMode = loaded.repeatMode;
    }
  }

  watch(
    () => ({
      volume: volume.value,
      shuffle: shuffle.value,
      repeatMode: repeatMode.value,
    }),
    val => {
      settings.volume = val.volume;
      settings.shuffle = val.shuffle;
      settings.repeatMode = val.repeatMode;
      saveSettings(settings);
    }
  );

  return {
    settings,
    restoreSettings,
  };
}
