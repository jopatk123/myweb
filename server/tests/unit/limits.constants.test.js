/**
 * limits.js 常量测试
 */
import {
  ONE_DAY_MS,
  DEFAULT_WALLPAPER_MAX_SIZE,
  DEFAULT_FILE_MAX_SIZE,
  DEFAULT_MESSAGE_IMAGE_MAX_SIZE,
  DEFAULT_MESSAGE_IMAGE_MAX_FILES,
  SESSION_MAX_AGE_MS,
  MESSAGE_CONTENT_MAX_LENGTH,
  MESSAGE_IMAGE_MAX_COUNT,
} from '../../src/constants/limits.js';

describe('limits constants', () => {
  test('ONE_DAY_MS equals 24 * 60 * 60 * 1000', () => {
    expect(ONE_DAY_MS).toBe(24 * 60 * 60 * 1000);
    expect(ONE_DAY_MS).toBe(86400000);
  });

  test('SESSION_MAX_AGE_MS equals ONE_DAY_MS', () => {
    expect(SESSION_MAX_AGE_MS).toBe(ONE_DAY_MS);
  });

  test('DEFAULT_WALLPAPER_MAX_SIZE is 500 MiB', () => {
    expect(DEFAULT_WALLPAPER_MAX_SIZE).toBe(500 * 1024 * 1024);
  });

  test('DEFAULT_FILE_MAX_SIZE is 1 GiB', () => {
    expect(DEFAULT_FILE_MAX_SIZE).toBe(1024 * 1024 * 1024);
  });

  test('DEFAULT_MESSAGE_IMAGE_MAX_SIZE is 5 MiB', () => {
    expect(DEFAULT_MESSAGE_IMAGE_MAX_SIZE).toBe(5 * 1024 * 1024);
  });

  test('DEFAULT_MESSAGE_IMAGE_MAX_FILES is 5', () => {
    expect(DEFAULT_MESSAGE_IMAGE_MAX_FILES).toBe(5);
  });

  test('MESSAGE_CONTENT_MAX_LENGTH is 1000', () => {
    expect(MESSAGE_CONTENT_MAX_LENGTH).toBe(1000);
  });

  test('MESSAGE_IMAGE_MAX_COUNT is 5', () => {
    expect(MESSAGE_IMAGE_MAX_COUNT).toBe(5);
  });

  test('MESSAGE_IMAGE_MAX_COUNT matches DEFAULT_MESSAGE_IMAGE_MAX_FILES', () => {
    expect(MESSAGE_IMAGE_MAX_COUNT).toBe(DEFAULT_MESSAGE_IMAGE_MAX_FILES);
  });
});
