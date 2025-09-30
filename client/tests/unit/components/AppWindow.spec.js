import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, fireEvent } from '@testing-library/vue';
import { ref, markRaw } from 'vue';

vi.mock('@/composables/useDraggableModal.js', () => {
  const modalRef = ref(null);
  const modalStyle = ref({});
  const pos = ref({ x: 0, y: 0 });
  return {
    useDraggableModal: vi.fn(() => ({
      modalRef,
      modalStyle,
      onHeaderPointerDown: vi.fn(),
      pos,
      savePosition: vi.fn(),
    })),
  };
});

const mockResizeStart = vi.fn();

vi.mock('@/composables/useAppWindowResize.js', () => ({
  useAppWindowResize: vi.fn(() => ({
    onResizeStart: mockResizeStart,
  })),
}));

const autoMinimizeHandlers = {
  onMouseEnter: vi.fn(),
  onMouseLeave: vi.fn(),
  onFocusIn: vi.fn(),
  onFocusOut: vi.fn(),
};

vi.mock('@/composables/useNovelReaderAutoMinimize.js', () => ({
  useNovelReaderAutoMinimize: vi.fn(() => autoMinimizeHandlers),
}));

import AppWindow from '@/components/desktop/AppWindow.vue';

function createWindow(overrides = {}) {
  return {
    id: 1,
    title: '测试窗口',
    appSlug: 'test-app',
    width: 520,
    height: 400,
    zIndex: 1002,
    minimized: false,
    maximized: false,
    props: {},
    component: markRaw({
      template: '<div data-testid="window-content">内容</div>',
    }),
    storageKey: 'window:test-app:1',
    ...overrides,
  };
}

describe('AppWindow', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // 重置 auto minimize 监听函数
    autoMinimizeHandlers.onMouseEnter.mockClear();
    autoMinimizeHandlers.onMouseLeave.mockClear();
    autoMinimizeHandlers.onFocusIn.mockClear();
    autoMinimizeHandlers.onFocusOut.mockClear();
    mockResizeStart.mockClear();
  });

  it('renders header and dynamic component content', () => {
    const windowData = createWindow();
    const { getByText, getByTestId } = render(AppWindow, {
      props: {
        window: windowData,
        isActive: true,
      },
    });

    expect(getByText('测试窗口')).toBeInTheDocument();
    expect(getByTestId('window-content')).toBeInTheDocument();
  });

  it('emits close event when close button is clicked', async () => {
    const windowData = createWindow();
    const { getByTitle, emitted } = render(AppWindow, {
      props: {
        window: windowData,
        isActive: false,
      },
    });

    await fireEvent.click(getByTitle('关闭'));

    expect(emitted().close).toBeTruthy();
    expect(emitted().close[0][0]).toBe(windowData.id);
  });

  it('emits maximize event when maximize button is clicked', async () => {
    const windowData = createWindow();
    const { getByTitle, emitted } = render(AppWindow, {
      props: {
        window: windowData,
        isActive: false,
      },
    });

    await fireEvent.click(getByTitle('最大化'));

    expect(emitted().maximize).toBeTruthy();
    expect(emitted().maximize[0][0]).toBe(windowData.id);
  });

  it('emits activate when window is clicked', async () => {
    const windowData = createWindow();
    const { container, emitted } = render(AppWindow, {
      props: {
        window: windowData,
        isActive: false,
      },
    });

    const root = container.querySelector('.app-window');
    await fireEvent.pointerDown(root);

    expect(emitted().activate).toBeTruthy();
    expect(emitted().activate[0][0]).toBe(windowData.id);
  });

  it('shows fallback message when component is missing', () => {
    const windowData = createWindow({ component: null });
    const { getByText } = render(AppWindow, {
      props: {
        window: windowData,
        isActive: false,
      },
    });

    expect(getByText('未找到应用组件')).toBeInTheDocument();
  });
});
