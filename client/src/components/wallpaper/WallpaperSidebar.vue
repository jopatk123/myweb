<template>
  <aside class="module-sider">
    <div class="module-header-row">
      <div class="module-title">分组管理</div>
      <div class="header-actions">
        <button class="btn btn-secondary btn-sm" @click="$emit('create-group')">
          新建
        </button>
        <button
          class="btn btn-danger btn-sm"
          :disabled="!selectedGroupId || isSelectedDefault"
          @click="$emit('delete-group')"
          title="删除当前选中分组"
        >
          删除
        </button>
      </div>
    </div>
    <div class="group-list">
      <div
        class="group-item"
        :class="{ active: selectedGroupId === '' }"
        @click="$emit('select-group', '')"
      >
        全部壁纸
      </div>
      <div
        v-for="group in groups"
        :key="group.id"
        class="group-item"
        :class="{ active: selectedGroupId === group.id }"
        @click="$emit('select-group', group.id)"
      >
        <span>{{ group.name }}</span>
        <span v-if="group.is_current" class="badge">（当前应用壁纸）</span>
      </div>
    </div>
    <div class="apply-current">
      <button
        class="btn btn-primary btn-sm full-width"
        :disabled="!selectedGroupId"
        @click="$emit('apply-current', selectedGroupId)"
        title="将当前选中分组设为应用分组"
      >
        应用当前分组
      </button>
      <div class="tip">默认分组不可删除</div>
    </div>
  </aside>
</template>

<script setup>
  import { computed } from 'vue';

  const props = defineProps({
    groups: {
      type: Array,
      required: true,
    },
    selectedGroupId: {
      type: [String, Number],
      required: true,
    },
  });

  const emit = defineEmits([
    'select-group',
    'create-group',
    'delete-group',
    'apply-current',
  ]);

  const isSelectedDefault = computed(() => {
    const g = (props.groups || []).find(g => g.id === props.selectedGroupId);
    return !!g?.is_default;
  });
</script>

<style scoped>
  .module-sider {
    background: #fff;
    border-right: 1px solid #e5e7eb;
    padding: 16px;
  }
  .module-header-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 12px;
  }
  .module-title {
    font-weight: 600;
    color: #111827;
  }
  .group-list {
    display: flex;
    flex-direction: column;
    gap: 6px;
  }
  .group-item {
    padding: 8px 10px;
    border-radius: 6px;
    cursor: pointer;
    color: #111827;
  }
  .group-item:hover {
    background: #f3f4f6;
  }
  .group-item.active {
    background: #e0e7ff;
    color: #1d4ed8;
  }
  .btn {
    padding: 8px 16px;
    border: none;
    border-radius: 4px;
    cursor: pointer;
    font-size: 14px;
    transition: background-color 0.3s ease;
  }
  .btn-secondary {
    background: #6c757d;
    color: white;
  }
  .btn-secondary:hover {
    background: #545b62;
  }
  .btn-sm {
    padding: 6px 12px;
    font-size: 12px;
  }
  .btn-danger {
    background: #dc3545;
    color: white;
  }
  .btn-danger:hover {
    background: #b02a37;
  }
  .btn:disabled,
  .btn[disabled] {
    opacity: 0.6;
    cursor: not-allowed;
  }
  .header-actions {
    display: flex;
    gap: 8px;
    align-items: center;
  }
  .apply-current {
    margin-top: 12px;
  }
  .full-width {
    width: 100%;
  }
  .tip {
    margin-top: 8px;
    color: #6b7280;
    font-size: 12px;
  }
</style>
