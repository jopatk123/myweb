import { describe, it, expect } from 'vitest';
import { render, fireEvent } from '@testing-library/vue';
import AppWindowHeader from '@/components/desktop/AppWindowHeader.vue';

const defaultProps = {
  title: '测试窗口',
  maximized: false,
  active: false,
};

describe('AppWindowHeader', () => {
  it('renders title and buttons', () => {
    const { getByText, getByTitle } = render(AppWindowHeader, {
      props: defaultProps,
    });

    expect(getByText('测试窗口')).toBeInTheDocument();
    expect(getByTitle('最小化')).toBeInTheDocument();
    expect(getByTitle('最大化')).toBeInTheDocument();
    expect(getByTitle('关闭')).toBeInTheDocument();
  });

  it('emits events when control buttons are clicked', async () => {
    const { getByTitle, emitted } = render(AppWindowHeader, {
      props: defaultProps,
    });

    await fireEvent.click(getByTitle('最小化'));
    await fireEvent.click(getByTitle('最大化'));
    await fireEvent.click(getByTitle('关闭'));

    const events = emitted();
    expect(events.minimize).toBeTruthy();
    expect(events.maximize).toBeTruthy();
    expect(events.close).toBeTruthy();
  });

  it('marks header as active when active prop is true', () => {
    const { container } = render(AppWindowHeader, {
      props: {
        ...defaultProps,
        active: true,
      },
    });

    const header = container.querySelector('.window-header');
    expect(header).toHaveClass('active');
  });

  it('forwards pointer and double click events', async () => {
    const { container, emitted } = render(AppWindowHeader, {
      props: defaultProps,
    });

    const header = container.querySelector('.window-header');
    await fireEvent.pointerDown(header);
    await fireEvent.dblClick(header);

    const events = emitted();
    expect(events.pointerdown).toBeTruthy();
    expect(events.doubleclick).toBeTruthy();
  });
});
