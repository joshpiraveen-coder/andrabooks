import { useState, type ImgHTMLAttributes } from 'react';

type Props = Omit<ImgHTMLAttributes<HTMLImageElement>, 'src' | 'onError'> & {
  src?: string;
  fallbackSrc?: string;
};

/** Keeps a missing upload or stale catalog URL from rendering a broken-image icon. */
export function BookImage({ src, fallbackSrc, alt = '', className = '', ...props }: Props) {
  const [failed, setFailed] = useState<string[]>([]);
  const image = src && !failed.includes(src) ? src : fallbackSrc && !failed.includes(fallbackSrc) ? fallbackSrc : undefined;
  if (!image) return <span className={`book-cover-pending ${className}`} role="img" aria-label={alt || 'Book image unavailable'} />;
  return <img {...props} className={className} src={image} alt={alt} onError={() => setFailed(current => current.includes(image) ? current : [...current, image])}/>;
}
