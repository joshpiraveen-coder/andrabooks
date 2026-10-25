import { useState } from 'react';
import { BookOpen, Heart, Shuffle } from 'lucide-react';
import { Link } from 'react-router-dom';
import type { Product } from '../../types';
import { useStore } from '../../context/StoreContext';
import { BookCover } from './BookCover';
import { getProductInsideImage } from '../../services/productMedia';

export function ProductCard({ product, compact = false }: { product: Product; compact?: boolean }) {
  const { addToCart, wishlist, compare, toggleWishlist, toggleCompare, notifyMascot } = useStore();
  const [added, setAdded] = useState(false);
  const [peekOpen, setPeekOpen] = useState(false);
  const add = () => { addToCart(product.id); setAdded(true); window.setTimeout(() => setAdded(false), 1200); };
  const insideImage = getProductInsideImage(product);
  const productPath = `/product/${product.slug || product.id}`;
  return <article className={`product-card ${compact ? 'product-card-compact' : ''} ${insideImage ? 'has-inside-image' : ''} ${peekOpen ? 'is-peek-open' : ''}`} onMouseEnter={event => { const rect = event.currentTarget.getBoundingClientRect(); notifyMascot({ kind: 'peek', productName: product.name, price: product.price, coords: { x: rect.right - 82, y: rect.top - 54 } }); }}>
    <div className="product-image"><Link className="product-image-link" to={productPath} aria-label={`View ${product.name}`}><BookCover product={product} className="book-front"/>{insideImage && <img className="product-inside-preview" src={insideImage} alt={`${product.name} inside pages`} loading="lazy"/>}</Link>{insideImage && <button type="button" className="peek-inside-toggle" aria-pressed={peekOpen} onClick={() => setPeekOpen(value => !value)}>{peekOpen ? 'Close preview' : <><BookOpen size={13}/> Peek inside</>}</button>}
      {product.onSale && <span className="sale-badge">SALE</span>}
    </div>
    <div className="product-card-actionbar"><button aria-label={compare.includes(product.id) ? 'Remove from compare' : 'Add to compare'} className={compare.includes(product.id) ? 'selected' : ''} onClick={() => toggleCompare(product.id)}><Shuffle size={15}/><span>Compare</span></button><button aria-label={wishlist.includes(product.id) ? 'Remove from wishlist' : 'Add to wishlist'} className={wishlist.includes(product.id) ? 'selected' : ''} onClick={() => toggleWishlist(product.id)}><Heart size={15}/><span>Wishlist</span></button></div>
    <div className="product-info"><Link className="product-name" to={productPath}>{product.name}</Link><span className="product-category">{product.category}</span><strong className="product-price">Rs.{product.price.toFixed(2)}{product.onSale && product.oldPrice && <span className="product-price-old">Rs.{product.oldPrice.toFixed(2)}</span>}</strong><button className={`add-cart-button ${compact ? 'add-cart-button-compact' : ''}`} onClick={add} disabled={product.stock < 1}>{product.stock < 1 ? 'OUT OF STOCK' : added ? 'ADDED TO CART' : 'ADD TO CART'}</button></div>
  </article>;
}
