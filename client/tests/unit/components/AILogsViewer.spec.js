import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { render, fireEvent, waitFor, screen } from '@testing-library/vue';
import AILogsViewer from '@/components/common/AILogsViewer.vue';

vi.mock('@/api/logs.js', () => {
  const getAILogs = vi.fn();
  const getAILogStats = vi.fn();
  const clearAILogs = vi.fn();
  return {
    logsApi: {
      getAILogs,
      getAILogStats,
      clearAILogs,
    },
  };
});

import { logsApi } from '@/api/logs.js';

const mockLogEntry = {
  timestamp: '2024-01-01T10:00:00Z',
  model: 'gpt-test',
  playerType: 1,
  requestText: '下一步怎么走？',
  responseText: '尝试在中心落子。',
};

const defaultStats = {
  entries: 1,
  sizeFormatted: '1 KB',
  lastModified: '2024-01-01T10:00:00Z',
  disabled: false,
};

beforeEach(() => {
  vi.clearAllMocks();
  window.confirm = vi.fn(() => true);
  window.alert = vi.fn();
});

afterEach(() => {
  vi.clearAllMocks();
});

describe('AILogsViewer', () => {
  it('renders logs returned from API', async () => {
    logsApi.getAILogs.mockResolvedValue({
      data: { logs: [mockLogEntry], disabled: false },
    });
    logsApi.getAILogStats.mockResolvedValue({ data: defaultStats });

    render(AILogsViewer);

    expect(
      await screen.findByText('AI对话日志查看器（已禁用文件存储）')
    ).toBeInTheDocument();
    expect(await screen.findByText('下一步怎么走？')).toBeInTheDocument();
    expect(logsApi.getAILogs).toHaveBeenCalled();
  });

  it('shows disabled hint when feature disabled', async () => {
    logsApi.getAILogs.mockResolvedValue({ data: { disabled: true } });
    logsApi.getAILogStats.mockResolvedValue({
      data: { ...defaultStats, disabled: true },
    });

    render(AILogsViewer);

    expect(
      await screen.findByText(
        '已取消将 AI 对话写入服务器文件，只保留控制台输出。此页面显示空数据。'
      )
    ).toBeInTheDocument();
    expect(screen.queryByText('清空日志')).not.toBeInTheDocument();
  });

  it('clears logs after confirmation', async () => {
    logsApi.getAILogs.mockResolvedValue({
      data: { logs: [mockLogEntry], disabled: false },
    });
    logsApi.getAILogStats.mockResolvedValue({ data: defaultStats });
    logsApi.clearAILogs.mockResolvedValue({});

    render(AILogsViewer);

    const clearButton = await screen.findByText('清空日志');
    await fireEvent.click(clearButton);

    expect(window.confirm).toHaveBeenCalled();
    await waitFor(() => expect(logsApi.clearAILogs).toHaveBeenCalled());
    expect(window.alert).toHaveBeenCalledWith('日志已清空');
  });

  it('debounces search input before fetching logs', async () => {
    vi.useFakeTimers();
    logsApi.getAILogs.mockResolvedValue({
      data: { logs: [], disabled: false },
    });
    logsApi.getAILogStats.mockResolvedValue({ data: defaultStats });

    render(AILogsViewer);

    logsApi.getAILogs.mockClear();
    const input = await screen.findByPlaceholderText('搜索日志内容...');

    await fireEvent.update(input, '中心');
    expect(logsApi.getAILogs).not.toHaveBeenCalled();

    vi.advanceTimersByTime(500);
    await vi.runAllTimersAsync();
    await waitFor(() => {
      expect(logsApi.getAILogs).toHaveBeenCalledWith(
        expect.objectContaining({ search: '中心', lines: 100 })
      );
    });

    vi.useRealTimers();
  });
});
