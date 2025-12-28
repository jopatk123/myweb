import {
  detectTypeCategory,
  FILE_CATEGORIES,
  MIME_TYPE_MAP,
  EXTENSION_TYPE_MAP,
} from '../src/services/file.service.js';

describe('file.service - detectTypeCategory', () => {
  describe('MIME type detection', () => {
    it('should detect image types by MIME', () => {
      expect(detectTypeCategory('image/jpeg')).toBe(FILE_CATEGORIES.IMAGE);
      expect(detectTypeCategory('image/png')).toBe(FILE_CATEGORIES.IMAGE);
      expect(detectTypeCategory('image/gif')).toBe(FILE_CATEGORIES.IMAGE);
      expect(detectTypeCategory('image/webp')).toBe(FILE_CATEGORIES.IMAGE);
      expect(detectTypeCategory('image/svg+xml')).toBe(FILE_CATEGORIES.IMAGE);
      expect(detectTypeCategory('image/bmp')).toBe(FILE_CATEGORIES.IMAGE);
      expect(detectTypeCategory('image/heic')).toBe(FILE_CATEGORIES.IMAGE);
      expect(detectTypeCategory('image/avif')).toBe(FILE_CATEGORIES.IMAGE);
    });

    it('should detect video types by MIME', () => {
      expect(detectTypeCategory('video/mp4')).toBe(FILE_CATEGORIES.VIDEO);
      expect(detectTypeCategory('video/webm')).toBe(FILE_CATEGORIES.VIDEO);
      expect(detectTypeCategory('video/quicktime')).toBe(FILE_CATEGORIES.VIDEO);
      expect(detectTypeCategory('video/x-msvideo')).toBe(FILE_CATEGORIES.VIDEO);
      expect(detectTypeCategory('video/x-matroska')).toBe(
        FILE_CATEGORIES.VIDEO
      );
    });

    it('should detect audio/music types by MIME', () => {
      expect(detectTypeCategory('audio/mpeg')).toBe(FILE_CATEGORIES.MUSIC);
      expect(detectTypeCategory('audio/wav')).toBe(FILE_CATEGORIES.MUSIC);
      expect(detectTypeCategory('audio/flac')).toBe(FILE_CATEGORIES.MUSIC);
      expect(detectTypeCategory('audio/aac')).toBe(FILE_CATEGORIES.MUSIC);
      expect(detectTypeCategory('audio/ogg')).toBe(FILE_CATEGORIES.MUSIC);
      expect(detectTypeCategory('audio/m4a')).toBe(FILE_CATEGORIES.MUSIC);
      expect(detectTypeCategory('audio/midi')).toBe(FILE_CATEGORIES.AUDIO);
    });

    it('should detect Word document types by MIME', () => {
      expect(detectTypeCategory('application/msword')).toBe(
        FILE_CATEGORIES.WORD
      );
      expect(
        detectTypeCategory(
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
        )
      ).toBe(FILE_CATEGORIES.WORD);
    });

    it('should detect Excel types by MIME', () => {
      expect(detectTypeCategory('application/vnd.ms-excel')).toBe(
        FILE_CATEGORIES.EXCEL
      );
      expect(
        detectTypeCategory(
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        )
      ).toBe(FILE_CATEGORIES.EXCEL);
      expect(detectTypeCategory('text/csv')).toBe(FILE_CATEGORIES.EXCEL);
    });

    it('should detect PPT types by MIME', () => {
      expect(detectTypeCategory('application/vnd.ms-powerpoint')).toBe(
        FILE_CATEGORIES.PPT
      );
      expect(
        detectTypeCategory(
          'application/vnd.openxmlformats-officedocument.presentationml.presentation'
        )
      ).toBe(FILE_CATEGORIES.PPT);
    });

    it('should detect PDF types by MIME', () => {
      expect(detectTypeCategory('application/pdf')).toBe(FILE_CATEGORIES.PDF);
    });

    it('should detect text types by MIME', () => {
      expect(detectTypeCategory('text/plain')).toBe(FILE_CATEGORIES.TEXT);
      expect(detectTypeCategory('text/markdown')).toBe(FILE_CATEGORIES.TEXT);
      expect(detectTypeCategory('text/rtf')).toBe(FILE_CATEGORIES.TEXT);
    });

    it('should detect code types by MIME', () => {
      expect(detectTypeCategory('text/html')).toBe(FILE_CATEGORIES.CODE);
      expect(detectTypeCategory('text/css')).toBe(FILE_CATEGORIES.CODE);
      expect(detectTypeCategory('text/javascript')).toBe(FILE_CATEGORIES.CODE);
      expect(detectTypeCategory('application/javascript')).toBe(
        FILE_CATEGORIES.CODE
      );
      expect(detectTypeCategory('application/json')).toBe(FILE_CATEGORIES.CODE);
      expect(detectTypeCategory('application/xml')).toBe(FILE_CATEGORIES.CODE);
    });

    it('should detect archive types by MIME', () => {
      expect(detectTypeCategory('application/zip')).toBe(
        FILE_CATEGORIES.ARCHIVE
      );
      expect(detectTypeCategory('application/x-rar-compressed')).toBe(
        FILE_CATEGORIES.ARCHIVE
      );
      expect(detectTypeCategory('application/x-7z-compressed')).toBe(
        FILE_CATEGORIES.ARCHIVE
      );
      expect(detectTypeCategory('application/gzip')).toBe(
        FILE_CATEGORIES.ARCHIVE
      );
      expect(detectTypeCategory('application/x-tar')).toBe(
        FILE_CATEGORIES.ARCHIVE
      );
    });
  });

  describe('extension fallback detection', () => {
    it('should detect image types by extension', () => {
      expect(detectTypeCategory('', 'photo.jpg')).toBe(FILE_CATEGORIES.IMAGE);
      expect(detectTypeCategory('', 'photo.jpeg')).toBe(FILE_CATEGORIES.IMAGE);
      expect(detectTypeCategory('', 'photo.png')).toBe(FILE_CATEGORIES.IMAGE);
      expect(detectTypeCategory('', 'photo.gif')).toBe(FILE_CATEGORIES.IMAGE);
      expect(detectTypeCategory('', 'photo.webp')).toBe(FILE_CATEGORIES.IMAGE);
      expect(detectTypeCategory('', 'photo.heic')).toBe(FILE_CATEGORIES.IMAGE);
    });

    it('should detect video types by extension', () => {
      expect(detectTypeCategory('', 'video.mp4')).toBe(FILE_CATEGORIES.VIDEO);
      expect(detectTypeCategory('', 'video.mov')).toBe(FILE_CATEGORIES.VIDEO);
      expect(detectTypeCategory('', 'video.avi')).toBe(FILE_CATEGORIES.VIDEO);
      expect(detectTypeCategory('', 'video.mkv')).toBe(FILE_CATEGORIES.VIDEO);
      expect(detectTypeCategory('', 'video.webm')).toBe(FILE_CATEGORIES.VIDEO);
    });

    it('should detect music types by extension', () => {
      expect(detectTypeCategory('', 'song.mp3')).toBe(FILE_CATEGORIES.MUSIC);
      expect(detectTypeCategory('', 'song.wav')).toBe(FILE_CATEGORIES.MUSIC);
      expect(detectTypeCategory('', 'song.flac')).toBe(FILE_CATEGORIES.MUSIC);
      expect(detectTypeCategory('', 'song.aac')).toBe(FILE_CATEGORIES.MUSIC);
      expect(detectTypeCategory('', 'song.m4a')).toBe(FILE_CATEGORIES.MUSIC);
      expect(detectTypeCategory('', 'song.ogg')).toBe(FILE_CATEGORIES.MUSIC);
    });

    it('should detect document types by extension', () => {
      expect(detectTypeCategory('', 'doc.pdf')).toBe(FILE_CATEGORIES.PDF);
      expect(detectTypeCategory('', 'doc.doc')).toBe(FILE_CATEGORIES.WORD);
      expect(detectTypeCategory('', 'doc.docx')).toBe(FILE_CATEGORIES.WORD);
      expect(detectTypeCategory('', 'sheet.xls')).toBe(FILE_CATEGORIES.EXCEL);
      expect(detectTypeCategory('', 'sheet.xlsx')).toBe(FILE_CATEGORIES.EXCEL);
      expect(detectTypeCategory('', 'sheet.csv')).toBe(FILE_CATEGORIES.EXCEL);
      expect(detectTypeCategory('', 'slides.ppt')).toBe(FILE_CATEGORIES.PPT);
      expect(detectTypeCategory('', 'slides.pptx')).toBe(FILE_CATEGORIES.PPT);
    });

    it('should detect text types by extension', () => {
      expect(detectTypeCategory('', 'readme.txt')).toBe(FILE_CATEGORIES.TEXT);
      expect(detectTypeCategory('', 'README.md')).toBe(FILE_CATEGORIES.TEXT);
      expect(detectTypeCategory('', 'notes.rtf')).toBe(FILE_CATEGORIES.TEXT);
      expect(detectTypeCategory('', 'server.log')).toBe(FILE_CATEGORIES.TEXT);
    });

    it('should detect code types by extension', () => {
      expect(detectTypeCategory('', 'script.js')).toBe(FILE_CATEGORIES.CODE);
      expect(detectTypeCategory('', 'script.ts')).toBe(FILE_CATEGORIES.CODE);
      expect(detectTypeCategory('', 'app.vue')).toBe(FILE_CATEGORIES.CODE);
      expect(detectTypeCategory('', 'main.py')).toBe(FILE_CATEGORIES.CODE);
      expect(detectTypeCategory('', 'Main.java')).toBe(FILE_CATEGORIES.CODE);
      expect(detectTypeCategory('', 'main.go')).toBe(FILE_CATEGORIES.CODE);
      expect(detectTypeCategory('', 'main.rs')).toBe(FILE_CATEGORIES.CODE);
      expect(detectTypeCategory('', 'index.html')).toBe(FILE_CATEGORIES.CODE);
      expect(detectTypeCategory('', 'style.css')).toBe(FILE_CATEGORIES.CODE);
      expect(detectTypeCategory('', 'style.scss')).toBe(FILE_CATEGORIES.CODE);
      expect(detectTypeCategory('', 'config.json')).toBe(FILE_CATEGORIES.CODE);
      expect(detectTypeCategory('', 'config.yaml')).toBe(FILE_CATEGORIES.CODE);
      expect(detectTypeCategory('', 'query.sql')).toBe(FILE_CATEGORIES.CODE);
    });

    it('should detect archive types by extension', () => {
      expect(detectTypeCategory('', 'archive.zip')).toBe(
        FILE_CATEGORIES.ARCHIVE
      );
      expect(detectTypeCategory('', 'archive.rar')).toBe(
        FILE_CATEGORIES.ARCHIVE
      );
      expect(detectTypeCategory('', 'archive.7z')).toBe(
        FILE_CATEGORIES.ARCHIVE
      );
      expect(detectTypeCategory('', 'archive.tar')).toBe(
        FILE_CATEGORIES.ARCHIVE
      );
      expect(detectTypeCategory('', 'archive.gz')).toBe(
        FILE_CATEGORIES.ARCHIVE
      );
    });

    it('should detect novel types by extension', () => {
      expect(detectTypeCategory('', 'book.epub')).toBe(FILE_CATEGORIES.NOVEL);
      expect(detectTypeCategory('', 'book.mobi')).toBe(FILE_CATEGORIES.NOVEL);
      expect(detectTypeCategory('', 'book.azw3')).toBe(FILE_CATEGORIES.NOVEL);
    });
  });

  describe('case insensitivity', () => {
    it('should handle uppercase MIME types', () => {
      expect(detectTypeCategory('IMAGE/JPEG')).toBe(FILE_CATEGORIES.IMAGE);
      expect(detectTypeCategory('VIDEO/MP4')).toBe(FILE_CATEGORIES.VIDEO);
      expect(detectTypeCategory('AUDIO/MPEG')).toBe(FILE_CATEGORIES.MUSIC);
    });

    it('should handle uppercase file extensions', () => {
      expect(detectTypeCategory('', 'PHOTO.JPG')).toBe(FILE_CATEGORIES.IMAGE);
      expect(detectTypeCategory('', 'VIDEO.MP4')).toBe(FILE_CATEGORIES.VIDEO);
      expect(detectTypeCategory('', 'SONG.MP3')).toBe(FILE_CATEGORIES.MUSIC);
    });

    it('should handle mixed case', () => {
      expect(detectTypeCategory('Image/Jpeg')).toBe(FILE_CATEGORIES.IMAGE);
      expect(detectTypeCategory('', 'Photo.Jpg')).toBe(FILE_CATEGORIES.IMAGE);
    });
  });

  describe('generic MIME prefix fallback', () => {
    it('should use image/ prefix for unknown image types', () => {
      expect(detectTypeCategory('image/unknown')).toBe(FILE_CATEGORIES.IMAGE);
      expect(detectTypeCategory('image/x-custom')).toBe(FILE_CATEGORIES.IMAGE);
    });

    it('should use video/ prefix for unknown video types', () => {
      expect(detectTypeCategory('video/unknown')).toBe(FILE_CATEGORIES.VIDEO);
      expect(detectTypeCategory('video/x-custom')).toBe(FILE_CATEGORIES.VIDEO);
    });

    it('should use audio/ prefix for unknown audio types', () => {
      expect(detectTypeCategory('audio/unknown')).toBe(FILE_CATEGORIES.MUSIC);
      expect(detectTypeCategory('audio/x-custom')).toBe(FILE_CATEGORIES.MUSIC);
    });

    it('should use text/ prefix for unknown text types', () => {
      expect(detectTypeCategory('text/unknown')).toBe(FILE_CATEGORIES.TEXT);
      expect(detectTypeCategory('text/x-custom')).toBe(FILE_CATEGORIES.TEXT);
    });
  });

  describe('edge cases', () => {
    it('should return OTHER for completely unknown types', () => {
      expect(detectTypeCategory('application/octet-stream', 'file.xyz')).toBe(
        FILE_CATEGORIES.OTHER
      );
      expect(detectTypeCategory('', 'unknown')).toBe(FILE_CATEGORIES.OTHER);
    });

    it('should handle null and undefined inputs', () => {
      expect(detectTypeCategory(null)).toBe(FILE_CATEGORIES.OTHER);
      expect(detectTypeCategory(undefined)).toBe(FILE_CATEGORIES.OTHER);
      expect(detectTypeCategory(null, null)).toBe(FILE_CATEGORIES.OTHER);
      expect(detectTypeCategory(undefined, undefined)).toBe(
        FILE_CATEGORIES.OTHER
      );
    });

    it('should handle empty strings', () => {
      expect(detectTypeCategory('')).toBe(FILE_CATEGORIES.OTHER);
      expect(detectTypeCategory('', '')).toBe(FILE_CATEGORIES.OTHER);
    });

    it('should handle files without extensions', () => {
      expect(detectTypeCategory('', 'Makefile')).toBe(FILE_CATEGORIES.OTHER);
      expect(detectTypeCategory('', 'LICENSE')).toBe(FILE_CATEGORIES.OTHER);
      expect(detectTypeCategory('', '.gitignore')).toBe(FILE_CATEGORIES.OTHER);
    });

    it('should prioritize MIME type over extension', () => {
      // File claims to be a PDF but has .jpg extension
      expect(detectTypeCategory('application/pdf', 'document.jpg')).toBe(
        FILE_CATEGORIES.PDF
      );
      // File claims to be an image but has .pdf extension
      expect(detectTypeCategory('image/jpeg', 'photo.pdf')).toBe(
        FILE_CATEGORIES.IMAGE
      );
    });

    it('should handle special characters in filenames', () => {
      expect(detectTypeCategory('', 'file (1).jpg')).toBe(
        FILE_CATEGORIES.IMAGE
      );
      expect(detectTypeCategory('', 'my-file.mp4')).toBe(FILE_CATEGORIES.VIDEO);
      expect(detectTypeCategory('', 'file_name.pdf')).toBe(FILE_CATEGORIES.PDF);
    });

    it('should handle multiple dots in filenames', () => {
      expect(detectTypeCategory('', 'archive.tar.gz')).toBe(
        FILE_CATEGORIES.ARCHIVE
      );
      expect(detectTypeCategory('', 'file.backup.jpg')).toBe(
        FILE_CATEGORIES.IMAGE
      );
      expect(detectTypeCategory('', 'script.min.js')).toBe(
        FILE_CATEGORIES.CODE
      );
    });
  });

  describe('constants exports', () => {
    it('should export FILE_CATEGORIES', () => {
      expect(FILE_CATEGORIES).toBeDefined();
      expect(FILE_CATEGORIES.IMAGE).toBe('image');
      expect(FILE_CATEGORIES.VIDEO).toBe('video');
      expect(FILE_CATEGORIES.MUSIC).toBe('music');
    });

    it('should export MIME_TYPE_MAP', () => {
      expect(MIME_TYPE_MAP).toBeDefined();
      expect(MIME_TYPE_MAP['image/jpeg']).toBe(FILE_CATEGORIES.IMAGE);
    });

    it('should export EXTENSION_TYPE_MAP', () => {
      expect(EXTENSION_TYPE_MAP).toBeDefined();
      expect(EXTENSION_TYPE_MAP['.jpg']).toBe(FILE_CATEGORIES.IMAGE);
    });
  });
});
