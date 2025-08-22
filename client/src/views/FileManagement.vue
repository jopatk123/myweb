<template>
  <div class="admin-layout">
    <!-- 全局侧边栏 -->
    <aside class="global-sider">
      <div class="brand">管理后台</div>
      <nav class="global-menu">
        <router-link to="/wallpapers" class="menu-item">壁纸管理</router-link>
        <router-link to="/apps" class="menu-item">应用管理</router-link>
        <a class="menu-item active">文件管理</a>
      </nav>
    </aside>

    <!-- 模块侧边栏（占位，后续扩展分组/标签） -->
    <aside class="module-sider">
      <div class="module-header-row">
        <div class="module-title">文件筛选</div>
      </div>
      <div class="group-list">
        <select v-model="type">
          <option value="">全部类型</option>
          <option value="image">图片</option>
          <option value="video">视频</option>
          <option value="word">Word</option>
          <option value="excel">Excel</option>
          <option value="archive">压缩包</option>
          <option value="other">其他</option>
        </select>
      </div>
    </aside>

    <!-- 主内容区 -->
    <main class="content-area">
      <div class="toolbar-row">
        <div class="left">
          <input type="file" multiple @change="onSelect" />
        </div>
        <div class="right">
          <input v-model="search" class="search" placeholder="搜索文件名..." />
          <button class="btn btn-secondary" @click="fetchList">查询</button>
        </div>
      </div>

      <div class="app-list">
        <table>
          <thead>
            <tr>
              <th>文件名</th>
              <th>大小</th>
              <th>类型</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="f in items" :key="f.id">
              <td class="name">{{ f.original_name }}</td>
              <td>{{ (f.file_size / 1024).toFixed(1) }} KB</td>
              <td>{{ f.type_category }}</td>
              <td class="actions">
                <a :href="getDownloadUrl(f.id)">下载</a>
                <button class="btn btn-sm btn-danger" @click="remove(f.id)">
                  删除
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div class="pagination-controls">
        <button
          class="btn"
          :disabled="page <= 1"
          @click="
            setPage(page - 1);
            fetchList();
          "
        >
          上一页
        </button>
        <span>第 {{ page }} 页 / 共 {{ totalPages }} 页</span>
        <button
          class="btn"
          :disabled="page >= totalPages"
          @click="
            setPage(page + 1);
            fetchList();
          "
        >
          下一页
        </button>
      </div>

      <FileUploadProgress :uploading="uploading" :progress="uploadProgress" />
    </main>
  </div>
</template>

<script setup>
  import { onMounted } from 'vue';
  import { useFiles } from '@/composables/useFiles.js';
  import FileUploadProgress from '@/components/file/FileUploadProgress.vue';

  const {
    items,
    page,
    totalPages,
    type,
    search,
    uploading,
    uploadProgress,
    fetchList,
    upload,
    remove,
    getDownloadUrl,
    setPage,
  } = useFiles();

  onMounted(fetchList);

  function onSelect(e) {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    upload(files).catch(() => {});
    e.target.value = '';
  }
</script>

<style scoped>
  .admin-layout {
    display: grid;
    grid-template-columns: 200px 260px 1fr;
    min-height: 100vh;
  }
  .global-sider {
    background: #0f172a;
    color: #e2e8f0;
    padding: 16px 12px;
  }
  .brand {
    font-weight: 700;
    font-size: 18px;
    margin-bottom: 20px;
  }
  .global-menu {
    display: flex;
    flex-direction: column;
    gap: 6px;
  }
  .menu-item {
    display: block;
    padding: 10px 12px;
    color: #cbd5e1;
    text-decoration: none;
    border-radius: 6px;
  }
  .menu-item.active {
    background: #1e293b;
    color: #fff;
  }
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
  .content-area {
    padding: 20px;
  }
  .toolbar-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 12px;
  }
  .search {
    padding: 6px 10px;
    border: 1px solid #ddd;
    border-radius: 6px;
  }
  .app-list table {
    width: 100%;
    border-collapse: collapse;
    background: #fff;
    border-radius: 8px;
    overflow: hidden;
  }
  .app-list th,
  .app-list td {
    padding: 10px;
    border-bottom: 1px solid #eee;
    text-align: left;
  }
  .name {
    word-break: break-all;
  }
  .actions {
    display: flex;
    gap: 10px;
    align-items: center;
  }
  .pagination-controls {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 12px 0;
  }
</style>
