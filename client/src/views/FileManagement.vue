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
      <div class="filter-section">
        <label class="filter-label">文件类型</label>
        <select v-model="type" class="filter-select">
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
      <!-- 工具栏 -->
      <div class="toolbar">
        <div class="toolbar-left">
          <div class="upload-section">
            <label class="upload-btn">
              <input
                type="file"
                multiple
                @change="onSelect"
                class="file-input"
              />
              <span class="upload-icon">📁</span>
              <span>选择文件</span>
            </label>
            <span class="upload-hint">支持多文件上传</span>
          </div>
        </div>
        <div class="toolbar-right">
          <div class="search-section">
            <input
              v-model="search"
              class="search-input"
              placeholder="搜索文件名..."
            />
            <button class="btn btn-primary search-btn" @click="fetchList">
              <span class="search-icon">🔍</span>
              搜索
            </button>
          </div>
        </div>
      </div>

      <!-- 文件列表 -->
      <div class="file-list-container">
        <div class="file-list-header">
          <h3 class="list-title">文件列表</h3>
          <span class="file-count" v-if="items.length > 0"
            >共 {{ items.length }} 个文件</span
          >
        </div>

        <div class="file-table-wrapper">
          <table class="file-table">
            <thead>
              <tr>
                <th class="th-name">文件名</th>
                <th class="th-size">大小</th>
                <th class="th-type">类型</th>
                <th class="th-actions">操作</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="f in items" :key="f.id" class="file-row">
                <td class="file-name">
                  <span class="file-icon">{{
                    getFileIcon(f.type_category)
                  }}</span>
                  <span class="name-text">{{ f.original_name }}</span>
                </td>
                <td class="file-size">{{ formatFileSize(f.file_size) }}</td>
                <td class="file-type">
                  <span class="type-badge">{{ f.type_category }}</span>
                </td>
                <td class="file-actions">
                  <a
                    :href="getDownloadUrl(f.id)"
                    class="action-link download-link"
                  >
                    <span class="action-icon">⬇️</span>
                    下载
                  </a>
                  <button
                    class="btn btn-sm btn-danger delete-btn"
                    @click="remove(f.id)"
                  >
                    <span class="action-icon">🗑️</span>
                    删除
                  </button>
                </td>
              </tr>
            </tbody>
          </table>

          <!-- 空状态 -->
          <div v-if="items.length === 0" class="empty-state">
            <div class="empty-icon">📄</div>
            <p class="empty-text">暂无文件</p>
            <p class="empty-hint">点击上方"选择文件"按钮上传文件</p>
          </div>
        </div>
      </div>

      <!-- 分页控件 -->
      <div class="pagination-wrapper">
        <PaginationControls
          :page="page"
          :limit="limit"
          :total="total"
          @prev="onPrevPage"
          @next="onNextPage"
          @limit-change="onLimitChange"
        />
      </div>

      <FileUploadProgress :uploading="uploading" :progress="uploadProgress" />
    </main>
  </div>
</template>

<script setup>
  import { onMounted } from 'vue';
  import { useFiles } from '@/composables/useFiles.js';
  import FileUploadProgress from '@/components/file/FileUploadProgress.vue';
  import PaginationControls from '@/components/common/PaginationControls.vue';

  const {
    items,
    page,
    total,
    limit,
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

  function getFileIcon(type) {
    const icons = {
      image: '🖼️',
      video: '🎥',
      word: '📝',
      excel: '📊',
      archive: '📦',
      other: '📄',
    };
    return icons[type] || '📄';
  }

  function formatFileSize(bytes) {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  }

  async function onPrevPage() {
    if (page.value <= 1) return;
    setPage(page.value - 1);
    await fetchList();
  }

  async function onNextPage() {
    const totalPages = Math.max(
      1,
      Math.ceil((total.value || 0) / (limit.value || 1))
    );
    if (page.value >= totalPages) return;
    setPage(page.value + 1);
    await fetchList();
  }

  async function onLimitChange(l) {
    setPage(1);
    setLimit(l);
    await fetchList();
  }
</script>

<style scoped>
  .admin-layout {
    display: grid;
    grid-template-columns: 200px 260px 1fr;
    min-height: 100vh;
    background: #f8fafc;
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
    transition: all 0.2s ease;
  }

  .menu-item:hover {
    background: #1e293b;
    color: #fff;
  }

  .menu-item.active {
    background: #1e293b;
    color: #fff;
  }

  .module-sider {
    background: #fff;
    border-right: 1px solid #e2e8f0;
    padding: 20px;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  }

  .module-header-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 20px;
  }

  .module-title {
    font-weight: 600;
    font-size: 16px;
    color: #1e293b;
  }

  .filter-section {
    margin-bottom: 16px;
  }

  .filter-label {
    display: block;
    font-size: 14px;
    font-weight: 500;
    color: #64748b;
    margin-bottom: 8px;
  }

  .filter-select {
    width: 100%;
    padding: 8px 12px;
    border: 1px solid #d1d5db;
    border-radius: 6px;
    font-size: 14px;
    background: #fff;
    transition: border-color 0.2s ease;
  }

  .filter-select:focus {
    outline: none;
    border-color: #3b82f6;
    box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
  }

  .content-area {
    padding: 24px;
    background: #f8fafc;
  }

  .toolbar {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 24px;
    padding: 20px;
    background: #fff;
    border-radius: 8px;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  }

  .toolbar-left {
    display: flex;
    align-items: center;
  }

  .upload-section {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  .upload-btn {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 10px 16px;
    background: #f1f5f9;
    border: 2px dashed #cbd5e1;
    border-radius: 6px;
    cursor: pointer;
    transition: all 0.2s ease;
    font-size: 14px;
    color: #64748b;
  }

  .upload-btn:hover {
    border-color: #3b82f6;
    background: #eff6ff;
    color: #3b82f6;
  }

  .file-input {
    display: none;
  }

  .upload-icon {
    font-size: 16px;
  }

  .upload-hint {
    font-size: 12px;
    color: #94a3b8;
  }

  .toolbar-right {
    display: flex;
    align-items: center;
  }

  .search-section {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .search-input {
    padding: 8px 12px;
    border: 1px solid #d1d5db;
    border-radius: 6px;
    font-size: 14px;
    width: 200px;
    transition: border-color 0.2s ease;
  }

  .search-input:focus {
    outline: none;
    border-color: #3b82f6;
    box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
  }

  .search-btn {
    display: flex;
    align-items: center;
    gap: 4px;
  }

  .search-icon {
    font-size: 12px;
  }

  .file-list-container {
    background: #fff;
    border-radius: 8px;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
    overflow: hidden;
    margin-bottom: 24px;
  }

  .file-list-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 16px 20px;
    border-bottom: 1px solid #e2e8f0;
    background: #f8fafc;
  }

  .list-title {
    font-size: 16px;
    font-weight: 600;
    color: #1e293b;
    margin: 0;
  }

  .file-count {
    font-size: 14px;
    color: #64748b;
  }

  .file-table-wrapper {
    position: relative;
  }

  .file-table {
    width: 100%;
    border-collapse: collapse;
  }

  .file-table th {
    padding: 12px 16px;
    text-align: left;
    font-weight: 600;
    font-size: 14px;
    color: #374151;
    background: #f9fafb;
    border-bottom: 1px solid #e5e7eb;
  }

  .file-table td {
    padding: 12px 16px;
    border-bottom: 1px solid #f3f4f6;
    vertical-align: middle;
  }

  .file-row:hover {
    background: #f8fafc;
  }

  .file-name {
    display: flex;
    align-items: center;
    gap: 8px;
    font-weight: 500;
  }

  .file-icon {
    font-size: 16px;
  }

  .name-text {
    color: #1f2937;
    word-break: break-all;
  }

  .file-size {
    color: #6b7280;
    font-size: 14px;
  }

  .file-type {
    text-align: center;
  }

  .type-badge {
    display: inline-block;
    padding: 4px 8px;
    background: #e0e7ff;
    color: #3730a3;
    border-radius: 4px;
    font-size: 12px;
    font-weight: 500;
  }

  .file-actions {
    display: flex;
    gap: 8px;
    align-items: center;
  }

  .action-link {
    display: flex;
    align-items: center;
    gap: 4px;
    padding: 6px 10px;
    color: #3b82f6;
    text-decoration: none;
    border-radius: 4px;
    font-size: 12px;
    transition: background-color 0.2s ease;
  }

  .action-link:hover {
    background: #eff6ff;
  }

  .action-icon {
    font-size: 12px;
  }

  .delete-btn {
    display: flex;
    align-items: center;
    gap: 4px;
  }

  .empty-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 60px 20px;
    text-align: center;
  }

  .empty-icon {
    font-size: 48px;
    margin-bottom: 16px;
    opacity: 0.5;
  }

  .empty-text {
    font-size: 16px;
    font-weight: 500;
    color: #6b7280;
    margin-bottom: 8px;
  }

  .empty-hint {
    font-size: 14px;
    color: #9ca3af;
  }

  .pagination-wrapper {
    display: flex;
    justify-content: center;
    padding: 20px 0;
  }

  .pagination-controls {
    display: flex;
    align-items: center;
    gap: 16px;
    padding: 12px 20px;
    background: #fff;
    border-radius: 8px;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  }

  .pagination-info {
    font-size: 14px;
    color: #6b7280;
    min-width: 120px;
    text-align: center;
  }

  .pagination-icon {
    font-size: 12px;
  }

  /* 响应式设计 */
  @media (max-width: 1024px) {
    .admin-layout {
      grid-template-columns: 200px 1fr;
    }

    .module-sider {
      display: none;
    }
  }

  @media (max-width: 768px) {
    .admin-layout {
      grid-template-columns: 1fr;
    }

    .global-sider {
      display: none;
    }

    .toolbar {
      flex-direction: column;
      gap: 16px;
      align-items: stretch;
    }

    .search-section {
      width: 100%;
    }

    .search-input {
      width: 100%;
    }
  }
</style>
