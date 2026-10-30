export type Language = 'Tamil' | 'Sinhala' | 'English' | 'Bilingual';

export type Product = {
  id: string;
  slug?: string;
  name: string;
  category: string;
  price: number;
  oldPrice?: number;
  cover: string;
  accent: string;
  language: Language;
  grade?: string;
  sku: string;
  isbn?: string;
  ageGroup?: string;
  pages?: number;
  setInfo?: string;
  dimensions?: string;
  stock: number;
  onSale?: boolean;
  rating: number;
  flags: ('new' | 'featured' | 'topRated')[];
  description?: string;
  coverImage?: string;
  insideImage?: string;
  galleryImages?: string[];
  /** Legacy primary image field retained for existing local data and API records. */
  imageUrl?: string;
  metaTitle?: string;
  metaDescription?: string;
  focusKeywords?: string;
  canonicalUrl?: string;
  ogImage?: string;
};

export type MascotMessageKey = 'hero' | 'arrivals' | 'promo' | 'language' | 'testimonials' | 'shop' | 'product' | 'cart';
export type MascotSettings = {
  enabled: boolean;
  defaultMode: 'roam' | 'dock';
  messages: Record<MascotMessageKey, string>;
  broadcast: string;
  broadcastIntervalSeconds: number;
};

export type HeroSlide = {
  id: string;
  titleLine1: string;
  titleLine2: string;
  subtitle: string;
  buttonText: string;
  buttonLink: string;
  bookProductId?: string;
  bookImage?: string;
  bgTheme: 'pink' | 'sky' | 'amber' | 'mint' | 'lavender' | 'custom';
  bgGradient?: string;
  bgImage?: string;
  isActive: boolean;
};

export type HeroSliderSettings = {
  autoPlay: boolean;
  intervalMs: number;
  showArrows: boolean;
  showDots: boolean;
  slides: HeroSlide[];
};

export type PaymentMethod = 'cod' | 'bank' | 'payhere' | 'dialog';
export type PaymentStatus = 'pending' | 'paid' | 'failed' | 'demo-paid';
export type PaymentSettings = {
  payhere: { enabled: boolean; mode: 'demo' | 'sandbox' | 'live'; merchantId: string; title: string; description: string };
  dialog: { enabled: boolean; mode: 'demo' | 'sandbox' | 'live'; merchantId: string; walletNumber: string; channels: ('genie' | 'ezcash' | 'lankaqr')[]; title: string; description: string };
  cod: { enabled: boolean };
  bank: { enabled: boolean; bankName: string; branch: string; accountName: string; accountNumber: string; whatsappReceipt: string };
  flatShipping: number;
  freeShippingThreshold: number;
};

export type SiteSettings = {
  announcement: string;
  address: string;
  phones: string[];
  whatsapp: string;
  brandColor: string;
  heroTitle: string;
  heroSubtitle: string;
  heroButton: string;
  heroProductId: string;
  heroSlider: HeroSliderSettings;
  payments: PaymentSettings;
  promoTitle: string;
  promoDescription: string;
  promoTarget: string;
  promoCards: { eyebrow: string; title: string; subtitle: string; category: string; imageUrl?: string }[];
  testimonials: { quote: string; name: string }[];
  socialLinks: { facebook: string; instagram: string; whatsapp: string; tiktok: string };
  logoUrl?: string;
  aboutImageUrl?: string;
  mascot: MascotSettings;
};

export type Order = {
  id: string;
  remoteId?: string;
  customer: string;
  email: string;
  phone?: string;
  address?: string;
  city?: string;
  district?: string;
  discount?: number;
  paymentMethod?: PaymentMethod | 'online';
  paymentStatus?: PaymentStatus;
  paymentReference?: string;
  notes?: string;
  total: number;
  status: 'Pending' | 'Processing' | 'Shipped' | 'Delivered';
  createdAt: string;
  items: { productId: string; quantity: number }[];
};

export type Inquiry = { id: string; name: string; email: string; phone: string; company: string; message: string; createdAt: string };

export type SeoSettings = {
  title: string;
  description: string;
  keywords: string;
  canonical: string;
  ogImage: string;
};
