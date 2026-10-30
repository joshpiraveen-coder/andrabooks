import { useEffect, useState } from 'react';
import { Star } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useStore } from '../context/StoreContext';
import type { MascotMessageKey, Product } from '../types';
import { ProductCard } from '../components/storefront/ProductCard';
import { BookCover } from '../components/storefront/BookCover';
import { HeroSlider } from '../components/storefront/HeroSlider';
import { Seo } from '../components/storefront/Seo';
import { PRODUCTS } from '../data/products';

function ProductSection({ title, subtitle, watermark, products, tabs = false, anchor }: { title: string; subtitle: string; watermark: string; products: Product[]; tabs?: boolean; anchor?: MascotMessageKey }) {
  const { settings, notifyMascot } = useStore();
  const [language, setLanguage] = useState('Tamil');
  const visible = tabs ? products.filter(p => p.language === language || (language === 'English' && p.language === 'Bilingual')).slice(0, 5) : products.slice(0, 5);
  return <section className="container home-product-section">
    <div className={`section-heading${tabs ? ' section-heading-language' : ''}`} data-mascot-anchor={!tabs ? anchor : undefined}><div><div className="section-title-row"><h2>{title}</h2>{tabs && <div className="language-tabs" data-mascot-anchor={anchor}>{['Tamil', 'Sinhala', 'English'].map(tab => <button key={tab} className={language === tab ? 'active' : ''} onClick={() => { setLanguage(tab); notifyMascot({ kind: 'filter', text: settings.mascot.messages.language }); }}>{tab.toUpperCase()}</button>)}</div>}</div><p>{subtitle}</p></div>{!tabs && <span>{watermark}</span>}</div>
    <div className="home-product-grid">{visible.map(product => <ProductCard key={product.id} product={product}/>)}</div>
  </section>;
}

function useCountdown(target: string) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => { const timer = window.setInterval(() => setNow(Date.now()), 1000); return () => window.clearInterval(timer); }, []);
  const diff = Math.max(0, new Date(target).getTime() - now);
  return [Math.floor(diff / 86400000), Math.floor(diff / 3600000) % 24, Math.floor(diff / 60000) % 60, Math.floor(diff / 1000) % 60];
}

export function HomePage() {
  const { products, settings } = useStore();
  const newest = products.filter(p => p.flags.includes('new'));
  const featured = products.filter(p => p.flags.includes('featured'));
  const topRated = products.filter(p => p.flags.includes('topRated'));
  const countdown = useCountdown(settings.promoTarget);
  return <main className="home-page">
    <Seo title="Children's Books, Workbooks & Coloring Books" description="Discover Tamil and English story books, workbooks and coloring books for growing minds at Andra Books." structuredData={{ '@context': 'https://schema.org', '@type': 'BookStore', name: 'Andra Books', address: settings.address, telephone: settings.phones.join(', ') }}/>
    <HeroSlider/>
    <section className="container promo-bento" aria-label="Featured promotions">{settings.promoCards.map((card, i) => <Link key={`${card.eyebrow}-${i}`} to={`/shop?category=${encodeURIComponent(card.category)}`} aria-label={`${card.eyebrow}: ${card.title.replace(/\n/g, ' ')}`} className={`bento-card ${['bento-school', 'bento-floral', 'bento-adventure'][i % 3]}`}>
      {card.imageUrl || i !== 1 ? <img className="bento-image" src={card.imageUrl || (i === 0 ? '/promos/schoolboy-books.webp' : '/promos/creative-universe.webp')} alt=""/> : <div className="bento-floral-scene" aria-hidden="true"><span>DREAM DAY SALE</span><BookCover product={products.find(p => p.id === 'first-picture-flowers') || PRODUCTS[7]} /></div>}
    </Link>)}</section>
    <ProductSection title="NEW ARRIVALS" subtitle="FRESH STORIES FOR CURIOUS MINDS" watermark="ARRIVALS" products={newest} anchor="arrivals"/>
    <section className="promo-banner"><svg className="promo-curve promo-curve-top" viewBox="0 0 100 42" preserveAspectRatio="none" aria-hidden="true"><path d="M0 0h100v26C75 5 25 5 0 26z"/></svg><div className="container promo-banner-inner"><div className="promo-book-stack">{['grade-1-workbook', 'eruthulakum-singamum', 'coloring-animals', 'book-048-joyful-english-for-kids-book-1'].map(id => products.find(p => p.id === id)).filter((p): p is Product => Boolean(p?.coverImage)).map((p, i) => <BookCover key={p.id} product={p} className={`promo-book promo-book-${i < 2 ? i + 1 : i + 2}`}/>)}<img className="promo-book promo-book-3" src="/promos/andra-grade-3-workbook-cover.webp" alt="Andra Grade 3 English workbook cover"/></div><div className="promo-copy"><h2>{settings.promoTitle}</h2><p>{settings.promoDescription}</p><div className="countdown" data-mascot-anchor="promo">{countdown.map((value, i) => <div key={i}><strong>{String(value).padStart(2, '0')}</strong><span>{['Days', 'Hr', 'Min', 'Sc'][i]}</span></div>)}</div><Link to="/shop?category=Coloring%20Books" className="outline-button">SHOP NOW</Link></div></div><svg className="promo-curve promo-curve-bottom" viewBox="0 0 100 42" preserveAspectRatio="none" aria-hidden="true"><path d="M0 15C25 40 75 40 100 15v27H0z"/></svg></section>
    <ProductSection title="FEATURED PRODUCTS" subtitle="OUR FAVORITE BOOKS FOR EVERY AGE" watermark="FEATURED" products={featured}/>
    <ProductSection title="POPULAR IN LANGUAGE" subtitle="FIND A NEW FAVORITE IN YOUR LANGUAGE" watermark="POPULAR" products={products} tabs anchor="language"/>
    <ProductSection title="TOP RATED PRODUCTS" subtitle="LOVED BY READERS AND FAMILIES" watermark="TOP" products={topRated}/>
    <section className="testimonial-section"><div className="container"><div className="testimonial-title" data-mascot-anchor="testimonials"><span className="eyebrow">KIND WORDS FROM OUR READERS</span><h2>Our Testimonials</h2><p>Stories that families love, shared by the people who read them.</p></div><div className="testimonial-grid">{settings.testimonials.map(({ quote, name }) => <article className="testimonial-card" key={name}><div className="stars">{Array.from({ length: 5 }, (_, i) => <Star key={i} size={15} fill="currentColor"/>)}</div><p>{quote}</p><strong>{name}</strong></article>)}</div></div></section>
  </main>;
}
