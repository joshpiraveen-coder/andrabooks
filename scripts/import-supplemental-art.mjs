import fs from 'node:fs/promises';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { unzipSync } from 'fflate';
import { createCanvas, loadImage } from '@napi-rs/canvas';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const manifest = JSON.parse(await fs.readFile(path.join(root, 'catalog/supplemental-art.json'), 'utf8'));
const archivePath = path.resolve(process.argv[2] || path.join(root, manifest.archiveName));
const archiveBytes = await fs.readFile(archivePath);
const actualHash = createHash('sha256').update(archiveBytes).digest('hex');
if (actualHash !== manifest.archiveSha256) throw new Error(`Unexpected archive SHA-256: ${actualHash}`);

const mappings = [
  ['Pub Web/A HTD 026_How to Draw Book 1/59 copy.jpg', 'public/books/andra-book-023-cover-pubweb.webp', 'cover'],
  ['Pub Web/A HTD 026_How to Draw Book 1/How to Draw Book 2 copy.jpg', 'public/books/andra-book-023-inside-pubweb.webp', 'inside'],
  ['Pub Web/A HTD 025_How to Draw Book 2/58 copy.jpg', 'public/books/andra-book-024-cover-pubweb.webp', 'cover'],
  ['Pub Web/A HTD 025_How to Draw Book 2/How to Draw Book 2 copy.jpg', 'public/books/andra-book-024-inside-pubweb.webp', 'inside'],
  ['Pub Web/A E 060_Andra Grade 6 Work Book English/English Work Book 6.jpg', 'public/books/andra-book-059-cover-pubweb.webp', 'cover'],
  ['Pub Web/A E 060_Andra Grade 6 Work Book English/Grade 6 Work Book English.jpg', 'public/books/andra-book-059-inside-pubweb.webp', 'inside'],
  ['Pub Web/A E 057_Andra Grade 3 Work Book English/English Work Book 3.jpg', 'public/promos/andra-grade-3-workbook-cover.webp', 'cover'],
];
const selectedNames = new Set(mappings.map(([source]) => source));
const files = unzipSync(new Uint8Array(archiveBytes), { filter: info => selectedNames.has(info.name) });
if (Object.keys(files).length !== mappings.length) throw new Error(`Expected ${mappings.length} selected archive files; found ${Object.keys(files).length}.`);

function clearOuterWhite(canvas) {
  const context = canvas.getContext('2d');
  const { width, height } = canvas;
  const image = context.getImageData(0, 0, width, height);
  const pixels = image.data;
  const visited = new Uint8Array(width * height);
  const queue = new Int32Array(width * height);
  let first = 0, last = 0;
  const queuePixel = index => {
    if (index < 0 || index >= visited.length || visited[index]) return;
    visited[index] = 1;
    const offset = index * 4;
    const r = pixels[offset], g = pixels[offset + 1], b = pixels[offset + 2];
    if (Math.min(r, g, b) < 238 || Math.max(r, g, b) - Math.min(r, g, b) > 22) return;
    queue[last++] = index;
  };
  for (const corner of [0, width - 1, width * (height - 1), width * height - 1]) queuePixel(corner);
  while (first < last) {
    const index = queue[first++];
    const offset = index * 4;
    const brightness = Math.min(pixels[offset], pixels[offset + 1], pixels[offset + 2]);
    pixels[offset + 3] = brightness >= 248 ? 0 : Math.round((248 - brightness) / 10 * 255);
    const column = index % width;
    if (column) queuePixel(index - 1);
    if (column < width - 1) queuePixel(index + 1);
    if (index >= width) queuePixel(index - width);
    if (index < width * (height - 1)) queuePixel(index + width);
  }
  context.putImageData(image, 0, 0);
}

function trim(canvas) {
  const context = canvas.getContext('2d');
  const pixels = context.getImageData(0, 0, canvas.width, canvas.height).data;
  let left = canvas.width, top = canvas.height, right = 0, bottom = 0;
  for (let y = 0; y < canvas.height; y++) for (let x = 0; x < canvas.width; x++) {
    if (pixels[(y * canvas.width + x) * 4 + 3] < 12) continue;
    left = Math.min(left, x); top = Math.min(top, y); right = Math.max(right, x); bottom = Math.max(bottom, y);
  }
  if (right <= left || bottom <= top) throw new Error('Image became empty after white matting.');
  const padding = 4;
  const output = createCanvas(right - left + 1 + padding * 2, bottom - top + 1 + padding * 2);
  output.getContext('2d').drawImage(canvas, left, top, right - left + 1, bottom - top + 1, padding, padding, right - left + 1, bottom - top + 1);
  return output;
}

for (const [source, relativeOutput, kind] of mappings) {
  const bytes = files[source];
  if (!bytes) throw new Error(`Missing ZIP entry: ${source}`);
  const image = await loadImage(Buffer.from(bytes));
  const limit = kind === 'cover' ? 1000 : 1200;
  const scale = Math.min(1, limit / Math.max(image.width, image.height));
  const canvas = createCanvas(Math.round(image.width * scale), Math.round(image.height * scale));
  canvas.getContext('2d').drawImage(image, 0, 0, canvas.width, canvas.height);
  clearOuterWhite(canvas);
  const output = trim(canvas);
  const outputPath = path.join(root, relativeOutput);
  await fs.mkdir(path.dirname(outputPath), { recursive: true });
  await fs.writeFile(outputPath, await output.encode('webp', 86));
  console.log(`${relativeOutput}: ${output.width}x${output.height}`);
}
