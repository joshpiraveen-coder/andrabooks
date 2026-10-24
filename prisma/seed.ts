import 'dotenv/config';
import bcrypt from 'bcryptjs';
import { Prisma, PrismaClient } from '@prisma/client';
import { PRODUCTS, DEFAULT_SETTINGS } from '../src/data/products';

const prisma = new PrismaClient();

async function main() {
  const email = (process.env.ADMIN_EMAIL || 'admin@andrabooks.lk').toLowerCase();
  const password = process.env.ADMIN_PASSWORD;
  if (!password) throw new Error('Set ADMIN_PASSWORD in .env before seeding the owner account.');
  await prisma.adminUser.upsert({ where: { email }, update: { passwordHash: await bcrypt.hash(password, 12) }, create: { email, passwordHash: await bcrypt.hash(password, 12), role: 'OWNER' } });
  const names = [...new Set(PRODUCTS.map(product => product.category))];
  const categoryByName = new Map<string, string>();
  for (const [sortOrder, name] of names.entries()) {
    const category = await prisma.category.upsert({ where: { name }, update: { sortOrder }, create: { name, slug: name.toLowerCase().replace(/[^a-z0-9]+/g, '-'), sortOrder } });
    categoryByName.set(name, category.id);
  }
  for (const book of PRODUCTS) {
    const coverImage = book.coverImage || book.imageUrl;
    const mediaData = { ...(coverImage ? { imageUrl: coverImage, coverImage } : {}), ...(book.insideImage ? { insideImage: book.insideImage } : {}), ...(book.galleryImages?.length ? { galleryImages: book.galleryImages } : {}) };
    const data = { name: book.name, slug: book.slug || book.id, sku: book.sku, description: book.description || '', price: book.price, oldPrice: book.oldPrice, stock: book.stock, language: book.language, grade: book.grade, cover: book.cover, accent: book.accent, ...mediaData, rating: book.rating, onSale: Boolean(book.onSale), isNew: book.flags.includes('new'), isFeatured: book.flags.includes('featured'), isTopRated: book.flags.includes('topRated'), categoryId: categoryByName.get(book.category)! };
    await prisma.product.upsert({ where: { id: book.id }, update: data, create: { id: book.id, ...data } });
  }
  await prisma.siteSetting.upsert({ where: { key: 'main' }, update: {}, create: { key: 'main', value: DEFAULT_SETTINGS as unknown as Prisma.InputJsonValue } });
  console.log(`Seeded ${PRODUCTS.length} books and ${names.length} categories.`);
}

main().catch(error => { console.error(error); process.exitCode = 1; }).finally(async () => prisma.$disconnect());
