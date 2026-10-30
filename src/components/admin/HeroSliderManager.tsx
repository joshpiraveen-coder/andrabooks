import type { HeroSlide, HeroSliderSettings, Product } from '../../types';

type Props = {
  value: HeroSliderSettings;
  products: Product[];
  onChange: (next: HeroSliderSettings) => void;
  onUpload: (file: File, onReady: (url: string) => void) => void;
};

const themes: { value: HeroSlide['bgTheme']; label: string }[] = [
  { value: 'pink', label: 'Pink Silk' }, { value: 'sky', label: 'Sky Blue' },
  { value: 'amber', label: 'Warm Amber' }, { value: 'mint', label: 'Mint Green' },
  { value: 'lavender', label: 'Lavender' }, { value: 'custom', label: 'Custom' },
];

export function HeroSliderManager({ value, products, onChange, onUpload }: Props) {
  const updateSlide = (id: string, patch: Partial<HeroSlide>) => onChange({ ...value, slides: value.slides.map(slide => slide.id === id ? { ...slide, ...patch } : slide) });
  const move = (index: number, direction: -1 | 1) => {
    const nextIndex = index + direction;
    if (nextIndex < 0 || nextIndex >= value.slides.length) return;
    const slides = [...value.slides];
    [slides[index], slides[nextIndex]] = [slides[nextIndex], slides[index]];
    onChange({ ...value, slides });
  };
  const add = () => onChange({ ...value, slides: [...value.slides, { id: crypto.randomUUID(), titleLine1: 'New', titleLine2: 'Collection', subtitle: 'Discover more books for growing minds.', buttonText: 'SHOP NOW', buttonLink: '/shop', bookProductId: products[0]?.id, bgTheme: 'mint', isActive: true }] });
  return <section className="admin-panel slider-manager"><div className="panel-heading"><div><h2>Hero slider</h2><p>Build the first-screen campaign. Changes preview immediately in this browser.</p></div><button type="button" className="admin-primary" onClick={add}>Add slide</button></div>
    <div className="slider-global-settings">
      <label className="toggle-line"><input type="checkbox" checked={value.autoPlay} onChange={event => onChange({ ...value, autoPlay: event.target.checked })}/> Auto-play slides</label>
      <label>Interval (seconds)<input type="number" min="3" max="10" step="1" value={value.intervalMs / 1000} onChange={event => onChange({ ...value, intervalMs: Math.max(3000, Math.min(10000, Math.round(Number(event.target.value || 5) * 1000))) })}/></label>
      <label className="toggle-line"><input type="checkbox" checked={value.showArrows} onChange={event => onChange({ ...value, showArrows: event.target.checked })}/> Show arrows</label>
      <label className="toggle-line"><input type="checkbox" checked={value.showDots} onChange={event => onChange({ ...value, showDots: event.target.checked })}/> Show pagination dots</label>
    </div>
    <div className="slider-admin-list">{value.slides.map((slide, index) => {
      const chosen = products.find(product => product.id === slide.bookProductId);
      const preview = slide.bookImage || chosen?.coverImage || chosen?.imageUrl;
      return <article className="slider-admin-card" key={slide.id}>
        <div className="slider-admin-card-head"><strong>Slide {index + 1}: {slide.titleLine1} {slide.titleLine2}</strong><div><label className="toggle-line"><input type="checkbox" checked={slide.isActive} onChange={event => updateSlide(slide.id, { isActive: event.target.checked })}/> Active</label><button type="button" disabled={index === 0} onClick={() => move(index, -1)}>↑</button><button type="button" disabled={index === value.slides.length - 1} onClick={() => move(index, 1)}>↓</button><button type="button" disabled={value.slides.length === 1} onClick={() => onChange({ ...value, slides: value.slides.filter(item => item.id !== slide.id) })}>Delete</button></div></div>
        <div className="slider-admin-fields"><label>Title line 1<input value={slide.titleLine1} maxLength={55} onChange={event => updateSlide(slide.id, { titleLine1: event.target.value })}/></label><label>Title line 2<input value={slide.titleLine2} maxLength={55} onChange={event => updateSlide(slide.id, { titleLine2: event.target.value })}/></label><label className="slider-span">Subtitle<input value={slide.subtitle} onChange={event => updateSlide(slide.id, { subtitle: event.target.value })}/></label><label>Button text<input value={slide.buttonText} onChange={event => updateSlide(slide.id, { buttonText: event.target.value })}/></label><label>Button link<input value={slide.buttonLink} placeholder="/shop" onChange={event => updateSlide(slide.id, { buttonLink: event.target.value })}/></label><label>Quick-pick catalog book<select value={slide.bookProductId || ''} onChange={event => updateSlide(slide.id, { bookProductId: event.target.value, bookImage: '' })}><option value="">Choose a book</option>{products.map(product => <option key={product.id} value={product.id}>{product.name}</option>)}</select></label><label>Book image URL<input value={slide.bookImage || ''} placeholder="Use selected book cover" onChange={event => updateSlide(slide.id, { bookImage: event.target.value })}/></label><label>Upload book image<input type="file" accept="image/*" onChange={event => { const file = event.target.files?.[0]; if (file) onUpload(file, url => updateSlide(slide.id, { bookImage: url })); event.target.value = ''; }}/></label><label>Background preset<select value={slide.bgTheme} onChange={event => updateSlide(slide.id, { bgTheme: event.target.value as HeroSlide['bgTheme'] })}>{themes.map(theme => <option key={theme.value} value={theme.value}>{theme.label}</option>)}</select></label>{slide.bgTheme === 'custom' && <><label className="slider-span">Custom CSS gradient<input value={slide.bgGradient || ''} placeholder="linear-gradient(120deg, #f8d, #fff)" onChange={event => updateSlide(slide.id, { bgGradient: event.target.value })}/></label><label>Background image URL<input value={slide.bgImage || ''} onChange={event => updateSlide(slide.id, { bgImage: event.target.value })}/></label><label>Upload background<input type="file" accept="image/*" onChange={event => { const file = event.target.files?.[0]; if (file) onUpload(file, url => updateSlide(slide.id, { bgImage: url })); event.target.value = ''; }}/></label></>}</div>
        {preview && <img className="slider-admin-preview" src={preview} alt={`Slide ${index + 1} book preview`}/>}<p className="admin-hint">Shown after the previous slide; only active slides appear on the storefront.</p>
      </article>;
    })}</div>
  </section>;
}
