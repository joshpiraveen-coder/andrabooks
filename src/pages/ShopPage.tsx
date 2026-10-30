import { useEffect, useMemo, useState } from 'react';
import type { CSSProperties } from 'react';
import { Grid2X2, Grid3X3, LayoutGrid, SlidersHorizontal, X } from 'lucide-react';
import { Link, useSearchParams } from 'react-router-dom';
import { useStore } from '../context/StoreContext';
import { ProductCard } from '../components/storefront/ProductCard';
import { Seo } from '../components/storefront/Seo';

const PRICE_MIN = 210;
const PRICE_MAX = 1200;
const legacyCategories: Record<string, string> = { 'Coloring Book': 'Coloring Books', 'English Language': 'English & Math Workbooks', Dictionary: 'English & Math Workbooks', 'Tamil Language': 'Tamil Workbooks', 'Activity & Drawing Books': 'Activity & Dot-to-Dot', 'Exam Papers & Past Papers': 'Exam Papers (Yarl Aruvi)', 'Puzzles & Charts': 'Puzzles & Wall Charts' };
function priceFromQuery(value: string | null, fallback: number) {
  if (!value?.trim()) return fallback;
  const price = Number(value);
  return Number.isFinite(price) ? Math.min(PRICE_MAX, Math.max(PRICE_MIN, Math.round(price / 10) * 10)) : fallback;
}

export function ShopPage() {
  const { products, categories, settings, notifyMascot } = useStore();
  const [params, setParams] = useSearchParams();
  const query = params.get('q')?.trim().toLowerCase() || '';
  const categoryQuery = params.get('category') || '';
  const category = legacyCategories[categoryQuery] || categoryQuery;
  const language = params.get('language') || '';
  const maxPriceQuery = priceFromQuery(params.get('maxPrice'), PRICE_MAX);
  const minPriceQuery = Math.min(maxPriceQuery, priceFromQuery(params.get('minPrice'), PRICE_MIN));
  const [minPrice, setMinPrice] = useState(minPriceQuery);
  const [maxPrice, setMaxPrice] = useState(maxPriceQuery);
  const [onSale, setOnSale] = useState(false);
  const [inStock, setInStock] = useState(false);
  const [sort, setSort] = useState('default');
  const [perPage, setPerPage] = useState(12);
  const [columns, setColumns] = useState(3);
  const [page, setPage] = useState(1);
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);
  useEffect(() => { setMinPrice(minPriceQuery); setMaxPrice(maxPriceQuery); }, [minPriceQuery, maxPriceQuery]);
  useEffect(() => { setPage(1); }, [category, language, query, minPrice, maxPrice, onSale, inStock, sort, perPage]);
  useEffect(() => {
    if (!mobileFiltersOpen) return;
    const previousOverflow = document.body.style.overflow;
    const closeOnEscape = (event: KeyboardEvent) => { if (event.key === 'Escape') setMobileFiltersOpen(false); };
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', closeOnEscape);
    return () => { document.body.style.overflow = previousOverflow; window.removeEventListener('keydown', closeOnEscape); };
  }, [mobileFiltersOpen]);
  const filtered = useMemo(() => {
    const result = products.filter(p => (!query || `${p.name} ${p.category} ${p.language} ${p.sku} ${p.isbn || ''}`.toLowerCase().includes(query)) && (!category || p.category === category) && (!language || p.language === language || (language === 'English' && p.language === 'Bilingual')) && p.price >= minPrice && p.price <= maxPrice && (!onSale || p.onSale) && (!inStock || p.stock > 0));
    if (sort === 'price-low') return result.sort((a, b) => a.price - b.price);
    if (sort === 'price-high') return result.sort((a, b) => b.price - a.price);
    if (sort === 'rating') return result.sort((a, b) => b.rating - a.rating);
    return result;
  }, [products, query, category, language, minPrice, maxPrice, onSale, inStock, sort]);
  const pageCount = Math.max(1, Math.ceil(filtered.length / perPage));
  const currentPage = Math.min(page, pageCount);
  const current = filtered.slice((currentPage - 1) * perPage, currentPage * perPage);
  const pageNumbers = Array.from({ length: pageCount }, (_, index) => index + 1).filter(number => pageCount <= 7 || number === 1 || number === pageCount || Math.abs(number - currentPage) <= 1);
  const topRated = products.filter(p => p.flags.includes('topRated')).slice(0, 3);
  const filterActive = Boolean(category || language || onSale || inStock || minPrice !== PRICE_MIN || maxPrice !== PRICE_MAX);
  const rangeStyle = { '--price-start': `${((minPrice - PRICE_MIN) / (PRICE_MAX - PRICE_MIN)) * 100}%`, '--price-end': `${((maxPrice - PRICE_MIN) / (PRICE_MAX - PRICE_MIN)) * 100}%` } as CSSProperties;
  const chooseCategory = (nextCategory: string) => {
    const next = new URLSearchParams(params);
    if (nextCategory === category) next.delete('category');
    else next.set('category', nextCategory);
    setParams(next);
    setPage(1);
  };
  const chooseLanguage = (nextLanguage: string) => {
    const next = new URLSearchParams(params);
    if (nextLanguage === language) next.delete('language');
    else next.set('language', nextLanguage);
    setParams(next);
    setPage(1);
  };
  const applyPrices = () => {
    const next = new URLSearchParams(params);
    if (minPrice === PRICE_MIN) next.delete('minPrice');
    else next.set('minPrice', String(minPrice));
    if (maxPrice === PRICE_MAX) next.delete('maxPrice');
    else next.set('maxPrice', String(maxPrice));
    setParams(next);
    setPage(1);
    notifyMascot({ kind: 'filter', text: settings.mascot.messages.shop });
  };
  const clearFilters = () => { setParams({}); setMinPrice(PRICE_MIN); setMaxPrice(PRICE_MAX); setInStock(false); setOnSale(false); setPage(1); };
  const renderFilters = (includeTopRated = true) => <>
    <section className="filter-block">
      <h3 data-mascot-anchor="shop">FILTER BY PRICE</h3>
      <div className="price-slider" style={rangeStyle} role="group" aria-label="Book price range">
        <div className="price-slider-track" aria-hidden="true"/>
        <input className={`price-slider-min${minPrice >= PRICE_MAX - 10 ? ' price-slider-raised' : ''}`} aria-label="Minimum price" aria-valuetext={`Rs.${minPrice}`} aria-valuemax={maxPrice} type="range" min={PRICE_MIN} max={PRICE_MAX} step="10" value={minPrice} onChange={event => setMinPrice(Math.min(Number(event.target.value), maxPrice))}/>
        <input className="price-slider-max" aria-label="Maximum price" aria-valuetext={`Rs.${maxPrice}`} aria-valuemin={minPrice} type="range" min={PRICE_MIN} max={PRICE_MAX} step="10" value={maxPrice} onChange={event => setMaxPrice(Math.max(Number(event.target.value), minPrice))}/>
      </div>
      <div className="price-range"><span>Price: <strong>Rs.{minPrice} — Rs.{maxPrice}</strong></span><button onClick={applyPrices}>FILTER</button></div>
    </section>
    <section className="filter-block"><h3>STOCK STATUS</h3><label className="check-line"><input type="checkbox" checked={onSale} onChange={e => { setOnSale(e.target.checked); notifyMascot({ kind: 'filter', text: settings.mascot.messages.shop }); }}/> On sale</label><label className="check-line"><input type="checkbox" checked={inStock} onChange={e => { setInStock(e.target.checked); notifyMascot({ kind: 'filter', text: settings.mascot.messages.shop }); }}/> In stock</label></section>
    <section className="filter-block"><h3>LANGUAGE</h3>{['Tamil', 'Sinhala', 'English', 'Bilingual'].map(item => <button className={`category-filter ${language === item ? 'active' : ''}`} aria-pressed={language === item} key={item} onClick={() => chooseLanguage(item)}>{item}</button>)}</section>
    <section className="filter-block"><h3>CATEGORIES</h3>{categories.map(c => <button className={`category-filter ${category === c ? 'active' : ''}`} aria-pressed={category === c} key={c} onClick={() => chooseCategory(c)}>{c}</button>)}</section>
    {filterActive && <button className="shop-clear-filters" onClick={clearFilters}>Clear filters</button>}
    {includeTopRated && <section className="filter-block"><h3>TOP RATED PRODUCTS</h3>{topRated.map(p => <div className="mini-product" key={p.id}><div className="mini-cover" style={{ background: p.accent }}>{p.name.slice(0, 1)}</div><div><span>{p.name}</span><strong>Rs.{p.price.toFixed(2)}</strong></div></div>)}</section>}
  </>;
  return <main className="container shop-layout"><Seo title="Shop all books" description="Shop the full Andra Books collection of Tamil and English story books, workbooks and coloring books."/>
    <aside className="shop-sidebar">{renderFilters()}</aside>
    <div className="shop-main"><div className="shop-toolbar"><div className="breadcrumbs"><Link to="/">Home</Link><span>/</span><strong>Shop</strong>{category && <><span>/</span><strong>{category}</strong></>}</div><div className="toolbar-controls"><button className="shop-filter-toggle" onClick={() => setMobileFiltersOpen(true)}><SlidersHorizontal size={15}/> Filters{filterActive && <span className="filter-active-dot" aria-label="Filters active"/>}</button><label className="shop-page-size">Show: <select value={perPage} onChange={e => { setPerPage(Number(e.target.value)); setPage(1); }}>{[9, 12, 18, 24].map(n => <option key={n}>{n}</option>)}</select></label><div className="view-buttons"><button className={columns === 2 ? 'active' : ''} onClick={() => setColumns(2)} aria-label="Two columns"><Grid2X2/></button><button className={columns === 3 ? 'active' : ''} onClick={() => setColumns(3)} aria-label="Three columns"><Grid3X3/></button><button className={columns === 4 ? 'active' : ''} onClick={() => setColumns(4)} aria-label="Four columns"><LayoutGrid/></button></div><select aria-label="Sort products" value={sort} onChange={e => setSort(e.target.value)}><option value="default">Default sorting</option><option value="price-low">Sort by price: low to high</option><option value="price-high">Sort by price: high to low</option><option value="rating">Sort by rating</option></select></div></div>
      {mobileFiltersOpen && <div className="shop-filter-overlay" onClick={() => setMobileFiltersOpen(false)}><section className="shop-filter-sheet" role="dialog" aria-modal="true" aria-label="Filter and sort books" onClick={event => event.stopPropagation()}><header><h2>Filter &amp; Sort</h2><button aria-label="Close filters" onClick={() => setMobileFiltersOpen(false)}><X size={20}/></button></header><div className="shop-filter-sheet-content">{renderFilters(false)}</div><button className="pill-button shop-filter-apply" onClick={() => { applyPrices(); setMobileFiltersOpen(false); }}>APPLY FILTERS</button></section></div>}
      {query && <p className="search-results-label">Search results for “{query}”</p>}
      {current.length ? <div className="shop-product-grid" style={{ '--columns': columns } as CSSProperties & { '--columns': number }}>{current.map(p => <ProductCard key={p.id} product={p} compact/>)}</div> : <div className="no-results"><h2>No books found</h2><p>Try another search or choose a different category.</p><button onClick={clearFilters}>CLEAR FILTERS</button></div>}
      {pageCount > 1 && <nav className="pagination" aria-label="Product pages">
        <button aria-label="Previous page" disabled={currentPage === 1} onClick={() => setPage(currentPage - 1)}>?</button>
        {pageNumbers.map((number, index) => <span className="pagination-item" key={number}>{index > 0 && number - pageNumbers[index - 1] > 1 && <span aria-hidden="true">?</span>}<button className={currentPage === number ? 'active' : ''} aria-current={currentPage === number ? 'page' : undefined} onClick={() => setPage(number)}>{number}</button></span>)}
        <button aria-label="Next page" disabled={currentPage === pageCount} onClick={() => setPage(currentPage + 1)}>?</button>
      </nav>}
    </div>
  </main>;
}
