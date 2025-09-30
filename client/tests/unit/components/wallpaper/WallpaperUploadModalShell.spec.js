import { fireEvent, render } from '@testing-library/vue';
import WallpaperUploadModalShell from '@/components/wallpaper/WallpaperUploadModalShell.vue';

describe('WallpaperUploadModalShell', () => {
  const renderShell = (props = {}, slots = {}) =>
    render(WallpaperUploadModalShell, {
      props: {
        storageKey: 'wallpaper-shell-test',
        title: '测试标题',
        ...props,
      },
      slots,
    });

  it('renders title, default slot and footer slot', () => {
    const { getByText } = renderShell(
      {},
      {
        default: '<div>主体内容</div>',
        footer: '<button>底部按钮</button>',
      }
    );

    expect(getByText('测试标题')).toBeInTheDocument();
    expect(getByText('主体内容')).toBeInTheDocument();
    expect(getByText('底部按钮')).toBeInTheDocument();
  });

  it('emits close when overlay is clicked', async () => {
    const { container, emitted } = renderShell();
    const overlay = container.querySelector('.modal-overlay');
    await fireEvent.click(overlay);

    expect(emitted().close).toBeTruthy();
  });

  it('emits close when close button is clicked', async () => {
    const { getByRole, emitted } = renderShell();
    const button = getByRole('button', { name: /×/ });
    await fireEvent.click(button);

    expect(emitted().close).toBeTruthy();
  });
});
