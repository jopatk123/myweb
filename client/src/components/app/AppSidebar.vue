<template>
  <aside class="module-sider">
    <div class="module-header-row">
      <div class="module-title">分组管理</div>
      <div class="header-actions">
        <button
          class="btn btn-secondary btn-sm"
          @click="$emit('create-group')"
          title="新建分组"
        >
          新建
        </button>
      </div>
    </div>
    <div class="group-list">
      <div
        class="group-item"
        :class="{ active: selectedGroupId === '' }"
        @click="$emit('select-group', '')"
      >
        全部应用
      </div>
      <div
        class="group-item"
        v-for="g in groups"
        :key="g.id"
        :class="{ active: selectedGroupId === g.id }"
        @click="$emit('select-group', g.id)"
      >
        <span class="group-name">{{ g.name }}</span>
      </div>
    </div>
  </aside>
</template>

<script setup>
  defineProps({
    groups: {
      type: Array,
      default: () => [],
    },
    selectedGroupId: {
      // accept both String and Number to avoid prop type warnings when parent
      // passes numeric ids
      type: [String, Number],
      default: '',
    },
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
    justify-content: space-between;
    align-items: center;
    margin-bottom: 12px;
  }
  .module-title {
    font-weight: 600;
  }
  .group-list {
    display: flex;
    flex-direction: column;
    gap: 6px;
  }
  .group-item {
    padding: 8px 10px;
    cursor: pointer;
    border-radius: 6px;
  }
  .group-item:hover {
    background: #f9fafb;
  }
  .group-item.active {
    background: #eef2ff;
    color: #4f46e5;
    font-weight: 500;
  }
</style>
