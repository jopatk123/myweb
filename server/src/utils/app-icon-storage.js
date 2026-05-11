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

export async function copyPresetAppIcon({
  uploadsDir,
  publicIconsDir,
  presetIconsDir,
  presetIconFilename,
}) {
  await fs.mkdir(uploadsDir, { recursive: true });

  const safeFilename = path.basename(presetIconFilename || '');
  const sourcePath = await findFirstExistingPath([
    path.join(publicIconsDir, safeFilename),
    path.join(presetIconsDir, safeFilename),
    path.join(uploadsDir, safeFilename),
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
