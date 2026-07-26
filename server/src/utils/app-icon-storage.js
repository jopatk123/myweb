import fs from 'fs/promises';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';

async function findFirstExistingPath(candidates) {
  for (const candidatePath of candidates) {
    try {
      await fs.access(candidatePath);
      return candidatePath;
    } catch (error) {
      void error;
    }
  }

  return null;
}

/**
 * 复制预选图标到 uploads 目录。
 *
 * - 仅在 publicIconsDir / presetIconsDir 中查找，避免从其它用户上传过的图标（uploadsDir）中复制
 *   （旧实现会扫描 uploadsDir，存在跨用户图标复制风险）
 * - 复制后文件名以新 UUID 命名，避免与源文件冲突
 * - 使用 path.basename 防止路径穿越
 */
export async function copyPresetAppIcon({
  uploadsDir,
  publicIconsDir,
  presetIconsDir,
  presetIconFilename,
}) {
  await fs.mkdir(uploadsDir, { recursive: true });

  const safeFilename = path.basename(presetIconFilename || '');
  if (!safeFilename) {
    throw new Error('预选图标文件名为空');
  }

  const sourcePath = await findFirstExistingPath([
    path.join(publicIconsDir, safeFilename),
    path.join(presetIconsDir, safeFilename),
  ]);

  if (!sourcePath) {
    throw new Error(`预选图标文件不存在: ${presetIconFilename}`);
  }

  const extension = path.extname(safeFilename);
  const newFilename = `${uuidv4()}${extension}`;
  const targetPath = path.join(uploadsDir, newFilename);

  await fs.copyFile(sourcePath, targetPath);
  return newFilename;
}

export async function deleteAppIconIfExists({ uploadsDir, filename }) {
  if (!filename) {
    return false;
  }

  const safeFilename = path.basename(String(filename));
  const targetPath = path.join(uploadsDir, safeFilename);
  await fs.unlink(targetPath);
  return true;
}
