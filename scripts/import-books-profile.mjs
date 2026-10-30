import fs from 'node:fs/promises';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { getDocument } from 'pdfjs-dist/legacy/build/pdf.mjs';
import { createCanvas } from '@napi-rs/canvas';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const briefPath = path.join(root, 'catalog/books-profile-source.md');
const pdfPath = path.resolve(process.argv[2] || path.join(root, 'Books Profile.pdf'));
const productsOut = path.join(root, 'src/data/catalogProducts.ts');
const assetsDir = path.join(root, 'public/books');
const supplemental = JSON.parse(await fs.readFile(path.join(root, 'catalog/supplemental-art.json'), 'utf8'));
const brief = await fs.readFile(briefPath, 'utf8');
const sectionByNumber = new Map();
let currentSeries = 0;
const catalogRows = [];
for (const line of brief.split(/\r?\n/)) {
  const header = line.match(/^### Series (\d+):/);
  if (header) currentSeries = Number(header[1]);
  const row = line.match(/^(\d+)\. \*\*(.*?)\*\*(.*)$/);
  if (!row || currentSeries < 1 || Number(row[1]) > 141) continue;
  catalogRows.push({ number: Number(row[1]), name: row[2].trim(), rest: row[3], series: currentSeries });
  if (Number(row[1]) === 141) break;
}
if (catalogRows.length !== 141 || catalogRows.some((row, index) => row.number !== index + 1)) throw new Error(`Expected the 141 ordered catalog entries; found ${catalogRows.length}.`);

const pdfBytes = await fs.readFile(pdfPath);
const pdfSha256 = createHash('sha256').update(pdfBytes).digest('hex');
const pdf = await getDocument({ data: new Uint8Array(pdfBytes), verbosity: 0 }).promise;
if (pdf.numPages !== 49) throw new Error(`Expected 49 PDF pages, found ${pdf.numPages}.`);
const pdfRows = [];
for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber++) {
  const page = await pdf.getPage(pageNumber);
  const content = await page.getTextContent();
  const rowGroups = [[], [], []];
  for (const item of content.items) {
    if (!item.str?.trim()) continue;
    const y = item.transform[5];
    const row = y > 500 ? 0 : y > 300 ? 1 : 2;
    rowGroups[row].push({ x: item.transform[4], y, text: item.str.trim() });
  }
  for (let row = 0; row < 3; row++) {
    const items = rowGroups[row].sort((a, b) => b.y - a.y || a.x - b.x);
    const isMetadata = text => /^(For Age Group|Grade\s*-|Pages\b|A Set\b|Size\b|Price\b|ISBN\s*:)/i.test(text);
    const titleItem = items.find(item => !isMetadata(item.text) && item.text !== 'ANDRA PUBLICATIONS 2022');
    pdfRows.push({ page: pageNumber, row: row + 1, x: titleItem?.x || 0, items });
  }
}

function pdfIndexForProduct(n) {
  if (n <= 24) return n - 1;
  if (n <= 58) return n + 5; // the repeated picture-book panels on PDF pages 9–10 are omitted
  if (n === 59) return 136; // Andra's English Workbook Grade 6 is shown on PDF page 46, panel 2
  if (n <= 131) return n + 4;
  return n + 5;
}
function pdfFields(pdfRow) {
  const lineText = pdfRow.items.map(item => item.text);
  const find = regex => lineText.map(text => text.match(regex)?.[1]?.trim()).find(value => value !== undefined) || '';
  return {
    ageGroup: find(/^For Age Group\s+(.+)$/i),
    grade: find(/^Grade\s*-\s*(.+)$/i),
    pages: find(/^Pages\s*(\d+)$/i),
    setInfo: find(/^(A Set of .+)$/i),
    dimensions: find(/^Size\s+(.+)$/i),
    price: find(/^Price\s+Rs\.\s*(.+)$/i),
    isbn: find(/^ISBN\s*:\s*(.+)$/i),
  };
}
function rowFields(rest) {
  const fields = {};
  const regex = /\|\s*([^|:]+):\s*`([^`]*)`/g;
  for (const match of rest.matchAll(regex)) fields[match[1].trim().toLowerCase()] = match[2].trim();
  for (const key of ['age', 'grade', 'pages', 'set', 'size', 'price', 'sale', 'isbn']) {
    const keyLabel = key === 'size' ? 'dimensions' : key === 'set' ? 'setinfo' : key;
    if (!fields[keyLabel]) {
      const found = rest.match(new RegExp(`\\|\\s*${key}:\\s*([^|]+)`, 'i'));
      if (found) fields[keyLabel] = found[1].trim().replace(/`/g, '');
    }
  }
  const sale = rest.match(/\bSale:\s*`([^`]+)`/i);
  if (sale) fields.sale = sale[1].trim();
  return fields;
}
function categoryFor(row) {
  if (row.number === 132) return 'Tamil Workbooks';
  if (row.number >= 133 && row.number <= 139) return 'History & Health (Grade 6-10)';
  if (row.number >= 140) return 'Puzzles & Wall Charts';
  return ({ 1:'Picture Books',2:'Coloring Books',3:'Coloring Books',4:'Activity & Dot-to-Dot',5:'Tamil Workbooks',6:'English & Math Workbooks',7:'Exam Papers (Yarl Aruvi)',8:'Story Books',9:'Story Books',10:'Story Books' })[row.series] || 'Story Books';
}
function languageFor(row) {
  if (row.series === 5 || row.series === 7 || row.series === 9 || row.number === 132 || [133,134,135,139].includes(row.number)) return 'Tamil';
  if (row.series === 10) return 'Sinhala';
  return 'English';
}
function normalized(value) { return value.normalize('NFKD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''); }
// The PDF places each angled book on white. Clear only the white region connected
// to the crop's outer corners, retaining white paper inside the printed book.
function clearOuterWhite(canvas) {
  const context = canvas.getContext('2d');
  const { width, height } = canvas;
  const image = context.getImageData(0, 0, width, height);
  const pixels = image.data;
  const visited = new Uint8Array(width * height);
  const queue = new Int32Array(width * height);
  let first = 0;
  let last = 0;
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
const preservedIds = new Map([[8,'first-picture-flowers'],[9,'coloring-animals'],[13,'coloring-vehicles'],[43,'andra-dictionary'],[51,'grade-1-workbook'],[52,'grade-2-workbook'],[90,'cleverest-crow'],[100,'aamaiyum-muyalum'],[108,'eruthulakum-singamum'],[119,'cap-seller-monkeys'],[122,'four-bulls-lion-sinhala'],[129,'fox-grapes']]);
const slugCounts = new Map();
await fs.mkdir(assetsDir, { recursive: true });
const products = [];
const auditRows = [];
let renderedPageNumber = 0;
let renderedPageCanvas;
for (const row of catalogRows) {
  const n = row.number;
  const pdfRow = pdfRows[pdfIndexForProduct(n)];
  if (!pdfRow) throw new Error(`No source PDF panel for product ${n}.`);
  const extracted = pdfFields(pdfRow);
  const supplied = rowFields(row.rest);
  const ageGroup = supplied.age || extracted.ageGroup || undefined;
  let grade = supplied.grade || undefined;
  const gradeInTitle = row.name.match(/Grade\s*-?\s*([0-9]+(?:\s*[-,]\s*[0-9]+)?)(?:\s*\(Term\s*([1-3])\))?/i);
  if (!grade && gradeInTitle) grade = `Grade ${gradeInTitle[1].replace(/\s+/g, ' ').trim()}${gradeInTitle[2] ? ` (Term ${gradeInTitle[2]})` : ''}`;
  if (!grade && extracted.grade) grade = /^\d/.test(extracted.grade) ? `Grade ${extracted.grade}` : extracted.grade;
  const pages = Number.parseInt(supplied.pages || extracted.pages, 10) || undefined;
  const setInfo = supplied.setinfo || extracted.setInfo || undefined;
  const dimensions = supplied.dimensions || extracted.dimensions || undefined;
  const suppliedPrice = Number.parseFloat((supplied.price || '').replace(/[^0-9.]/g, ''));
  const suppliedSale = Number.parseFloat((supplied.sale || '').replace(/[^0-9.]/g, ''));
  const pdfPrice = Number.parseFloat(extracted.price.replace(/[^0-9.]/g, ''));
  const regularPrice = Number.isFinite(suppliedPrice) && suppliedPrice > 0 ? suppliedPrice : pdfPrice;
  if (!Number.isFinite(regularPrice) || regularPrice <= 0) throw new Error(`Missing price for product ${n}`);
  const onSale = Number.isFinite(suppliedSale) && suppliedSale > 0 && suppliedSale < regularPrice;
  const price = onSale ? suppliedSale : regularPrice;
  const oldPrice = onSale ? regularPrice : undefined;
  const rawIsbn = supplied.isbn || extracted.isbn || '';
  const isbn = rawIsbn.match(/\d{3}-\d{3}-\d{4}-\d{2}-\d/)?.[0] || rawIsbn.match(/\d{3}-\d{4}-\d{2}-\d/)?.[0] || rawIsbn.match(/\d{3}-\d{4}-\d{2}-\d{2}/)?.[0] || rawIsbn.split(/[;,()]/)[0].trim() || undefined;
  const baseSlug = normalized(row.name) || `book-${String(n).padStart(3, '0')}`;
  const duplicateCount = slugCounts.get(baseSlug) || 0;
  slugCounts.set(baseSlug, duplicateCount + 1);
  const slug = duplicateCount ? `${baseSlug}-${languageFor(row).toLowerCase()}-${duplicateCount + 1}` : baseSlug;
  const id = preservedIds.get(n) || `book-${String(n).padStart(3, '0')}-${baseSlug}`;
  const coverName = `andra-book-${String(n).padStart(3, '0')}-cover.webp`;
  const insideName = `andra-book-${String(n).padStart(3, '0')}-inside.webp`;
  const pageNumber = pdfRow.page, panel = pdfRow.row;
  const vertical = panel === 1 ? [140,268] : panel === 2 ? [545,673] : [953,1081];
  const rects = {
    coverLeft: [78,vertical[0] + 4,258,348], coverRight: [659,vertical[0] + 4,258,348],
    insideLeft: [78,vertical[1] + 4,292,220], insideRight: [626,vertical[1] + 4,292,220],
  };
  const leftCover = pdfRow.x > 100;
  const coverRect = leftCover ? rects.coverLeft : rects.coverRight;
  const insideRect = leftCover ? rects.insideRight : rects.insideLeft;
  if (renderedPageNumber !== pageNumber) {
    const page = await pdf.getPage(pageNumber);
    const viewport = page.getViewport({ scale: 4 });
    renderedPageCanvas = createCanvas(Math.ceil(viewport.width), Math.ceil(viewport.height));
    await page.render({ canvasContext: renderedPageCanvas.getContext('2d'), viewport }).promise;
    renderedPageNumber = pageNumber;
  }
  const pageCanvas = renderedPageCanvas;
  const imagePaths = {};
  for (const [kind, rect, filename, threshold] of [['cover',coverRect,coverName,0.025],['inside',insideRect,insideName,0.018]]) {
    const [x,y,w,h] = rect.map(value => value * 2);
    const crop = createCanvas(w,h); crop.getContext('2d').drawImage(pageCanvas,x,y,w,h,0,0,w,h);
    const data = crop.getContext('2d').getImageData(0,0,w,h).data;
    let visible = 0;
    for (let i=0;i<data.length;i+=4) if (Math.min(data[i],data[i+1],data[i+2]) < 240) visible++;
    if (visible/(data.length/4) > threshold) {
      clearOuterWhite(crop);
      await fs.writeFile(path.join(assetsDir,filename),await crop.encode('webp',86));
      imagePaths[kind === 'cover' ? 'coverImage' : 'insideImage'] = `/books/${filename}`;
    }
  }
  const extraArt = supplemental.products[String(n)];
  if (extraArt) {
    for (const kind of ['coverImage', 'insideImage']) {
      if (!extraArt[kind]) continue;
      await fs.access(path.join(root, 'public', extraArt[kind].replace(/^\//, '')));
      imagePaths[kind] = extraArt[kind];
    }
  }
  const flags = [];
  if (n <= 5) flags.push('new');
  if ([3,8,9,24,29,41,43,48,51,52,77,90,100,115,132].includes(n)) flags.push('featured');
  if ([1,3,8,9,43,90,100,115,140].includes(n)) flags.push('topRated');
  const product = {
    id, slug, name: row.name, category: categoryFor(row), price,
    ...(oldPrice ? { oldPrice } : {}), cover: `catalog-book-${String(n).padStart(3,'0')}`,
    accent: '#df0067', language: languageFor(row), ...(grade ? { grade } : {}), sku: `AB-${String(n).padStart(3,'0')}`,
    ...(isbn ? { isbn } : {}), ...(ageGroup ? { ageGroup } : {}), ...(pages ? { pages } : {}), ...(setInfo ? { setInfo } : {}), ...(dimensions ? { dimensions } : {}),
    stock: 20, rating: 0, flags, ...(onSale ? { onSale: true } : {}),
    ...imagePaths, description: `${row.name} from Andra Publications.`
  };
  products.push(product);
  auditRows.push({ number: n, sku: product.sku, name: row.name, pdfPage: pageNumber, pdfPanel: panel, coverImage: imagePaths.coverImage || null, insideImage: imagePaths.insideImage || null, ...(extraArt ? { supplementalArt: true } : {}), price, ...(oldPrice ? { oldPrice } : {}), ...(isbn ? { isbn } : {}) });
}
const missingCovers = products.filter(product => !product.coverImage).length;
const missingInsides = products.filter(product => !product.insideImage).length;
const source = `import type { Product } from '../types';\n\n// 141 unique catalog entries. Six repeated picture-book panels in the source PDF are intentionally deduplicated.\nexport const BOOK_CATALOG: Product[] = ${JSON.stringify(products,null,2)};\n`;
await fs.writeFile(productsOut,source,'utf8');
await fs.writeFile(path.join(root, 'catalog/books-profile-audit.json'), JSON.stringify({ pdfSha256, supplementalArchiveSha256: supplemental.archiveSha256, sourcePages: pdf.numPages, expectedProducts: 141, extractedProducts: products.length, missingCovers, missingInsides, rows: auditRows }, null, 2) + '\n', 'utf8');
const categories = [...new Set(products.map(product=>product.category))];
console.log(JSON.stringify({products:products.length,categories,categoryCounts:Object.fromEntries(categories.map(category=>[category,products.filter(product=>product.category===category).length])),missingCovers,missingInsides,assetCount:(await fs.readdir(assetsDir)).length},null,2));
