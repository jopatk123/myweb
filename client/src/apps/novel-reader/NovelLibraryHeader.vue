<template>
  <div class="library-header">
    <div class="header-title">
      <h2>📚 小说阅读器</h2>
      <div class="book-count">共 {{ totalBooks }} 本书籍</div>
    </div>

    <div class="header-actions">
      <div class="search-box">
        <input
          v-model="searchInput"
          type="text"
          placeholder="搜索书名或作者..."
          class="search-input"
          @input="handleSearch"
        />
        <button class="search-btn">🔍</button>
      </div>

      <button class="upload-btn" @click="$emit('upload')">📁 添加书籍</button>
    </div>
  </div>
</template>

<script setup>
  import { ref, watch } from 'vue';

  const props = defineProps({
    totalBooks: {
      type: Number,
      default: 0,
    },
  });

  const emit = defineEmits(['upload', 'search']);

  const searchInput = ref('');

  function handleSearch() {
    emit('search', searchInput.value);
  }

  watch(searchInput, newValue => {
    emit('search', newValue);
  });
</script>

<style scoped>
  .library-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 16px 20px;
    background: rgba(255, 255, 255, 0.1);
    backdrop-filter: blur(10px);
    border-bottom: 1px solid rgba(255, 255, 255, 0.2);
    flex-shrink: 0;
  }

  .header-title h2 {
    margin: 0;
    color: white;
    font-size: 1.5rem;
    text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.3);
  }

  .book-count {
    color: rgba(255, 255, 255, 0.8);
    font-size: 0.9rem;
    margin-top: 4px;
  }

  .header-actions {
    display: flex;
    align-items: center;
    gap: 12px;
  }

  .search-box {
    display: flex;
    align-items: center;
    background: rgba(255, 255, 255, 0.9);
    border-radius: 8px;
    overflow: hidden;
  }

  .search-input {
    padding: 8px 12px;
    border: none;
    background: transparent;
    color: #333;
    font-size: 14px;
    width: 200px;
    outline: none;
  }

  .search-input::placeholder {
    color: #999;
  }

  .search-btn {
    padding: 8px 12px;
    border: none;
    background: transparent;
    cursor: pointer;
    color: #666;
    transition: color 0.2s ease;
  }

  .search-btn:hover {
    color: #333;
  }

  .upload-btn {
    padding: 8px 16px;
    border: 1px solid rgba(255, 255, 255, 0.3);
    border-radius: 8px;
    background: rgba(255, 255, 255, 0.1);
    color: white;
    cursor: pointer;
    transition: all 0.2s ease;
    font-size: 14px;
    backdrop-filter: blur(10px);
  }

  .upload-btn:hover {
    background: rgba(255, 255, 255, 0.2);
    transform: translateY(-1px);
  }

  @media (max-width: 768px) {
    .library-header {
      flex-direction: column;
      gap: 12px;
      align-items: stretch;
    }

    .header-actions {
      justify-content: space-between;
    }

    .search-input {
      width: 150px;
    }
  }
</style>
