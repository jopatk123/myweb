export function useNovelParser() {
  function parseChapters(content) {
    // 简单的章节分割逻辑：支持中文数字（零 一 二 两 三 四 五 六 七 八 九 十 百 千 万 亿）和阿拉伯数字
    // 以及常见的章节后缀（章/节/回/卷/篇/部）。这可以避免仅匹配到 99 章的问题。
    const chapterRegex =
      /第[\d零一二两三四五六七八九十百千万亿]+[章节回卷部篇节]/g;
    const chapters = [];
    const matches = [...content.matchAll(chapterRegex)];

    if (matches.length === 0) {
      // 如果没有找到章节标记，整本书作为一章
      return [
        {
          title: '正文',
          content: content,
          startIndex: 0,
        },
      ];
    }

    for (let i = 0; i < matches.length; i++) {
      const match = matches[i];
      const nextMatch = matches[i + 1];
      const startIndex = match.index;
      const endIndex = nextMatch ? nextMatch.index : content.length;

      chapters.push({
        title: match[0],
        content: content.slice(startIndex, endIndex).trim(),
        startIndex: startIndex,
      });
    }

    return chapters;
  }

  async function parseBookFile(file) {
    return new Promise(resolve => {
      const reader = new FileReader();
      reader.onload = e => {
        try {
          const content = e.target.result;
          const book = {
            id: generateId(),
            title: file.name.replace(/\.[^/.]+$/, ''),
            author: '未知作者',
            size: file.size,
            format: file.name.split('.').pop().toLowerCase(),
            content: content,
            chapters: parseChapters(content),
            addedAt: new Date().toISOString(),
            lastRead: null,
          };
          resolve(book);
        } catch (error) {
          console.error('解析文件失败:', error);
          resolve(null);
        }
      };
      reader.readAsText(file, 'UTF-8');
    });
  }

  function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }

  return {
    parseChapters,
    parseBookFile,
    generateId,
  };
}
