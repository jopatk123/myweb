<template>
  <div class="settings-overlay" @click="$emit('close')">
    <div class="settings-panel" @click.stop>
      <div class="settings-header">
        <h3>⚙️ 阅读设置</h3>
        <button class="close-btn" @click="$emit('close')">✕</button>
      </div>

      <div class="settings-content">
        <!-- 字体设置 -->
        <div class="setting-group">
          <div class="setting-title">字体设置</div>

          <div class="setting-item">
            <label>字体大小</label>
            <div class="font-size-controls">
              <button class="size-btn" @click="adjustFontSize(-1)">A-</button>
              <span class="size-display">{{ settings.fontSize }}px</span>
              <button class="size-btn" @click="adjustFontSize(1)">A+</button>
            </div>
          </div>

          <div class="setting-item">
            <label>字体类型</label>
            <div class="font-family-options">
              <button
                v-for="font in fontOptions"
                :key="font.value"
                class="font-btn"
                :class="{ active: settings.fontFamily === font.value }"
                @click="updateSetting('fontFamily', font.value)"
              >
                {{ font.label }}
              </button>
            </div>
          </div>

          <div class="setting-item">
            <label>行间距</label>
            <div class="line-height-controls">
              <input
                type="range"
                min="1.2"
                max="2.5"
                step="0.1"
                :value="settings.lineHeight"
                @input="
                  updateSetting('lineHeight', parseFloat($event.target.value))
                "
                class="slider"
              />
              <span class="value-display">{{ settings.lineHeight }}</span>
            </div>
          </div>
        </div>

        <!-- 主题设置 -->
        <div class="setting-group">
          <div class="setting-title">主题设置</div>

          <div class="theme-options">
            <div
              v-for="theme in themeOptions"
              :key="theme.value"
              class="theme-option"
              :class="{ active: settings.theme === theme.value }"
              @click="updateSetting('theme', theme.value)"
            >
              <div
                class="theme-preview"
                :class="`preview-${theme.value}`"
              ></div>
              <span class="theme-label">{{ theme.label }}</span>
            </div>
          </div>
        </div>

        <!-- 页面设置 -->
        <div class="setting-group">
          <div class="setting-title">页面设置</div>

          <div class="setting-item">
            <label>页面宽度</label>
            <div class="page-width-controls">
              <input
                type="range"
                min="600"
                max="1200"
                step="50"
                :value="settings.pageWidth"
                @input="
                  updateSetting('pageWidth', parseInt($event.target.value))
                "
                class="slider"
              />
              <span class="value-display">{{ settings.pageWidth }}px</span>
            </div>
          </div>

          <div class="setting-item">
            <label class="checkbox-label">
              <input
                type="checkbox"
                :checked="settings.autoSave"
                @change="updateSetting('autoSave', $event.target.checked)"
              />
              自动保存阅读进度
            </label>
          </div>

          <div class="setting-item">
            <label class="checkbox-label">
              <input
                type="checkbox"
                :checked="settings.autoMinimize"
                @change="updateSetting('autoMinimize', $event.target.checked)"
              />
              鼠标移出窗口自动最小化
            </label>
          </div>
        </div>

        <!-- 预设方案 -->
        <div class="setting-group">
          <div class="setting-title">预设方案</div>

          <div class="preset-options">
            <button
              v-for="preset in presetOptions"
              :key="preset.name"
              class="preset-btn"
              @click="applyPreset(preset)"
            >
              {{ preset.name }}
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
  import { computed } from 'vue';

  const props = defineProps({
    settings: {
      type: Object,
      required: true,
    },
  });

  const emit = defineEmits(['update:settings', 'close']);

  // 字体选项
  const fontOptions = [
    { label: '宋体', value: 'serif' },
    { label: '黑体', value: 'sans-serif' },
    { label: '等宽', value: 'monospace' },
  ];

  // 主题选项
  const themeOptions = [
    { label: '明亮', value: 'light' },
    { label: '暗黑', value: 'dark' },
    { label: '护眼', value: 'sepia' },
  ];

  // 预设方案
  const presetOptions = [
    {
      name: '默认',
      settings: {
        fontSize: 16,
        lineHeight: 1.6,
        fontFamily: 'serif',
        theme: 'sepia', // 默认使用护眼主题
        pageWidth: 800,
      },
    },
    {
      name: '大字体',
      settings: {
        fontSize: 20,
        lineHeight: 1.8,
        fontFamily: 'sans-serif',
        theme: 'light',
        pageWidth: 900,
      },
    },
    {
      name: '夜间模式',
      settings: {
        fontSize: 16,
        lineHeight: 1.7,
        fontFamily: 'serif',
        theme: 'dark',
        pageWidth: 800,
      },
    },
    {
      name: '护眼模式',
      settings: {
        fontSize: 18,
        lineHeight: 1.8,
        fontFamily: 'serif',
        theme: 'sepia',
        pageWidth: 750,
      },
    },
  ];

  function updateSetting(key, value) {
    const newSettings = { ...props.settings, [key]: value };
    emit('update:settings', newSettings);
  }

  function adjustFontSize(delta) {
    const newSize = Math.max(12, Math.min(32, props.settings.fontSize + delta));
    updateSetting('fontSize', newSize);
  }

  function applyPreset(preset) {
    // 应用预设时保留 autoMinimize 设置
    const newSettings = { 
      ...props.settings, 
      ...preset.settings,
      autoMinimize: props.settings.autoMinimize // 保持用户的自定义设置
    };
    emit('update:settings', newSettings);
  }
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
  }

  .setting-group {
    margin-bottom: 24px;
  }

  .setting-group:last-child {
    margin-bottom: 0;
  }

  .setting-title {
    font-weight: bold;
    color: #333;
    margin-bottom: 16px;
    padding-bottom: 8px;
    border-bottom: 2px solid #f0f0f0;
  }

  .setting-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 16px;
  }

  .setting-item label {
    font-size: 0.9rem;
    color: #555;
    min-width: 80px;
  }

  .font-size-controls {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .size-btn {
    width: 32px;
    height: 32px;
    border: 1px solid #ddd;
    border-radius: 6px;
    background: white;
    cursor: pointer;
    transition: all 0.2s ease;
    font-size: 0.8rem;
  }

  .size-btn:hover {
    background: #f8f9fa;
    border-color: #667eea;
  }

  .size-display,
  .value-display {
    font-size: 0.9rem;
    color: #666;
    min-width: 50px;
    text-align: center;
  }

  .font-family-options {
    display: flex;
    gap: 8px;
  }

  .font-btn {
    padding: 6px 12px;
    border: 1px solid #ddd;
    border-radius: 6px;
    background: white;
    cursor: pointer;
    transition: all 0.2s ease;
    font-size: 0.85rem;
  }

  .font-btn:hover {
    background: #f8f9fa;
    border-color: #667eea;
  }

  .font-btn.active {
    background: #667eea;
    color: white;
    border-color: #667eea;
  }

  .line-height-controls,
  .page-width-controls {
    display: flex;
    align-items: center;
    gap: 12px;
  }

  .slider {
    width: 120px;
    height: 4px;
    border-radius: 2px;
    background: #ddd;
    outline: none;
    cursor: pointer;
  }

  .slider::-webkit-slider-thumb {
    appearance: none;
    width: 16px;
    height: 16px;
    border-radius: 50%;
    background: #667eea;
    cursor: pointer;
  }

  .slider::-moz-range-thumb {
    width: 16px;
    height: 16px;
    border-radius: 50%;
    background: #667eea;
    cursor: pointer;
    border: none;
  }

  .theme-options {
    display: flex;
    gap: 16px;
  }

  .theme-option {
    display: flex;
    flex-direction: column;
    align-items: center;
    cursor: pointer;
    padding: 8px;
    border-radius: 8px;
    transition: background 0.2s ease;
  }

  .theme-option:hover {
    background: #f8f9fa;
  }

  .theme-option.active {
    background: #e3f2fd;
  }

  .theme-preview {
    width: 40px;
    height: 30px;
    border-radius: 6px;
    margin-bottom: 8px;
    border: 2px solid #ddd;
  }

  .preview-light {
    background: white;
  }

  .preview-dark {
    background: #1a1a1a;
  }

  .preview-sepia {
    background: #f4f1e8;
  }

  .theme-option.active .theme-preview {
    border-color: #667eea;
  }

  .theme-label {
    font-size: 0.8rem;
    color: #666;
  }

  .checkbox-label {
    display: flex;
    align-items: center;
    gap: 8px;
    cursor: pointer;
    font-size: 0.9rem;
    color: #555;
  }

  .checkbox-label input[type='checkbox'] {
    width: 16px;
    height: 16px;
    cursor: pointer;
  }

  .preset-options {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 8px;
  }

  .preset-btn {
    padding: 8px 16px;
    border: 1px solid #ddd;
    border-radius: 6px;
    background: white;
    cursor: pointer;
    transition: all 0.2s ease;
    font-size: 0.9rem;
  }

  .preset-btn:hover {
    background: #f8f9fa;
    border-color: #667eea;
  }

  @media (max-width: 768px) {
    .settings-panel {
      width: 95%;
      margin: 20px;
    }

    .settings-content {
      padding: 16px;
    }

    .setting-item {
      flex-direction: column;
      align-items: flex-start;
      gap: 8px;
    }

    .theme-options {
      justify-content: space-around;
    }

    .preset-options {
      grid-template-columns: 1fr;
    }
  }
</style>
