import { useEffect, useState, type FormEvent } from 'react';
import { ChevronLeft, ChevronRight, Expand, Heart, LayoutGrid, Minus, Plus, Shuffle, Star, X } from 'lucide-react';
import { Link, useParams } from 'react-router-dom';
import { useStore } from '../context/StoreContext';
import { BookCover } from '../components/storefront/BookCover';
import { ProductCard } from '../components/storefront/ProductCard';
import { Seo } from '../components/storefront/Seo';
import { getProductGallery, type ProductGalleryImage } from '../services/productMedia';
import type { Product } from '../types';

type Review = { name: string; rating: number; text: string; createdAt: string };
type DetailTab = 'description' | 'reviews' | 'shipping';

function readReviews(productId: string): Review[] {
  try {
    const parsed: unknown = JSON.parse(localStorage.getItem(`andra:reviews:${productId}`) || '[]');
    return Array.isArray(parsed) ? parsed as Review[] : [];
  } catch { return []; }
}

export function ProductDetail() {
  const { slug = '' } = useParams();
  const { products } = useStore();
  const product = products.find(item => item.slug === slug || item.id === slug);
  if (!product) return <main className="container not-found"><h1>We couldn't find that book.</h1><Link to="/shop" className="pill-button">BACK TO SHOP</Link></main>;
  return <ProductDetailView key={product.id} product={product} products={products}/>;
}

function ProductDetailView({ product, products }: { product: Product; products: Product[] }) {
  const { addToCart, toggleWishlist, toggleCompare, wishlist, compare } = useStore();
  const gallery: ProductGalleryImage[] = getProductGallery(product);
  const relatedPriority = ['cap-seller-monkeys', 'cleverest-crow', 'crow-fox-sinhala', 'four-bulls-lion-sinhala'];
  const related = products.filter(item => item.category === product.category && item.id !== product.id).sort((a, b) => {
    const aOrder = relatedPriority.indexOf(a.id);
    const bOrder = relatedPriority.indexOf(b.id);
    return (aOrder < 0 ? Number.MAX_SAFE_INTEGER : aOrder) - (bOrder < 0 ? Number.MAX_SAFE_INTEGER : bOrder);
  });
  const catalogIndex = products.findIndex(item => item.id === product.id);
  const previous = products[(catalogIndex - 1 + products.length) % products.length];
  const next = products[(catalogIndex + 1) % products.length];
  const [activeImage, setActiveImage] = useState(0);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [qty, setQty] = useState(1);
  const [added, setAdded] = useState(false);
  const [activeTab, setActiveTab] = useState<DetailTab>('description');
  const [reviews, setReviews] = useState<Review[]>(() => readReviews(product.id));
  const [reviewName, setReviewName] = useState('');
  const [reviewText, setReviewText] = useState('');
  const [reviewRating, setReviewRating] = useState(5);
  const currentImage = gallery[activeImage];
  const pageUrl = typeof window === 'undefined' ? '' : window.location.href;
  const shareUrl = encodeURIComponent(pageUrl);
  const shareTitle = encodeURIComponent(product.name);
  const detailSpecs = [
    { label: 'ISBN', value: product.isbn },
    { label: 'Age group', value: product.ageGroup },
    { label: 'Grade', value: product.grade },
    { label: 'Pages', value: product.pages ? `${product.pages} Pages` : undefined },
    { label: 'Book size', value: product.dimensions },
    { label: 'Series / set', value: product.setInfo },
  ].filter((spec): spec is { label: string; value: string } => Boolean(spec.value));

  useEffect(() => {
    if (!lightboxOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setLightboxOpen(false);
      if (event.key === 'ArrowRight') setActiveImage(index => (index + 1) % Math.max(1, gallery.length));
      if (event.key === 'ArrowLeft') setActiveImage(index => (index - 1 + Math.max(1, gallery.length)) % Math.max(1, gallery.length));
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [lightboxOpen, gallery.length]);

  const changeImage = (direction: -1 | 1) => setActiveImage(index => (index + direction + gallery.length) % gallery.length);
  const submitReview = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const updated = [{ name: reviewName.trim(), rating: reviewRating, text: reviewText.trim(), createdAt: new Date().toISOString() }, ...reviews];
    setReviews(updated);
    localStorage.setItem(`andra:reviews:${product.id}`, JSON.stringify(updated));
    setReviewName(''); setReviewText(''); setReviewRating(5);
  };

  return <main className="product-detail-page">
    <Seo title={product.name} description={product.description || `${product.name}, available from Andra Books in Jaffna, Sri Lanka.`} productSeo={{ title: product.metaTitle, description: product.metaDescription, keywords: product.focusKeywords, canonical: product.canonicalUrl, ogImage: product.ogImage }} structuredData={{ '@context': 'https://schema.org', '@graph': [{ '@type': 'Book', name: product.name, inLanguage: product.language, isbn: product.isbn, numberOfPages: product.pages, audience: product.ageGroup }, { '@type': 'Product', name: product.name, sku: product.sku, category: product.category, image: gallery.map(image => image.src), offers: { '@type': 'Offer', priceCurrency: 'LKR', price: product.price, availability: product.stock > 0 ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock' } }] }}/>
    <section className="container product-detail-layout">
      <div className="detail-gallery">
        {gallery.length > 1 && <div className="detail-thumbnails" aria-label="Product images">{gallery.map((image, index) => <button key={`${image.src}-${index}`} className={activeImage === index ? 'active' : ''} onClick={() => setActiveImage(index)} aria-label={`Show ${image.kind === 'inside' ? 'inside pages' : image.kind === 'cover' ? 'cover' : `image ${index + 1}`}`}><img src={image.src} alt=""/></button>)}</div>}
        <div className="detail-main-image">
          {currentImage ? <img className="detail-preview-image" src={currentImage.src} alt={`${product.name}${currentImage.kind === 'inside' ? ' inside pages' : ''}`} /> : <BookCover product={product}/>}
          <button className="detail-expand" aria-label="Open full-screen image" onClick={() => setLightboxOpen(true)}><Expand size={16}/></button>
          {gallery.length > 1 && <div className="detail-gallery-arrows"><button onClick={() => changeImage(-1)} aria-label="Previous image"><ChevronLeft size={16}/></button><button onClick={() => changeImage(1)} aria-label="Next image"><ChevronRight size={16}/></button></div>}
        </div>
      </div>

      <div className="detail-product-info">
        <div className="detail-topline"><div className="breadcrumbs"><Link to="/">Home</Link><span>/</span><Link to={`/shop?category=${encodeURIComponent(product.category)}`}>{product.category}</Link><span>/</span><strong>{product.name}</strong></div><nav className="detail-product-nav" aria-label="Product navigation"><Link to={`/product/${previous.slug || previous.id}`} aria-label="Previous product"><ChevronLeft size={17}/></Link><Link to="/shop" aria-label="Back to shop"><LayoutGrid size={15}/></Link><Link to={`/product/${next.slug || next.id}`} aria-label="Next product"><ChevronRight size={17}/></Link></nav></div>
        <span className="detail-category">{product.category}</span>
        <h1>{product.name}</h1>
        <div className="detail-price">Rs.{product.price.toFixed(2)}{product.onSale && product.oldPrice && <del>Rs.{product.oldPrice.toFixed(2)}</del>}</div>
        <p className="detail-short-description">{product.description || `${product.language} book for readers of all ages.`}</p>
        <div className="detail-stock">{product.stock > 0 ? <><span aria-hidden="true">✓</span> In stock</> : 'Currently unavailable'}</div>
        <div className="detail-buy-row" data-mascot-anchor="product"><div className="detail-quantity"><button onClick={() => setQty(value => Math.max(1, value - 1))} aria-label="Decrease quantity"><Minus size={13}/></button><input type="number" min="1" max={Math.max(product.stock, 1)} value={qty} onChange={event => setQty(Math.max(1, Math.min(product.stock || 1, Number(event.target.value) || 1)))} aria-label="Quantity"/><button onClick={() => setQty(value => Math.min(product.stock || 1, value + 1))} aria-label="Increase quantity"><Plus size={13}/></button></div><button className="pill-button" disabled={!product.stock} onClick={() => { addToCart(product.id, qty); setAdded(true); }}>{added ? 'ADDED TO CART ✓' : 'ADD TO CART'}</button></div>
        <div className="detail-secondary-actions"><button className={compare.includes(product.id) ? 'selected' : ''} onClick={() => toggleCompare(product.id)}><Shuffle size={14}/> {compare.includes(product.id) ? 'Added to compare' : 'Compare'}</button><button className={wishlist.includes(product.id) ? 'selected' : ''} onClick={() => toggleWishlist(product.id)}><Heart size={14}/> {wishlist.includes(product.id) ? 'Added to wishlist' : 'Add to wishlist'}</button></div>
        <div className="detail-meta"><p><strong>SKU:</strong> <span>{product.sku}</span></p><p><strong>Category:</strong> <Link to={`/shop?category=${encodeURIComponent(product.category)}`}>{product.category}</Link></p>{detailSpecs.length > 0 && <dl className="detail-spec-table detail-spec-table-meta">{detailSpecs.map(spec => <div key={spec.label}><dt>{spec.label}</dt><dd>{spec.value}</dd></div>)}</dl>}<div className="detail-share"><strong>Share:</strong><a href={`https://www.facebook.com/sharer/sharer.php?u=${shareUrl}`} target="_blank" rel="noreferrer" aria-label="Share on Facebook">f</a><a href={`https://twitter.com/intent/tweet?url=${shareUrl}&text=${shareTitle}`} target="_blank" rel="noreferrer" aria-label="Share on X">𝕏</a><a href={`https://pinterest.com/pin/create/button/?url=${shareUrl}&description=${shareTitle}`} target="_blank" rel="noreferrer" aria-label="Share on Pinterest">P</a><a href={`https://www.linkedin.com/sharing/share-offsite/?url=${shareUrl}`} target="_blank" rel="noreferrer" aria-label="Share on LinkedIn">in</a><a href={`https://t.me/share/url?url=${shareUrl}&text=${shareTitle}`} target="_blank" rel="noreferrer" aria-label="Share on Telegram">➤</a></div></div>
      </div>
    </section>

    <section className="container detail-tabs-section">
      <div className="detail-tab-list" role="tablist" aria-label="Product information">{([['description', 'Description'], ['reviews', `Reviews (${reviews.length})`], ['shipping', 'Shipping and delivery']] as [DetailTab, string][]).map(([tab, label]) => <button key={tab} role="tab" aria-selected={activeTab === tab} className={activeTab === tab ? 'active' : ''} onClick={() => setActiveTab(tab)}>{label}</button>)}</div>
      <div className="detail-tab-content" role="tabpanel">
        {activeTab === 'description' && <><p>{product.description || `${product.name} is a thoughtfully selected ${product.language} title from Andra Books.`}</p>{detailSpecs.length > 0 && <><h3>Book specifications</h3><dl className="detail-spec-table">{detailSpecs.map(spec => <div key={spec.label}><dt>{spec.label}</dt><dd>{spec.value}</dd></div>)}</dl></>}</>}
        {activeTab === 'reviews' && <div className="detail-reviews"><div className="review-summary"><strong>{reviews.length ? (reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length).toFixed(1) : product.rating.toFixed(1)}</strong><span>{'★'.repeat(Math.round(reviews.length ? reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length : product.rating))}{'☆'.repeat(5 - Math.round(reviews.length ? reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length : product.rating))}</span><small>Based on {reviews.length} customer {reviews.length === 1 ? 'review' : 'reviews'}</small></div>{reviews.length > 0 && <div className="review-list">{reviews.map((review, index) => <article key={`${review.createdAt}-${index}`}><strong>{review.name}</strong><span>{'★'.repeat(review.rating)}{'☆'.repeat(5 - review.rating)}</span><p>{review.text}</p></article>)}</div>}<form className="review-form" onSubmit={submitReview}><h3>Write a review</h3><label>Your rating<div className="review-rating-picker">{[1, 2, 3, 4, 5].map(rating => <button type="button" key={rating} aria-label={`${rating} stars`} onClick={() => setReviewRating(rating)} className={rating <= reviewRating ? 'active' : ''}><Star size={18} fill="currentColor"/></button>)}</div></label><div className="form-row"><label>Your name<input required value={reviewName} onChange={event => setReviewName(event.target.value)}/></label><label>Your review<textarea required rows={3} value={reviewText} onChange={event => setReviewText(event.target.value)}/></label></div><button className="pill-button">SUBMIT REVIEW</button></form></div>}
        {activeTab === 'shipping' && <div className="shipping-copy"><p>Shipping options, delivery estimates, and any applicable fees are shown during checkout based on your delivery address.</p><p>For help with an existing order, contact the Andra Books team using the details in the site footer.</p></div>}
      </div>
    </section>

    {related.length > 0 && <RelatedProducts products={related}/>}

    {lightboxOpen && <div className="detail-lightbox" role="dialog" aria-modal="true" aria-label={`${product.name} image viewer`} onMouseDown={event => { if (event.target === event.currentTarget) setLightboxOpen(false); }}><button className="lightbox-close" onClick={() => setLightboxOpen(false)} aria-label="Close image viewer"><X size={22}/></button>{gallery.length > 1 && <button className="lightbox-arrow lightbox-prev" onClick={() => changeImage(-1)} aria-label="Previous image"><ChevronLeft/></button>}{currentImage ? <img src={currentImage.src} alt={`${product.name} preview`}/> : <BookCover product={product}/>}{gallery.length > 1 && <button className="lightbox-arrow lightbox-next" onClick={() => changeImage(1)} aria-label="Next image"><ChevronRight/></button>}</div>}
  </main>;
}

function RelatedProducts({ products }: { products: Product[] }) {
  const [page, setPage] = useState(0);
  const pageCount = Math.ceil(products.length / 4);
  const visible = products.slice(page * 4, page * 4 + 4);
  return <section className="container related-products detail-related-products"><h2>Related products</h2><div className="related-product-grid">{visible.map(item => <ProductCard key={item.id} product={item}/>)}</div>{pageCount > 1 && <div className="related-dots" aria-label="Related product pages">{Array.from({ length: pageCount }, (_, index) => <button key={index} className={index === page ? 'active' : ''} aria-label={`Show related products page ${index + 1}`} onClick={() => setPage(index)}/>)}</div>}</section>;
}
