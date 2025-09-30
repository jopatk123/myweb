import { describe, it, expect } from 'vitest';
import { render, fireEvent } from '@testing-library/vue';
import PaginationControls from '@/components/common/PaginationControls.vue';

describe('PaginationControls', () => {
  const defaultProps = {
    page: 2,
    limit: 20,
    total: 120,
    showLimit: true,
    showTotal: true,
  };

  it('renders pagination info and total count', () => {
    const { getByText } = render(PaginationControls, {
      props: defaultProps,
    });

    expect(getByText('第 2 页 / 共 6 页')).toBeInTheDocument();
    expect(getByText('共 120 条')).toBeInTheDocument();
  });

  it('emits events when navigation buttons are clicked', async () => {
    const { getByText, emitted } = render(PaginationControls, {
      props: defaultProps,
    });

    await fireEvent.click(getByText('上一页'));
    await fireEvent.click(getByText('下一页'));

    expect(emitted().prev).toBeTruthy();
    expect(emitted().next).toBeTruthy();
  });

  it('disables previous button on first page', () => {
    const { getByRole } = render(PaginationControls, {
      props: {
        ...defaultProps,
        page: 1,
      },
    });

    expect(getByRole('button', { name: '上一页' })).toBeDisabled();
  });

  it('disables next button on last page', () => {
    const { getByRole } = render(PaginationControls, {
      props: {
        ...defaultProps,
        page: 6,
      },
    });

    expect(getByRole('button', { name: '下一页' })).toBeDisabled();
  });

  it('emits limit-change when page size changes', async () => {
    const { getByDisplayValue, emitted } = render(PaginationControls, {
      props: defaultProps,
    });

    const select = getByDisplayValue('20 / 页');
    await fireEvent.update(select, '50');

    const events = emitted();
    expect(events['limit-change']).toBeTruthy();
    expect(events['limit-change'][0][0]).toBe(50);
  });
});
