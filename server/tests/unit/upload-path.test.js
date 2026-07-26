/**
 * 上传路径安全工具单元测试
 *
 * 重点验证 toUploadsAbsolutePath 的路径遍历防御：
 *  - 越界相对路径（../../etc/passwd）应被拒绝
 *  - 越界绝对路径（/etc/passwd）应被拒绝
 *  - 合法的 uploads/ 子路径应被接受
 */
import path from 'path';
import {
  toUploadsAbsolutePath,
  toUploadsRelativePath,
  UPLOADS_ROOT,
  PROJECT_ROOT,
} from '../../src/utils/upload-path.js';

describe('toUploadsAbsolutePath - 路径遍历防御', () => {
  test('空输入返回 null', () => {
    expect(toUploadsAbsolutePath('')).toBeNull();
    expect(toUploadsAbsolutePath(null)).toBeNull();
    expect(toUploadsAbsolutePath(undefined)).toBeNull();
    expect(toUploadsAbsolutePath('   ')).toBeNull();
  });

  test('合法的 uploads 子路径被接受', () => {
    const result = toUploadsAbsolutePath('uploads/wallpapers/test.jpg');
    expect(result).toBe(path.join(PROJECT_ROOT, 'uploads/wallpapers/test.jpg'));
  });

  test('合法的 uploads/wallpapers 路径被接受', () => {
    const result = toUploadsAbsolutePath('uploads/wallpapers/abc-uuid.png');
    expect(result).toBe(
      path.join(PROJECT_ROOT, 'uploads/wallpapers/abc-uuid.png')
    );
  });

  test('内部 ../ 在 uploads 范围内仍合法', () => {
    // uploads/wallpapers/../files/test.txt 等价于 uploads/files/test.txt，仍在 uploads 内
    const result = toUploadsAbsolutePath(
      'uploads/wallpapers/../files/test.txt'
    );
    expect(result).toBe(path.join(PROJECT_ROOT, 'uploads/files/test.txt'));
  });

  test('越界相对路径 ../../etc/passwd 被拒绝', () => {
    expect(toUploadsAbsolutePath('../../etc/passwd')).toBeNull();
  });

  test('越界相对路径 ../../../etc/shadow 被拒绝', () => {
    expect(toUploadsAbsolutePath('../../../etc/shadow')).toBeNull();
  });

  test('从 uploads 越界 uploads/../../../etc/passwd 被拒绝', () => {
    expect(toUploadsAbsolutePath('uploads/../../../etc/passwd')).toBeNull();
  });

  test('从 wallpapers 越界 uploads/wallpapers/../../etc/passwd 被拒绝', () => {
    expect(
      toUploadsAbsolutePath('uploads/wallpapers/../../etc/passwd')
    ).toBeNull();
  });

  test('绝对路径 /etc/passwd 被拒绝', () => {
    expect(toUploadsAbsolutePath('/etc/passwd')).toBeNull();
  });

  test('绝对路径 /etc/shadow 被拒绝', () => {
    expect(toUploadsAbsolutePath('/etc/shadow')).toBeNull();
  });

  test('绝对路径指向 UPLOADS_ROOT 被接受', () => {
    const result = toUploadsAbsolutePath(UPLOADS_ROOT);
    expect(result).toBe(path.normalize(UPLOADS_ROOT));
  });

  test('绝对路径指向 UPLOADS_ROOT 子目录被接受', () => {
    const target = path.join(UPLOADS_ROOT, 'wallpapers/test.jpg');
    const result = toUploadsAbsolutePath(target);
    expect(result).toBe(path.normalize(target));
  });

  test('绝对路径指向项目外目录被拒绝', () => {
    expect(toUploadsAbsolutePath('/tmp/evil.jpg')).toBeNull();
    expect(toUploadsAbsolutePath('/var/log/auth.log')).toBeNull();
  });

  test('Windows 风格的盘符绝对路径被拒绝（在 posix 环境下）', () => {
    // C:\Windows\System32 在 posix 下会被当作相对路径解析，
    // 但 resolve 后会越界，仍应被拒绝
    expect(toUploadsAbsolutePath('C:\\Windows\\System32\\evil.dll')).toBeNull();
  });

  test('带前导空格的路径被 trim 后处理', () => {
    const result = toUploadsAbsolutePath('  uploads/wallpapers/test.jpg  ');
    expect(result).toBe(path.join(PROJECT_ROOT, 'uploads/wallpapers/test.jpg'));
  });

  test('恰好等于 UPLOADS_ROOT 的路径被接受', () => {
    const relativeRoot = path.relative(PROJECT_ROOT, UPLOADS_ROOT);
    const result = toUploadsAbsolutePath(relativeRoot);
    expect(result).toBe(UPLOADS_ROOT);
  });
});

describe('toUploadsRelativePath', () => {
  test('拼接多个段为 posix 相对路径', () => {
    expect(toUploadsRelativePath('wallpapers', 'test.jpg')).toBe(
      'uploads/wallpapers/test.jpg'
    );
  });

  test('过滤 undefined/null/空字符串段', () => {
    expect(
      toUploadsRelativePath('wallpapers', undefined, null, '', 'test.jpg')
    ).toBe('uploads/wallpapers/test.jpg');
  });

  test('规范化反斜杠为正斜杠', () => {
    expect(toUploadsRelativePath('wallpapers\\sub', 'test.jpg')).toBe(
      'uploads/wallpapers/sub/test.jpg'
    );
  });

  test('剥离前导/尾随斜杠', () => {
    expect(toUploadsRelativePath('/wallpapers/', '/test.jpg')).toBe(
      'uploads/wallpapers/test.jpg'
    );
  });
});
