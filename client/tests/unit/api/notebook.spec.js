import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const clientMock = vi.hoisted(() => ({
  get: vi.fn(),
  post: vi.fn(),
  put: vi.fn(),
  delete: vi.fn(),
}));

vi.mock('@/api/httpClient.js', () => ({
  createApiClient: vi.fn(() => clientMock),
}));

async function loadNotebookApi() {
  vi.resetModules();
  return import('@/api/notebook.js');
}

describe('notebook API', () => {
  beforeEach(() => {
    clientMock.get.mockReset();
    clientMock.post.mockReset();
    clientMock.put.mockReset();
    clientMock.delete.mockReset();
  });

  afterEach(() => {
    vi.resetModules();
  });

  it('creates the client with the notebook timeout', async () => {
    const httpClient = await import('@/api/httpClient.js');
    await loadNotebookApi();

    expect(httpClient.createApiClient).toHaveBeenCalledWith({
      timeout: 120000,
    });
  });

  it('lists notes with params', async () => {
    const { notebookApi } = await loadNotebookApi();
    clientMock.get.mockResolvedValue({ items: [] });

    await notebookApi.list({ page: 3, keyword: 'todo' });

    expect(clientMock.get).toHaveBeenCalledWith('/notebook', {
      params: { page: 3, keyword: 'todo' },
    });
  });

  it('defaults list params to an empty object', async () => {
    const { notebookApi } = await loadNotebookApi();
    clientMock.get.mockResolvedValue({ items: [] });

    await notebookApi.list();

    expect(clientMock.get.mock.calls[0][1]).toEqual({ params: {} });
  });

  it('posts the payload when creating a note', async () => {
    const { notebookApi } = await loadNotebookApi();
    const payload = { title: 't', content: 'c' };
    clientMock.post.mockResolvedValue({ id: 'n1' });

    await notebookApi.create(payload);

    expect(clientMock.post).toHaveBeenCalledWith('/notebook', payload);
  });

  it('puts updates to the note id', async () => {
    const { notebookApi } = await loadNotebookApi();
    const payload = { content: 'updated' };
    clientMock.put.mockResolvedValue({});

    await notebookApi.update('n7', payload);

    expect(clientMock.put).toHaveBeenCalledWith('/notebook/n7', payload);
  });

  it('deletes a note by id', async () => {
    const { notebookApi } = await loadNotebookApi();
    clientMock.delete.mockResolvedValue({});

    await notebookApi.remove('n9');

    expect(clientMock.delete).toHaveBeenCalledWith('/notebook/n9');
  });

  it('propagates backend errors to the caller', async () => {
    const { notebookApi } = await loadNotebookApi();
    const error = new Error('notebook unavailable');
    clientMock.get.mockRejectedValue(error);

    await expect(notebookApi.list()).rejects.toBe(error);
  });
});
