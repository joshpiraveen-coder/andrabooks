import type { Product } from '../../types';
import { getProductCoverImage } from '../../services/productMedia';
import { BookImage } from './BookImage';

export function BookCover({ product, className = '' }: { product: Product; className?: string }) {
  const coverImage = getProductCoverImage(product);
  return <div className={`book-tilt ${coverImage ? 'has-cover-image' : ''} ${className}`}>
    <BookImage className="uploaded-cover" src={coverImage} alt={coverImage ? product.name : `Cover image needed for ${product.name}`} />
  </div>;
}
