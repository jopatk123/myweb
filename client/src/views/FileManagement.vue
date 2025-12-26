<template>
  <div class="admin-layout" :class="{ 'sider-visible': siderVisible }">
    <!-- 全局侧边栏切换按钮 -->
    <button
      v-if="!siderVisible"
      class="global-sider-toggle"
      @click="siderVisible = true"
      title="显示侧边栏"
    >
      ☰
    </button>

    <!-- 全局侧边栏 -->
    <aside class="global-sider">
      <div class="brand">管理后台</div>
      <nav class="global-menu">
        <router-link to="/wallpapers" class="menu-item">壁纸管理</router-link>
        <router-link to="/myapps" class="menu-item">应用管理</router-link>
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
        <select v-model="type" class="filter-select" @change="onTypeChange">
          <option value="">全部类型</option>
          <option value="image">图片</option>
          <option value="video">视频</option>
          <option value="word">Word</option>
          <option value="excel">Excel</option>
          <option value="archive">压缩包</option>
          <option value="music">音频</option>
          <option value="novel">小说</option>
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
              @keyup.enter="onSearch"
            />
            <button class="btn btn-primary search-btn" @click="onSearch">
              <span class="search-icon">🔍</span>
              搜索
            </button>
          </div>
        </div>
      </div>

      <div v-if="statusMessage" :class="['status-banner', statusClass]">
        <span>{{ statusMessage }}</span>
        <button class="close-status" @click="clearStatus" aria-label="关闭提示">
          ×
        </button>
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
                  <span class="name-text">{{
                    f.originalName || f.original_name
                  }}</span>
                </td>
                <td class="file-size">
                  {{ formatFileSize(f.fileSize || f.file_size) }}
                </td>
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
                    @click="onDelete(f)"
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

      <FileUploadProgress
        :uploading="uploading"
        :progress="uploadProgress"
        :uploaded-bytes="uploadedBytes"
        :total-bytes="totalBytes"
        :current-file-name="currentFileName"
        :upload-queue="uploadQueue"
        @close="onCloseProgress"
      />
      <div v-if="loading" class="loading-overlay">
        <div class="loading-spinner"></div>
        <span>加载中...</span>
      </div>
    </main>
  </div>
</template>

<script setup>
  import { computed, onMounted, ref } from 'vue';
  import { useFiles } from '@/composables/useFiles.js';
  import { useConfirm } from '@/composables/useConfirm.js';
  import FileUploadProgress from '@/components/file/FileUploadProgress.vue';
  import PaginationControls from '@/components/common/PaginationControls.vue';

  const {
    items,
    page,
    total,
    limit,
    type,
    search,
    loading,
    uploading,
    uploadProgress,
    uploadedBytes,
    totalBytes,
    currentFileName,
    uploadQueue,
    fetchList,
    upload,
    remove,
    getDownloadUrl,
    setPage,
    setLimit,
  } = useFiles();

  const { confirmAction } = useConfirm();

  const statusMessage = ref('');
  const statusType = ref('info');
  const siderVisible = ref(false);

  const statusClass = computed(() => `status-${statusType.value}`);

  onMounted(fetchListWithStatus);

  function onSelect(e) {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    upload(files)
      .then(() => {
        setStatus('success', `已成功上传 ${files.length} 个文件`);
      })
      .catch(err => {
        setStatus('error', err?.message || '上传失败');
      })
      .finally(() => {
        e.target.value = '';
      });
  }

  function getFileIcon(type) {
    const icons = {
      image: '🖼️',
      video: '🎥',
      word: '📝',
      excel: '📊',
      archive: '📦',
      music: '🎵',
      novel: '📖',
      other: '📄',
    };
    return icons[type] || '📄';
  }

  function formatFileSize(bytes) {
    if (!Number.isFinite(bytes) || bytes < 0) return '--';
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    const size = sizes[i] || 'TB';
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + size;
  }

  async function onPrevPage() {
    if (page.value <= 1) return;
    setPage(page.value - 1);
    await fetchListWithStatus();
  }

  async function onTypeChange() {
    setPage(1);
    await fetchListWithStatus();
  }

  async function onSearch() {
    setPage(1);
    await fetchListWithStatus();
  }

  async function fetchListWithStatus() {
    try {
      await fetchList();
      if (statusType.value === 'error') {
        clearStatus();
      }
    } catch (err) {
      setStatus('error', err?.message || '加载失败');
    }
  }

  async function onDelete(file) {
    const name = file.originalName || file.original_name || '该文件';
    const ok = confirmAction(`确认删除文件“${name}”？`);
    if (!ok) return;
    try {
      await remove(file.id);
      setStatus('success', '文件删除成功');
    } catch (err) {
      setStatus('error', err?.message || '删除失败');
    }
  }

  function onCloseProgress() {
    // 用户主动关闭进度条时不做额外处理
  }

  function setStatus(type, message) {
    statusType.value = type;
    statusMessage.value = message;
  }

  function clearStatus() {
    statusMessage.value = '';
    statusType.value = 'info';
  }

  async function onNextPage() {
    const totalPages = Math.max(
      1,
      Math.ceil((total.value || 0) / (limit.value || 1))
    );
    if (page.value >= totalPages) return;
    setPage(page.value + 1);
    await fetchListWithStatus();
  }

  async function onLimitChange(l) {
    setPage(1);
    setLimit(l);
    await fetchListWithStatus();
  }
</script>

<style scoped>
  /* 页面独有的微调项可保留（若未来出现冲突再加细节选择器覆盖） */
  .file-table-wrapper {
    position: relative;
  }
  .list-title {
    margin: 0;
  }

  .content-area {
    position: relative;
  }

  .status-banner {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 10px 16px;
    border-radius: 8px;
    margin-bottom: 16px;
    font-size: 14px;
  }

  .status-success {
    background: #ecfdf5;
    color: #047857;
    border: 1px solid #a7f3d0;
  }

  .status-error {
    background: #fef2f2;
    color: #b91c1c;
    border: 1px solid #fecaca;
  }

  .close-status {
    background: transparent;
    border: none;
    font-size: 18px;
    cursor: pointer;
    color: inherit;
  }

  .loading-overlay {
    position: absolute;
    inset: 0;
    background: rgba(255, 255, 255, 0.75);
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 8px;
    font-size: 14px;
    color: #444;
  }

  .loading-spinner {
    width: 32px;
    height: 32px;
    border: 3px solid rgba(59, 130, 246, 0.2);
    border-top-color: #3b82f6;
    border-radius: 50%;
    animation: spin 1s linear infinite;
  }

  @keyframes spin {
    0% {
      transform: rotate(0deg);
    }
    100% {
      transform: rotate(360deg);
    }
  }
</style>
