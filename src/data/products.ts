import type { Product, SiteSettings } from '../types';
import { BOOK_CATALOG } from './catalogProducts';

export const PRODUCTS: Product[] = BOOK_CATALOG;
export const CATALOG_CATEGORIES = [
  'Picture Books',
  'Coloring Books',
  'Activity & Dot-to-Dot',
  'Story Books',
  'Tamil Workbooks',
  'English & Math Workbooks',
  'Exam Papers (Yarl Aruvi)',
  'History & Health (Grade 6-10)',
  'Puzzles & Wall Charts',
];
export const DEFAULT_SETTINGS: SiteSettings = {
  announcement: 'GROWING MINDS, PAGE BY PAGE',
  address: '#379, Kasthuriyar Road, Jaffna, Sri Lanka',
  phones: ['+94 77 662 2981', '+94 76 442 6745', '+94 21 222 8929'],
  whatsapp: '94776622981',
  brandColor: '#df0067',
  heroTitle: 'Aamaiyum\nMuyalum',
  heroSubtitle: 'Explore best children story books.',
  heroButton: 'SHOP NOW',
  heroProductId: 'aamaiyum-muyalum',
  heroSlider: {
    autoPlay: true, intervalMs: 5000, showArrows: true, showDots: true,
    slides: [
      { id: 'story-aamaiyum', titleLine1: 'Aamaiyum', titleLine2: 'Muyalum', subtitle: 'Explore best children story books.', buttonText: 'SHOP NOW', buttonLink: '/product/aamaiyum-muyalum', bookProductId: 'aamaiyum-muyalum', bgTheme: 'pink', isActive: true },
      { id: 'picture-series', titleLine1: 'My First Picture', titleLine2: 'Book Series', subtitle: 'Vibrant 32-page picture books for curious young minds (Age 3+).', buttonText: 'EXPLORE SERIES', buttonLink: '/shop?category=Picture%20Books', bookProductId: 'book-001-my-first-picture-book-of-abc', bgTheme: 'sky', isActive: true },
      { id: 'colouring-series', titleLine1: 'Super Find With', titleLine2: 'Colouring Books', subtitle: 'Fun die-cut colouring books for creative kids (Age 4–6).', buttonText: 'BROWSE COLOURING', buttonLink: '/shop?category=Coloring%20Books', bookProductId: 'book-015-super-find-with-colouring-animals', bgTheme: 'amber', isActive: true },
    ],
  },
  payments: {
    payhere: { enabled: true, mode: 'demo', merchantId: '', title: 'PayHere', description: 'Cards, wallets and LankaQR' },
    dialog: { enabled: true, mode: 'demo', merchantId: '', walletNumber: '', channels: ['genie', 'ezcash', 'lankaqr'], title: 'Dialog Pay', description: 'Genie, eZ Cash and QR' },
    cod: { enabled: true },
    bank: { enabled: false, bankName: '', branch: '', accountName: 'Andra Publication (Pvt) Ltd', accountNumber: '', whatsappReceipt: '94776622981' },
    flatShipping: 0, freeShippingThreshold: 0,
  },
  promoTitle: 'Best way to buy coloring books.',
  promoDescription: 'Make a little time for creativity. Our carefully selected coloring books turn every page into a new adventure.',
  promoTarget: '2026-12-31T23:59',
  promoCards: [
    { eyebrow: 'BACK TO SCHOOL', title: 'Little steps.\nBig ideas.', subtitle: 'Ready for a new school year.', category: 'English & Math Workbooks', imageUrl: '' },
    { eyebrow: 'CREATIVE HOURS', title: 'Dream, color\n& discover.', subtitle: 'Coloring books for every age.', category: 'Coloring Books', imageUrl: '' },
    { eyebrow: 'STORY TIME', title: 'Wild worlds\nawait.', subtitle: 'A new adventure on every page.', category: 'Story Books', imageUrl: '' },
  ],
  testimonials: [
    { quote: '“I was struggling to find good quality Tamil storybooks for my daughter until I found Andra Books. The stories are engaging and have helped her connect with our mother tongue.”', name: 'Priya S., Mother of a 5-year-old' },
    { quote: '“The coloring books from Andra Books are fantastic! The paper quality is great, and the illustrations keep my son busy for hours. It’s the perfect screen-free activity.”', name: 'Karthik R., Father of a 7-year-old' },
    { quote: '“We absolutely love the collection here! We bought English stories and Tamil books, and my kids enjoy reading both. Delivery was fast, and the prices are fair.”', name: 'Anitha M., Mother of two' },
  ],
  socialLinks: { facebook: '#', instagram: '#', whatsapp: 'https://wa.me/94776622981', tiktok: '#' },
  logoUrl: '',
  aboutImageUrl: '',
  mascot: {
    enabled: true,
    defaultMode: 'roam',
    messages: {
      hero: "Vanakkam & welcome! I'm Andra Buddy. Scroll down with me or hover over a book to peek inside!",
      arrivals: 'Fresh off the press! Hover over a cover to flip it open.',
      promo: 'Tick-tock! Find a favorite coloring book before the timer runs out.',
      language: 'Tamil, Sinhala, or English? Choose a language to find your next book.',
      testimonials: 'Families across Sri Lanka love reading with Andra Books!',
      shop: 'Let me help you find the right book. Try a price or stock filter.',
      product: 'Want a closer look? Use the gallery thumbnails to peek inside.',
      cart: 'Your next story is waiting. Let’s find a book to read together.',
    },
    broadcast: '',
    broadcastIntervalSeconds: 45,
  },
};
