import { apiFetch, buildApiUrl } from './httpClient.js';

const API_BASE = '/novel-bookmarks';

export const bookmarksApi = {
  // 创建书签
  async create(bookmarkData) {
  const response = await apiFetch(buildApiUrl(API_BASE), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(bookmarkData),
    });

    if (!response.ok) {
      throw new Error(`创建书签失败: ${response.status}`);
    }

    return response.json();
  },

  // 获取指定书籍的所有书签
  async getByBookId(bookId) {
    const response = await apiFetch(
      buildApiUrl(`${API_BASE}/book/${encodeURIComponent(bookId)}`)
    );

    if (!response.ok) {
      throw new Error(`获取书签失败: ${response.status}`);
    }

    return response.json();
  },

  // 获取指定文件的所有书签
  async getByFileId(fileId) {
    const response = await apiFetch(
      buildApiUrl(`${API_BASE}/file/${encodeURIComponent(fileId)}`)
    );

    if (!response.ok) {
      throw new Error(`获取书签失败: ${response.status}`);
    }

    return response.json();
  },

  // 更新书签
  async update(id, updates) {
  const response = await apiFetch(buildApiUrl(`${API_BASE}/${id}`), {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(updates),
    });

    if (!response.ok) {
      throw new Error(`更新书签失败: ${response.status}`);
    }

    return response.json();
  },

  // 删除书签
  async delete(id) {
  const response = await apiFetch(buildApiUrl(`${API_BASE}/${id}`), {
      method: 'DELETE',
    });

    if (!response.ok) {
      throw new Error(`删除书签失败: ${response.status}`);
    }

    return response.json();
  },

  // 删除指定书籍的所有书签
  async deleteByBookId(bookId) {
    const response = await apiFetch(
      buildApiUrl(`${API_BASE}/book/${encodeURIComponent(bookId)}`),
      {
        method: 'DELETE',
      }
    );

    if (!response.ok) {
      throw new Error(`删除书籍书签失败: ${response.status}`);
    }

    return response.json();
  },

  // 同步书签
  async sync(deviceId, bookmarks) {
  const response = await apiFetch(buildApiUrl(`${API_BASE}/sync`), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ deviceId, bookmarks }),
    });

    if (!response.ok) {
      throw new Error(`同步书签失败: ${response.status}`);
    }

    return response.json();
  },

  // 获取所有书签（管理员功能）
  async getAll() {
  const response = await apiFetch(buildApiUrl(API_BASE));

    if (!response.ok) {
      throw new Error(`获取所有书签失败: ${response.status}`);
    }

    return response.json();
  },
};
