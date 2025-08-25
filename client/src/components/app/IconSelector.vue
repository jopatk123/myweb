<template>
  <div class="icon-selector">
    <div class="selector-tabs">
      <button
        :class="['tab', { active: activeTab === 'preset' }]"
        @click="activeTab = 'preset'"
      >
        预选图标
      </button>
      <button
        :class="['tab', { active: activeTab === 'upload' }]"
        @click="activeTab = 'upload'"
      >
        自定义上传
      </button>
    </div>

    <div v-if="activeTab === 'preset'" class="preset-icons">
      <div class="icon-grid">
        <div
          v-for="icon in presetIcons"
          :key="icon.name"
          :class="['icon-item', { selected: selectedIcon === icon.path }]"
          @click="selectPresetIcon(icon)"
        >
          <img :src="icon.path" :alt="icon.name" />
          <span class="icon-name">{{ icon.name }}</span>
        </div>
      </div>
    </div>

    <div v-if="activeTab === 'upload'" class="upload-section">
      <input
        type="file"
        accept="image/*"
        @change="onFileSelected"
        ref="fileInput"
        class="file-input"
      />
      <div v-if="uploadedIcon" class="upload-preview">
        <img :src="uploadedIcon" alt="上传的图标" />
        <span>已上传图标</span>
      </div>
    </div>

    <div v-if="selectedIcon" class="selected-preview">
      <div class="preview-label">当前选择：</div>
      <img :src="selectedIcon" alt="选中的图标" class="preview-icon" />
    </div>
  </div>
</template>

<script setup>
  import { ref, computed, watch } from 'vue';

  const props = defineProps({
    modelValue: String, // 当前选中的图标路径或文件名
    iconFilename: String, // 上传的图标文件名
  });

  const emit = defineEmits([
    'update:modelValue',
    'update:iconFilename',
    // 改为延迟上传：不再立即上传，改为通知父组件选择了文件
    'select-file',
  ]);

  const activeTab = ref('preset');
  const selectedIcon = ref(props.modelValue || '');
  const uploadedIcon = ref('');
  const objectUrl = ref('');
  const fileInput = ref(null);

  // 丰富的预选图标库
  const presetIcons = ref([
    // 应用类图标
    { name: '浏览器', path: '/apps/icons/browser.svg', category: 'app' },
    { name: '邮件', path: '/apps/icons/email.svg', category: 'app' },
    { name: '日历', path: '/apps/icons/calendar.svg', category: 'app' },
    { name: '计算器', path: '/apps/icons/calculator-128.png', category: 'app' },
    { name: '记事本', path: '/apps/icons/notebook-128.svg', category: 'app' },
    { name: '设置', path: '/apps/icons/settings.svg', category: 'app' },
    { name: '终端', path: '/apps/icons/terminal.svg', category: 'app' },
    {
      name: '代码编辑器',
      path: '/apps/icons/code-editor.svg',
      category: 'app',
    },
    { name: '音乐', path: '/apps/icons/music.svg', category: 'app' },
    { name: '视频', path: '/apps/icons/video-128.svg', category: 'app' },

    // 社交媒体图标
    { name: 'GitHub', path: '/apps/icons/github.svg', category: 'social' },
    { name: 'Twitter', path: '/apps/icons/twitter.svg', category: 'social' },
    { name: 'LinkedIn', path: '/apps/icons/linkedin.svg', category: 'social' },
    { name: 'Facebook', path: '/apps/icons/facebook.svg', category: 'social' },
    {
      name: 'Instagram',
      path: '/apps/icons/instagram.svg',
      category: 'social',
    },
    { name: 'YouTube', path: '/apps/icons/youtube.svg', category: 'social' },
    { name: 'Discord', path: '/apps/icons/discord.svg', category: 'social' },
    { name: 'Slack', path: '/apps/icons/slack.svg', category: 'social' },

    // 工具类图标
    { name: '文件管理', path: '/apps/icons/file-128.svg', category: 'tool' },
    { name: '压缩包', path: '/apps/icons/archive-128.svg', category: 'tool' },
    { name: '图片', path: '/apps/icons/image-128.svg', category: 'tool' },
    { name: 'Word', path: '/apps/icons/word-128.svg', category: 'tool' },
    { name: 'Excel', path: '/apps/icons/excel-128.svg', category: 'tool' },
    { name: '下载', path: '/apps/icons/download.svg', category: 'tool' },
    { name: '上传', path: '/apps/icons/upload.svg', category: 'tool' },
    { name: '搜索', path: '/apps/icons/search.svg', category: 'tool' },
    { name: '购物车', path: '/apps/icons/shopping-cart.svg', category: 'tool' },
    { name: '地图', path: '/apps/icons/map.svg', category: 'tool' },

    // 游戏类图标
    { name: '贪吃蛇', path: '/apps/icons/snake-128.png', category: 'game' },
    { name: '游戏手柄', path: '/apps/icons/gamepad.svg', category: 'game' },
    { name: '扑克', path: '/apps/icons/cards.svg', category: 'game' },
    { name: '骰子', path: '/apps/icons/dice.svg', category: 'game' },

    // 办公类图标
    { name: '会议', path: '/apps/icons/meeting.svg', category: 'office' },
    { name: '演示', path: '/apps/icons/presentation.svg', category: 'office' },
    { name: '报表', path: '/apps/icons/chart.svg', category: 'office' },
    { name: '打印机', path: '/apps/icons/printer.svg', category: 'office' },
    { name: '扫描仪', path: '/apps/icons/scanner.svg', category: 'office' },

    // 其他常用图标
    { name: '天气', path: '/apps/icons/weather.svg', category: 'other' },
    { name: '新闻', path: '/apps/icons/news.svg', category: 'other' },
    { name: '翻译', path: '/apps/icons/translate.svg', category: 'other' },
    { name: '时钟', path: '/apps/icons/clock.svg', category: 'other' },
    { name: '相机', path: '/apps/icons/camera.svg', category: 'other' },
    { name: '电话', path: '/apps/icons/phone.svg', category: 'other' },
    { name: '消息', path: '/apps/icons/message.svg', category: 'other' },
    { name: '通知', path: '/apps/icons/notification.svg', category: 'other' },
  ]);

  // 监听外部传入的值变化
  watch(
    () => props.modelValue,
    newVal => {
      selectedIcon.value = newVal || '';
    }
  );

  watch(
    () => props.iconFilename,
    newVal => {
      if (newVal) {
        uploadedIcon.value = `/uploads/apps/icons/${newVal}`;
        selectedIcon.value = uploadedIcon.value;
        activeTab.value = 'upload';
      }
    }
  );

  function selectPresetIcon(icon) {
    selectedIcon.value = icon.path;
    uploadedIcon.value = '';
    emit('update:modelValue', icon.path);
    emit('update:iconFilename', null); // 清除上传的文件名
  }

  async function onFileSelected(e) {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    // 仅本地预览与上抛文件，由父组件在提交时执行上传
    try {
      if (objectUrl.value) {
        URL.revokeObjectURL(objectUrl.value);
        objectUrl.value = '';
      }
    } catch (_) {}
    objectUrl.value = URL.createObjectURL(file);
    uploadedIcon.value = objectUrl.value;
    selectedIcon.value = uploadedIcon.value;
    emit('select-file', file);
  }

  // 当上传成功后，父组件会更新 iconFilename
  defineExpose({
    reset() {
      selectedIcon.value = '';
      uploadedIcon.value = '';
      activeTab.value = 'preset';
      if (fileInput.value) {
        fileInput.value.value = '';
      }
      try {
        if (objectUrl.value) {
          URL.revokeObjectURL(objectUrl.value);
          objectUrl.value = '';
        }
      } catch (_) {}
    },
  });
</script>

<style scoped>
  .icon-selector {
    border: 1px solid #ddd;
    border-radius: 8px;
    overflow: hidden;
  }

  .selector-tabs {
    display: flex;
    background: #f5f5f5;
    border-bottom: 1px solid #ddd;
  }

  .tab {
    flex: 1;
    padding: 8px 16px;
    border: none;
    background: none;
    cursor: pointer;
    font-size: 14px;
    transition: all 0.2s;
  }

  .tab:hover {
    background: #e9e9e9;
  }

  .tab.active {
    background: #fff;
    color: #007bff;
    font-weight: 500;
  }

  .preset-icons {
    padding: 12px;
    max-height: 300px;
    overflow-y: auto;
  }

  .icon-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(80px, 1fr));
    gap: 8px;
  }

  .icon-item {
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: 8px;
    border: 2px solid transparent;
    border-radius: 6px;
    cursor: pointer;
    transition: all 0.2s;
  }

  .icon-item:hover {
    background: #f8f9fa;
    border-color: #dee2e6;
  }

  .icon-item.selected {
    background: #e3f2fd;
    border-color: #2196f3;
  }

  .icon-item img {
    width: 32px;
    height: 32px;
    object-fit: contain;
    margin-bottom: 4px;
  }

  .icon-name {
    font-size: 11px;
    text-align: center;
    color: #666;
    line-height: 1.2;
  }

  .upload-section {
    padding: 20px;
    text-align: center;
  }

  .file-input {
    width: 100%;
    padding: 8px;
    border: 2px dashed #ddd;
    border-radius: 6px;
    background: #fafafa;
    cursor: pointer;
  }

  .upload-preview {
    margin-top: 12px;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 8px;
  }

  .upload-preview img {
    width: 48px;
    height: 48px;
    object-fit: contain;
    border: 1px solid #ddd;
    border-radius: 4px;
    padding: 4px;
  }

  .selected-preview {
    padding: 12px;
    border-top: 1px solid #ddd;
    background: #f8f9fa;
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .preview-label {
    font-size: 12px;
    color: #666;
  }

  .preview-icon {
    width: 24px;
    height: 24px;
    object-fit: contain;
  }
</style>
