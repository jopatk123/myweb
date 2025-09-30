import { computed, ref } from 'vue';
import { fireEvent, render } from '@testing-library/vue';
import WallpaperUploadModal from '@/components/wallpaper/WallpaperUploadModal.vue';

const flushPromises = () => new Promise(resolve => setTimeout(resolve, 0));

const createUploaderState = () => {
  const selectedGroupId = ref('');
  const files = ref([]);
  const wallpaperName = ref('');
  const uploading = ref(false);
  const error = ref('');
  const overallProgress = ref(0);
  const hasFiles = computed(() => files.value.length > 0);
  return {
    selectedGroupId,
    files,
    wallpaperName,
    uploading,
    error,
    overallProgress,
    hasFiles,
    handleFiles: vi.fn(),
    removeFile: vi.fn(),
    upload: vi.fn(),
    reset: vi.fn(),
  };
};

const uploaderFactory = vi.fn(createUploaderState);

vi.mock('@/composables/useWallpaperUploader.js', () => ({
  useWallpaperUploader: (...args) => uploaderFactory(...args),
}));

vi.mock('@/components/wallpaper/upload/FileDropzone.vue', () => ({
  default: {
    name: 'FileDropzoneStub',
    template:
      '<div data-testid="dropzone" role="button" @click="$emit(\'files-selected\', [])"><slot /></div>',
  },
}));

vi.mock('@/components/wallpaper/upload/FilePreviewList.vue', () => ({
  default: {
    name: 'FilePreviewListStub',
    props: ['items', 'showProgress'],
    template:
      '<div data-testid="preview-list">预览数量: {{ items.length }}</div>',
  },
}));

describe('WallpaperUploadModal', () => {
  beforeEach(() => {
    uploaderFactory.mockClear();
  });

  it('disables submit when no files selected', () => {
    uploaderFactory.mockImplementation(() => createUploaderState());
    const { getByRole } = render(WallpaperUploadModal, {
      props: { groups: [] },
    });

    const submitButton = getByRole('button', { name: '上传' });
    expect(submitButton).toBeDisabled();
  });

  it('triggers upload and emits uploaded event', async () => {
    const state = createUploaderState();
    state.files.value = [
      {
        file: new File(['a'], 'a.jpg', { type: 'image/jpeg' }),
        name: 'a.jpg',
        progress: 0,
      },
    ];
    state.wallpaperName.value = 'custom';
    state.upload.mockResolvedValue();

    uploaderFactory.mockImplementation(() => state);

    const { container, emitted, getByRole } = render(WallpaperUploadModal, {
      props: { groups: [] },
    });

    const submitButton = getByRole('button', { name: '上传' });
    expect(submitButton).not.toBeDisabled();

    const form = container.querySelector('form');
    await fireEvent.submit(form);
    await flushPromises();

    expect(state.upload).toHaveBeenCalledTimes(1);
    expect(state.reset).toHaveBeenCalledTimes(1);
    expect(emitted().uploaded).toHaveLength(1);
  });

  it('emits close and resets when cancel is clicked', async () => {
    const state = createUploaderState();
    uploaderFactory.mockImplementation(() => state);

    const { getByRole, emitted } = render(WallpaperUploadModal, {
      props: { groups: [] },
    });

    const cancelButton = getByRole('button', { name: '取消' });
    await fireEvent.click(cancelButton);
    await flushPromises();

    expect(state.reset).toHaveBeenCalledTimes(1);
    expect(emitted().close).toHaveLength(1);
  });

  it('forwards files-selected event to composable', async () => {
    const state = createUploaderState();
    uploaderFactory.mockImplementation(() => state);

    const { getByTestId } = render(WallpaperUploadModal, {
      props: { groups: [] },
    });

    const dropZone = getByTestId('dropzone');
    await fireEvent.click(dropZone);

    expect(state.handleFiles).toHaveBeenCalled();
  });
});
