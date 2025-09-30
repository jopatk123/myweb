import { computed } from 'vue';
import {
  DEFAULT_READER_SETTINGS,
  FONT_OPTIONS,
  THEME_OPTIONS,
  PRESET_OPTIONS,
  FONT_SIZE_RANGE,
  LINE_HEIGHT_RANGE,
  PAGE_WIDTH_RANGE,
} from '../constants/settings.js';

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function roundToStep(value, step) {
  return Math.round(value / step) * step;
}

function normalizeSettings(rawSettings = {}) {
  const merged = {
    ...DEFAULT_READER_SETTINGS,
    ...rawSettings,
  };

  return {
    ...merged,
    fontSize: clamp(merged.fontSize, FONT_SIZE_RANGE.min, FONT_SIZE_RANGE.max),
    lineHeight: clamp(
      roundToStep(merged.lineHeight, LINE_HEIGHT_RANGE.step),
      LINE_HEIGHT_RANGE.min,
      LINE_HEIGHT_RANGE.max
    ),
    pageWidth: clamp(
      roundToStep(merged.pageWidth, PAGE_WIDTH_RANGE.step),
      PAGE_WIDTH_RANGE.min,
      PAGE_WIDTH_RANGE.max
    ),
    fontFamily: FONT_OPTIONS.some(option => option.value === merged.fontFamily)
      ? merged.fontFamily
      : DEFAULT_READER_SETTINGS.fontFamily,
    theme: THEME_OPTIONS.some(option => option.value === merged.theme)
      ? merged.theme
      : DEFAULT_READER_SETTINGS.theme,
    autoSave: Boolean(merged.autoSave),
    autoMinimize: Boolean(merged.autoMinimize),
  };
}

export function useReaderSettings(settingsRef) {
  const presetOptions = computed(() => PRESET_OPTIONS);

  function updateSetting(key, value) {
    const nextSettings = normalizeSettings({
      ...settingsRef.value,
      [key]: value,
    });
    settingsRef.value = nextSettings;
  }

  function adjustFontSize(delta) {
    const current =
      settingsRef.value.fontSize || DEFAULT_READER_SETTINGS.fontSize;
    const next = clamp(
      current + delta,
      FONT_SIZE_RANGE.min,
      FONT_SIZE_RANGE.max
    );
    updateSetting('fontSize', next);
  }

  function applyPreset(preset) {
    const presetSettings =
      typeof preset === 'string'
        ? PRESET_OPTIONS.find(item => item.name === preset)?.settings
        : preset?.settings;

    if (!presetSettings) return;

    settingsRef.value = normalizeSettings({
      ...settingsRef.value,
      ...presetSettings,
      autoMinimize: settingsRef.value.autoMinimize,
    });
  }

  return {
    presetOptions,
    updateSetting,
    adjustFontSize,
    applyPreset,
  };
}

export { normalizeSettings };
