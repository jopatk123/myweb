import { computed, ref } from 'vue';
import { fireEvent, render } from '@testing-library/vue';
import WallpaperBulkUploadModal from '@/components/wallpaper/WallpaperBulkUploadModal.vue';

const flushPromises = () => new Promise(resolve => setTimeout(resolve, 0));

const createUploaderState = () => {
  const selectedGroupId = ref('');
  const files = ref([]);
  const uploading = ref(false);
  const error = ref('');
  const overallProgress = ref(0);
  const hasFiles = computed(() => files.value.length > 0);
  return {
    selectedGroupId,
    files,
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
      '<div data-testid="preview-list">预览共 {{ items.length }} 项，{{ showProgress }}</div>',
  },
}));

describe('WallpaperBulkUploadModal', () => {
  beforeEach(() => {
    uploaderFactory.mockClear();
  });

  it('disables submit when no files selected', () => {
    uploaderFactory.mockImplementation(() => createUploaderState());
    const { getByRole } = render(WallpaperBulkUploadModal, {
      props: { groups: [] },
    });

    const submitButton = getByRole('button', { name: '开始上传' });
    expect(submitButton).toBeDisabled();
  });

  it('runs upload flow and emits uploaded', async () => {
    const state = createUploaderState();
    state.files.value = [
      {
        file: new File(['a'], 'a.jpg', { type: 'image/jpeg' }),
        name: 'a.jpg',
        progress: 0,
      },
    ];
    state.upload.mockResolvedValue();

    uploaderFactory.mockImplementation(() => state);

    const { container, emitted, getByRole } = render(WallpaperBulkUploadModal, {
      props: { groups: [] },
    });

    const submitButton = getByRole('button', { name: '开始上传' });
    expect(submitButton).not.toBeDisabled();

    const form = container.querySelector('form');
    await fireEvent.submit(form);
    await flushPromises();

    expect(state.upload).toHaveBeenCalledTimes(1);
    expect(state.reset).toHaveBeenCalledTimes(1);
    expect(emitted().uploaded).toHaveLength(1);
  });

  it('resets and closes when cancel clicked', async () => {
    const state = createUploaderState();
    uploaderFactory.mockImplementation(() => state);

    const { getByRole, emitted } = render(WallpaperBulkUploadModal, {
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

    const { getByTestId } = render(WallpaperBulkUploadModal, {
      props: { groups: [] },
    });

    const dropZone = getByTestId('dropzone');
    await fireEvent.click(dropZone);

    expect(state.handleFiles).toHaveBeenCalled();
  });
});
