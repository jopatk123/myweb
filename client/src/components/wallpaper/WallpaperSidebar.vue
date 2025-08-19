<template>
  <aside class="module-sider">
    <div class="module-header-row">
      <div class="module-title">分组管理</div>
      <div class="header-actions">
        <button class="btn btn-secondary btn-sm" @click="$emit('create-group')">新建</button>
        <button
          class="btn btn-danger btn-sm"
          :disabled="!selectedGroupId"
          @click="$emit('delete-group')"
          title="删除当前选中分组"
        >删除</button>
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
        {{ group.name }}
      </div>
    </div>
  </aside>
</template>

<script setup>
defineProps({
  groups: {
    type: Array,
    required: true
  },
  selectedGroupId: {
    type: [String, Number],
    required: true
  }
});

defineEmits(['select-group', 'create-group', 'delete-group']);
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
.btn-secondary { background: #6c757d; color: white; }
.btn-secondary:hover { background: #545b62; }
.btn-sm { padding: 6px 12px; font-size: 12px; }
.btn-danger { background: #dc3545; color: white; }
.btn-danger:hover { background: #b02a37; }
.btn:disabled, .btn[disabled] {
  opacity: 0.6;
  cursor: not-allowed;
}
.header-actions {
  display: flex;
  gap: 8px;
  align-items: center;
}
</style>
