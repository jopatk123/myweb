import { describe, it, expect, vi } from 'vitest';
import { render } from '@testing-library/vue';
import NotebookIcon from '@/apps/notebook/NotebookIcon.vue';

const ICON_PATH_COUNTS = {
  check: 1,
  circle: 1,
  pencil: 1,
  trash: 5,
  plus: 2,
  compact: 3,
  detailed: 2,
  clearDone: 2,
};

describe('notebook/NotebookIcon', () => {
  it.each(Object.entries(ICON_PATH_COUNTS))(
    'renders %s with %i paths',
    (name, expectedCount) => {
      const { container } = render(NotebookIcon, {
        props: { name, size: 18 },
      });

      const svg = container.querySelector('svg');
      expect(svg).not.toBeNull();
      expect(container.querySelectorAll('path')).toHaveLength(expectedCount);
      expect(svg).toHaveAttribute('width', '18');
      expect(svg).toHaveAttribute('height', '18');
    }
  );

  it('accepts string sizes', () => {
    const { container } = render(NotebookIcon, {
      props: { name: 'plus', size: '24' },
    });

    expect(container.querySelector('svg')).toHaveAttribute('width', '24');
  });

  it('falls back to no paths for unknown icon names', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const { container } = render(NotebookIcon, {
      props: { name: 'unknown-icon' },
    });

    expect(container.querySelector('svg')).not.toBeNull();
    expect(container.querySelectorAll('path')).toHaveLength(0);
    warnSpy.mockRestore();
  });
});
