import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, fireEvent } from '@testing-library/vue';
import { ref, nextTick } from 'vue';
import FileUploadProgress from '@/components/file/FileUploadProgress.vue';

describe('FileUploadProgress', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  const defaultProps = {
    progress: 50,
    uploading: true,
    uploadedBytes: 512000,
    totalBytes: 1024000,
    currentFileName: 'test-file.pdf',
    uploadQueue: [{ name: 'test-file.pdf', size: 1024000, progress: 50 }],
    error: '',
  };

  describe('visibility', () => {
    it('should show panel when uploading with progress between 0 and 100', () => {
      const { getByTestId } = render(FileUploadProgress, {
        props: defaultProps,
      });

      expect(getByTestId('upload-progress-panel')).toBeTruthy();
    });

    it('should not show panel when not uploading', () => {
      const { queryByTestId } = render(FileUploadProgress, {
        props: {
          ...defaultProps,
          uploading: false,
          progress: 0,
        },
      });

      expect(queryByTestId('upload-progress-panel')).toBeNull();
    });

    it('should not show panel when progress is 0', () => {
      const { queryByTestId } = render(FileUploadProgress, {
        props: {
          ...defaultProps,
          progress: 0,
        },
      });

      expect(queryByTestId('upload-progress-panel')).toBeNull();
    });

    it('should show panel when upload is complete (progress 100)', () => {
      const { getByTestId } = render(FileUploadProgress, {
        props: {
          ...defaultProps,
          progress: 100,
          uploading: false,
        },
      });

      expect(getByTestId('upload-progress-panel')).toBeTruthy();
    });
  });

  describe('content display', () => {
    it('should display current file name', () => {
      const { getByText } = render(FileUploadProgress, {
        props: defaultProps,
      });

      expect(getByText('test-file.pdf')).toBeTruthy();
    });

    it('should display progress percentage', () => {
      const { getByText } = render(FileUploadProgress, {
        props: defaultProps,
      });

      expect(getByText('50%')).toBeTruthy();
    });

    it('should display file size information', () => {
      const { getByText } = render(FileUploadProgress, {
        props: defaultProps,
      });

      // 512KB / 1000KB
      expect(getByText(/500.*KB.*\/.*1000.*KB/i)).toBeTruthy();
    });

    it('should display upload complete message when finished', () => {
      const { getByText } = render(FileUploadProgress, {
        props: {
          ...defaultProps,
          progress: 100,
          uploading: false,
        },
      });

      expect(getByText('上传完成')).toBeTruthy();
      expect(getByText('✓ 完成')).toBeTruthy();
    });
  });

  describe('upload queue', () => {
    it('should display queue when multiple files', () => {
      const { getByText } = render(FileUploadProgress, {
        props: {
          ...defaultProps,
          uploadQueue: [
            { name: 'file1.pdf', size: 512000, progress: 100 },
            { name: 'file2.pdf', size: 512000, progress: 50 },
            { name: 'file3.pdf', size: 512000, progress: 0 },
          ],
        },
      });

      expect(getByText('上传队列')).toBeTruthy();
      expect(getByText('1/3')).toBeTruthy();
    });

    it('should not display queue for single file', () => {
      const { queryByText } = render(FileUploadProgress, {
        props: defaultProps,
      });

      expect(queryByText('上传队列')).toBeNull();
    });

    it('should show completed count correctly', () => {
      const { getByText } = render(FileUploadProgress, {
        props: {
          ...defaultProps,
          uploadQueue: [
            { name: 'file1.pdf', size: 512000, progress: 100 },
            { name: 'file2.pdf', size: 512000, progress: 100 },
            { name: 'file3.pdf', size: 512000, progress: 50 },
          ],
        },
      });

      expect(getByText('2/3')).toBeTruthy();
    });
  });

  describe('file emoji', () => {
    it('should show correct emoji for different file types', () => {
      const testCases = [
        { fileName: 'photo.jpg', expectedEmoji: '🖼️' },
        { fileName: 'video.mp4', expectedEmoji: '🎬' },
        { fileName: 'song.mp3', expectedEmoji: '🎵' },
        { fileName: 'doc.pdf', expectedEmoji: '📕' },
        { fileName: 'script.js', expectedEmoji: '💻' },
        { fileName: 'archive.zip', expectedEmoji: '📦' },
        { fileName: 'unknown.xyz', expectedEmoji: '📄' },
      ];

      for (const { fileName, expectedEmoji } of testCases) {
        const { container } = render(FileUploadProgress, {
          props: {
            ...defaultProps,
            currentFileName: fileName,
          },
        });

        expect(container.textContent).toContain(expectedEmoji);
      }
    });
  });

  describe('close button', () => {
    it('should emit close event when close button clicked', async () => {
      const { getByTitle, emitted } = render(FileUploadProgress, {
        props: defaultProps,
      });

      const closeButton = getByTitle('关闭');
      await fireEvent.click(closeButton);

      expect(emitted().close).toBeTruthy();
    });

    it('should hide panel after close button clicked', async () => {
      const { getByTitle, queryByTestId } = render(FileUploadProgress, {
        props: defaultProps,
      });

      const closeButton = getByTitle('关闭');
      await fireEvent.click(closeButton);
      await nextTick();

      expect(queryByTestId('upload-progress-panel')).toBeNull();
    });
  });

  describe('minimize functionality', () => {
    it('should toggle minimize state when minimize button clicked', async () => {
      const { getByTitle, queryByText } = render(FileUploadProgress, {
        props: defaultProps,
      });

      // Find minimize button by title
      const minimizeButton = getByTitle('最小化');
      expect(minimizeButton).toBeTruthy();

      // Click to minimize
      await fireEvent.click(minimizeButton);
      await nextTick();

      // Progress container should be hidden
      expect(queryByText('50%')).toBeNull();

      // Click to expand
      const expandButton = getByTitle('展开');
      await fireEvent.click(expandButton);
      await nextTick();

      // Progress should be visible again
      expect(queryByText('50%')).toBeTruthy();
    });
  });

  describe('file name truncation', () => {
    it('should truncate long file names', () => {
      const longFileName =
        'this-is-a-very-long-file-name-that-should-be-truncated.pdf';
      const { container } = render(FileUploadProgress, {
        props: {
          ...defaultProps,
          currentFileName: longFileName,
        },
      });

      // Should contain ellipsis
      expect(container.textContent).toContain('...');
      // Should preserve extension
      expect(container.textContent).toContain('.pdf');
    });

    it('should not truncate short file names', () => {
      const shortFileName = 'short.pdf';
      const { getByText } = render(FileUploadProgress, {
        props: {
          ...defaultProps,
          currentFileName: shortFileName,
        },
      });

      expect(getByText(shortFileName)).toBeTruthy();
    });
  });

  describe('formatFileSize', () => {
    it('should format various file sizes correctly', () => {
      const testCases = [
        { bytes: 0, expected: '0 B' },
        { bytes: 500, expected: '500 B' },
        { bytes: 1024, expected: '1 KB' },
        { bytes: 1048576, expected: '1 MB' },
        { bytes: 1073741824, expected: '1 GB' },
      ];

      for (const { bytes, expected } of testCases) {
        const { container } = render(FileUploadProgress, {
          props: {
            ...defaultProps,
            uploadedBytes: bytes,
            totalBytes: bytes,
          },
        });

        expect(container.textContent).toContain(expected);
      }
    });
  });

  describe('header title', () => {
    it('should show "文件上传中" when uploading', () => {
      const { getByText } = render(FileUploadProgress, {
        props: defaultProps,
      });

      expect(getByText('文件上传中')).toBeTruthy();
    });

    it('should show "上传完成" when complete', () => {
      const { getByText } = render(FileUploadProgress, {
        props: {
          ...defaultProps,
          progress: 100,
          uploading: false,
        },
      });

      expect(getByText('上传完成')).toBeTruthy();
    });

    it('should show "上传失败" when there is an error', () => {
      const { getByText } = render(FileUploadProgress, {
        props: {
          ...defaultProps,
          error: '上传失败',
        },
      });

      expect(getByText('上传失败')).toBeTruthy();
    });
  });

  describe('panel resets on new upload', () => {
    it('should show panel when new upload starts', async () => {
      const props = ref({
        ...defaultProps,
        uploading: false,
        progress: 0,
      });

      const { queryByTestId, rerender } = render(FileUploadProgress, {
        props: props.value,
      });

      expect(queryByTestId('upload-progress-panel')).toBeNull();

      // Start new upload
      await rerender({
        ...defaultProps,
        uploading: true,
        progress: 10,
      });

      expect(queryByTestId('upload-progress-panel')).toBeTruthy();
    });
  });
});
