import 'dotenv/config';
import bcrypt from 'bcryptjs';
import { Prisma, PrismaClient } from '@prisma/client';
import { CATALOG_CATEGORIES, PRODUCTS, DEFAULT_SETTINGS } from '../src/data/products';

const prisma = new PrismaClient();
const legacyCategoryNames: Record<string, string> = {
  'Coloring Book': 'Coloring Books',
  'Tamil Language': 'Tamil Workbooks',
  'English Language': 'English & Math Workbooks',
  Dictionary: 'English & Math Workbooks',
};

async function main() {
  const email = (process.env.ADMIN_EMAIL || 'admin@andrabooks.lk').toLowerCase();
  const existingOwner = await prisma.adminUser.findUnique({ where: { email } });
  if (!existingOwner) {
    const password = process.env.ADMIN_PASSWORD;
    if (!password) throw new Error('Set ADMIN_PASSWORD in .env before creating the owner account.');
    await prisma.adminUser.create({ data: { email, passwordHash: await bcrypt.hash(password, 12), role: 'OWNER' } });
  }

  // Re-running this seed must preserve stock, prices, uploaded media, and owner credentials.
  // The PDF has no inventory quantities. Newly created database products start at zero stock.
  const categoryByName = new Map<string, string>();
  for (const [sortOrder, name] of CATALOG_CATEGORIES.entries()) {
    const category = await prisma.category.upsert({ where: { name }, update: {}, create: { name, slug: name.toLowerCase().replace(/[^a-z0-9]+/g, '-'), sortOrder } });
    categoryByName.set(name, category.id);
  }

  let created = 0;
  let enriched = 0;
  for (const book of PRODUCTS) {
    const slug = book.slug || book.id;
    const matches = await prisma.product.findMany({ where: { OR: [{ id: book.id }, { slug }, { sku: book.sku }] }, include: { category: true } });
    if (matches.length > 1 || (matches.length === 1 && matches[0].id !== book.id)) {
      throw new Error(`Catalog identity conflict for ${book.sku} (${book.id}). Existing IDs: ${matches.map(product => product.id).join(', ')}. Reconcile the records before re-running the seed; no duplicate was created.`);
    }
    const existing = matches[0];
    const coverImage = book.coverImage || book.imageUrl;
    const mediaData = {
      ...(coverImage ? { imageUrl: coverImage, coverImage } : {}),
      ...(book.insideImage ? { insideImage: book.insideImage } : {}),
      ...(book.galleryImages?.length ? { galleryImages: book.galleryImages } : {}),
    };
    const metadata = { isbn: book.isbn, ageGroup: book.ageGroup, grade: book.grade, pages: book.pages, setInfo: book.setInfo, dimensions: book.dimensions };

    if (existing) {
      const category = legacyCategoryNames[existing.category.name];
      await prisma.product.update({
        where: { id: existing.id },
        data: {
          isbn: existing.isbn || metadata.isbn,
          ageGroup: existing.ageGroup || metadata.ageGroup,
          grade: existing.grade || metadata.grade,
          pages: existing.pages ?? metadata.pages,
          setInfo: existing.setInfo || metadata.setInfo,
          dimensions: existing.dimensions || metadata.dimensions,
          ...(!existing.coverImage && !existing.imageUrl && coverImage ? { coverImage, imageUrl: coverImage } : {}),
          ...(!existing.insideImage && book.insideImage ? { insideImage: book.insideImage } : {}),
          ...(category ? { categoryId: categoryByName.get(category)! } : {}),
        },
      });
      enriched++;
      continue;
    }

    await prisma.product.create({
      data: {
        id: book.id, name: book.name, slug, sku: book.sku, ...metadata,
        description: book.description || '', price: book.price, oldPrice: book.oldPrice,
        stock: 0, language: book.language, cover: book.cover, accent: book.accent, ...mediaData,
        rating: book.rating, onSale: Boolean(book.onSale), isNew: book.flags.includes('new'),
        isFeatured: book.flags.includes('featured'), isTopRated: book.flags.includes('topRated'),
        categoryId: categoryByName.get(book.category)!,
      },
    });
    created++;
  }
  await prisma.siteSetting.upsert({ where: { key: 'main' }, update: {}, create: { key: 'main', value: DEFAULT_SETTINGS as unknown as Prisma.InputJsonValue } });
  console.log(`Catalog seed: ${created} books created, ${enriched} existing books enriched, ${CATALOG_CATEGORIES.length} categories. Existing inventory, prices, media, and credentials were preserved. Set stock for new books in the admin panel.`);
}

main().catch(error => { console.error(error); process.exitCode = 1; }).finally(async () => prisma.$disconnect());
