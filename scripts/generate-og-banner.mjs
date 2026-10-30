import { createCanvas, loadImage } from '@napi-rs/canvas';
import { writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const publicDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../public');
const canvas = createCanvas(1200, 630);
const context = canvas.getContext('2d');
const gradient = context.createLinearGradient(0, 0, 1200, 630);
gradient.addColorStop(0, '#fff3fa');
gradient.addColorStop(.54, '#ffb8dc');
gradient.addColorStop(1, '#df0067');
context.fillStyle = gradient;
context.fillRect(0, 0, 1200, 630);

context.save();
context.translate(870, -100);
context.rotate(-.28);
for (let index = 0; index < 7; index++) {
  context.fillStyle = index % 2 ? '#ffffff24' : '#ffffff18';
  context.fillRect(index * 78, -200, 45, 1000);
}
context.restore();

context.fillStyle = '#df0067';
context.font = 'bold 37px Arial';
context.fillText('ANDRA BOOKS', 70, 108);
context.fillStyle = '#251b23';
context.font = 'bold 78px Arial';
context.fillText('Growing minds,', 67, 247);
context.fillText('page by page.', 67, 338);
context.font = '28px Arial';
context.fillText("Children's books, stories & creativity", 71, 413);
context.fillText('from Jaffna, Sri Lanka', 71, 454);
context.fillStyle = '#df0067';
context.beginPath();
context.roundRect(70, 505, 335, 63, 31);
context.fill();
context.fillStyle = '#fff';
context.font = 'bold 24px Arial';
context.fillText('Explore the collection', 105, 546);

const cover = await loadImage(path.join(publicDir, 'books/andra-book-100-cover.webp'));
const scale = Math.min(450 / cover.width, 540 / cover.height);
const width = cover.width * scale;
const height = cover.height * scale;
context.shadowColor = '#48102d88';
context.shadowBlur = 22;
context.shadowOffsetY = 15;
context.drawImage(cover, 790, (630 - height) / 2, width, height);
await writeFile(path.join(publicDir, 'og-banner.jpg'), canvas.toBuffer('image/jpeg', 92));
console.log('Wrote public/og-banner.jpg (1200 × 630).');
