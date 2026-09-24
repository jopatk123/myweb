import { describe, it, expect } from 'vitest';
import { render, fireEvent } from '@testing-library/vue';
import FloatingControls from '@/components/common/FloatingControls.vue';

describe('common/FloatingControls', () => {
  it('emits random and message from the floating buttons', async () => {
    const { getByLabelText, emitted } = render(FloatingControls);

    await fireEvent.click(getByLabelText('随机切换壁纸'));
    await fireEvent.click(getByLabelText('打开留言板'));

    expect(emitted().random).toHaveLength(1);
    expect(emitted().message).toHaveLength(1);
  });

  it('links to the admin area in a new tab', () => {
    const { getByLabelText } = render(FloatingControls);
    const link = getByLabelText('在新标签页打开管理后台');

    expect(link.getAttribute('href')).toBe('/wallpapers');
    expect(link.getAttribute('target')).toBe('_blank');
    expect(link.getAttribute('rel')).toContain('noopener');
  });
});
