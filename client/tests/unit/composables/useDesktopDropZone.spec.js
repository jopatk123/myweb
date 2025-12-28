import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useDesktopDropZone } from '@/composables/useDesktopDropZone.js';
import { UPLOAD_SIZE_LIMITS } from '@/constants/fileTypes.js';

describe('useDesktopDropZone', () => {
  let mockUpload;
  let mockOnError;

  beforeEach(() => {
    mockUpload = vi.fn().mockResolvedValue({});
    mockOnError = vi.fn();
  });

  describe('initialization', () => {
    it('should initialize with default values', () => {
      const { dragOver, uploading, lastError } = useDesktopDropZone({
        upload: mockUpload,
      });

      expect(dragOver.value).toBe(false);
      expect(uploading.value).toBe(false);
      expect(lastError.value).toBe(null);
    });

    it('should use default max file size', () => {
      const { MAX_DESKTOP_UPLOAD_SIZE } = useDesktopDropZone({
        upload: mockUpload,
      });

      expect(MAX_DESKTOP_UPLOAD_SIZE).toBe(UPLOAD_SIZE_LIMITS.DEFAULT);
    });

    it('should use custom max file size when provided', () => {
      const customSize = 500 * 1024 * 1024; // 500MB
      const { MAX_DESKTOP_UPLOAD_SIZE } = useDesktopDropZone({
        upload: mockUpload,
        maxFileSize: customSize,
      });

      expect(MAX_DESKTOP_UPLOAD_SIZE).toBe(customSize);
    });
  });

  describe('onDragOver', () => {
    it('should set dragOver to true', () => {
      const { dragOver, onDragOver } = useDesktopDropZone({
        upload: mockUpload,
      });

      expect(dragOver.value).toBe(false);
      onDragOver();
      expect(dragOver.value).toBe(true);
    });

    it('should call preventDefault on event', () => {
      const { onDragOver } = useDesktopDropZone({
        upload: mockUpload,
      });

      const mockEvent = { preventDefault: vi.fn() };
      onDragOver(mockEvent);
      expect(mockEvent.preventDefault).toHaveBeenCalled();
    });
  });

  describe('onDragLeave', () => {
    it('should set dragOver to false', () => {
      const { dragOver, onDragOver, onDragLeave } = useDesktopDropZone({
        upload: mockUpload,
      });

      onDragOver();
      expect(dragOver.value).toBe(true);
      onDragLeave();
      expect(dragOver.value).toBe(false);
    });

    it('should not set dragOver to false if leaving to a child element', () => {
      const { dragOver, onDragOver, onDragLeave } = useDesktopDropZone({
        upload: mockUpload,
      });

      onDragOver();

      const parent = document.createElement('div');
      const child = document.createElement('div');
      parent.appendChild(child);

      const mockEvent = {
        relatedTarget: child,
        currentTarget: parent,
      };

      onDragLeave(mockEvent);
      expect(dragOver.value).toBe(true);
    });
  });

  describe('onDrop', () => {
    it('should set dragOver to false on drop', async () => {
      const { dragOver, onDragOver, onDrop } = useDesktopDropZone({
        upload: mockUpload,
      });

      onDragOver();
      expect(dragOver.value).toBe(true);

      const file = new File(['test'], 'test.txt', { type: 'text/plain' });
      const mockEvent = {
        dataTransfer: { files: [file] },
      };

      await onDrop(mockEvent);
      expect(dragOver.value).toBe(false);
    });

    it('should call upload with valid files', async () => {
      const { onDrop } = useDesktopDropZone({
        upload: mockUpload,
      });

      const file = new File(['test'], 'test.txt', { type: 'text/plain' });
      const mockEvent = {
        dataTransfer: { files: [file] },
      };

      await onDrop(mockEvent);
      expect(mockUpload).toHaveBeenCalledWith([file]);
    });

    it('should not call upload when no files are dropped', async () => {
      const { onDrop } = useDesktopDropZone({
        upload: mockUpload,
      });

      const mockEvent = {
        dataTransfer: { files: [] },
      };

      await onDrop(mockEvent);
      expect(mockUpload).not.toHaveBeenCalled();
    });

    it('should not call upload when upload function is not provided', async () => {
      const { onDrop } = useDesktopDropZone({});

      const file = new File(['test'], 'test.txt', { type: 'text/plain' });
      const mockEvent = {
        dataTransfer: { files: [file] },
      };

      await onDrop(mockEvent);
      // Should not throw
    });

    it('should handle null event gracefully', async () => {
      const { onDrop } = useDesktopDropZone({
        upload: mockUpload,
      });

      await onDrop(null);
      expect(mockUpload).not.toHaveBeenCalled();
    });

    it('should handle undefined dataTransfer gracefully', async () => {
      const { onDrop } = useDesktopDropZone({
        upload: mockUpload,
      });

      await onDrop({});
      expect(mockUpload).not.toHaveBeenCalled();
    });
  });

  describe('file validation', () => {
    it('should reject files exceeding max size', async () => {
      const { onDrop, lastError } = useDesktopDropZone({
        upload: mockUpload,
        onError: mockOnError,
        maxFileSize: 100, // 100 bytes
      });

      // Create a file larger than 100 bytes
      const largeFile = new File(['a'.repeat(200)], 'large.txt', {
        type: 'text/plain',
      });
      const mockEvent = {
        dataTransfer: { files: [largeFile] },
      };

      await onDrop(mockEvent);

      expect(mockOnError).toHaveBeenCalled();
      expect(lastError.value).not.toBe(null);
      expect(lastError.value.code).toBe('DESKTOP_UPLOAD_VALIDATION_ERROR');
    });

    it('should reject files with invalid names', async () => {
      const { onDrop, lastError } = useDesktopDropZone({
        upload: mockUpload,
        onError: mockOnError,
      });

      // Create a file with empty name
      const invalidFile = new File(['test'], '', { type: 'text/plain' });
      const mockEvent = {
        dataTransfer: { files: [invalidFile] },
      };

      await onDrop(mockEvent);

      expect(mockOnError).toHaveBeenCalled();
      expect(lastError.value).not.toBe(null);
    });

    it('should allow valid files while rejecting invalid ones', async () => {
      const { onDrop } = useDesktopDropZone({
        upload: mockUpload,
        onError: mockOnError,
        maxFileSize: 100,
      });

      const validFile = new File(['test'], 'valid.txt', { type: 'text/plain' });
      const largeFile = new File(['a'.repeat(200)], 'large.txt', {
        type: 'text/plain',
      });
      const mockEvent = {
        dataTransfer: { files: [validFile, largeFile] },
      };

      await onDrop(mockEvent);

      // Should still upload the valid file
      expect(mockUpload).toHaveBeenCalledWith([validFile]);
    });
  });

  describe('validateFiles', () => {
    it('should return valid files and errors', () => {
      const { validateFiles } = useDesktopDropZone({
        upload: mockUpload,
        maxFileSize: 100,
      });

      const validFile = new File(['test'], 'valid.txt', { type: 'text/plain' });
      const largeFile = new File(['a'.repeat(200)], 'large.txt', {
        type: 'text/plain',
      });

      const result = validateFiles([validFile, largeFile]);

      expect(result.valid).toHaveLength(1);
      expect(result.valid[0]).toBe(validFile);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]).toContain('large.txt');
    });
  });

  describe('error handling', () => {
    it('should call onError callback on upload failure', async () => {
      const uploadError = new Error('Upload failed');
      mockUpload.mockRejectedValue(uploadError);

      const { onDrop, lastError } = useDesktopDropZone({
        upload: mockUpload,
        onError: mockOnError,
      });

      const file = new File(['test'], 'test.txt', { type: 'text/plain' });
      const mockEvent = {
        dataTransfer: { files: [file] },
      };

      await onDrop(mockEvent);

      expect(mockOnError).toHaveBeenCalledWith(uploadError);
      expect(lastError.value).toBe(uploadError);
    });

    it('should log warning when onError is not provided', async () => {
      const uploadError = new Error('Upload failed');
      mockUpload.mockRejectedValue(uploadError);
      const consoleWarn = vi
        .spyOn(console, 'warn')
        .mockImplementation(() => {});

      const { onDrop } = useDesktopDropZone({
        upload: mockUpload,
      });

      const file = new File(['test'], 'test.txt', { type: 'text/plain' });
      const mockEvent = {
        dataTransfer: { files: [file] },
      };

      await onDrop(mockEvent);

      expect(consoleWarn).toHaveBeenCalled();
      consoleWarn.mockRestore();
    });
  });

  describe('uploading state', () => {
    it('should set uploading to true during upload', async () => {
      let resolveUpload;
      mockUpload.mockImplementation(
        () =>
          new Promise(resolve => {
            resolveUpload = resolve;
          })
      );

      const { onDrop, uploading } = useDesktopDropZone({
        upload: mockUpload,
      });

      const file = new File(['test'], 'test.txt', { type: 'text/plain' });
      const mockEvent = {
        dataTransfer: { files: [file] },
      };

      const dropPromise = onDrop(mockEvent);
      expect(uploading.value).toBe(true);

      resolveUpload();
      await dropPromise;
      expect(uploading.value).toBe(false);
    });

    it('should set uploading to false after upload error', async () => {
      mockUpload.mockRejectedValue(new Error('Upload failed'));

      const { onDrop, uploading } = useDesktopDropZone({
        upload: mockUpload,
        onError: mockOnError,
      });

      const file = new File(['test'], 'test.txt', { type: 'text/plain' });
      const mockEvent = {
        dataTransfer: { files: [file] },
      };

      await onDrop(mockEvent);
      expect(uploading.value).toBe(false);
    });
  });

  describe('reset', () => {
    it('should reset all state', async () => {
      mockUpload.mockRejectedValue(new Error('Upload failed'));

      const { onDragOver, onDrop, reset, dragOver, uploading, lastError } =
        useDesktopDropZone({
          upload: mockUpload,
          onError: mockOnError,
        });

      onDragOver();
      const file = new File(['test'], 'test.txt', { type: 'text/plain' });
      await onDrop({ dataTransfer: { files: [file] } });

      expect(lastError.value).not.toBe(null);

      reset();

      expect(dragOver.value).toBe(false);
      expect(uploading.value).toBe(false);
      expect(lastError.value).toBe(null);
    });
  });

  describe('multiple files', () => {
    it('should handle multiple files', async () => {
      const { onDrop } = useDesktopDropZone({
        upload: mockUpload,
      });

      const file1 = new File(['test1'], 'test1.txt', { type: 'text/plain' });
      const file2 = new File(['test2'], 'test2.txt', { type: 'text/plain' });
      const mockEvent = {
        dataTransfer: { files: [file1, file2] },
      };

      await onDrop(mockEvent);
      expect(mockUpload).toHaveBeenCalledWith([file1, file2]);
    });
  });
});
