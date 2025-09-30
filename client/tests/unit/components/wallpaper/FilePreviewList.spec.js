import { render } from '@testing-library/vue';
import FilePreviewList from '@/components/wallpaper/upload/FilePreviewList.vue';

describe('FilePreviewList', () => {
  it('renders items and progress when enabled', () => {
    const items = [
      {
        name: 'sample.jpg',
        size: 1024,
        preview: 'data://sample',
        wasCompressed: false,
        progress: 55.2,
      },
    ];

    const { getByText, container } = render(FilePreviewList, {
      props: { items, showProgress: true },
    });

    expect(getByText('sample.jpg')).toBeInTheDocument();
    expect(getByText('55%')).toBeInTheDocument();
    const progressBar = container.querySelector('.progress-value');
    expect(progressBar.style.width).toBe('55%');
  });
});
