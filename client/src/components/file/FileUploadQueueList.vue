<template>
  <div class="upload-list" v-if="uploadQueue.length > 1">
    <div class="list-header">
      <span class="list-title">上传队列</span>
      <span class="list-count"
        >{{ completedCount }}/{{ uploadQueue.length }}</span
      >
    </div>
    <div
      class="queue-scroll"
      :class="{ 'show-scroll': uploadQueue.length > 3 }"
    >
      <div
        class="queue-item"
        v-for="(item, index) in uploadQueue"
        :key="item.id || item.name || index"
        :class="{
          current: index === currentIndex,
          completed: item.progress === 100,
          waiting: item.progress === 0 && index !== currentIndex,
        }"
      >
        <span class="item-status">
          {{ item.progress === 100 ? '✓' : index === currentIndex ? '⬆' : '○' }}
        </span>
        <div class="item-name" :title="item.name">
          {{ displayItemName(item.name) }}
        </div>
        <div class="item-progress">
          <div class="item-bar">
            <div
              class="item-fill"
              :style="{ width: item.progress + '%' }"
            ></div>
          </div>
          <span class="item-text">{{ item.progress }}%</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
  import { truncateFileName } from '@/utils/fileName.js';

  const props = defineProps({
    uploadQueue: { type: Array, default: () => [] },
    currentIndex: { type: Number, default: -1 },
    completedCount: { type: Number, default: 0 },
    nameLength: { type: Number, default: 20 },
  });

  function displayItemName(name) {
    return truncateFileName(name, props.nameLength);
  }
</script>

<style scoped>
  .upload-list {
    border-top: 1px solid #f0f0f0;
    padding: 12px 16px;
    background: #fafafa;
  }

  .list-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 8px;
  }

  .list-title {
    font-size: 11px;
    color: #666;
    font-weight: 500;
  }

  .list-count {
    font-size: 10px;
    color: #999;
  }

  .queue-scroll {
    max-height: 150px;
    overflow-y: auto;
  }

  .queue-scroll.show-scroll {
    padding-right: 4px;
  }

  .queue-scroll::-webkit-scrollbar {
    width: 4px;
  }

  .queue-scroll::-webkit-scrollbar-track {
    background: #f1f1f1;
    border-radius: 2px;
  }

  .queue-scroll::-webkit-scrollbar-thumb {
    background: #ccc;
    border-radius: 2px;
  }

  .queue-item {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 8px;
    padding: 6px 8px;
    border-radius: 6px;
    background: white;
    transition: all 0.2s ease;
  }

  .queue-item:last-child {
    margin-bottom: 0;
  }

  .queue-item.current {
    background: #eff6ff;
    border: 1px solid #bfdbfe;
  }

  .queue-item.completed {
    background: #f0fdf4;
  }

  .queue-item.waiting {
    opacity: 0.6;
  }

  .item-status {
    font-size: 12px;
    width: 16px;
    text-align: center;
    flex-shrink: 0;
  }

  .item-name {
    font-size: 11px;
    color: #333;
    flex: 1;
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .item-progress {
    display: flex;
    align-items: center;
    gap: 6px;
    flex-shrink: 0;
  }

  .item-bar {
    width: 50px;
    height: 3px;
    background: #e0e0e0;
    border-radius: 2px;
    overflow: hidden;
  }

  .item-fill {
    height: 100%;
    background: linear-gradient(90deg, #3b82f6, #1d4ed8);
    transition: width 0.2s ease;
    border-radius: 2px;
  }

  .queue-item.completed .item-fill {
    background: linear-gradient(90deg, #4ade80, #22c55e);
  }

  .item-text {
    font-size: 10px;
    color: #666;
    min-width: 28px;
    text-align: right;
  }
</style>
