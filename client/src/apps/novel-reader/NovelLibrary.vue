<template>
  <div class="novel-library">
    <div v-if="loading" class="loading-state">
      <div class="loading-spinner"></div>
      <p>正在处理文件...</p>
    </div>

    <div v-else-if="books.length === 0" class="empty-state">
      <div class="empty-icon">📖</div>
      <h3>还没有添加任何书籍</h3>
      <p>点击"添加书籍"按钮开始您的阅读之旅</p>
    </div>

    <div v-else class="books-grid">
      <NovelBookCard
        v-for="book in books"
        :key="book.id"
        :book="book"
        @open="$emit('open-book', book)"
        @delete="$emit('delete-book', book.id)"
        @info="$emit('show-info', book)"
      />
    </div>
  </div>
</template>

<script setup>
  import NovelBookCard from './NovelBookCard.vue';

  defineProps({
    books: {
      type: Array,
      default: () => [],
    },
    loading: {
      type: Boolean,
      default: false,
    },
  });

  defineEmits(['open-book', 'delete-book', 'show-info']);
</script>

<style scoped>
  .novel-library {
    flex: 1;
    padding: 20px;
    overflow-y: auto;
  }

  .loading-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    height: 200px;
    color: white;
  }

  .loading-spinner {
    width: 40px;
    height: 40px;
    border: 4px solid rgba(255, 255, 255, 0.3);
    border-top: 4px solid white;
    border-radius: 50%;
    animation: spin 1s linear infinite;
    margin-bottom: 16px;
  }

  @keyframes spin {
    0% {
      transform: rotate(0deg);
    }
    100% {
      transform: rotate(360deg);
    }
  }

  .empty-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    height: 300px;
    color: white;
    text-align: center;
  }

  .empty-icon {
    font-size: 4rem;
    margin-bottom: 16px;
    opacity: 0.7;
  }

  .empty-state h3 {
    margin: 0 0 8px 0;
    font-size: 1.2rem;
  }

  .empty-state p {
    margin: 0;
    opacity: 0.8;
    font-size: 0.9rem;
  }

  .books-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
    gap: 20px;
    padding: 8px;
  }

  @media (max-width: 768px) {
    .novel-library {
      padding: 16px;
    }

    .books-grid {
      grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
      gap: 16px;
    }
  }
</style>
