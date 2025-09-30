<template>
  <div class="settings-overlay" @click.self="emit('close')">
    <div class="settings-panel" @click.stop>
      <header class="settings-header">
        <h3>⚙️ 阅读设置</h3>
        <button class="close-btn" type="button" @click="emit('close')">
          ✕
        </button>
      </header>

      <div class="settings-content">
        <SettingsSection title="字体设置">
          <SettingRow label="字体大小">
            <FontSizeControl
              v-model="fontSize"
              :min="FONT_SIZE_RANGE.min"
              :max="FONT_SIZE_RANGE.max"
            />
          </SettingRow>

          <SettingRow label="字体类型">
            <FontFamilySelector v-model="fontFamily" :options="FONT_OPTIONS" />
          </SettingRow>

          <SettingRow label="行间距">
            <RangeSlider
              v-model="lineHeight"
              :min="LINE_HEIGHT_RANGE.min"
              :max="LINE_HEIGHT_RANGE.max"
              :step="LINE_HEIGHT_RANGE.step"
              unit=""
              :precision="1"
              aria-label="行间距"
            />
          </SettingRow>
        </SettingsSection>

        <SettingsSection title="主题设置">
          <ThemeSelector v-model="theme" :options="THEME_OPTIONS" />
        </SettingsSection>

        <SettingsSection title="页面设置">
          <SettingRow label="页面宽度">
            <RangeSlider
              v-model="pageWidth"
              :min="PAGE_WIDTH_RANGE.min"
              :max="PAGE_WIDTH_RANGE.max"
              :step="PAGE_WIDTH_RANGE.step"
              unit="px"
              :precision="0"
              aria-label="页面宽度"
            />
          </SettingRow>

          <SettingRow align="start">
            <ToggleSetting v-model="autoSave">自动保存阅读进度</ToggleSetting>
          </SettingRow>

          <SettingRow align="start">
            <ToggleSetting v-model="autoMinimize"
              >鼠标移出窗口自动最小化</ToggleSetting
            >
          </SettingRow>
        </SettingsSection>

        <SettingsSection title="预设方案">
          <PresetButtons :presets="presetOptions" @apply="applyPreset" />
        </SettingsSection>
      </div>
    </div>
  </div>
</template>

<script setup>
  import { computed } from 'vue';
  import SettingsSection from './components/settings/SettingsSection.vue';
  import SettingRow from './components/settings/SettingRow.vue';
  import FontSizeControl from './components/settings/FontSizeControl.vue';
  import FontFamilySelector from './components/settings/FontFamilySelector.vue';
  import RangeSlider from './components/settings/RangeSlider.vue';
  import ThemeSelector from './components/settings/ThemeSelector.vue';
  import ToggleSetting from './components/settings/ToggleSetting.vue';
  import PresetButtons from './components/settings/PresetButtons.vue';
  import {
    FONT_OPTIONS,
    THEME_OPTIONS,
    FONT_SIZE_RANGE,
    LINE_HEIGHT_RANGE,
    PAGE_WIDTH_RANGE,
  } from './constants/settings.js';
  import { useReaderSettings } from './composables/useReaderSettings.js';

  const emit = defineEmits(['close']);

  const settingsModel = defineModel('settings', {
    type: Object,
    required: true,
  });

  const { updateSetting, applyPreset, presetOptions } =
    useReaderSettings(settingsModel);

  const fontSize = computed({
    get: () => settingsModel.value.fontSize,
    set: value => updateSetting('fontSize', value),
  });

  const fontFamily = computed({
    get: () => settingsModel.value.fontFamily,
    set: value => updateSetting('fontFamily', value),
  });

  const lineHeight = computed({
    get: () => settingsModel.value.lineHeight,
    set: value => updateSetting('lineHeight', value),
  });

  const theme = computed({
    get: () => settingsModel.value.theme,
    set: value => updateSetting('theme', value),
  });

  const pageWidth = computed({
    get: () => settingsModel.value.pageWidth,
    set: value => updateSetting('pageWidth', value),
  });

  const autoSave = computed({
    get: () => settingsModel.value.autoSave,
    set: value => updateSetting('autoSave', value),
  });

  const autoMinimize = computed({
    get: () => settingsModel.value.autoMinimize,
    set: value => updateSetting('autoMinimize', value),
  });
</script>

<style scoped>
  .settings-overlay {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.5);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1000;
  }

  .settings-panel {
    background: white;
    border-radius: 12px;
    width: 90%;
    max-width: 500px;
    max-height: 80vh;
    overflow: hidden;
    box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
  }

  .settings-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 20px;
    border-bottom: 1px solid #eee;
    background: #f8f9fa;
  }

  .settings-header h3 {
    margin: 0;
    color: #333;
  }

  .close-btn {
    background: none;
    border: none;
    font-size: 1.2rem;
    cursor: pointer;
    color: #666;
    padding: 4px;
    border-radius: 4px;
    transition: all 0.2s ease;
  }

  .close-btn:hover {
    background: #e9ecef;
    color: #333;
  }

  .settings-content {
    padding: 20px;
    max-height: 60vh;
    overflow-y: auto;
    display: flex;
    flex-direction: column;
    gap: 24px;
  }

  @media (max-width: 768px) {
    .settings-panel {
      width: 95%;
      margin: 20px;
    }

    .settings-content {
      padding: 16px;
      gap: 20px;
    }
  }
</style>
