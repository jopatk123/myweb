<template>
  <div
    class="window-header"
    :class="{ active }"
    @pointerdown.stop.prevent="$emit('pointerdown', $event)"
    @dblclick="$emit('doubleclick')"
  >
    <div class="window-title">{{ title }}</div>
    <div class="window-controls">
      <button
        class="control-btn minimize"
        type="button"
        @click.stop="$emit('minimize')"
        title="最小化"
      >
        ─
      </button>
      <button
        class="control-btn maximize"
        type="button"
        @click.stop="$emit('maximize')"
        :title="maximized ? '还原' : '最大化'"
      >
        {{ maximized ? '❐' : '□' }}
      </button>
      <button
        class="control-btn close"
        type="button"
        @click.stop="$emit('close')"
        title="关闭"
      >
        ✖
      </button>
    </div>
  </div>
</template>

<script setup>
  import { toRefs } from 'vue';

  const props = defineProps({
    title: {
      type: String,
      required: true,
    },
    maximized: {
      type: Boolean,
      default: false,
    },
    active: {
      type: Boolean,
      default: false,
    },
  });

  defineEmits(['pointerdown', 'doubleclick', 'minimize', 'maximize', 'close']);

  const { title, maximized, active } = toRefs(props);
</script>

<style scoped>
  .window-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 8px 12px;
    background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
    border-bottom: 1px solid #dee2e6;
    cursor: move;
    user-select: none;
  }

  .window-header.active {
    background: linear-gradient(135deg, #007acc 0%, #005a9e 100%);
    color: white;
  }

  .window-title {
    font-weight: 600;
    font-size: 14px;
    flex: 1;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .window-controls {
    display: flex;
    gap: 4px;
  }

  .control-btn {
    width: 24px;
    height: 24px;
    border: none;
    background: rgba(0, 0, 0, 0.1);
    border-radius: 4px;
    cursor: pointer;
    font-size: 12px;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: background-color 0.2s ease;
  }

  .control-btn:hover {
    background: rgba(0, 0, 0, 0.2);
  }

  .control-btn.close:hover {
    background: #e74c3c;
    color: white;
  }

  .control-btn.minimize:hover {
    background: #f39c12;
    color: white;
  }

  .control-btn.maximize:hover {
    background: #27ae60;
    color: white;
  }

  .window-header.active .control-btn {
    background: rgba(255, 255, 255, 0.2);
    color: white;
  }

  .window-header.active .control-btn:hover {
    background: rgba(255, 255, 255, 0.3);
  }
</style>
