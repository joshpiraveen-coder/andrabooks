import { useEffect, useMemo, useState } from 'react';
import type { CSSProperties } from 'react';
import { Grid2X2, Grid3X3, LayoutGrid, SlidersHorizontal, X } from 'lucide-react';
import { useSearchParams } from 'react-router-dom';
import { useStore } from '../context/StoreContext';
import { ProductCard } from '../components/storefront/ProductCard';
import { Seo } from '../components/storefront/Seo';

export function ShopPage() {
  const { products, categories, settings, notifyMascot } = useStore();
  const [params, setParams] = useSearchParams();
  const query = params.get('q')?.toLowerCase() || '';
  const category = params.get('category') || '';
  const language = params.get('language') || '';
  const maxPriceQuery = Number(params.get('maxPrice')) || 950;
  const [maxPrice, setMaxPrice] = useState(maxPriceQuery);
  const [onSale, setOnSale] = useState(false);
  const [inStock, setInStock] = useState(false);
  const [sort, setSort] = useState('default');
  const [perPage, setPerPage] = useState(12);
  const [columns, setColumns] = useState(3);
  const [page, setPage] = useState(1);
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);
  useEffect(() => { setMaxPrice(maxPriceQuery); }, [maxPriceQuery]);
  useEffect(() => { setPage(1); }, [category, language, query]);
  useEffect(() => {
    if (!mobileFiltersOpen) return;
    const previousOverflow = document.body.style.overflow;
    const closeOnEscape = (event: KeyboardEvent) => { if (event.key === 'Escape') setMobileFiltersOpen(false); };
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', closeOnEscape);
    return () => { document.body.style.overflow = previousOverflow; window.removeEventListener('keydown', closeOnEscape); };
  }, [mobileFiltersOpen]);
  const filtered = useMemo(() => {
    const result = products.filter(p => (!query || `${p.name} ${p.category} ${p.language}`.toLowerCase().includes(query)) && (!category || p.category === category) && (!language || p.language === language) && p.price <= maxPrice && (!onSale || p.onSale) && (!inStock || p.stock > 0));
    if (sort === 'price-low') return result.sort((a, b) => a.price - b.price);
    if (sort === 'price-high') return result.sort((a, b) => b.price - a.price);
    if (sort === 'rating') return result.sort((a, b) => b.rating - a.rating);
    return result;
  }, [products, query, category, language, maxPrice, onSale, inStock, sort]);
  const pageCount = Math.max(1, Math.ceil(filtered.length / perPage));
  const current = filtered.slice((page - 1) * perPage, page * perPage);
  const topRated = products.filter(p => p.flags.includes('topRated')).slice(0, 3);
  const chooseCategory = (nextCategory: string) => {
    const next = new URLSearchParams(params);
    if (nextCategory === category) next.delete('category');
    else next.set('category', nextCategory);
    setParams(next);
    setPage(1);
  };
  const renderFilters = (includeTopRated = true) => <>
    <section className="filter-block"><h3 data-mascot-anchor="shop">FILTER BY PRICE</h3><input aria-label="Maximum price" type="range" min="210" max="950" step="10" value={maxPrice} onChange={e => { const rect = e.currentTarget.getBoundingClientRect(); setMaxPrice(Number(e.target.value)); setPage(1); notifyMascot({ kind: 'filter', text: settings.mascot.messages.shop, coords: { x: rect.right - 78, y: rect.top - 65 } }); }}/><div className="price-range"><span>Price: <strong>Rs.210 — Rs.{maxPrice}</strong></span><button onClick={() => setPage(1)}>FILTER</button></div></section>
    <section className="filter-block"><h3>STOCK STATUS</h3><label className="check-line"><input type="checkbox" checked={onSale} onChange={e => { setOnSale(e.target.checked); notifyMascot({ kind: 'filter', text: settings.mascot.messages.shop }); }}/> On sale</label><label className="check-line"><input type="checkbox" checked={inStock} onChange={e => { setInStock(e.target.checked); notifyMascot({ kind: 'filter', text: settings.mascot.messages.shop }); }}/> In stock</label></section>
    <section className="filter-block"><h3>CATEGORIES</h3>{categories.map(c => <button className={`category-filter ${category === c ? 'active' : ''}`} aria-pressed={category === c} key={c} onClick={() => chooseCategory(c)}>{c}</button>)}</section>
    {includeTopRated && <section className="filter-block"><h3>TOP RATED PRODUCTS</h3>{topRated.map(p => <div className="mini-product" key={p.id}><div className="mini-cover" style={{ background: p.accent }}>{p.name.slice(0, 1)}</div><div><span>{p.name}</span><strong>Rs.{p.price.toFixed(2)}</strong></div></div>)}</section>}
  </>;
  return <main className="container shop-layout"><Seo title="Shop all books" description="Shop the full Andra Books collection of Tamil and English story books, workbooks and coloring books."/>
    <aside className="shop-sidebar">{renderFilters()}</aside>
    <div className="shop-main"><div className="shop-toolbar"><div className="breadcrumbs"><a href="/">Home</a><span>/</span><strong>Shop</strong>{category && <><span>/</span><strong>{category}</strong></>}</div><div className="toolbar-controls"><button className="shop-filter-toggle" onClick={() => setMobileFiltersOpen(true)}><SlidersHorizontal size={15}/> Filters{(category || onSale || inStock || maxPrice !== 950) && <span className="filter-active-dot" aria-label="Filters active"/>}</button><label className="shop-page-size">Show: <select value={perPage} onChange={e => { setPerPage(Number(e.target.value)); setPage(1); }}>{[9, 12, 18, 24].map(n => <option key={n}>{n}</option>)}</select></label><div className="view-buttons"><button className={columns === 2 ? 'active' : ''} onClick={() => setColumns(2)} aria-label="Two columns"><Grid2X2/></button><button className={columns === 3 ? 'active' : ''} onClick={() => setColumns(3)} aria-label="Three columns"><Grid3X3/></button><button className={columns === 4 ? 'active' : ''} onClick={() => setColumns(4)} aria-label="Four columns"><LayoutGrid/></button></div><select aria-label="Sort products" value={sort} onChange={e => setSort(e.target.value)}><option value="default">Default sorting</option><option value="price-low">Sort by price: low to high</option><option value="price-high">Sort by price: high to low</option><option value="rating">Sort by rating</option></select></div></div>
      {mobileFiltersOpen && <div className="shop-filter-overlay" onClick={() => setMobileFiltersOpen(false)}><section className="shop-filter-sheet" role="dialog" aria-modal="true" aria-label="Filter and sort books" onClick={event => event.stopPropagation()}><header><h2>Filter &amp; Sort</h2><button aria-label="Close filters" onClick={() => setMobileFiltersOpen(false)}><X size={20}/></button></header><div className="shop-filter-sheet-content">{renderFilters(false)}</div><button className="pill-button shop-filter-apply" onClick={() => setMobileFiltersOpen(false)}>APPLY FILTERS</button></section></div>}
      {query && <p className="search-results-label">Search results for “{query}”</p>}
      {current.length ? <div className="shop-product-grid" style={{ '--columns': columns } as CSSProperties & { '--columns': number }}>{current.map(p => <ProductCard key={p.id} product={p} compact/>)}</div> : <div className="no-results"><h2>No books found</h2><p>Try another search or choose a different category.</p><button onClick={() => { setParams({}); setMaxPrice(950); setInStock(false); setOnSale(false); setPage(1); }}>CLEAR FILTERS</button></div>}
      <div className="pagination">{Array.from({ length: pageCount }, (_, i) => i + 1).slice(0, 4).map(n => <button className={page === n ? 'active' : ''} onClick={() => setPage(n)} key={n}>{n}</button>)}{pageCount > 4 && <><span>…</span><button onClick={() => setPage(pageCount)}>{pageCount}</button></>}<button aria-label="Next page" onClick={() => setPage(Math.min(pageCount, page + 1))}>›</button></div>
    </div>
  </main>;
}
