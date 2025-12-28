import { describe, it, expect } from 'vitest';
import {
  FILE_CATEGORIES,
  MIME_TYPE_MAP,
  EXTENSION_TYPE_MAP,
  FILE_TYPE_ICONS,
  getFileCategory,
  getFileIcon,
  getFileIconByFile,
  isPreviewable,
  formatFileSize,
  formatUploadSpeed,
  formatRemainingTime,
} from '@/constants/fileTypes.js';

describe('fileTypes constants', () => {
  describe('FILE_CATEGORIES', () => {
    it('should have all required categories', () => {
      expect(FILE_CATEGORIES.IMAGE).toBe('image');
      expect(FILE_CATEGORIES.VIDEO).toBe('video');
      expect(FILE_CATEGORIES.AUDIO).toBe('audio');
      expect(FILE_CATEGORIES.MUSIC).toBe('music');
      expect(FILE_CATEGORIES.WORD).toBe('word');
      expect(FILE_CATEGORIES.EXCEL).toBe('excel');
      expect(FILE_CATEGORIES.PPT).toBe('ppt');
      expect(FILE_CATEGORIES.PDF).toBe('pdf');
      expect(FILE_CATEGORIES.TEXT).toBe('text');
      expect(FILE_CATEGORIES.CODE).toBe('code');
      expect(FILE_CATEGORIES.ARCHIVE).toBe('archive');
      expect(FILE_CATEGORIES.NOVEL).toBe('novel');
      expect(FILE_CATEGORIES.OTHER).toBe('other');
    });
  });

  describe('MIME_TYPE_MAP', () => {
    it('should map image MIME types correctly', () => {
      expect(MIME_TYPE_MAP['image/jpeg']).toBe(FILE_CATEGORIES.IMAGE);
      expect(MIME_TYPE_MAP['image/png']).toBe(FILE_CATEGORIES.IMAGE);
      expect(MIME_TYPE_MAP['image/gif']).toBe(FILE_CATEGORIES.IMAGE);
      expect(MIME_TYPE_MAP['image/webp']).toBe(FILE_CATEGORIES.IMAGE);
      expect(MIME_TYPE_MAP['image/svg+xml']).toBe(FILE_CATEGORIES.IMAGE);
    });

    it('should map video MIME types correctly', () => {
      expect(MIME_TYPE_MAP['video/mp4']).toBe(FILE_CATEGORIES.VIDEO);
      expect(MIME_TYPE_MAP['video/webm']).toBe(FILE_CATEGORIES.VIDEO);
      expect(MIME_TYPE_MAP['video/quicktime']).toBe(FILE_CATEGORIES.VIDEO);
    });

    it('should map audio MIME types correctly', () => {
      expect(MIME_TYPE_MAP['audio/mpeg']).toBe(FILE_CATEGORIES.MUSIC);
      expect(MIME_TYPE_MAP['audio/wav']).toBe(FILE_CATEGORIES.MUSIC);
      expect(MIME_TYPE_MAP['audio/flac']).toBe(FILE_CATEGORIES.MUSIC);
    });

    it('should map document MIME types correctly', () => {
      expect(MIME_TYPE_MAP['application/pdf']).toBe(FILE_CATEGORIES.PDF);
      expect(MIME_TYPE_MAP['application/msword']).toBe(FILE_CATEGORIES.WORD);
      expect(MIME_TYPE_MAP['application/vnd.ms-excel']).toBe(
        FILE_CATEGORIES.EXCEL
      );
      expect(MIME_TYPE_MAP['application/vnd.ms-powerpoint']).toBe(
        FILE_CATEGORIES.PPT
      );
    });

    it('should map archive MIME types correctly', () => {
      expect(MIME_TYPE_MAP['application/zip']).toBe(FILE_CATEGORIES.ARCHIVE);
      expect(MIME_TYPE_MAP['application/x-rar-compressed']).toBe(
        FILE_CATEGORIES.ARCHIVE
      );
      expect(MIME_TYPE_MAP['application/x-7z-compressed']).toBe(
        FILE_CATEGORIES.ARCHIVE
      );
    });

    it('should map code MIME types correctly', () => {
      expect(MIME_TYPE_MAP['application/javascript']).toBe(
        FILE_CATEGORIES.CODE
      );
      expect(MIME_TYPE_MAP['application/json']).toBe(FILE_CATEGORIES.CODE);
      expect(MIME_TYPE_MAP['text/html']).toBe(FILE_CATEGORIES.CODE);
      expect(MIME_TYPE_MAP['text/css']).toBe(FILE_CATEGORIES.CODE);
    });
  });

  describe('EXTENSION_TYPE_MAP', () => {
    it('should map image extensions correctly', () => {
      expect(EXTENSION_TYPE_MAP['.jpg']).toBe(FILE_CATEGORIES.IMAGE);
      expect(EXTENSION_TYPE_MAP['.png']).toBe(FILE_CATEGORIES.IMAGE);
      expect(EXTENSION_TYPE_MAP['.gif']).toBe(FILE_CATEGORIES.IMAGE);
      expect(EXTENSION_TYPE_MAP['.webp']).toBe(FILE_CATEGORIES.IMAGE);
    });

    it('should map video extensions correctly', () => {
      expect(EXTENSION_TYPE_MAP['.mp4']).toBe(FILE_CATEGORIES.VIDEO);
      expect(EXTENSION_TYPE_MAP['.mov']).toBe(FILE_CATEGORIES.VIDEO);
      expect(EXTENSION_TYPE_MAP['.avi']).toBe(FILE_CATEGORIES.VIDEO);
      expect(EXTENSION_TYPE_MAP['.mkv']).toBe(FILE_CATEGORIES.VIDEO);
    });

    it('should map audio extensions correctly', () => {
      expect(EXTENSION_TYPE_MAP['.mp3']).toBe(FILE_CATEGORIES.MUSIC);
      expect(EXTENSION_TYPE_MAP['.wav']).toBe(FILE_CATEGORIES.MUSIC);
      expect(EXTENSION_TYPE_MAP['.flac']).toBe(FILE_CATEGORIES.MUSIC);
    });

    it('should map document extensions correctly', () => {
      expect(EXTENSION_TYPE_MAP['.pdf']).toBe(FILE_CATEGORIES.PDF);
      expect(EXTENSION_TYPE_MAP['.doc']).toBe(FILE_CATEGORIES.WORD);
      expect(EXTENSION_TYPE_MAP['.docx']).toBe(FILE_CATEGORIES.WORD);
      expect(EXTENSION_TYPE_MAP['.xls']).toBe(FILE_CATEGORIES.EXCEL);
      expect(EXTENSION_TYPE_MAP['.xlsx']).toBe(FILE_CATEGORIES.EXCEL);
      expect(EXTENSION_TYPE_MAP['.ppt']).toBe(FILE_CATEGORIES.PPT);
      expect(EXTENSION_TYPE_MAP['.pptx']).toBe(FILE_CATEGORIES.PPT);
    });

    it('should map code extensions correctly', () => {
      expect(EXTENSION_TYPE_MAP['.js']).toBe(FILE_CATEGORIES.CODE);
      expect(EXTENSION_TYPE_MAP['.ts']).toBe(FILE_CATEGORIES.CODE);
      expect(EXTENSION_TYPE_MAP['.vue']).toBe(FILE_CATEGORIES.CODE);
      expect(EXTENSION_TYPE_MAP['.py']).toBe(FILE_CATEGORIES.CODE);
      expect(EXTENSION_TYPE_MAP['.java']).toBe(FILE_CATEGORIES.CODE);
    });

    it('should map archive extensions correctly', () => {
      expect(EXTENSION_TYPE_MAP['.zip']).toBe(FILE_CATEGORIES.ARCHIVE);
      expect(EXTENSION_TYPE_MAP['.rar']).toBe(FILE_CATEGORIES.ARCHIVE);
      expect(EXTENSION_TYPE_MAP['.7z']).toBe(FILE_CATEGORIES.ARCHIVE);
      expect(EXTENSION_TYPE_MAP['.tar']).toBe(FILE_CATEGORIES.ARCHIVE);
    });

    it('should map novel extensions correctly', () => {
      expect(EXTENSION_TYPE_MAP['.epub']).toBe(FILE_CATEGORIES.NOVEL);
      expect(EXTENSION_TYPE_MAP['.mobi']).toBe(FILE_CATEGORIES.NOVEL);
    });
  });

  describe('FILE_TYPE_ICONS', () => {
    it('should have icons for all categories', () => {
      expect(FILE_TYPE_ICONS[FILE_CATEGORIES.IMAGE]).toBe(
        '/apps/icons/image-128.svg'
      );
      expect(FILE_TYPE_ICONS[FILE_CATEGORIES.VIDEO]).toBe(
        '/apps/icons/video-128.svg'
      );
      expect(FILE_TYPE_ICONS[FILE_CATEGORIES.PDF]).toBe(
        '/apps/icons/pdf-128.svg'
      );
      expect(FILE_TYPE_ICONS[FILE_CATEGORIES.OTHER]).toBe(
        '/apps/icons/file-128.svg'
      );
    });
  });
});

describe('getFileCategory', () => {
  it('should return category based on MIME type', () => {
    expect(getFileCategory('image/jpeg')).toBe(FILE_CATEGORIES.IMAGE);
    expect(getFileCategory('video/mp4')).toBe(FILE_CATEGORIES.VIDEO);
    expect(getFileCategory('audio/mpeg')).toBe(FILE_CATEGORIES.MUSIC);
    expect(getFileCategory('application/pdf')).toBe(FILE_CATEGORIES.PDF);
  });

  it('should handle case-insensitive MIME types', () => {
    expect(getFileCategory('IMAGE/JPEG')).toBe(FILE_CATEGORIES.IMAGE);
    expect(getFileCategory('Video/MP4')).toBe(FILE_CATEGORIES.VIDEO);
  });

  it('should use generic MIME type prefix fallback', () => {
    expect(getFileCategory('image/unknown')).toBe(FILE_CATEGORIES.IMAGE);
    expect(getFileCategory('video/unknown')).toBe(FILE_CATEGORIES.VIDEO);
    expect(getFileCategory('audio/unknown')).toBe(FILE_CATEGORIES.MUSIC);
    expect(getFileCategory('text/unknown')).toBe(FILE_CATEGORIES.TEXT);
  });

  it('should fallback to extension when MIME type is unknown', () => {
    expect(getFileCategory('application/octet-stream', 'test.pdf')).toBe(
      FILE_CATEGORIES.PDF
    );
    expect(getFileCategory('application/octet-stream', 'test.jpg')).toBe(
      FILE_CATEGORIES.IMAGE
    );
    expect(getFileCategory('', 'script.js')).toBe(FILE_CATEGORIES.CODE);
  });

  it('should return OTHER for unknown types', () => {
    expect(getFileCategory('application/unknown', 'file.xyz')).toBe(
      FILE_CATEGORIES.OTHER
    );
    expect(getFileCategory('')).toBe(FILE_CATEGORIES.OTHER);
    expect(getFileCategory(null)).toBe(FILE_CATEGORIES.OTHER);
    expect(getFileCategory(undefined)).toBe(FILE_CATEGORIES.OTHER);
  });

  it('should handle files without extensions', () => {
    expect(getFileCategory('', 'Makefile')).toBe(FILE_CATEGORIES.OTHER);
    expect(getFileCategory('', 'README')).toBe(FILE_CATEGORIES.OTHER);
  });
});

describe('getFileIcon', () => {
  it('should return correct icon for category', () => {
    expect(getFileIcon(FILE_CATEGORIES.IMAGE)).toBe(
      '/apps/icons/image-128.svg'
    );
    expect(getFileIcon(FILE_CATEGORIES.PDF)).toBe('/apps/icons/pdf-128.svg');
    expect(getFileIcon(FILE_CATEGORIES.CODE)).toBe('/apps/icons/code-128.svg');
  });

  it('should return default icon for unknown category', () => {
    expect(getFileIcon('unknown')).toBe('/apps/icons/file-128.svg');
    expect(getFileIcon(null)).toBe('/apps/icons/file-128.svg');
    expect(getFileIcon(undefined)).toBe('/apps/icons/file-128.svg');
  });
});

describe('getFileIconByFile', () => {
  it('should return icon based on MIME type and filename', () => {
    expect(getFileIconByFile('image/jpeg', 'photo.jpg')).toBe(
      '/apps/icons/image-128.svg'
    );
    expect(getFileIconByFile('application/pdf', 'doc.pdf')).toBe(
      '/apps/icons/pdf-128.svg'
    );
    expect(getFileIconByFile('', 'script.js')).toBe('/apps/icons/code-128.svg');
  });
});

describe('isPreviewable', () => {
  it('should return true for previewable categories', () => {
    expect(isPreviewable(FILE_CATEGORIES.IMAGE)).toBe(true);
    expect(isPreviewable(FILE_CATEGORIES.VIDEO)).toBe(true);
    expect(isPreviewable(FILE_CATEGORIES.WORD)).toBe(true);
    expect(isPreviewable(FILE_CATEGORIES.EXCEL)).toBe(true);
    expect(isPreviewable(FILE_CATEGORIES.PDF)).toBe(true);
    expect(isPreviewable(FILE_CATEGORIES.TEXT)).toBe(true);
    expect(isPreviewable(FILE_CATEGORIES.CODE)).toBe(true);
  });

  it('should return false for non-previewable categories', () => {
    expect(isPreviewable(FILE_CATEGORIES.ARCHIVE)).toBe(false);
    expect(isPreviewable(FILE_CATEGORIES.MUSIC)).toBe(false);
    expect(isPreviewable(FILE_CATEGORIES.OTHER)).toBe(false);
  });
});

describe('formatFileSize', () => {
  it('should format bytes correctly', () => {
    expect(formatFileSize(0)).toBe('0 B');
    expect(formatFileSize(500)).toBe('500 B');
    expect(formatFileSize(1024)).toBe('1 KB');
    expect(formatFileSize(1536)).toBe('1.5 KB');
    expect(formatFileSize(1048576)).toBe('1 MB');
    expect(formatFileSize(1073741824)).toBe('1 GB');
  });

  it('should handle negative and invalid values', () => {
    expect(formatFileSize(-1)).toBe('0 B');
    expect(formatFileSize(null)).toBe('0 B');
    expect(formatFileSize(undefined)).toBe('0 B');
  });

  it('should respect decimal places', () => {
    expect(formatFileSize(1536, 2)).toBe('1.5 KB');
    expect(formatFileSize(1600, 0)).toBe('2 KB');
  });
});

describe('formatUploadSpeed', () => {
  it('should format speed correctly', () => {
    expect(formatUploadSpeed(0)).toBe('');
    expect(formatUploadSpeed(500)).toBe('500 B/s');
    expect(formatUploadSpeed(1024)).toBe('1 KB/s');
    expect(formatUploadSpeed(1048576)).toBe('1 MB/s');
  });

  it('should handle invalid values', () => {
    expect(formatUploadSpeed(Infinity)).toBe('');
    expect(formatUploadSpeed(NaN)).toBe('');
  });
});

describe('formatRemainingTime', () => {
  it('should format seconds correctly', () => {
    expect(formatRemainingTime(30)).toBe('30秒');
    expect(formatRemainingTime(59)).toBe('59秒');
  });

  it('should format minutes correctly', () => {
    expect(formatRemainingTime(60)).toBe('1分');
    expect(formatRemainingTime(90)).toBe('1分30秒');
    expect(formatRemainingTime(120)).toBe('2分');
  });

  it('should format hours correctly', () => {
    expect(formatRemainingTime(3600)).toBe('1时');
    expect(formatRemainingTime(3660)).toBe('1时1分');
    expect(formatRemainingTime(7200)).toBe('2时');
  });

  it('should handle invalid values', () => {
    expect(formatRemainingTime(0)).toBe('');
    expect(formatRemainingTime(-1)).toBe('');
    expect(formatRemainingTime(null)).toBe('');
    expect(formatRemainingTime(undefined)).toBe('');
    expect(formatRemainingTime(Infinity)).toBe('');
  });
});
