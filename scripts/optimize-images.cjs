// Run: node scripts/optimize-images.cjs [path-to-sharp-package]
// Originals are retained. Never process customer uploads or runtime storage.
const fs = require('node:fs/promises');
const path = require('node:path');
const crypto = require('node:crypto');
const sharp = require(process.argv[2] || 'sharp');
sharp.concurrency(2);
const root = path.resolve('public');
const output = path.join(root, 'optimized');
const manifest = {};
const report = {groups: {}, losslessVerified: 0};
async function emit(buffer, name) {
  const hash = crypto.createHash('sha256').update(buffer).digest('hex').slice(0, 12);
  const file = `${name}-${hash}.webp`;
  await fs.writeFile(path.join(output, file), buffer);
  return `/optimized/${file}`;
}
async function main() {
  await fs.mkdir(output, {recursive: true});
  const files = (await fs.readdir(root, {recursive: true})).filter(p => /\.(png|jpg|webp)$/i.test(p) && !p.startsWith('optimized' + path.sep)).sort();
  for (const relative of files) {
    const source = path.join(root, relative), original = await fs.readFile(source), metadata = await sharp(original).metadata();
    const url = '/' + relative.split(path.sep).join('/'), group = relative.split(path.sep)[0];
    const entry = {src: url, width: metadata.width, height: metadata.height, variants: []};
    const stats = report.groups[group] ||= {count: 0, originalBytes: 0, fullBytes: 0, thumbnailBytes: 0};
    stats.count++; stats.originalBytes += original.length;
    let fullBytes = original.length;
    const stem = relative.replace(/\.[^.]+$/, '').replace(/[\\/]/g, '-');
    if (/\.png$/i.test(relative)) {
      // Exact pixels: no downscaling, no lossy compression of equations.
      const buffer = await sharp(original).webp({lossless: true, effort: 6}).toBuffer();
      if (buffer.length < original.length) {
        const before = await sharp(original).ensureAlpha().raw().toBuffer();
        const after = await sharp(buffer).ensureAlpha().raw().toBuffer();
        if (!before.equals(after)) throw Error(`Lossless verification failed: ${url}`);
        report.losslessVerified++;
        entry.src = await emit(buffer, stem); fullBytes = buffer.length;
      }
    } else if (group === 'guide') {
      const buffer = await sharp(original).rotate().webp({quality: 98, alphaQuality: 100, effort: 6, smartSubsample: true}).toBuffer();
      if (buffer.length < original.length) {entry.src = await emit(buffer, stem); fullBytes = buffer.length;}
    }
    stats.fullBytes += fullBytes;
    const widths = group === 'companions' ? [128, 256] : group === 'brand' ? [88, 176] : group === 'guide' ? [1080, 2160] : [];
    for (const width of widths.filter(w => w < metadata.width)) {
      const buffer = await sharp(original).rotate().resize({width, withoutEnlargement: true, fastShrinkOnLoad: false}).webp({quality: 98, alphaQuality: 100, effort: 6, smartSubsample: true}).toBuffer();
      if (buffer.length < fullBytes) {entry.variants.push({width, src: await emit(buffer, `${stem}-${width}`)}); stats.thumbnailBytes += buffer.length;}
    }
    entry.variants.push({width: metadata.width, src: entry.src});
    manifest[url] = entry;
  }
  await fs.writeFile('app/lib/image-manifest.json', JSON.stringify(manifest, null, 2) + '\n');
  await fs.writeFile('scripts/image-optimization-report.json', JSON.stringify(report, null, 2) + '\n');
  console.log(JSON.stringify(report, null, 2));
}
main().catch(e => {console.error(e); process.exitCode = 1;});
