import { existsSync, statSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { PRODUCTS } from '../src/data/products';

const publicDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../public');
const broken: string[] = [];
let checked = 0;
let empty = 0;
let external = 0;

for (const product of PRODUCTS) {
  for (const field of ['coverImage', 'insideImage'] as const) {
    const image = product[field];
    if (!image) { empty++; continue; }
    if (/^(https?:|data:|blob:)/i.test(image)) { external++; continue; }
    const localPath = path.resolve(publicDir, decodeURIComponent(image.split(/[?#]/, 1)[0]).replace(/^\/+/, ''));
    checked++;
    if (!localPath.startsWith(publicDir + path.sep) || !existsSync(localPath) || !statSync(localPath).isFile()) broken.push(`${product.id} ${field}: ${image}`);
  }
}

console.log(`${PRODUCTS.length} catalog books; ${checked} local image paths checked; ${empty} intentionally empty slots; ${external} external image URLs.`);
if (broken.length) { console.error(`${broken.length} broken image paths:\n${broken.join('\n')}`); process.exitCode = 1; }
else console.log('0 broken catalog image paths.');
