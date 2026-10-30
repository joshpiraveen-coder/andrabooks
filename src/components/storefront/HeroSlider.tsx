import { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useStore } from '../../context/StoreContext';
import { BookImage } from './BookImage';

export function HeroSlider() {
  const { products, settings } = useStore();
  const { heroSlider } = settings;
  const slides = useMemo(() => heroSlider.slides.filter(slide => slide.isActive), [heroSlider.slides]);
  const [activeId, setActiveId] = useState(slides[0]?.id || '');
  const [paused, setPaused] = useState(false);
  const reduceMotion = useReducedMotion();
  const activeIndex = Math.max(0, slides.findIndex(slide => slide.id === activeId));
  const slide = slides[activeIndex];
  useEffect(() => {
    if (!heroSlider.autoPlay || paused || slides.length < 2) return;
    const timer = window.setInterval(() => {
      if (!document.hidden) setActiveId(current => slides[(Math.max(0, slides.findIndex(item => item.id === current)) + 1) % slides.length].id);
    }, Math.max(3000, Math.min(10000, heroSlider.intervalMs)));
    return () => window.clearInterval(timer);
  }, [heroSlider.autoPlay, heroSlider.intervalMs, paused, slides]);
  const step = (direction: number) => setActiveId(slides[(activeIndex + direction + slides.length) % slides.length].id);
  if (!slide) return null;
  const book = products.find(product => product.id === slide.bookProductId);
  const image = slide.bookImage || book?.coverImage || book?.imageUrl;
  const destination = slide.buttonLink.startsWith('/') && !slide.buttonLink.startsWith('//') ? slide.buttonLink : '/shop';
  const background = slide.bgTheme === 'custom' ? (slide.bgImage ? { backgroundImage: `url(${JSON.stringify(slide.bgImage)})` } : { background: slide.bgGradient || undefined }) : undefined;
  return <section className="hero-slider" aria-label="Featured books" onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)} onFocusCapture={() => setPaused(true)} onBlurCapture={event => { if (!event.currentTarget.contains(event.relatedTarget)) setPaused(false); }}>
    <AnimatePresence mode="wait" initial={false}>
      <motion.div key={slide.id} className={`hero-slide hero-theme-${slide.bgTheme}`} style={background} initial={reduceMotion ? false : { opacity: 0, x: 35 }} animate={{ opacity: 1, x: 0 }} exit={reduceMotion ? undefined : { opacity: 0, x: -35 }} transition={{ duration: reduceMotion ? 0 : .45, ease: 'easeOut' }} drag={slides.length > 1 ? 'x' : false} dragConstraints={{ left: 0, right: 0 }} dragElastic={.12} onDragEnd={(_, info) => { if (Math.abs(info.offset.x) > 65 || Math.abs(info.velocity.x) > 500) step(info.offset.x < 0 ? 1 : -1); }}>
        <div className="container hero-slide-inner">
          <div className="hero-slide-copy"><h1><span>{slide.titleLine1}</span><span>{slide.titleLine2}</span></h1><p>{slide.subtitle}</p><Link className="pill-button" to={destination}>{slide.buttonText}</Link></div>
          <Link className="hero-slide-book" data-mascot-anchor="hero" to={book ? `/product/${book.slug || book.id}` : destination} aria-label={book ? `View ${book.name}` : slide.buttonText}>{image ? <BookImage src={image} fallbackSrc={book?.coverImage || book?.imageUrl} alt={book?.name || `${slide.titleLine1} ${slide.titleLine2}`}/> : <span className="hero-slide-image-needed">Choose a book image in the slider manager</span>}</Link>
        </div>
      </motion.div>
    </AnimatePresence>
    {slides.length > 1 && heroSlider.showArrows && <div className="hero-slide-arrows"><button type="button" aria-label="Previous slide" onClick={() => step(-1)}><ChevronLeft/></button><button type="button" aria-label="Next slide" onClick={() => step(1)}><ChevronRight/></button></div>}
    {slides.length > 1 && heroSlider.showDots && <div className="hero-slide-dots" aria-label="Choose slide">{slides.map((item, index) => <button type="button" key={item.id} className={index === activeIndex ? 'active' : ''} aria-label={`Show slide ${index + 1}: ${item.titleLine1} ${item.titleLine2}`} aria-current={index === activeIndex ? 'true' : undefined} onClick={() => setActiveId(item.id)}/>)}</div>}
  </section>;
}
