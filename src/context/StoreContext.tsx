import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import type { Inquiry, Order, Product, SiteSettings } from '../types';
import { CATALOG_CATEGORIES, DEFAULT_SETTINGS, PRODUCTS } from '../data/products';
import { API_URL, apiJson, apiRequest } from '../services/api';

type Cart = Record<string, number>;
type ServerOrder = { id: string; orderNumber: string; status: string; total: number | string; createdAt: string; paymentMethod: string; paymentStatus?: string; paymentReference?: string | null; customer: { name: string; email: string }; items: { productId: string; quantity: number }[] };
export type MascotSignal = { token: number; kind: 'peek' | 'cart' | 'wishlist' | 'compare' | 'search' | 'filter' | 'broadcast'; productName?: string; price?: number; text?: string; coords?: { x: number; y: number } };
type MascotSignalInput = Omit<MascotSignal, 'token'>;
type StoreValue = {
  products: Product[]; cart: Cart; wishlist: string[]; compare: string[]; orders: Order[]; inquiries: Inquiry[];
  newsletter: string[]; settings: SiteSettings; categories: string[]; mascotSignal: MascotSignal | null;
  notifyMascot: (signal: MascotSignalInput) => void;
  addToCart: (id: string, qty?: number) => void; removeFromCart: (id: string) => void; setQty: (id: string, qty: number) => void;
  toggleWishlist: (id: string) => void; toggleCompare: (id: string) => void;
  saveProduct: (product: Product) => void; deleteProduct: (id: string) => void; saveSettings: (settings: SiteSettings) => void;
  addCategory: (name: string) => void; submitInquiry: (inquiry: Omit<Inquiry, 'id' | 'createdAt'>) => Promise<void>;
  moveCategory: (name: string, direction: -1 | 1) => void; removeCategory: (name: string) => void;
  subscribe: (email: string) => Promise<void>; placeOrder: (order: Omit<Order, 'id' | 'createdAt' | 'status'>) => Promise<Order>;
  updateOrder: (id: string, status: Order['status']) => void; clearCart: () => void;
  setOrdersFromServer: (orders: ServerOrder[]) => void;
};

const StoreContext = createContext<StoreValue | null>(null);
function fromStorage<T>(key: string, fallback: T): T {
  try { const value = localStorage.getItem(`andra:${key}`); return value ? JSON.parse(value) as T : fallback; } catch { return fallback; }
}
function persist<T>(key: string, value: T) {
  try { localStorage.setItem(`andra:${key}`, JSON.stringify(value)); } catch { /* Keep the storefront usable if browser storage is full or unavailable. */ }
}

const isRecord = (value: unknown): value is Record<string, unknown> => Boolean(value) && typeof value === 'object' && !Array.isArray(value);
const textOr = (value: unknown, fallback: string) => typeof value === 'string' ? value : fallback;
const numberOr = (value: unknown, fallback: number) => typeof value === 'number' && Number.isFinite(value) ? value : fallback;
const stringsOr = (value: unknown, fallback: string[]) => Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : fallback;

function normalizeSettings(raw: unknown): SiteSettings {
  const saved = isRecord(raw) ? raw as Partial<SiteSettings> : {};
  const heroTitle = saved.heroTitle === 'Aamaiyum Muyalum' ? 'Aamaiyum\nMuyalum' : textOr(saved.heroTitle, DEFAULT_SETTINGS.heroTitle);
  const legacyCategoryNames: Record<string, string> = { 'English Language': 'English & Math Workbooks', 'Coloring Book': 'Coloring Books', 'Tamil Language': 'Tamil Workbooks' };
  const promoCards = DEFAULT_SETTINGS.promoCards.map((card, index) => { const rawCard = Array.isArray(saved.promoCards) ? saved.promoCards[index] : undefined; const merged = { ...card, ...(isRecord(rawCard) ? rawCard : {}) }; return { eyebrow: textOr(merged.eyebrow, card.eyebrow), title: textOr(merged.title, card.title), subtitle: textOr(merged.subtitle, card.subtitle), category: legacyCategoryNames[textOr(merged.category, card.category)] || textOr(merged.category, card.category), imageUrl: textOr(merged.imageUrl, card.imageUrl || '') }; });
  const savedMascot: Record<string, unknown> = isRecord(saved.mascot) ? saved.mascot : {};
  const mascotMessages: Record<string, unknown> = isRecord(savedMascot.messages) ? savedMascot.messages : {};
  const mascot = { ...DEFAULT_SETTINGS.mascot, ...savedMascot, enabled: typeof savedMascot.enabled === 'boolean' ? savedMascot.enabled : DEFAULT_SETTINGS.mascot.enabled, defaultMode: savedMascot.defaultMode === 'dock' ? 'dock' as const : 'roam' as const, broadcast: textOr(savedMascot.broadcast, DEFAULT_SETTINGS.mascot.broadcast), broadcastIntervalSeconds: numberOr(savedMascot.broadcastIntervalSeconds, DEFAULT_SETTINGS.mascot.broadcastIntervalSeconds), messages: Object.fromEntries(Object.entries(DEFAULT_SETTINGS.mascot.messages).map(([key, fallback]) => [key, textOr(mascotMessages[key], fallback)])) as SiteSettings['mascot']['messages'] };
  const savedSlider: Record<string, unknown> = isRecord(saved.heroSlider) ? saved.heroSlider : {};
  const themes = ['pink', 'sky', 'amber', 'mint', 'lavender', 'custom'];
  const slides = Array.isArray(savedSlider.slides) ? (savedSlider.slides as unknown[]).flatMap((item, index) => {
    if (!isRecord(item)) return [];
    const fallback = DEFAULT_SETTINGS.heroSlider.slides[index] || DEFAULT_SETTINGS.heroSlider.slides[0];
    return [{ id: textOr(item.id, `saved-slide-${index}`), titleLine1: textOr(item.titleLine1, fallback.titleLine1), titleLine2: textOr(item.titleLine2, fallback.titleLine2), subtitle: textOr(item.subtitle, fallback.subtitle), buttonText: textOr(item.buttonText, fallback.buttonText), buttonLink: textOr(item.buttonLink, fallback.buttonLink), bookProductId: textOr(item.bookProductId, fallback.bookProductId || ''), bookImage: textOr(item.bookImage, ''), bgTheme: themes.includes(String(item.bgTheme)) ? item.bgTheme as SiteSettings['heroSlider']['slides'][number]['bgTheme'] : fallback.bgTheme, bgGradient: textOr(item.bgGradient, ''), bgImage: textOr(item.bgImage, ''), isActive: typeof item.isActive === 'boolean' ? item.isActive : true }];
  }) : DEFAULT_SETTINGS.heroSlider.slides;
  const heroSlider: SiteSettings['heroSlider'] = { autoPlay: typeof savedSlider.autoPlay === 'boolean' ? savedSlider.autoPlay : true, intervalMs: Math.max(3000, Math.min(10000, numberOr(savedSlider.intervalMs, 5000))), showArrows: typeof savedSlider.showArrows === 'boolean' ? savedSlider.showArrows : true, showDots: typeof savedSlider.showDots === 'boolean' ? savedSlider.showDots : true, slides };
  if (!isRecord(saved.heroSlider) && (saved.heroTitle || saved.heroSubtitle || saved.heroButton || saved.heroProductId)) {
    const [line1, ...otherLines] = heroTitle.split('\n');
    heroSlider.slides = [{ ...heroSlider.slides[0], titleLine1: line1, titleLine2: otherLines.join(' ') || '', subtitle: textOr(saved.heroSubtitle, DEFAULT_SETTINGS.heroSubtitle), buttonText: textOr(saved.heroButton, DEFAULT_SETTINGS.heroButton), bookProductId: textOr(saved.heroProductId, DEFAULT_SETTINGS.heroProductId) }, ...heroSlider.slides.slice(1)];
  }
  const savedPayments: Record<string, unknown> = isRecord(saved.payments) ? saved.payments : {};
  const payhere: Record<string, unknown> = isRecord(savedPayments.payhere) ? savedPayments.payhere : {};
  const dialog: Record<string, unknown> = isRecord(savedPayments.dialog) ? savedPayments.dialog : {};
  const cod: Record<string, unknown> = isRecord(savedPayments.cod) ? savedPayments.cod : {};
  const bank: Record<string, unknown> = isRecord(savedPayments.bank) ? savedPayments.bank : {};
  const paymentMode = (value: unknown): 'demo' | 'sandbox' | 'live' => value === 'sandbox' || value === 'live' ? value : 'demo';
  const payments: SiteSettings['payments'] = {
    payhere: { enabled: typeof payhere.enabled === 'boolean' ? payhere.enabled : true, mode: paymentMode(payhere.mode), merchantId: textOr(payhere.merchantId, ''), title: textOr(payhere.title, DEFAULT_SETTINGS.payments.payhere.title), description: textOr(payhere.description, DEFAULT_SETTINGS.payments.payhere.description) },
    dialog: { enabled: typeof dialog.enabled === 'boolean' ? dialog.enabled : true, mode: paymentMode(dialog.mode), merchantId: textOr(dialog.merchantId, ''), walletNumber: textOr(dialog.walletNumber, ''), channels: stringsOr(dialog.channels, DEFAULT_SETTINGS.payments.dialog.channels).filter((item): item is 'genie' | 'ezcash' | 'lankaqr' => ['genie', 'ezcash', 'lankaqr'].includes(item)), title: textOr(dialog.title, DEFAULT_SETTINGS.payments.dialog.title), description: textOr(dialog.description, DEFAULT_SETTINGS.payments.dialog.description) },
    cod: { enabled: typeof cod.enabled === 'boolean' ? cod.enabled : true },
    bank: { enabled: bank.enabled === true, bankName: textOr(bank.bankName, ''), branch: textOr(bank.branch, ''), accountName: textOr(bank.accountName, DEFAULT_SETTINGS.payments.bank.accountName), accountNumber: textOr(bank.accountNumber, ''), whatsappReceipt: textOr(bank.whatsappReceipt, DEFAULT_SETTINGS.payments.bank.whatsappReceipt) },
    flatShipping: Math.max(0, numberOr(savedPayments.flatShipping, 0)), freeShippingThreshold: Math.max(0, numberOr(savedPayments.freeShippingThreshold, 0)),
  };
  const savedSocial: Record<string, unknown> = isRecord(saved.socialLinks) ? saved.socialLinks : {};
  const socialLinks = Object.fromEntries(Object.entries(DEFAULT_SETTINGS.socialLinks).map(([key, fallback]) => [key, textOr(savedSocial[key], fallback)])) as SiteSettings['socialLinks'];
  const testimonials = Array.isArray(saved.testimonials) ? saved.testimonials.filter(isRecord).map(item => ({ quote: textOr(item.quote, ''), name: textOr(item.name, '') })).filter(item => item.quote && item.name) : DEFAULT_SETTINGS.testimonials;
  return { ...DEFAULT_SETTINGS, ...saved, announcement: textOr(saved.announcement, DEFAULT_SETTINGS.announcement), address: textOr(saved.address, DEFAULT_SETTINGS.address), phones: stringsOr(saved.phones, DEFAULT_SETTINGS.phones), whatsapp: textOr(saved.whatsapp, DEFAULT_SETTINGS.whatsapp), brandColor: textOr(saved.brandColor, DEFAULT_SETTINGS.brandColor), heroTitle, heroSubtitle: textOr(saved.heroSubtitle, DEFAULT_SETTINGS.heroSubtitle), heroButton: textOr(saved.heroButton, DEFAULT_SETTINGS.heroButton), heroProductId: textOr(saved.heroProductId, DEFAULT_SETTINGS.heroProductId), heroSlider, payments, promoCards, mascot, socialLinks, testimonials, promoTitle: textOr(saved.promoTitle, DEFAULT_SETTINGS.promoTitle), promoDescription: textOr(saved.promoDescription, DEFAULT_SETTINGS.promoDescription), promoTarget: textOr(saved.promoTarget, DEFAULT_SETTINGS.promoTarget), logoUrl: textOr(saved.logoUrl, ''), aboutImageUrl: textOr(saved.aboutImageUrl, '') };
}

function loadSettings(): SiteSettings {
  const current = fromStorage<Partial<SiteSettings> | null>('settings:v2', null);
  if (current) return normalizeSettings(current);
  return normalizeSettings(fromStorage<Partial<SiteSettings>>('settings', {}));
}

function loadProducts(): Product[] {
  const saved = fromStorage<unknown>('products:v5', null);
  if (!Array.isArray(saved)) return PRODUCTS;
  return saved.flatMap((item: unknown) => {
    if (!isRecord(item) || typeof item.id !== 'string') return [];
    const base = PRODUCTS.find(product => product.id === item.id);
    if (!base && typeof item.name !== 'string') return [];
    const merged = { ...base, ...item };
    const flags = stringsOr(item.flags, base?.flags || []).filter((flag): flag is Product['flags'][number] => ['new', 'featured', 'topRated'].includes(flag));
    return [{ ...merged, id: item.id, name: textOr(item.name, base?.name || ''), category: textOr(item.category, base?.category || 'Books'), price: numberOr(item.price, base?.price || 0), oldPrice: typeof item.oldPrice === 'number' ? item.oldPrice : base?.oldPrice, cover: textOr(item.cover, base?.cover || ''), accent: textOr(item.accent, base?.accent || '#df0067'), language: ['Tamil', 'Sinhala', 'English', 'Bilingual'].includes(String(item.language)) ? item.language as Product['language'] : base?.language || 'English', grade: normalizeGrade(item.grade ?? base?.grade), sku: textOr(item.sku, base?.sku || item.id), isbn: typeof item.isbn === 'string' ? item.isbn : base?.isbn, ageGroup: typeof item.ageGroup === 'string' ? item.ageGroup : base?.ageGroup, pages: typeof item.pages === 'number' && Number.isFinite(item.pages) ? item.pages : base?.pages, setInfo: typeof item.setInfo === 'string' ? item.setInfo : base?.setInfo, dimensions: typeof item.dimensions === 'string' ? item.dimensions : base?.dimensions, stock: Math.max(0, Math.floor(numberOr(item.stock, base?.stock || 0))), rating: Math.max(0, Math.min(5, numberOr(item.rating, base?.rating || 0))), flags, coverImage: typeof item.coverImage === 'string' ? item.coverImage : base?.coverImage, imageUrl: typeof item.imageUrl === 'string' ? item.imageUrl : base?.imageUrl, insideImage: typeof item.insideImage === 'string' ? item.insideImage : base?.insideImage, galleryImages: stringsOr(item.galleryImages, base?.galleryImages || []) } as Product];
  });
}

function normalizeGrade(grade: unknown): string | undefined {
  if (typeof grade === 'number') return `Grade ${grade}`;
  return typeof grade === 'string' && grade.trim() ? (/^\d/.test(grade.trim()) ? `Grade ${grade.trim()}` : grade.trim()) : undefined;
}

export function StoreProvider({ children }: { children: ReactNode }) {
  const [products, setProducts] = useState<Product[]>(loadProducts);
  const [cart, setCart] = useState<Cart>(() => { const saved = fromStorage<unknown>('cart', {}); return isRecord(saved) ? Object.fromEntries(Object.entries(saved).filter(([, qty]) => typeof qty === 'number' && Number.isInteger(qty) && qty > 0)) as Cart : {}; });
  const [wishlist, setWishlist] = useState<string[]>(() => stringsOr(fromStorage<unknown>('wishlist', []), []));
  const [compare, setCompare] = useState<string[]>(() => stringsOr(fromStorage<unknown>('compare', []), []));
  const [orders, setOrders] = useState<Order[]>(() => { const saved = fromStorage<unknown>('orders', []); return Array.isArray(saved) ? saved.filter((item): item is Order => isRecord(item) && typeof item.id === 'string' && typeof item.customer === 'string' && typeof item.email === 'string' && typeof item.total === 'number' && Number.isFinite(item.total) && typeof item.status === 'string' && typeof item.createdAt === 'string' && Array.isArray(item.items) && item.items.every(row => isRecord(row) && typeof row.productId === 'string' && typeof row.quantity === 'number' && Number.isFinite(row.quantity))) : []; });
  const [inquiries, setInquiries] = useState<Inquiry[]>(() => { const saved = fromStorage<unknown>('inquiries', []); return Array.isArray(saved) ? saved.filter((item): item is Inquiry => isRecord(item) && typeof item.id === 'string' && typeof item.name === 'string' && typeof item.email === 'string' && typeof item.message === 'string') : []; });
  const [newsletter, setNewsletter] = useState<string[]>(() => stringsOr(fromStorage<unknown>('newsletter', []), []));
  const [settings, setSettings] = useState<SiteSettings>(loadSettings);
  const [categories, setCategories] = useState<string[]>(() => stringsOr(fromStorage<unknown>('categories:v2', CATALOG_CATEGORIES), CATALOG_CATEGORIES));
  const [mascotSignal, setMascotSignal] = useState<MascotSignal | null>(null);
  const notifyMascot = useCallback((signal: MascotSignalInput) => setMascotSignal({ ...signal, token: Date.now() + Math.random() }), []);
  // Hide obsolete demo IDs without discarding saved selections while an API catalog loads.
  const currentProductIds = useMemo(() => new Set(products.map(product => product.id)), [products]);
  const availableCart = useMemo(() => Object.fromEntries(Object.entries(cart).filter(([id, quantity]) => currentProductIds.has(id) && Number.isInteger(quantity) && quantity > 0)), [cart, currentProductIds]);
  const availableWishlist = useMemo(() => wishlist.filter(id => currentProductIds.has(id)), [wishlist, currentProductIds]);
  const availableCompare = useMemo(() => compare.filter(id => currentProductIds.has(id)), [compare, currentProductIds]);

  useEffect(() => {
    if (!API_URL) return;
    type ApiProduct = Omit<Product, 'category' | 'flags' | 'price' | 'oldPrice' | 'grade' | 'galleryImages'> & { category: { name: string }; price: number | string; oldPrice: number | string | null; grade: string | number | null; galleryImages: unknown; isNew: boolean; isFeatured: boolean; isTopRated: boolean };
    void apiRequest<ApiProduct[]>('/products').then(rows => setProducts(rows.map(row => ({ ...row, price: Number(row.price), oldPrice: row.oldPrice == null ? undefined : Number(row.oldPrice), grade: normalizeGrade(row.grade), category: row.category.name, coverImage: row.coverImage || row.imageUrl || undefined, galleryImages: Array.isArray(row.galleryImages) ? row.galleryImages.filter((image): image is string => typeof image === 'string') : [], flags: [...(row.isNew ? ['new' as const] : []), ...(row.isFeatured ? ['featured' as const] : []), ...(row.isTopRated ? ['topRated' as const] : [])] })))).catch(() => undefined);
    void apiRequest<SiteSettings>('/settings').then(remote => { if (remote && Object.keys(remote).length) setSettings(normalizeSettings(remote)); }).catch(() => undefined);
    void apiRequest<{ name: string }[]>('/categories').then(rows => { if (rows.length) setCategories(rows.map(row => row.name)); }).catch(() => undefined);
  }, []);

  useEffect(() => { persist('products:v5', products); }, [products]);
  useEffect(() => { persist('cart', cart); }, [cart]);
  useEffect(() => { persist('wishlist', wishlist); }, [wishlist]);
  useEffect(() => { persist('compare', compare); }, [compare]);
  useEffect(() => { persist('orders', orders); }, [orders]);
  useEffect(() => { persist('inquiries', inquiries); }, [inquiries]);
  useEffect(() => { persist('newsletter', newsletter); }, [newsletter]);
  useEffect(() => { persist('settings:v2', settings); document.documentElement.style.setProperty('--brand', settings.brandColor); }, [settings]);
  useEffect(() => { persist('categories:v2', categories); }, [categories]);

  const setOrdersFromServer = useCallback((rows: ServerOrder[]) => setOrders(rows.map(row => ({ id: row.orderNumber, remoteId: row.id, customer: row.customer.name, email: row.customer.email, total: Number(row.total), paymentMethod: row.paymentMethod === 'PAYHERE' ? 'payhere' : row.paymentMethod === 'DIALOG_PAY' ? 'dialog' : row.paymentMethod === 'BANK_TRANSFER' ? 'bank' : row.paymentMethod === 'ONLINE' ? 'online' : 'cod', paymentStatus: row.paymentStatus === 'DEMO_PAID' ? 'demo-paid' : row.paymentStatus === 'PAID' ? 'paid' : row.paymentStatus === 'FAILED' ? 'failed' : 'pending', paymentReference: row.paymentReference || undefined, status: (row.status.slice(0, 1) + row.status.slice(1).toLowerCase()) as Order['status'], createdAt: row.createdAt, items: row.items }))), []);

  const value = useMemo<StoreValue>(() => ({
    products, cart: availableCart, wishlist: availableWishlist, compare: availableCompare, orders, inquiries, newsletter, settings, categories, mascotSignal, notifyMascot,
    addToCart: (id, qty = 1) => { setCart(c => ({ ...c, [id]: (c[id] || 0) + qty })); const product = products.find(item => item.id === id); notifyMascot({ kind: 'cart', productName: product?.name }); },
    removeFromCart: id => setCart(c => { const next = { ...c }; delete next[id]; return next; }),
    setQty: (id, qty) => setCart(c => { if (qty <= 0) { const next = { ...c }; delete next[id]; return next; } return { ...c, [id]: qty }; }),
    toggleWishlist: id => { const removing = wishlist.includes(id); setWishlist(list => removing ? list.filter(x => x !== id) : [...list, id]); const product = products.find(item => item.id === id); notifyMascot({ kind: 'wishlist', productName: product?.name, text: removing ? 'Removed from your favorites.' : 'Saved to your favorites! ♥' }); },
    toggleCompare: id => { const removing = compare.includes(id); setCompare(list => removing ? list.filter(x => x !== id) : [...list, id].slice(-4)); notifyMascot({ kind: 'compare', text: removing ? 'Removed from your comparison list.' : 'Let’s compare those books.' }); },
    saveProduct: product => {
      setProducts(list => list.some(p => p.id === product.id) ? list.map(p => p.id === product.id ? product : p) : [product, ...list]);
      if (API_URL && localStorage.getItem('andra:token')) void apiRequest('/products', apiJson('POST', { ...product, coverImage: product.coverImage || product.imageUrl, imageUrl: product.coverImage || product.imageUrl, category: product.category, isNew: product.flags.includes('new'), isFeatured: product.flags.includes('featured'), isTopRated: product.flags.includes('topRated') }), true).catch(() => undefined);
    },
    deleteProduct: id => { setProducts(list => list.filter(p => p.id !== id)); if (API_URL && localStorage.getItem('andra:token')) void apiRequest(`/products/${id}`, { method: 'DELETE' }, true).catch(() => undefined); },
    saveSettings: next => { setSettings(next); if (API_URL && localStorage.getItem('andra:token')) void apiRequest('/settings', apiJson('PUT', next), true).catch(() => undefined); },
    addCategory: name => { setCategories(list => list.includes(name) ? list : [...list, name]); if (API_URL && localStorage.getItem('andra:token')) void apiRequest('/categories', apiJson('POST', { name }), true).catch(() => undefined); },
    moveCategory: (name, direction) => {
      const from = categories.indexOf(name); const to = from + direction;
      if (from < 0 || to < 0 || to >= categories.length) return;
      const next = [...categories]; [next[from], next[to]] = [next[to], next[from]]; setCategories(next);
      if (API_URL && localStorage.getItem('andra:token')) void apiRequest<{ id: string; name: string }[]>('/categories', {}, true).then(rows => apiRequest('/categories/reorder', apiJson('PATCH', next.map((category, sortOrder) => ({ id: rows.find(row => row.name === category)?.id, sortOrder })).filter(item => item.id)), true)).catch(() => undefined);
    },
    removeCategory: name => {
      if (products.some(product => product.category === name)) return;
      setCategories(list => list.filter(category => category !== name));
      if (API_URL && localStorage.getItem('andra:token')) void apiRequest<{ id: string; name: string }[]>('/categories', {}, true).then(rows => { const item = rows.find(row => row.name === name); return item ? apiRequest(`/categories/${item.id}`, { method: 'DELETE' }, true) : undefined; }).catch(() => undefined);
    },
    submitInquiry: async inquiry => {
      if (API_URL) {
        const saved = await apiRequest<{ id: string; name: string; email: string; phone?: string | null; company?: string | null; message: string; createdAt: string }>('/inquiries', apiJson('POST', inquiry));
        const created: Inquiry = { ...saved, phone: saved.phone || '', company: saved.company || '' };
        setInquiries(list => [created, ...list.filter(item => item.id !== created.id)]);
        return;
      }
      const created = { ...inquiry, id: crypto.randomUUID(), createdAt: new Date().toISOString() };
      setInquiries(list => [created, ...list]);
    },
    subscribe: async email => {
      const normalizedEmail = email.trim().toLowerCase();
      if (API_URL) await apiRequest('/newsletter', apiJson('POST', { email: normalizedEmail }));
      setNewsletter(list => list.includes(normalizedEmail) ? list : [normalizedEmail, ...list]);
    },
    placeOrder: async order => {
      let created: Order;
      let serverStock: Map<string, number> | undefined;
      if (API_URL) {
        const saved = await apiRequest<{ id: string; orderNumber: string; total: number | string; createdAt: string; paymentMethod: string; paymentStatus?: string; paymentReference?: string | null; customer: { name: string; email: string }; items: { productId: string; quantity: number; product: { stock: number } }[] }>('/orders', apiJson('POST', { customer: { name: order.customer, email: order.email, phone: order.phone, address: order.address, city: order.city, district: order.district }, items: order.items, discount: order.discount || 0, couponCode: order.discount ? 'ANDRA10' : undefined, notes: order.notes, demoPayment: order.paymentStatus === 'demo-paid', paymentMethod: order.paymentMethod === 'payhere' ? 'PAYHERE' : order.paymentMethod === 'dialog' ? 'DIALOG_PAY' : order.paymentMethod === 'bank' ? 'BANK_TRANSFER' : order.paymentMethod === 'online' ? 'ONLINE' : 'CASH_ON_DELIVERY' }));
        serverStock = new Map(saved.items.map(item => [item.productId, item.product.stock]));
        created = { ...order, id: saved.orderNumber, remoteId: saved.id, customer: saved.customer.name, email: saved.customer.email, total: Number(saved.total), paymentMethod: saved.paymentMethod === 'PAYHERE' ? 'payhere' : saved.paymentMethod === 'DIALOG_PAY' ? 'dialog' : saved.paymentMethod === 'BANK_TRANSFER' ? 'bank' : saved.paymentMethod === 'ONLINE' ? 'online' : 'cod', paymentStatus: saved.paymentStatus === 'DEMO_PAID' ? 'demo-paid' : saved.paymentStatus === 'PAID' ? 'paid' : 'pending', paymentReference: saved.paymentReference || undefined, status: 'Pending', createdAt: saved.createdAt };
        setOrders(list => [created, ...list.filter(existing => existing.remoteId !== saved.id && existing.id !== saved.orderNumber)]);
      } else {
        created = { ...order, id: `AB-${Date.now().toString().slice(-6)}`, status: 'Pending', createdAt: new Date().toISOString() };
        setOrders(list => [created, ...list]);
      }
      setProducts(list => list.map(product => { const item = order.items.find(row => row.productId === product.id); const stock = serverStock?.get(product.id); return stock !== undefined ? { ...product, stock } : item ? { ...product, stock: Math.max(0, product.stock - item.quantity) } : product; }));
      setCart({});
      return created;
    },
    updateOrder: (id, status) => { const order = orders.find(o => o.id === id); setOrders(list => list.map(o => o.id === id ? { ...o, status } : o)); if (API_URL && localStorage.getItem('andra:token')) void apiRequest(`/orders/${order?.remoteId || id}/status`, apiJson('PATCH', { status: status.toUpperCase() }), true).catch(() => undefined); },
    setOrdersFromServer,
    clearCart: () => setCart({}),
  }), [products, availableCart, availableWishlist, availableCompare, wishlist, compare, orders, inquiries, newsletter, settings, categories, mascotSignal, notifyMascot, setOrdersFromServer]);

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore() {
  const value = useContext(StoreContext);
  if (!value) throw new Error('useStore must be used inside StoreProvider');
  return value;
}
