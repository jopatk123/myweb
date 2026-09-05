/* 一次性维护脚本：压缩体积异常的上传图片（在容器内执行）
 * - apps/icons/*.png（>100KB）：等比缩到最大边 256px（桌面显示 64px，256 已含 retina 余量），
 *   输出 PNG 保留透明通道（palette 与 RGBA 双方案取更小者）
 * - wallpapers/*.jpg（>300KB）：保持分辨率，mozjpeg q82 视觉无损重编码
 * - 仅当压缩后体积更小时替换；壁纸同步更新 DB 的 file_size 字段
 *
 * 注意：sharp 的格式方法是"链式覆盖"语义，.png() 后再 .jpeg() 会输出 JPEG
 * （曾因此误将 PNG 图标压成 JPEG 丢失透明，已修复：按输入格式显式分支）。
 */
const sharp = require('sharp');
const fs = require('fs');
const path = require('path');
const Database = require('better-sqlite3');

const ICON_DIR = '/app/server/uploads/apps/icons';
const WALLPAPER_DIR = '/app/server/uploads/wallpapers';
const DB_PATH = '/app/server/data/myweb.db';

/** 图标压缩：256px PNG，palette 与 RGBA 双方案取更小者，透明无损 */
async function compressIcon(src) {
  const base = sharp(src).resize(256, 256, {
    fit: 'inside',
    withoutEnlargement: true,
  });
  const paletteBuf = await base
    .clone()
    .png({ palette: true, quality: 95, compressionLevel: 9 })
    .toBuffer();
  const rgbaBuf = await base.clone().png({ compressionLevel: 9 }).toBuffer();
  return paletteBuf.length <= rgbaBuf.length ? paletteBuf : rgbaBuf;
}

/** 壁纸压缩：保持分辨率，JPEG q82 重编码 */
async function compressWallpaper(src) {
  return sharp(src)
    .resize(20000, 20000, { fit: 'inside', withoutEnlargement: true })
    .jpeg({ quality: 82, mozjpeg: true })
    .toBuffer();
}

async function main() {
  const db = new Database(DB_PATH);
  const results = [];

  // 1. 图标：>100KB 的 PNG 缩到 256px（透明保留）
  for (const f of fs.readdirSync(ICON_DIR).filter(x => x.endsWith('.png'))) {
    const p = path.join(ICON_DIR, f);
    if (fs.statSync(p).size <= 100 * 1024) continue;
    const buffer = await compressIcon(p);
    const origSize = fs.statSync(p).size;
    const newSize = buffer.length;
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
    const buffer = await compressWallpaper(p);
    const origSize = fs.statSync(p).size;
    const newSize = buffer.length;
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
