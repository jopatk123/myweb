/* 一次性维护脚本：压缩体积异常的上传图片（在容器内执行）
 * - apps/icons/*.png（>100KB）：等比缩到最大边 256px（桌面显示 64px，256 已含 retina 余量）
 * - wallpapers/*.jpg（>300KB）：保持分辨率，mozjpeg q82 视觉无损重编码
 * - 仅当压缩后体积更小时替换；壁纸同步更新 DB 的 file_size 字段
 */
const sharp = require('sharp');
const fs = require('fs');
const path = require('path');
const Database = require('better-sqlite3');

const ICON_DIR = '/app/server/uploads/apps/icons';
const WALLPAPER_DIR = '/app/server/uploads/wallpapers';
const DB_PATH = '/app/server/data/myweb.db';

async function compressOne(src, opts) {
  const buf = await sharp(src)
    .resize({
      width: opts.maxWidth,
      height: opts.maxWidth,
      fit: 'inside',
      withoutEnlargement: true,
    })
    .png(opts.png || undefined)
    .jpeg(opts.jpeg || undefined)
    .toBuffer();
  const origSize = fs.statSync(src).size;
  return { buffer: buf, origSize, newSize: buf.length };
}

async function main() {
  const db = new Database(DB_PATH);
  const results = [];

  // 1. 图标：>100KB 的 PNG 缩到 256px
  for (const f of fs.readdirSync(ICON_DIR).filter(x => x.endsWith('.png'))) {
    const p = path.join(ICON_DIR, f);
    if (fs.statSync(p).size <= 100 * 1024) continue;
    const { buffer, origSize, newSize } = await compressOne(p, {
      maxWidth: 256,
      png: { palette: true, quality: 90, compressionLevel: 9 },
    });
    if (newSize < origSize) {
      fs.writeFileSync(p, buffer);
      results.push({ type: 'icon', file: f, origSize, newSize });
    }
  }

  // 2. JPG 壁纸：>300KB 的重编码 q82（保分辨率）
  let origTotal = 0;
  let newTotal = 0;
  const sizeUpdates = [];
  for (const f of fs
    .readdirSync(WALLPAPER_DIR)
    .filter(x => /\.jpe?g$/i.test(x))) {
    const p = path.join(WALLPAPER_DIR, f);
    if (fs.statSync(p).size <= 300 * 1024) continue;
    const { buffer, origSize, newSize } = await compressOne(p, {
      maxWidth: 20000,
      jpeg: { quality: 82, mozjpeg: true },
    });
    if (newSize < origSize) {
      fs.writeFileSync(p, buffer);
      origTotal += origSize;
      newTotal += newSize;
      const rel = `uploads/wallpapers/${f}`;
      const updated = db
        .prepare('UPDATE wallpapers SET file_size = ? WHERE file_path = ?')
        .run(newSize, rel);
      if (updated.changes > 0) sizeUpdates.push(rel);
    }
  }

  const icons = results.filter(r => r.type === 'icon');
  const iconOrig = icons.reduce((s, r) => s + r.origSize, 0);
  const iconNew = icons.reduce((s, r) => s + r.newSize, 0);
  console.log(
    JSON.stringify(
      {
        icons: {
          count: icons.length,
          origKB: Math.round(iconOrig / 1024),
          newKB: Math.round(iconNew / 1024),
        },
        wallpapers: {
          origMB: +(origTotal / 1048576).toFixed(1),
          newMB: +(newTotal / 1048576).toFixed(1),
        },
        dbFileSizeRows: sizeUpdates.length,
      },
      null,
      2
    )
  );
  db.close();
}

main().catch(e => {
  console.error('FAILED:', e.message);
  process.exit(1);
});
