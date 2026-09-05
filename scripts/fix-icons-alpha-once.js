/* 一次性修复脚本（容器内执行）：修复 compress-uploads-once.js 的图标压缩 bug
 * 该 bug 将 PNG 图标错误输出为 JPEG（sharp 链式格式调用后者覆盖前者），
 * 丢失透明通道且扩展名与内容错配。本脚本从备份恢复原图并正确重压缩：
 * - 仅处理当前文件与备份大小不一致的（即被 bug 触碰过的）图标
 * - 输出保持 PNG 格式，透明通道无损（palette 与 RGBA 双方案取更小者）
 */
const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const BACKUP_DIR = '/app/server/data/icons-backup-check';
const ICON_DIR = '/app/server/uploads/apps/icons';

async function compressIconCorrectly(src) {
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

async function main() {
  const results = [];
  for (const f of fs.readdirSync(BACKUP_DIR).filter(x => x.endsWith('.png'))) {
    const backupPath = path.join(BACKUP_DIR, f);
    const targetPath = path.join(ICON_DIR, f);
    if (!fs.existsSync(targetPath)) continue;

    const backupSize = fs.statSync(backupPath).size;
    const currentSize = fs.statSync(targetPath).size;
    if (backupSize === currentSize) continue; // 未被触碰，跳过

    const buf = await compressIconCorrectly(backupPath);
    fs.writeFileSync(targetPath, buf);

    // 校验：必须是真 PNG 且保留透明
    const meta = await sharp(targetPath).metadata();
    const stats = await sharp(targetPath).stats();
    results.push({
      file: f.slice(0, 8),
      origKB: Math.round(backupSize / 1024),
      fixedKB: Math.round(buf.length / 1024),
      format: meta.format,
      hasAlpha: meta.hasAlpha,
      reallyTransparent: !stats.isOpaque,
    });
  }
  console.log(JSON.stringify(results, null, 1));
}

main().catch(e => {
  console.error('FAILED:', e.message);
  process.exit(1);
});
