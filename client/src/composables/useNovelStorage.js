export function useNovelStorage() {
  function saveBooks(books) {
    try {
      // 优先尝试保存完整内容（可能会超配额）
      try {
        localStorage.setItem('novel-reader-books', JSON.stringify(books));
        return;
      } catch (err) {
        // 回退：保存仅含元数据的版本（移除 content 与 chapters 字段）
        console.warn(
          '保存完整书籍到 localStorage 失败，尝试只保存元数据：',
          err
        );
        const metaOnly = books.map(b => {
          const { content, chapters, ...meta } = b;
          return meta;
        });
        try {
          localStorage.setItem('novel-reader-books', JSON.stringify(metaOnly));
          console.info('已保存书籍元数据到 localStorage，书籍内容未被缓存。');
          return;
        } catch (err2) {
          console.error('保存书籍元数据也失败:', err2);
          throw err2;
        }
      }
    } catch (error) {
      console.error('保存书籍失败:', error);
    }
  }

  function loadBooks(booksRef) {
    try {
      const saved = localStorage.getItem('novel-reader-books');
      if (saved) {
        booksRef.value = JSON.parse(saved);
      }
    } catch (error) {
      console.error('加载书籍失败:', error);
      booksRef.value = [];
    }
  }

  function saveProgress(progress) {
    try {
      localStorage.setItem('novel-reader-progress', JSON.stringify(progress));
    } catch (error) {
      console.error('保存进度失败:', error);
    }
  }

  function loadProgress(progressRef) {
    try {
      const saved = localStorage.getItem('novel-reader-progress');
      if (saved) {
        progressRef.value = JSON.parse(saved);
      }
    } catch (error) {
      console.error('加载进度失败:', error);
      progressRef.value = {};
    }
  }

  function saveSettings(settings) {
    try {
      localStorage.setItem('novel-reader-settings', JSON.stringify(settings));
    } catch (error) {
      console.error('保存设置失败:', error);
    }
  }

  function loadSettings(settingsRef) {
    try {
      const saved = localStorage.getItem('novel-reader-settings');
      if (saved) {
        settingsRef.value = {
          ...settingsRef.value,
          ...JSON.parse(saved),
        };
      }
    } catch (error) {
      console.error('加载设置失败:', error);
    }
  }

  return {
    saveBooks,
    loadBooks,
    saveProgress,
    loadProgress,
    saveSettings,
    loadSettings,
  };
}
