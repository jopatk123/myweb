import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render } from '@testing-library/vue';
import { markRaw, nextTick, ref } from 'vue';
import CalculatorApp from '@/apps/calculator/CalculatorApp.vue';
import AppWindow from '@/components/desktop/AppWindow.vue';

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

vi.mock('@/composables/useAppWindowResize.js', () => ({
  useAppWindowResize: vi.fn(() => ({
    onResizeStart: vi.fn(),
  })),
}));

function createCalculatorWindow() {
  return {
    id: 11,
    title: '计算器',
    appSlug: 'calculator',
    width: 620,
    height: 560,
    zIndex: 1002,
    minimized: false,
    maximized: false,
    props: {},
    component: markRaw(CalculatorApp),
    storageKey: 'window:calculator:11',
  };
}

describe('Calculator window keyboard focus', () => {
  it('focuses the calculator when its window is active so typing works', async () => {
    const { container, getByTestId } = render(AppWindow, {
      props: {
        window: createCalculatorWindow(),
        isActive: true,
      },
    });

    await nextTick();
    await nextTick();
    const appEl = container.querySelector('.calculator-app');
    expect(document.activeElement).toBe(appEl);

    await fireEvent.keyDown(appEl, { key: '7' });
    expect(getByTestId('calculator-display')).toHaveTextContent('7');
  });

  it('does not steal an outside input while inactive, then takes focus on reactivate', async () => {
    const input = document.createElement('input');
    document.body.appendChild(input);
    input.focus();

    const windowData = createCalculatorWindow();
    const { container, getByTestId, rerender } = render(AppWindow, {
      props: {
        window: windowData,
        isActive: false,
      },
    });

    await nextTick();
    expect(document.activeElement).toBe(input);
    await fireEvent.keyDown(document, { key: '9' });
    expect(getByTestId('calculator-display')).toHaveTextContent('0');

    await rerender({
      window: windowData,
      isActive: true,
    });
    await nextTick();

    const appEl = container.querySelector('.calculator-app');
    expect(appEl).toBe(document.activeElement);
    expect(document.activeElement).not.toBe(input);

    await fireEvent.keyDown(appEl, { key: '4' });
    expect(getByTestId('calculator-display')).toHaveTextContent('4');

    input.remove();
  });

  it('keeps keyboard events on the calculator root instead of document', async () => {
    const { getByTestId } = render(CalculatorApp, {
      props: { isWindowActive: false },
    });

    await fireEvent.keyDown(document.body, { key: '8' });
    expect(getByTestId('calculator-display')).toHaveTextContent('0');
  });
});
