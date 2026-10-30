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
import { createCipheriv, createDecipheriv, createHash, randomBytes, randomUUID } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { payhereCheckoutHash, verifyPayHereNotification, type PayHereNotification } from './payhere';

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
app.use(express.urlencoded({ extended: false, limit: '32kb' }));
app.use('/uploads', express.static(uploadDir));

type GatewaySecrets = { payhereSecret?: string; dialogApiKey?: string };
function encryptionKey() {
  const value = process.env.PAYMENT_CONFIG_KEY || '';
  if (value.length < 32) throw new OrderRequestError(503, 'Set PAYMENT_CONFIG_KEY (at least 32 characters) on the API server before saving gateway credentials.');
  return createHash('sha256').update(value).digest();
}
async function gatewaySecrets(): Promise<GatewaySecrets> {
  const stored = await prisma.siteSetting.findUnique({ where: { key: 'payment-secrets' } });
  let decrypted: GatewaySecrets = {};
  if (stored?.value && typeof stored.value === 'object' && !Array.isArray(stored.value)) {
    const value = stored.value as { iv?: string; tag?: string; data?: string };
    if (value.iv && value.tag && value.data) {
      const decipher = createDecipheriv('aes-256-gcm', encryptionKey(), Buffer.from(value.iv, 'base64'));
      decipher.setAuthTag(Buffer.from(value.tag, 'base64'));
      decrypted = JSON.parse(Buffer.concat([decipher.update(Buffer.from(value.data, 'base64')), decipher.final()]).toString('utf8')) as GatewaySecrets;
    }
  }
  return { payhereSecret: decrypted.payhereSecret || process.env.PAYHERE_MERCHANT_SECRET, dialogApiKey: decrypted.dialogApiKey || process.env.DIALOG_PAY_API_KEY };
}
async function publicPaymentSettings() {
  const setting = await prisma.siteSetting.findUnique({ where: { key: 'main' } });
  const value = setting?.value && typeof setting.value === 'object' && !Array.isArray(setting.value) ? setting.value as Record<string, unknown> : {};
  const payments = value.payments && typeof value.payments === 'object' && !Array.isArray(value.payments) ? value.payments as Record<string, unknown> : {};
  const method = (key: string) => payments[key] && typeof payments[key] === 'object' && !Array.isArray(payments[key]) ? payments[key] as Record<string, unknown> : {};
  return {
    payhere: { enabled: method('payhere').enabled !== false, mode: String(method('payhere').mode || 'demo'), merchantId: String(method('payhere').merchantId || process.env.PAYHERE_MERCHANT_ID || '') },
    dialog: { enabled: method('dialog').enabled !== false, mode: String(method('dialog').mode || 'demo'), merchantId: String(method('dialog').merchantId || '') },
    cod: { enabled: method('cod').enabled !== false },
    bank: { enabled: method('bank').enabled === true, accountNumber: String(method('bank').accountNumber || '') },
    flatShipping: Math.max(0, Number(payments.flatShipping) || 0),
    freeShippingThreshold: Math.max(0, Number(payments.freeShippingThreshold) || 0),
  };
}

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
const optionalCatalogText = z.string().trim().max(191).optional().nullable();
const productInput = z.object({
  id: z.string().min(1).optional(), name: z.string().trim().min(1), slug: z.string().trim().optional(), sku: z.string().trim().min(1),
  isbn: optionalCatalogText, ageGroup: optionalCatalogText, grade: optionalCatalogText,
  pages: z.coerce.number().int().positive().optional().nullable(), setInfo: optionalCatalogText, dimensions: optionalCatalogText,
  description: z.string().default(''), price: z.coerce.number().min(0), oldPrice: z.coerce.number().min(0).optional().nullable(), stock: z.coerce.number().int().min(0),
  language: z.enum(['Tamil', 'Sinhala', 'English', 'Bilingual']), cover: z.string().default('turtle'), accent: z.string().default('#df0067'),
  imageUrl: z.string().optional().nullable(), coverImage: z.string().optional().nullable(), insideImage: z.string().optional().nullable(), galleryImages: z.array(z.string()).optional().nullable(),
  rating: z.coerce.number().min(0).max(5).default(5), onSale: z.boolean().default(false), isNew: z.boolean().default(false), isFeatured: z.boolean().default(false), isTopRated: z.boolean().default(false),
  metaTitle: z.string().optional().nullable(), metaDescription: z.string().optional().nullable(), focusKeywords: z.string().optional().nullable(), canonicalUrl: z.string().optional().nullable(), ogImage: z.string().optional().nullable(), category: z.string().min(1),
});

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
  const language = String(req.query.language || '');
  const where: Prisma.ProductWhereInput = { ...(req.query.category ? { category: { slug: String(req.query.category) } } : {}), ...(language ? { language: language === 'English' ? { in: ['English', 'Bilingual'] } : language } : {}), ...(req.query.search ? { name: { contains: String(req.query.search) } } : {}) };
  const products = await prisma.product.findMany({ where, include: { category: true }, orderBy: { createdAt: 'desc' } });
  return res.json(products);
}));
app.post('/api/products', requireAdmin, asyncRoute(async (req, res) => {
  const input = productInput.parse(req.body);
  const category = await prisma.category.upsert({ where: { name: input.category }, update: {}, create: { name: input.category, slug: input.category.toLowerCase().replace(/[^a-z0-9]+/g, '-') } });
  const id = input.id || randomUUID();
  const slug = input.slug || input.name.toLowerCase().normalize('NFKD').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || id;
  const coverImage = input.coverImage || input.imageUrl || null;
  const data = { name: input.name, slug, sku: input.sku, isbn: input.isbn || null, ageGroup: input.ageGroup || null, description: input.description, price: input.price, oldPrice: input.oldPrice ?? null, stock: input.stock, language: input.language, grade: input.grade || null, pages: input.pages ?? null, setInfo: input.setInfo || null, dimensions: input.dimensions || null, cover: input.cover, accent: input.accent, imageUrl: coverImage, coverImage, insideImage: input.insideImage || null, galleryImages: input.galleryImages ?? Prisma.DbNull, rating: input.rating, onSale: input.onSale, isNew: input.isNew, isFeatured: input.isFeatured, isTopRated: input.isTopRated, metaTitle: input.metaTitle || null, metaDescription: input.metaDescription || null, focusKeywords: input.focusKeywords || null, canonicalUrl: input.canonicalUrl || null, ogImage: input.ogImage || null, categoryId: category.id };
  const product = await prisma.product.upsert({ where: { id }, update: data, create: { id, ...data } });
  return res.status(201).json(product);
}));
app.delete('/api/products/:id', requireAdmin, asyncRoute(async (req, res) => { await prisma.product.delete({ where: { id: req.params.id } }); return res.status(204).end(); }));

app.get('/api/categories', asyncRoute(async (_req, res) => res.json(await prisma.category.findMany({ orderBy: { sortOrder: 'asc' }, include: { _count: { select: { products: true } } } }))));
app.post('/api/categories', requireAdmin, asyncRoute(async (req, res) => { const input = z.object({ name: z.string().min(1), sortOrder: z.number().int().optional() }).parse(req.body); return res.status(201).json(await prisma.category.create({ data: { ...input, slug: input.name.toLowerCase().replace(/[^a-z0-9]+/g, '-') } })); }));
app.patch('/api/categories/reorder', requireAdmin, asyncRoute(async (req, res) => { const items = z.array(z.object({ id: z.string(), sortOrder: z.number().int() })).parse(req.body); await prisma.$transaction(items.map(item => prisma.category.update({ where: { id: item.id }, data: { sortOrder: item.sortOrder } }))); return res.json({ ok: true }); }));
app.delete('/api/categories/:id', requireAdmin, asyncRoute(async (req, res) => { const category = await prisma.category.findUnique({ where: { id: req.params.id }, include: { _count: { select: { products: true } } } }); if (!category) return res.status(404).json({ error: 'Category not found.' }); if (category._count.products) return res.status(409).json({ error: 'Move the books before removing this category.' }); await prisma.category.delete({ where: { id: category.id } }); return res.status(204).end(); }));

app.post('/api/orders', asyncRoute(async (req, res) => {
  const input = z.object({ customer: z.object({ name: z.string().min(1), email: z.string().email(), phone: z.string().optional(), address: z.string().optional(), city: z.string().optional(), district: z.string().optional() }), items: z.array(z.object({ productId: z.string(), quantity: z.number().int().positive() })).min(1), paymentMethod: z.enum(['CASH_ON_DELIVERY', 'ONLINE', 'BANK_TRANSFER', 'PAYHERE', 'DIALOG_PAY']).default('CASH_ON_DELIVERY'), demoPayment: z.boolean().default(false), discount: z.coerce.number().min(0).default(0), couponCode: z.string().optional(), notes: z.string().optional() }).parse(req.body);
  const paymentConfig = await publicPaymentSettings();
  if (input.paymentMethod === 'CASH_ON_DELIVERY' && !paymentConfig.cod.enabled) return res.status(409).json({ error: 'Cash on delivery is disabled.' });
  if (input.paymentMethod === 'BANK_TRANSFER' && (!paymentConfig.bank.enabled || !paymentConfig.bank.accountNumber)) return res.status(409).json({ error: 'Bank transfer is not configured.' });
  if (input.paymentMethod === 'PAYHERE' && !paymentConfig.payhere.enabled) return res.status(409).json({ error: 'PayHere is disabled.' });
  if (input.paymentMethod === 'DIALOG_PAY' && !paymentConfig.dialog.enabled) return res.status(409).json({ error: 'Dialog Pay is disabled.' });
  const demoMode = input.paymentMethod === 'PAYHERE' ? paymentConfig.payhere.mode === 'demo' : input.paymentMethod === 'DIALOG_PAY' ? paymentConfig.dialog.mode === 'demo' : false;
  if (input.demoPayment !== demoMode && (input.paymentMethod === 'PAYHERE' || input.paymentMethod === 'DIALOG_PAY')) return res.status(409).json({ error: 'Payment mode changed. Refresh checkout and try again.' });
  if (input.paymentMethod === 'DIALOG_PAY' && !demoMode) return res.status(409).json({ error: 'Dialog Pay live checkout is not connected to a verified merchant API.' });
  if (input.paymentMethod === 'PAYHERE' && !demoMode && (!paymentConfig.payhere.merchantId || !(await gatewaySecrets()).payhereSecret)) return res.status(409).json({ error: 'PayHere merchant credentials are incomplete.' });
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
      // Client-supplied discount amounts are display hints; never use them to price a payment.
      const discount = input.couponCode?.toUpperCase() === 'ANDRA10' ? Math.round(subtotal * 10) / 100 : 0;
      const shipping = paymentConfig.flatShipping > 0 && (paymentConfig.freeShippingThreshold <= 0 || subtotal < paymentConfig.freeShippingThreshold) ? paymentConfig.flatShipping : 0;
      return transaction.order.create({ data: { orderNumber: `AB-${Date.now().toString().slice(-7)}-${randomUUID().slice(0, 4)}`, customerId: customer.id, paymentMethod: input.paymentMethod, paymentStatus: demoMode ? 'DEMO_PAID' : 'PENDING', paymentReference: demoMode ? `${input.paymentMethod === 'PAYHERE' ? 'PH' : 'DLG'}-DEMO-${randomUUID().slice(0, 8).toUpperCase()}` : null, subtotal, shipping, discount, couponCode: discount ? 'ANDRA10' : null, total: subtotal - discount + shipping, notes: input.notes, items: { create: input.items.map(item => ({ productId: item.productId, quantity: item.quantity, unitPrice: dbProducts.find(product => product.id === item.productId)!.price })) } }, include: { customer: true, items: { include: { product: true } } } });
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
app.get('/api/payment-config', requireAdmin, asyncRoute(async (_req, res) => {
  const config = await gatewaySecrets();
  return res.json({ payhere: Boolean(config.payhereSecret), dialog: Boolean(config.dialogApiKey) });
}));
app.put('/api/payment-config', requireAdmin, asyncRoute(async (req, res) => {
  const input = z.object({ payhereSecret: z.string().max(512).optional(), dialogApiKey: z.string().max(512).optional() }).parse(req.body);
  const current = await gatewaySecrets();
  const next = { payhereSecret: input.payhereSecret?.trim() || current.payhereSecret || '', dialogApiKey: input.dialogApiKey?.trim() || current.dialogApiKey || '' };
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', encryptionKey(), iv);
  const data = Buffer.concat([cipher.update(JSON.stringify(next), 'utf8'), cipher.final()]);
  const value = { iv: iv.toString('base64'), tag: cipher.getAuthTag().toString('base64'), data: data.toString('base64') };
  await prisma.siteSetting.upsert({ where: { key: 'payment-secrets' }, update: { value }, create: { key: 'payment-secrets', value } });
  return res.json({ payhere: Boolean(next.payhereSecret), dialog: Boolean(next.dialogApiKey) });
}));

app.post('/api/payments/payhere/start', asyncRoute(async (req, res) => {
  const { orderId, email } = z.object({ orderId: z.string().min(1), email: z.string().email() }).parse(req.body);
  const order = await prisma.order.findUnique({ where: { id: orderId }, include: { customer: true, items: { include: { product: true } } } });
  if (!order || order.customer.email.toLowerCase() !== email.toLowerCase()) return res.status(404).json({ error: 'Order not found.' });
  if (order.paymentMethod !== 'PAYHERE' || order.paymentStatus !== 'PENDING') return res.status(409).json({ error: 'This order is not awaiting PayHere payment.' });
  const config = await publicPaymentSettings();
  const merchantSecret = (await gatewaySecrets()).payhereSecret;
  if (!config.payhere.enabled || !['sandbox', 'live'].includes(config.payhere.mode) || !config.payhere.merchantId || !merchantSecret) return res.status(409).json({ error: 'PayHere is not configured for server checkout.' });
  const webOrigin = (process.env.WEB_ORIGIN || '').replace(/\/$/, '');
  const publicApiOrigin = (process.env.PUBLIC_API_ORIGIN || '').replace(/\/$/, '');
  if (!webOrigin.startsWith('https://') || !publicApiOrigin.startsWith('https://')) return res.status(503).json({ error: 'Configure HTTPS WEB_ORIGIN and PUBLIC_API_ORIGIN on the API server.' });
  const [firstName, ...rest] = order.customer.name.trim().split(/\s+/);
  const amount = Number(order.total).toFixed(2);
  const fields = {
    merchant_id: config.payhere.merchantId, return_url: `${webOrigin}/checkout?payment_return=1`, cancel_url: `${webOrigin}/checkout?payment_return=1`, notify_url: `${publicApiOrigin}/api/payments/payhere/notify`,
    first_name: firstName || 'Andra', last_name: rest.join(' ') || 'Customer', email: order.customer.email, phone: order.customer.phone || '', address: order.customer.address || '', city: order.customer.city || '', country: 'Sri Lanka',
    order_id: order.orderNumber, items: order.items.map(item => item.product.name).join(', ').slice(0, 250) || `Andra Books order ${order.orderNumber}`, currency: 'LKR', amount,
    hash: payhereCheckoutHash(config.payhere.merchantId, order.orderNumber, amount, 'LKR', merchantSecret),
  };
  return res.json({ action: config.payhere.mode === 'sandbox' ? 'https://sandbox.payhere.lk/pay/checkout' : 'https://www.payhere.lk/pay/checkout', fields });
}));

app.post('/api/payments/payhere/notify', asyncRoute(async (req, res) => {
  const notification = z.object({ merchant_id: z.string(), order_id: z.string(), payhere_amount: z.string(), payhere_currency: z.string(), status_code: z.string(), md5sig: z.string(), payment_id: z.string().optional() }).parse(req.body) as PayHereNotification;
  const config = await publicPaymentSettings();
  const merchantSecret = (await gatewaySecrets()).payhereSecret;
  const order = await prisma.order.findUnique({ where: { orderNumber: notification.order_id } });
  if (!merchantSecret || !order || order.paymentMethod !== 'PAYHERE' || notification.merchant_id !== config.payhere.merchantId || notification.payhere_currency !== 'LKR' || notification.payhere_amount !== Number(order.total).toFixed(2) || !verifyPayHereNotification(notification, merchantSecret)) return res.status(400).send('Invalid notification');
  if (order.paymentStatus !== 'PAID') {
    const paymentStatus = notification.status_code === '2' ? 'PAID' : notification.status_code === '0' ? 'PENDING' : 'FAILED';
    await prisma.order.update({ where: { id: order.id }, data: { paymentStatus, paymentReference: notification.payment_id || order.paymentReference } });
  }
  return res.send('OK');
}));

app.get('/api/payments/status/:id', asyncRoute(async (req, res) => {
  const email = z.string().email().parse(req.query.email);
  const order = await prisma.order.findUnique({ where: { id: req.params.id }, include: { customer: true } });
  if (!order || order.customer.email.toLowerCase() !== email.toLowerCase()) return res.status(404).json({ error: 'Order not found.' });
  return res.json({ orderNumber: order.orderNumber, paymentMethod: order.paymentMethod, paymentStatus: order.paymentStatus, paymentReference: order.paymentReference });
}));
app.get('/api/pages/:slug', asyncRoute(async (req, res) => { const page = await prisma.pageContent.findUnique({ where: { slug: req.params.slug } }); return page ? res.json(page) : res.status(404).json({ error: 'Page not found.' }); }));
app.put('/api/pages/:slug', requireAdmin, asyncRoute(async (req, res) => { const input = z.object({ title: z.string(), content: z.unknown(), metaTitle: z.string().optional(), metaDescription: z.string().optional(), focusKeywords: z.string().optional(), canonicalUrl: z.string().optional(), ogImage: z.string().optional() }).parse(req.body); const data = { ...input, content: input.content as Prisma.InputJsonValue }; return res.json(await prisma.pageContent.upsert({ where: { slug: req.params.slug }, update: data, create: { slug: req.params.slug, ...data } })); }));
app.get('/api/redirects/resolve', asyncRoute(async (req, res) => { const source = String(req.query.path || ''); const redirect = await prisma.redirect.findUnique({ where: { fromPath: source } }); return res.json({ toPath: redirect?.toPath || null, status: redirect?.status || null }); }));
app.get('/api/redirects', requireAdmin, asyncRoute(async (_req, res) => res.json(await prisma.redirect.findMany({ orderBy: { createdAt: 'desc' } }))));
app.post('/api/redirects', requireAdmin, asyncRoute(async (req, res) => { const input = z.object({ fromPath: z.string().startsWith('/'), toPath: z.string().startsWith('/'), status: z.union([z.literal(301), z.literal(302)]).default(301) }).parse(req.body); return res.status(201).json(await prisma.redirect.create({ data: input })); }));
app.delete('/api/redirects/:id', requireAdmin, asyncRoute(async (req, res) => { await prisma.redirect.delete({ where: { id: req.params.id } }); return res.status(204).end(); }));
app.post('/api/uploads', requireAdmin, upload.single('image'), (req, res) => { if (!req.file) return res.status(400).json({ error: 'Select an image file (maximum 8MB).' }); return res.status(201).json({ url: `/uploads/${req.file.filename}`, filename: req.file.filename }); });

app.use((error: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  if (error instanceof z.ZodError) return res.status(400).json({ error: 'Invalid request.', details: error.flatten() });
  if (error instanceof OrderRequestError) return res.status(error.status).json({ error: error.message });
  console.error(error);
  return res.status(500).json({ error: 'The server could not complete this request.' });
});

app.listen(port, () => console.log(`Andra Books API listening on port ${port}`));
