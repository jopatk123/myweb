import { describe, it, expect, vi } from 'vitest';
import { render, fireEvent } from '@testing-library/vue';
import LoadMoreButton from '@/apps/notebook/LoadMoreButton.vue';

describe('notebook/LoadMoreButton', () => {
  const onLoadMore = vi.fn();

  it('renders nothing when hidden', () => {
    const { container } = render(LoadMoreButton, {
      props: { show: false, remainingCount: 3, onLoadMore },
    });

    expect(container.querySelector('.load-more')).toBeNull();
  });

  it('shows the remaining count and calls onLoadMore on click', async () => {
    const { getByRole } = render(LoadMoreButton, {
      props: { show: true, remainingCount: 12, onLoadMore },
    });

    const button = getByRole('button');
    expect(button).toHaveTextContent('加载更多 (12 条)');
    await fireEvent.click(button);
    expect(onLoadMore).toHaveBeenCalledTimes(1);
  });
});
