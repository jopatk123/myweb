<template>
  <div class="wallpaper-list">
    <table>
      <thead>
        <tr>
          <th>
            <input
              type="checkbox"
              @change="toggleSelectAll"
              :checked="allSelected"
            />
          </th>
          <th>名称</th>
          <th>缩略图</th>
          <th>文件大小</th>
          <th>上传时间</th>
          <th>操作</th>
        </tr>
      </thead>
      <tbody>
        <tr
          v-for="wallpaper in wallpapers"
          :key="wallpaper.id"
          :class="{ active: activeWallpaper?.id === wallpaper.id }"
        >
          <td>
            <input
              type="checkbox"
              :value="wallpaper.id"
              v-model="selectedIds"
            />
          </td>
          <td>
            {{
              wallpaper.name ||
              wallpaper.originalName ||
              wallpaper.original_name
            }}
          </td>
          <td>
            <img
              :src="getWallpaperUrl(wallpaper)"
              :alt="wallpaper.name"
              class="thumbnail"
            />
          </td>
          <td>
            {{ formatFileSize(wallpaper.fileSize || wallpaper.file_size) }}
          </td>
          <td>
            {{
              new Date(
                wallpaper.createdAt || wallpaper.created_at
              ).toLocaleString()
            }}
          </td>
          <td>
            <button
              @click="$emit('set-active', wallpaper.id)"
              class="btn btn-sm btn-primary"
            >
              设为背景
            </button>
            <button
              @click="$emit('edit', wallpaper)"
              class="btn btn-sm btn-secondary"
            >
              编辑
            </button>
            <button
              @click="$emit('delete', wallpaper.id)"
              class="btn btn-sm btn-danger"
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
  import { ref, computed, watch } from 'vue';

  const props = defineProps({
    wallpapers: {
      type: Array,
      required: true,
    },
    activeWallpaper: {
      type: Object,
      default: null,
    },
    modelValue: {
      type: Array,
      default: () => [],
    },
  });

  const emit = defineEmits([
    'set-active',
    'delete',
    'edit',
    'update:modelValue',
  ]);

  const selectedIds = ref([...props.modelValue]);

  watch(selectedIds, newValue => {
    emit('update:modelValue', newValue);
  });

  watch(
    () => props.modelValue,
    newValue => {
      if (JSON.stringify(newValue) !== JSON.stringify(selectedIds.value)) {
        selectedIds.value = [...newValue];
      }
    }
  );

  const allSelected = computed(() => {
    return (
      props.wallpapers.length > 0 &&
      selectedIds.value.length === props.wallpapers.length
    );
  });

  const toggleSelectAll = event => {
    if (event.target.checked) {
      selectedIds.value = props.wallpapers.map(w => w.id);
    } else {
      selectedIds.value = [];
    }
  };

  const getWallpaperUrl = wallpaper => {
    if (!wallpaper) return null;
    const fp = wallpaper.filePath || wallpaper.file_path || '';

    // 对于图片文件，应该直接使用相对路径，不经过API
  // 图片由后端静态服务直接提供
    if (fp.startsWith('uploads/')) {
      return `/${fp}`;
    }

    // 兼容其他情况
    const base = import.meta.env.VITE_API_BASE || '';
    if (base) {
      return `${String(base).replace(/\/+$/g, '')}/${String(fp).replace(/^\/+/, '')}`;
    }
    return fp.startsWith('/') ? fp : `/${fp}`;
  };

  const formatFileSize = bytes => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };
</script>

<style scoped>
  .wallpaper-list table {
    width: 100%;
    border-collapse: collapse;
    margin-top: 16px;
  }
  .wallpaper-list th,
  .wallpaper-list td {
    padding: 12px 16px;
    border-bottom: 1px solid #e5e7eb;
    text-align: left;
    vertical-align: middle;
  }
  .wallpaper-list th {
    background-color: #f9fafb;
    font-weight: 600;
    color: #374151;
  }
  .wallpaper-list tr.active {
    background-color: #eff6ff;
  }
  .thumbnail {
    width: 100px;
    height: 56.25px; /* 16:9 */
    object-fit: cover;
    border-radius: 4px;
  }
  .wallpaper-list td .btn {
    margin-right: 8px;
  }
  .btn {
    padding: 8px 16px;
    border: none;
    border-radius: 4px;
    cursor: pointer;
    font-size: 14px;
    transition: background-color 0.3s ease;
  }
  .btn-primary {
    background: #007bff;
    color: white;
  }
  .btn-primary:hover {
    background: #0056b3;
  }
  .btn-danger {
    background: #dc3545;
    color: white;
  }
  .btn-danger:hover {
    background: #c82333;
  }
  .btn-sm {
    padding: 6px 12px;
    font-size: 12px;
  }
</style>
