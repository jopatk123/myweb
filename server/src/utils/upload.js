export function decodeUploadFilename(name) {
  if (typeof name !== 'string' || name.length === 0) {
    return name;
  }

  try {
    const buffer = Buffer.from(name, 'latin1');
    const decoded = buffer.toString('utf8');
    const reencoded = Buffer.from(decoded, 'utf8').toString('latin1');
    return reencoded === name ? decoded : name;
  } catch {
    return name;
  }
}

export function normaliseUploadedFileName(file) {
  if (!file || typeof file.originalname !== 'string') {
    return file?.originalname;
  }

  const decoded = decodeUploadFilename(file.originalname);
  if (decoded && decoded !== file.originalname) {
    file.originalname = decoded;
  }
  return file.originalname;
}
