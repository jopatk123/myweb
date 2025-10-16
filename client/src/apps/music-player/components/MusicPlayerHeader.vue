<template>
  <header class="app-header">
    <div class="header-left">
      <h2>音乐播放器</h2>
      <span class="track-count">{{ trackCount }} 首曲目</span>
    </div>

    <div class="header-actions">
      <div class="group-selector" v-if="groupOptions.length">
        <label for="music-group-select">歌单</label>
        <select
          id="music-group-select"
          v-model="groupModel"
          :disabled="groupsLoading"
        >
          <option value="all">全部歌曲</option>
          <option
            v-for="group in groupOptions"
            :key="group.id"
            :value="group.id"
          >
            {{ group.name }} ({{ group.trackCount ?? 0 }})
          </option>
        </select>
        <button
          class="icon-button"
          type="button"
          :disabled="groupsLoading"
          @click="$emit('create-group')"
        >
          ➕
        </button>
        <button
          class="icon-button"
          type="button"
          :disabled="groupsLoading || !canRenameCurrentGroup"
          @click="$emit('rename-group')"
        >
          ✏️
        </button>
        <button
          class="icon-button danger"
          type="button"
          :disabled="groupsLoading || !canDeleteCurrentGroup"
          @click="$emit('delete-group')"
        >
          🗑
        </button>
      </div>

      <label class="search-box">
        <span class="icon">🔍</span>
        <input
          v-model="searchModel"
          type="search"
          placeholder="搜索歌曲、歌手或专辑"
        />
      </label>

      <button
        class="upload-button"
        type="button"
        @click="$emit('request-upload')"
      >
        上传音乐
      </button>
    </div>
  </header>
</template>

<script setup>
  import { computed } from 'vue';

  const props = defineProps({
    trackCount: {
      type: Number,
      default: 0,
    },
    groupOptions: {
      type: Array,
      default: () => [],
    },
    selectedGroup: {
      type: [String, Number],
      default: 'all',
    },
    groupsLoading: {
      type: Boolean,
      default: false,
    },
    currentGroup: {
      type: Object,
      default: () => null,
    },
    search: {
      type: String,
      default: '',
    },
  });

  const emit = defineEmits([
    'update:search',
    'group-change',
    'create-group',
    'rename-group',
    'delete-group',
    'request-upload',
  ]);

  const searchModel = computed({
    get: () => props.search,
    set: value => emit('update:search', value),
  });

  const groupModel = computed({
    get: () => props.selectedGroup ?? 'all',
    set: value => emit('group-change', value),
  });

  const canRenameCurrentGroup = computed(() => {
    if (!props.currentGroup) return false;
    return !props.currentGroup.isDefault;
  });

  const canDeleteCurrentGroup = canRenameCurrentGroup;
</script>

<style scoped>
  .app-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 12px;
  }

  .header-left {
    display: flex;
    align-items: baseline;
    gap: 12px;
  }

  .header-left h2 {
    margin: 0;
    font-size: 24px;
    font-weight: 600;
  }

  .track-count {
    font-size: 14px;
    opacity: 0.75;
  }

  .prefetch-indicator {
    font-size: 13px;
    padding: 2px 6px;
    border-radius: 4px;
    background: rgba(255, 255, 255, 0.12);
  }

  .prefetch-indicator.ok {
    background: rgba(76, 175, 80, 0.25);
  }

  .prefetch-indicator.error {
    background: rgba(244, 67, 54, 0.25);
  }

  .header-actions {
    display: flex;
    align-items: center;
    gap: 12px;
  }

  .group-selector {
    display: flex;
    align-items: center;
    gap: 8px;
    background: rgba(255, 255, 255, 0.12);
    padding: 6px 10px;
    border-radius: 999px;
  }

  .group-selector select {
    border: none;
    border-radius: 8px;
    padding: 6px 8px;
    background: rgba(0, 0, 0, 0.25);
    color: #fff;
  }

  .group-selector label {
    font-size: 13px;
  }

  .search-box {
    display: flex;
    align-items: center;
    background: rgba(255, 255, 255, 0.12);
    padding: 6px 12px;
    border-radius: 999px;
    gap: 6px;
    min-width: 240px;
  }

  .search-box input {
    border: none;
    background: transparent;
    color: inherit;
    width: 100%;
    outline: none;
  }

  .upload-button {
    border: none;
    border-radius: 999px;
    padding: 8px 18px;
    background: linear-gradient(135deg, #ff8a65, #ffcc80);
    font-weight: 600;
    cursor: pointer;
    color: #2b2535;
  }

  .icon-button {
    width: 32px;
    height: 32px;
    border-radius: 50%;
    border: none;
    background: rgba(0, 0, 0, 0.35);
    color: #fff;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .icon-button:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }

  .icon-button.danger {
    background: rgba(244, 67, 54, 0.45);
  }
</style>
