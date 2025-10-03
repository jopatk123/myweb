<template>
  <div class="app-list">
    <table>
      <thead>
        <tr>
          <th>
            <input type="checkbox" :checked="allSelected" @change="toggleAll" />
          </th>
          <th>图标</th>
          <th>名称</th>
          <th>Slug</th>
          <th>类型</th>
          <th>分组</th>
          <th>可见</th>
          <th>自启动</th>
          <th>操作</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="app in apps" :key="app.id">
          <td>
            <input
              type="checkbox"
              :value="app.id"
              :checked="selectedIds.includes(app.id)"
              @change="onSelectionChange(app.id, $event.target.checked)"
            />
          </td>
          <td>
            <img
              v-if="app.icon_filename || app.iconFilename"
              :src="getAppIconUrl(app)"
              alt="icon"
              class="icon"
            />
            <span v-else class="icon placeholder">—</span>
          </td>
          <td>{{ app.name }}</td>
          <td>{{ app.slug }}</td>
          <td>{{ (app.isBuiltin ?? app.is_builtin) ? '内置' : '第三方' }}</td>
          <td>{{ displayGroupName(app.groupId || app.group_id) }}</td>
          <td>
            <label class="switch">
              <input
                type="checkbox"
                :checked="!!(app.isVisible ?? app.is_visible)"
                @change="$emit('toggle-visible', app, $event.target.checked)"
              />
              <span class="slider"></span>
            </label>
          </td>
          <td>
            <label class="switch">
              <input
                type="checkbox"
                :checked="!!(app.isAutostart ?? app.is_autostart)"
                @change="$emit('toggle-autostart', app, $event.target.checked)"
              />
              <span class="slider"></span>
            </label>
          </td>
          <td>
            <button
              class="btn btn-sm btn-secondary"
              :disabled="isBuiltin(app)"
              :title="isBuiltin(app) ? '内置应用不可编辑' : '编辑'"
              @click="!isBuiltin(app) && $emit('edit', app)"
            >
              编辑
            </button>
            <button
              class="btn btn-sm btn-danger"
              :disabled="isBuiltin(app)"
              :title="isBuiltin(app) ? '内置应用不可删除' : '删除'"
              @click="!isBuiltin(app) && $emit('delete', app.id)"
            >
              删除
            </button>
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</template>

<script setup>
  import { getAppIconUrl } from '@/composables/useApps.js'; // Assuming this can be static

  const props = defineProps({
    apps: {
      type: Array,
      required: true,
    },
    groups: {
      type: Array,
      required: true,
    },
    selectedIds: {
      type: Array,
      required: true,
    },
    allSelected: {
      type: Boolean,
      required: true,
    },
  });

  const emit = defineEmits([
    'update:selectedIds',
    'update:allSelected',
    'toggle-visible',
    'toggle-autostart',
    'edit',
    'delete',
  ]);

  const isBuiltin = app => {
    return (
      (app.isBuiltin ?? app.is_builtin) === 1 ||
      (app.isBuiltin ?? app.is_builtin) === true
    );
  };

  const displayGroupName = groupId => {
    if (groupId === null || groupId === undefined || groupId === '') return '';
    const g = props.groups.find(x => String(x.id) === String(groupId));
    return g ? g.name : '';
  };

  const onSelectionChange = (appId, isChecked) => {
    const newSelectedIds = [...props.selectedIds];
    if (isChecked) {
      if (!newSelectedIds.includes(appId)) {
        newSelectedIds.push(appId);
      }
    } else {
      const index = newSelectedIds.indexOf(appId);
      if (index > -1) {
        newSelectedIds.splice(index, 1);
      }
    }
    emit('update:selectedIds', newSelectedIds);
  };

  const toggleAll = e => {
    emit('update:allSelected', e.target.checked);
  };
</script>

<style scoped>
  .app-list {
    overflow-x: auto;
  }
  table {
    width: 100%;
    border-collapse: collapse;
  }
  th,
  td {
    padding: 8px 12px;
    border-bottom: 1px solid #eee;
    text-align: left;
    white-space: nowrap;
  }
  thead {
    background-color: #f9fafb;
  }
  .icon {
    width: 32px;
    height: 32px;
    object-fit: contain;
  }
  .icon.placeholder {
    display: inline-block;
    text-align: center;
    color: #888;
  }
  .switch {
    position: relative;
    display: inline-block;
    width: 34px;
    height: 20px;
  }
  .switch input {
    opacity: 0;
    width: 0;
    height: 0;
  }
  .slider {
    position: absolute;
    cursor: pointer;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background-color: #ccc;
    transition: 0.4s;
    border-radius: 20px;
  }
  .slider:before {
    position: absolute;
    content: '';
    height: 12px;
    width: 12px;
    left: 4px;
    bottom: 4px;
    background-color: white;
    transition: 0.4s;
    border-radius: 50%;
  }
  input:checked + .slider {
    background-color: #2563eb;
  }
  input:checked + .slider:before {
    transform: translateX(14px);
  }
</style>
