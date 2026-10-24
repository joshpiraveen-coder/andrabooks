import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import multer from 'multer';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { PrismaClient, Prisma } from '@prisma/client';
import { z } from 'zod';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

const prisma = new PrismaClient();
const app = express();
const port = Number(process.env.PORT || 4000);
const secret = process.env.JWT_SECRET || 'development-only-change-this-secret';
const here = path.dirname(fileURLToPath(import.meta.url));
const uploadDir = path.resolve(here, '../uploads');
fs.mkdirSync(uploadDir, { recursive: true });
const upload = multer({ storage: multer.diskStorage({ destination: uploadDir, filename: (_req, file, done) => done(null, `${Date.now()}-${file.originalname.replace(/[^a-zA-Z0-9._-]/g, '')}`) }), limits: { fileSize: 8 * 1024 * 1024 }, fileFilter: (_req, file, done) => done(null, /^image\//.test(file.mimetype)) });

app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
app.use(cors({ origin: process.env.CORS_ORIGIN?.split(',') || true }));
app.use(express.json({ limit: '2mb' }));
app.use('/uploads', express.static(uploadDir));

type AuthRequest = express.Request & { admin?: { id: string; role: string }; customerAccount?: { id: string; email: string } };
class OrderRequestError extends Error {
  constructor(readonly status: number, message: string) { super(message); }
}
function requireAdmin(req: AuthRequest, res: express.Response, next: express.NextFunction) {
  const token = req.headers.authorization?.replace(/^Bearer\s+/i, '');
  if (!token) return res.status(401).json({ error: 'Sign in required.' });
  try { const payload = jwt.verify(token, secret) as { sub: string; role: string }; if (!['OWNER', 'ADMIN'].includes(payload.role)) return res.status(403).json({ error: 'Admin access required.' }); req.admin = { id: payload.sub, role: payload.role }; next(); }
  catch { return res.status(401).json({ error: 'Session expired. Sign in again.' }); }
}
function requireCustomer(req: AuthRequest, res: express.Response, next: express.NextFunction) {
  const token = req.headers.authorization?.replace(/^Bearer\s+/i, '');
  if (!token) return res.status(401).json({ error: 'Sign in required.' });
  try { const payload = jwt.verify(token, secret) as { sub: string; role: string; email: string }; if (payload.role !== 'CUSTOMER') return res.status(403).json({ error: 'Customer access required.' }); req.customerAccount = { id: payload.sub, email: payload.email }; next(); }
  catch { return res.status(401).json({ error: 'Session expired. Sign in again.' }); }
}
const asyncRoute = (handler: (req: express.Request, res: express.Response) => Promise<unknown>) => (req: express.Request, res: express.Response, next: express.NextFunction) => { void handler(req, res).catch(next); };
const productInput = z.object({ id: z.string().optional(), name: z.string().min(1), slug: z.string().optional(), sku: z.string().min(1), isbn: z.string().optional().nullable(), description: z.string().default(''), price: z.coerce.number().min(0), oldPrice: z.coerce.number().optional().nullable(), stock: z.coerce.number().int().min(0), language: z.enum(['Tamil', 'Sinhala', 'English']), grade: z.coerce.number().int().optional().nullable(), cover: z.string().default('turtle'), accent: z.string().default('#df0067'), imageUrl: z.string().optional().nullable(), coverImage: z.string().optional().nullable(), insideImage: z.string().optional().nullable(), galleryImages: z.array(z.string()).optional().nullable(), rating: z.coerce.number().min(0).max(5).default(5), onSale: z.boolean().default(false), isNew: z.boolean().default(false), isFeatured: z.boolean().default(false), isTopRated: z.boolean().default(false), metaTitle: z.string().optional().nullable(), metaDescription: z.string().optional().nullable(), focusKeywords: z.string().optional().nullable(), canonicalUrl: z.string().optional().nullable(), ogImage: z.string().optional().nullable(), category: z.string().min(1) });

app.get('/api/health', (_req, res) => res.json({ ok: true, service: 'andra-books-api' }));

app.post('/api/auth/login', asyncRoute(async (req, res) => {
  const input = z.object({ email: z.string().email(), password: z.string().min(1) }).parse(req.body);
  const admin = await prisma.adminUser.findUnique({ where: { email: input.email.toLowerCase() } });
  if (!admin || !(await bcrypt.compare(input.password, admin.passwordHash))) return res.status(401).json({ error: 'Invalid email or password.' });
  const token = jwt.sign({ role: admin.role }, secret, { subject: admin.id, expiresIn: '8h' });
  return res.json({ token, user: { id: admin.id, email: admin.email, role: admin.role } });
}));
app.post('/api/account/register', asyncRoute(async (req, res) => {
  const input = z.object({ name: z.string().min(1), email: z.string().email(), phone: z.string().optional(), password: z.string().min(8) }).parse(req.body);
  const email = input.email.toLowerCase();
  if (await prisma.customerAccount.findUnique({ where: { email } })) return res.status(409).json({ error: 'An account already exists for that email.' });
  const user = await prisma.customerAccount.create({ data: { name: input.name, email, phone: input.phone, passwordHash: await bcrypt.hash(input.password, 12) } });
  const token = jwt.sign({ role: 'CUSTOMER', email }, secret, { subject: user.id, expiresIn: '30d' });
  return res.status(201).json({ token, user: { id: user.id, name: user.name, email: user.email, phone: user.phone } });
}));
app.post('/api/account/login', asyncRoute(async (req, res) => {
  const input = z.object({ email: z.string().email(), password: z.string().min(1) }).parse(req.body);
  const user = await prisma.customerAccount.findUnique({ where: { email: input.email.toLowerCase() } });
  if (!user || !(await bcrypt.compare(input.password, user.passwordHash))) return res.status(401).json({ error: 'Email or password did not match.' });
  const token = jwt.sign({ role: 'CUSTOMER', email: user.email }, secret, { subject: user.id, expiresIn: '30d' });
  return res.json({ token, user: { id: user.id, name: user.name, email: user.email, phone: user.phone } });
}));
app.get('/api/account/orders', requireCustomer, asyncRoute(async (req, res) => {
  const account = (req as AuthRequest).customerAccount;
  if (!account) return res.status(401).json({ error: 'Sign in required.' });
  const orders = await prisma.order.findMany({ where: { customer: { email: account.email } }, include: { items: { include: { product: true } } }, orderBy: { createdAt: 'desc' } });
  return res.json(orders);
}));

app.get('/api/products', asyncRoute(async (req, res) => {
  const where: Prisma.ProductWhereInput = { ...(req.query.category ? { category: { slug: String(req.query.category) } } : {}), ...(req.query.language ? { language: String(req.query.language) } : {}), ...(req.query.search ? { name: { contains: String(req.query.search) } } : {}) };
  const products = await prisma.product.findMany({ where, include: { category: true }, orderBy: { createdAt: 'desc' } });
  return res.json(products);
}));
app.post('/api/products', requireAdmin, asyncRoute(async (req, res) => {
  const input = productInput.parse(req.body);
  const category = await prisma.category.upsert({ where: { name: input.category }, update: {}, create: { name: input.category, slug: input.category.toLowerCase().replace(/[^a-z0-9]+/g, '-') } });
  const slug = input.slug || input.name.toLowerCase().normalize('NFKD').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  const coverImage = input.coverImage || input.imageUrl || null;
  const data = { name: input.name, slug, sku: input.sku, isbn: input.isbn || null, description: input.description, price: input.price, oldPrice: input.oldPrice ?? null, stock: input.stock, language: input.language, grade: input.grade ?? null, cover: input.cover, accent: input.accent, imageUrl: coverImage, coverImage, insideImage: input.insideImage || null, galleryImages: input.galleryImages ?? Prisma.DbNull, rating: input.rating, onSale: input.onSale, isNew: input.isNew, isFeatured: input.isFeatured, isTopRated: input.isTopRated, metaTitle: input.metaTitle || null, metaDescription: input.metaDescription || null, focusKeywords: input.focusKeywords || null, canonicalUrl: input.canonicalUrl || null, ogImage: input.ogImage || null, categoryId: category.id };
  const product = input.id ? await prisma.product.upsert({ where: { id: input.id }, update: data, create: { id: input.id, ...data } }) : await prisma.product.create({ data });
  return res.status(201).json(product);
}));
app.delete('/api/products/:id', requireAdmin, asyncRoute(async (req, res) => { await prisma.product.delete({ where: { id: req.params.id } }); return res.status(204).end(); }));

app.get('/api/categories', asyncRoute(async (_req, res) => res.json(await prisma.category.findMany({ orderBy: { sortOrder: 'asc' }, include: { _count: { select: { products: true } } } }))));
app.post('/api/categories', requireAdmin, asyncRoute(async (req, res) => { const input = z.object({ name: z.string().min(1), sortOrder: z.number().int().optional() }).parse(req.body); return res.status(201).json(await prisma.category.create({ data: { ...input, slug: input.name.toLowerCase().replace(/[^a-z0-9]+/g, '-') } })); }));
app.patch('/api/categories/reorder', requireAdmin, asyncRoute(async (req, res) => { const items = z.array(z.object({ id: z.string(), sortOrder: z.number().int() })).parse(req.body); await prisma.$transaction(items.map(item => prisma.category.update({ where: { id: item.id }, data: { sortOrder: item.sortOrder } }))); return res.json({ ok: true }); }));
app.delete('/api/categories/:id', requireAdmin, asyncRoute(async (req, res) => { const category = await prisma.category.findUnique({ where: { id: req.params.id }, include: { _count: { select: { products: true } } } }); if (!category) return res.status(404).json({ error: 'Category not found.' }); if (category._count.products) return res.status(409).json({ error: 'Move the books before removing this category.' }); await prisma.category.delete({ where: { id: category.id } }); return res.status(204).end(); }));

app.post('/api/orders', asyncRoute(async (req, res) => {
  const input = z.object({ customer: z.object({ name: z.string().min(1), email: z.string().email(), phone: z.string().optional(), address: z.string().optional(), city: z.string().optional(), district: z.string().optional() }), items: z.array(z.object({ productId: z.string(), quantity: z.number().int().positive() })).min(1), paymentMethod: z.enum(['CASH_ON_DELIVERY', 'ONLINE']).default('CASH_ON_DELIVERY'), discount: z.coerce.number().min(0).default(0), couponCode: z.string().optional(), notes: z.string().optional() }).parse(req.body);
  try {
    const order = await prisma.$transaction(async transaction => {
      const ids = [...new Set(input.items.map(item => item.productId))];
      const dbProducts = await transaction.product.findMany({ where: { id: { in: ids } } });
      if (dbProducts.length !== ids.length) throw new OrderRequestError(400, 'One or more books are unavailable.');
      const customer = await transaction.customer.create({ data: input.customer });
      for (const item of input.items) {
        const product = dbProducts.find(row => row.id === item.productId)!;
        const result = await transaction.product.updateMany({ where: { id: item.productId, stock: { gte: item.quantity } }, data: { stock: { decrement: item.quantity } } });
        if (result.count !== 1) throw new OrderRequestError(409, `${product.name} does not have enough stock.`);
      }
      const subtotal = input.items.reduce((sum, item) => sum + Number(dbProducts.find(product => product.id === item.productId)!.price) * item.quantity, 0);
      const discount = Math.min(input.discount, subtotal);
      return transaction.order.create({ data: { orderNumber: `AB-${Date.now().toString().slice(-7)}`, customerId: customer.id, paymentMethod: input.paymentMethod, subtotal, discount, couponCode: input.couponCode, total: subtotal - discount, notes: input.notes, items: { create: input.items.map(item => ({ productId: item.productId, quantity: item.quantity, unitPrice: dbProducts.find(product => product.id === item.productId)!.price })) } }, include: { customer: true, items: { include: { product: true } } } });
    });
    return res.status(201).json(order);
  } catch (error) {
    if (error instanceof OrderRequestError) return res.status(error.status).json({ error: error.message });
    throw error;
  }
}));
app.get('/api/orders', requireAdmin, asyncRoute(async (_req, res) => res.json(await prisma.order.findMany({ include: { customer: true, items: { include: { product: true } } }, orderBy: { createdAt: 'desc' } }))));
app.patch('/api/orders/:id/status', requireAdmin, asyncRoute(async (req, res) => { const { status } = z.object({ status: z.enum(['PENDING', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'CANCELLED']) }).parse(req.body); return res.json(await prisma.order.update({ where: { id: req.params.id }, data: { status } })); }));

app.post('/api/inquiries', asyncRoute(async (req, res) => { const input = z.object({ name: z.string().min(1), email: z.string().email(), phone: z.string().optional(), company: z.string().optional(), message: z.string().min(1) }).parse(req.body); return res.status(201).json(await prisma.inquiry.create({ data: input })); }));
app.get('/api/inquiries', requireAdmin, asyncRoute(async (_req, res) => res.json(await prisma.inquiry.findMany({ orderBy: { createdAt: 'desc' } }))));
app.post('/api/newsletter', asyncRoute(async (req, res) => { const { email } = z.object({ email: z.string().email() }).parse(req.body); return res.status(201).json(await prisma.newsletterSubscriber.upsert({ where: { email: email.toLowerCase() }, update: {}, create: { email: email.toLowerCase() } })); }));
app.get('/api/newsletter', requireAdmin, asyncRoute(async (_req, res) => res.json(await prisma.newsletterSubscriber.findMany({ orderBy: { createdAt: 'desc' } }))));

app.get('/api/settings', asyncRoute(async (_req, res) => { const setting = await prisma.siteSetting.findUnique({ where: { key: 'main' } }); return res.json(setting?.value || {}); }));
app.put('/api/settings', requireAdmin, asyncRoute(async (req, res) => { const value = z.record(z.unknown()).parse(req.body) as Prisma.InputJsonValue; return res.json(await prisma.siteSetting.upsert({ where: { key: 'main' }, update: { value }, create: { key: 'main', value } })); }));
app.get('/api/pages/:slug', asyncRoute(async (req, res) => { const page = await prisma.pageContent.findUnique({ where: { slug: req.params.slug } }); return page ? res.json(page) : res.status(404).json({ error: 'Page not found.' }); }));
app.put('/api/pages/:slug', requireAdmin, asyncRoute(async (req, res) => { const input = z.object({ title: z.string(), content: z.unknown(), metaTitle: z.string().optional(), metaDescription: z.string().optional(), focusKeywords: z.string().optional(), canonicalUrl: z.string().optional(), ogImage: z.string().optional() }).parse(req.body); const data = { ...input, content: input.content as Prisma.InputJsonValue }; return res.json(await prisma.pageContent.upsert({ where: { slug: req.params.slug }, update: data, create: { slug: req.params.slug, ...data } })); }));
app.get('/api/redirects/resolve', asyncRoute(async (req, res) => { const source = String(req.query.path || ''); const redirect = await prisma.redirect.findUnique({ where: { fromPath: source } }); return res.json({ toPath: redirect?.toPath || null, status: redirect?.status || null }); }));
app.get('/api/redirects', requireAdmin, asyncRoute(async (_req, res) => res.json(await prisma.redirect.findMany({ orderBy: { createdAt: 'desc' } }))));
app.post('/api/redirects', requireAdmin, asyncRoute(async (req, res) => { const input = z.object({ fromPath: z.string().startsWith('/'), toPath: z.string().startsWith('/'), status: z.union([z.literal(301), z.literal(302)]).default(301) }).parse(req.body); return res.status(201).json(await prisma.redirect.create({ data: input })); }));
app.delete('/api/redirects/:id', requireAdmin, asyncRoute(async (req, res) => { await prisma.redirect.delete({ where: { id: req.params.id } }); return res.status(204).end(); }));
app.post('/api/uploads', requireAdmin, upload.single('image'), (req, res) => { if (!req.file) return res.status(400).json({ error: 'Select an image file (maximum 8MB).' }); return res.status(201).json({ url: `/uploads/${req.file.filename}`, filename: req.file.filename }); });

app.use((error: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  if (error instanceof z.ZodError) return res.status(400).json({ error: 'Invalid request.', details: error.flatten() });
  console.error(error);
  return res.status(500).json({ error: 'The server could not complete this request.' });
});

app.listen(port, () => console.log(`Andra Books API listening on port ${port}`));
