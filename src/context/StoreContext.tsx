import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import type { Inquiry, Order, Product, SiteSettings } from '../types';
import { DEFAULT_SETTINGS, PRODUCTS } from '../data/products';
import { API_URL, apiJson, apiRequest } from '../services/api';

type Cart = Record<string, number>;
type ServerOrder = { id: string; orderNumber: string; status: string; total: number | string; createdAt: string; paymentMethod: string; customer: { name: string; email: string }; items: { productId: string; quantity: number }[] };
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

function normalizeSettings(saved: Partial<SiteSettings>): SiteSettings {
  const heroTitle = saved.heroTitle === 'Aamaiyum Muyalum' ? 'Aamaiyum\nMuyalum' : saved.heroTitle || DEFAULT_SETTINGS.heroTitle;
  const promoCards = DEFAULT_SETTINGS.promoCards.map((card, index) => ({ ...card, ...saved.promoCards?.[index] }));
  const mascot = { ...DEFAULT_SETTINGS.mascot, ...saved.mascot, messages: { ...DEFAULT_SETTINGS.mascot.messages, ...saved.mascot?.messages } };
  return { ...DEFAULT_SETTINGS, ...saved, heroTitle, promoCards, mascot, socialLinks: { ...DEFAULT_SETTINGS.socialLinks, ...saved.socialLinks } };
}

function loadSettings(): SiteSettings {
  return normalizeSettings(fromStorage<Partial<SiteSettings>>('settings', {}));
}

function loadProducts(): Product[] {
  const saved = fromStorage<Product[] | null>('products', null);
  if (!Array.isArray(saved)) return PRODUCTS;
  const products = [...saved];
  for (const sample of PRODUCTS) {
    const existingIndex = products.findIndex(product => product.id === sample.id);
    if (existingIndex < 0) products.push(sample);
    else if (sample.id === 'aamaiyum-muyalum' && products[existingIndex].sku === 'AB-ST-001') {
      products[existingIndex] = { ...products[existingIndex], sku: sample.sku, description: sample.description };
    }
  }
  return products;
}

export function StoreProvider({ children }: { children: ReactNode }) {
  const [products, setProducts] = useState<Product[]>(loadProducts);
  const [cart, setCart] = useState<Cart>(() => fromStorage('cart', {}));
  const [wishlist, setWishlist] = useState<string[]>(() => fromStorage('wishlist', []));
  const [compare, setCompare] = useState<string[]>(() => fromStorage('compare', []));
  const [orders, setOrders] = useState<Order[]>(() => fromStorage('orders', []));
  const [inquiries, setInquiries] = useState<Inquiry[]>(() => fromStorage('inquiries', []));
  const [newsletter, setNewsletter] = useState<string[]>(() => fromStorage('newsletter', []));
  const [settings, setSettings] = useState<SiteSettings>(loadSettings);
  const [categories, setCategories] = useState<string[]>(() => fromStorage('categories', [...new Set(PRODUCTS.map(p => p.category))]));
  const [mascotSignal, setMascotSignal] = useState<MascotSignal | null>(null);
  const notifyMascot = useCallback((signal: MascotSignalInput) => setMascotSignal({ ...signal, token: Date.now() + Math.random() }), []);

  useEffect(() => {
    if (!API_URL) return;
    type ApiProduct = Omit<Product, 'category' | 'flags' | 'price' | 'galleryImages'> & { category: { name: string }; price: number | string; galleryImages: unknown; isNew: boolean; isFeatured: boolean; isTopRated: boolean };
    void apiRequest<ApiProduct[]>('/products').then(rows => setProducts(rows.map(row => ({ ...row, price: Number(row.price), category: row.category.name, coverImage: row.coverImage || row.imageUrl || undefined, galleryImages: Array.isArray(row.galleryImages) ? row.galleryImages.filter((image): image is string => typeof image === 'string') : [], flags: [...(row.isNew ? ['new' as const] : []), ...(row.isFeatured ? ['featured' as const] : []), ...(row.isTopRated ? ['topRated' as const] : [])] })))).catch(() => undefined);
    void apiRequest<SiteSettings>('/settings').then(remote => { if (remote && Object.keys(remote).length) setSettings(normalizeSettings(remote)); }).catch(() => undefined);
    void apiRequest<{ name: string }[]>('/categories').then(rows => { if (rows.length) setCategories(rows.map(row => row.name)); }).catch(() => undefined);
  }, []);

  useEffect(() => { localStorage.setItem('andra:products', JSON.stringify(products)); }, [products]);
  useEffect(() => { localStorage.setItem('andra:cart', JSON.stringify(cart)); }, [cart]);
  useEffect(() => { localStorage.setItem('andra:wishlist', JSON.stringify(wishlist)); }, [wishlist]);
  useEffect(() => { localStorage.setItem('andra:compare', JSON.stringify(compare)); }, [compare]);
  useEffect(() => { localStorage.setItem('andra:orders', JSON.stringify(orders)); }, [orders]);
  useEffect(() => { localStorage.setItem('andra:inquiries', JSON.stringify(inquiries)); }, [inquiries]);
  useEffect(() => { localStorage.setItem('andra:newsletter', JSON.stringify(newsletter)); }, [newsletter]);
  useEffect(() => { localStorage.setItem('andra:settings', JSON.stringify(settings)); document.documentElement.style.setProperty('--brand', settings.brandColor); }, [settings]);
  useEffect(() => { localStorage.setItem('andra:categories', JSON.stringify(categories)); }, [categories]);

  const setOrdersFromServer = useCallback((rows: ServerOrder[]) => setOrders(rows.map(row => ({ id: row.orderNumber, remoteId: row.id, customer: row.customer.name, email: row.customer.email, total: Number(row.total), paymentMethod: row.paymentMethod === 'ONLINE' ? 'online' : 'cod', status: (row.status.slice(0, 1) + row.status.slice(1).toLowerCase()) as Order['status'], createdAt: row.createdAt, items: row.items }))), []);

  const value = useMemo<StoreValue>(() => ({
    products, cart, wishlist, compare, orders, inquiries, newsletter, settings, categories, mascotSignal, notifyMascot,
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
        const saved = await apiRequest<{ id: string; orderNumber: string; total: number | string; createdAt: string; paymentMethod: string; customer: { name: string; email: string }; items: { productId: string; quantity: number; product: { stock: number } }[] }>('/orders', apiJson('POST', { customer: { name: order.customer, email: order.email, phone: order.phone, address: order.address, city: order.city, district: order.district }, items: order.items, discount: order.discount || 0, couponCode: order.discount ? 'ANDRA10' : undefined, notes: order.notes, paymentMethod: order.paymentMethod === 'online' ? 'ONLINE' : 'CASH_ON_DELIVERY' }));
        serverStock = new Map(saved.items.map(item => [item.productId, item.product.stock]));
        created = { ...order, id: saved.orderNumber, remoteId: saved.id, customer: saved.customer.name, email: saved.customer.email, total: Number(saved.total), paymentMethod: saved.paymentMethod === 'ONLINE' ? 'online' : 'cod', status: 'Pending', createdAt: saved.createdAt };
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
  }), [products, cart, wishlist, compare, orders, inquiries, newsletter, settings, categories, mascotSignal, notifyMascot, setOrdersFromServer]);

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore() {
  const value = useContext(StoreContext);
  if (!value) throw new Error('useStore must be used inside StoreProvider');
  return value;
}
