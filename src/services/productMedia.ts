import type { Product } from '../types';

export type ProductGalleryImage = { src: string; kind: 'cover' | 'inside' | 'gallery' };

export function getProductCoverImage(product: Product): string | undefined {
  return product.coverImage || product.imageUrl || undefined;
}

export function getProductGallery(product: Product): ProductGalleryImage[] {
  const images: ProductGalleryImage[] = [];
  const seen = new Set<string>();
  const add = (src: string | undefined, kind: ProductGalleryImage['kind']) => {
    if (!src || seen.has(src)) return;
    seen.add(src);
    images.push({ src, kind });
  };

  add(getProductCoverImage(product), 'cover');
  add(product.insideImage, 'inside');
  product.galleryImages?.forEach(src => add(src, 'gallery'));
  return images;
}

export function getProductInsideImage(product: Product): string | undefined {
  return product.insideImage || product.galleryImages?.[0] || undefined;
}
