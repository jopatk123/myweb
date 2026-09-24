import { describe, expect, it } from 'vitest';
import { truncateFileName, getFileEmoji } from '@/utils/fileName.js';

describe('truncateFileName', () => {
  it('returns names that already fit untouched', () => {
    expect(truncateFileName('abc.txt', 10)).toBe('abc.txt');
    expect(truncateFileName('abc.txt', 7)).toBe('abc.txt');
  });

  it('keeps the extension when truncating long names', () => {
    const truncated = truncateFileName('averylongfilename.txt', 12);
    expect(truncated).toBe('avery....txt'); // 'avery' + '...' + '.txt'
    expect(truncated).toHaveLength(12);
  });

  it('falls back to a hard cut when the extension leaves no room', () => {
    // ext 占 5 字符，maxLength 8 时 truncateLength = 8 - 5 - 3 <= 0
    expect(truncateFileName('report.docx', 8)).toBe('repor...');
  });

  it('truncates names without an extension', () => {
    expect(truncateFileName('noext', 4)).toBe('n...');
  });

  it('returns empty strings as-is', () => {
    expect(truncateFileName('', 8)).toBe('');
  });

  it('returns the name unchanged for non-positive maxLength', () => {
    expect(truncateFileName('a.txt', 0)).toBe('a.txt');
    expect(truncateFileName('a.txt', -3)).toBe('a.txt');
  });
});

describe('getFileEmoji', () => {
  it('maps representative extensions to their emoji', () => {
    expect(getFileEmoji('photo.jpg')).toBe('🖼️');
    expect(getFileEmoji('clip.mp4')).toBe('🎬');
    expect(getFileEmoji('song.mp3')).toBe('🎵');
    expect(getFileEmoji('doc.pdf')).toBe('📕');
    expect(getFileEmoji('sheet.xlsx')).toBe('📊');
    expect(getFileEmoji('slide.pptx')).toBe('📽️');
    expect(getFileEmoji('app.js')).toBe('💻');
    expect(getFileEmoji('style.css')).toBe('🎨');
    expect(getFileEmoji('archive.zip')).toBe('📦');
    expect(getFileEmoji('book.epub')).toBe('📚');
  });

  it('is case-insensitive on the extension', () => {
    expect(getFileEmoji('PHOTO.JPG')).toBe('🖼️');
    expect(getFileEmoji('clip.MP4')).toBe('🎬');
  });

  it('falls back to the generic file emoji', () => {
    expect(getFileEmoji('mystery.xyz')).toBe('📄');
    expect(getFileEmoji('noextension')).toBe('📄');
    expect(getFileEmoji('')).toBe('📄');
    expect(getFileEmoji(null)).toBe('📄');
    expect(getFileEmoji(undefined)).toBe('📄');
  });
});
