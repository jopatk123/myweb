<template>
  <div class="wallpaper-list">
    <table>
      <thead>
        <tr>
          <th>名称</th>
          <th>缩略图</th>
          <th>文件大小</th>
          <th>上传时间</th>
          <th>操作</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="wallpaper in wallpapers" :key="wallpaper.id" :class="{ active: activeWallpaper?.id === wallpaper.id }">
          <td>{{ wallpaper.name || wallpaper.original_name }}</td>
          <td>
            <img :src="getWallpaperUrl(wallpaper)" :alt="wallpaper.name" class="thumbnail" />
          </td>
          <td>{{ formatFileSize(wallpaper.file_size) }}</td>
          <td>{{ new Date(wallpaper.created_at).toLocaleString() }}</td>
          <td>
            <button @click="$emit('set-active', wallpaper.id)" class="btn btn-sm btn-primary">设为背景</button>
            <button @click="$emit('delete', wallpaper.id)" class="btn btn-sm btn-danger">删除</button>
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</template>

<script setup>
import { computed } from 'vue';

const props = defineProps({
  wallpapers: {
    type: Array,
    required: true
  },
  activeWallpaper: {
    type: Object,
    default: null
  }
});

defineEmits(['set-active', 'delete']);

const getWallpaperUrl = (wallpaper) => {
  if (!wallpaper) return null;
  return `${import.meta.env.VITE_API_BASE || 'http://localhost:3002'}/${wallpaper.file_path}`;
};

const formatFileSize = (bytes) => {
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
.wallpaper-list th, .wallpaper-list td {
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
.btn-primary { background: #007bff; color: white; }
.btn-primary:hover { background: #0056b3; }
.btn-danger { background: #dc3545; color: white; }
.btn-danger:hover { background: #c82333; }
.btn-sm { padding: 6px 12px; font-size: 12px; }
</style>
