<template>
  <aside class="module-sider">
    <div class="module-header-row">
      <div class="module-title">分组管理</div>
      <button class="btn btn-secondary btn-sm" @click="$emit('create-group')">新建</button>
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
    type: String,
    required: true
  }
});

defineEmits(['select-group', 'create-group']);
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
</style>
