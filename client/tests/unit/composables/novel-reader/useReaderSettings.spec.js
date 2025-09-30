import { describe, expect, it } from 'vitest';
import { ref } from 'vue';
import {
  useReaderSettings,
  normalizeSettings,
} from '@/apps/novel-reader/composables/useReaderSettings.js';
import {
  DEFAULT_READER_SETTINGS,
  FONT_SIZE_RANGE,
  PRESET_OPTIONS,
} from '@/apps/novel-reader/constants/settings.js';

describe('useReaderSettings', () => {
  it('clamps font size adjustments within range', () => {
    const settingsRef = ref({
      ...DEFAULT_READER_SETTINGS,
      fontSize: FONT_SIZE_RANGE.max,
    });
    const { adjustFontSize } = useReaderSettings(settingsRef);

    adjustFontSize(5);
    expect(settingsRef.value.fontSize).toBe(FONT_SIZE_RANGE.max);

    adjustFontSize(-100);
    expect(settingsRef.value.fontSize).toBe(FONT_SIZE_RANGE.min);
  });

  it('applies preset and keeps autoMinimize flag', () => {
    const settingsRef = ref({ ...DEFAULT_READER_SETTINGS, autoMinimize: true });
    const { applyPreset } = useReaderSettings(settingsRef);

    applyPreset(PRESET_OPTIONS.find(p => p.name === '夜间模式'));

    expect(settingsRef.value.theme).toBe('dark');
    expect(settingsRef.value.autoMinimize).toBe(true);
  });

  it('normalizes unknown values to defaults', () => {
    const normalized = normalizeSettings({
      fontSize: FONT_SIZE_RANGE.max + 10,
      fontFamily: 'unknown',
      theme: 'mystery',
    });

    expect(normalized.fontSize).toBe(FONT_SIZE_RANGE.max);
    expect(normalized.fontFamily).toBe(DEFAULT_READER_SETTINGS.fontFamily);
    expect(normalized.theme).toBe(DEFAULT_READER_SETTINGS.theme);
  });
});
