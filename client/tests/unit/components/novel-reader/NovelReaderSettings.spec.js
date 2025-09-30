import { render, fireEvent, screen } from '@testing-library/vue';
import { defineComponent, ref } from 'vue';
import { describe, expect, it } from 'vitest';
import NovelReaderSettings from '@/apps/novel-reader/NovelReaderSettings.vue';
import { DEFAULT_READER_SETTINGS } from '@/apps/novel-reader/constants/settings.js';

function renderWithModel(initial = {}) {
  const settings = ref({ ...DEFAULT_READER_SETTINGS, ...initial });

  const Host = defineComponent({
    components: { NovelReaderSettings },
    setup() {
      return { settings };
    },
    template: `<NovelReaderSettings v-model:settings="settings" />`,
  });

  const utils = render(Host);
  return { settings, ...utils };
}

describe('NovelReaderSettings', () => {
  it('adjusts font size via controls', async () => {
    const { settings } = renderWithModel();

    const increase = screen.getByRole('button', { name: 'A+' });
    await fireEvent.click(increase);

    expect(settings.value.fontSize).toBe(DEFAULT_READER_SETTINGS.fontSize + 1);
  });

  it('applies preset while preserving autoMinimize', async () => {
    const { settings } = renderWithModel({ autoMinimize: true });

    const presetButton = screen.getByRole('button', { name: '夜间模式' });
    await fireEvent.click(presetButton);

    expect(settings.value.theme).toBe('dark');
    expect(settings.value.autoMinimize).toBe(true);
  });
});
