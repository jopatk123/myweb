import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/vue';
import NotebookHeader from '@/apps/notebook/NotebookHeader.vue';

describe('notebook/NotebookHeader', () => {
  it('renders title and stat values', () => {
    const { getByText } = render(NotebookHeader, {
      props: { totalCount: 5, pendingCount: 3, completedCount: 2 },
    });

    expect(getByText('笔记本')).toBeInTheDocument();
    expect(getByText('5')).toBeInTheDocument();
    expect(getByText('3')).toBeInTheDocument();
    expect(getByText('2')).toBeInTheDocument();
  });

  it('hides the progress bar when there are no notes', () => {
    const { queryByRole } = render(NotebookHeader, {
      props: { totalCount: 0, pendingCount: 0, completedCount: 0 },
    });

    expect(queryByRole('progressbar')).toBeNull();
  });

  it('shows progress percentage for partial completion', () => {
    const { getByRole } = render(NotebookHeader, {
      props: { totalCount: 4, pendingCount: 3, completedCount: 1 },
    });

    const progress = getByRole('progressbar');
    expect(progress).toHaveAttribute('aria-valuenow', '25');
    expect(progress.querySelector('.header-progress-fill')).toHaveStyle({
      width: '25%',
    });
  });

  it('rounds the progress percentage to the nearest integer', () => {
    const { getByRole } = render(NotebookHeader, {
      props: { totalCount: 3, pendingCount: 2, completedCount: 1 },
    });

    expect(getByRole('progressbar')).toHaveAttribute('aria-valuenow', '33');
  });
});
