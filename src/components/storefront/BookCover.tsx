import type { Product } from '../../types';
import { getProductCoverImage } from '../../services/productMedia';

export function BookCover({ product, className = '' }: { product: Product; className?: string }) {
  const coverImage = getProductCoverImage(product);
  return <div className={`book-tilt ${className}`}>
    {coverImage ? <img className="uploaded-cover" src={coverImage} alt={product.name} /> : <div className="book-cover-pending" role="img" aria-label={`Cover image needed for ${product.name}`} />}
  </div>;
}
