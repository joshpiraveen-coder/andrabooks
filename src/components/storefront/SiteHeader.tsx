import { useEffect, useMemo, useState } from 'react';
import type { FormEvent } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { Facebook, Heart, Instagram, Menu, MessageCircle, Search, ShoppingBag, Shuffle, X, ChevronDown, Music2 } from 'lucide-react';
import { useStore } from '../../context/StoreContext';
import { Logo } from './Logo';

export function SiteHeader() {
  const { cart, products, wishlist, compare, categories, settings, notifyMascot } = useStore();
  const [menuOpen, setMenuOpen] = useState(false);
  const [drawerTab, setDrawerTab] = useState<'menu' | 'categories'>('menu');
  const [search, setSearch] = useState('');
  const [searchCategoryOpen, setSearchCategoryOpen] = useState(false);
  const [categoryOpen, setCategoryOpen] = useState(false);
  const navigate = useNavigate();
  const qty = Object.values(cart).reduce((sum, n) => sum + n, 0);
  const total = useMemo(() => products.reduce((sum, p) => sum + p.price * (cart[p.id] || 0), 0), [products, cart]);
  const submitSearch = (event: FormEvent) => { event.preventDefault(); navigate(`/shop${search ? `?q=${encodeURIComponent(search)}` : ''}`); setMenuOpen(false); };
  useEffect(() => {
    if (!menuOpen) return;
    const previousOverflow = document.body.style.overflow;
    const closeOnEscape = (event: KeyboardEvent) => { if (event.key === 'Escape') setMenuOpen(false); };
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', closeOnEscape);
    return () => { document.body.style.overflow = previousOverflow; window.removeEventListener('keydown', closeOnEscape); };
  }, [menuOpen]);
  const closeDrawer = () => { setMenuOpen(false); window.scrollTo({ top: 0, left: 0, behavior: 'smooth' }); };
  const categoryLinks = (onSelect?: () => void) => categories.map(category => <Link key={category} to={`/shop?category=${encodeURIComponent(category)}`} onClick={onSelect}>{category}</Link>);
  return <header className="site-header">
    <div className="topbar"><div className="container topbar-inner"><span>{settings.announcement}</span><div className="toplinks"><a className="top-social" href={settings.socialLinks.facebook} aria-label="Facebook"><Facebook size={15} fill="currentColor" /></a><a className="top-social" href={settings.socialLinks.instagram} aria-label="Instagram"><Instagram size={15} /></a><a className="top-social" href={settings.socialLinks.whatsapp} aria-label="WhatsApp"><MessageCircle size={15} /></a><a className="top-social" href={settings.socialLinks.tiktok} aria-label="TikTok"><Music2 size={15} /></a><Link className="top-secondary" to="/contact-us">CONTACT US</Link><Link className="top-secondary" to="/faqs">FAQS</Link></div></div></div>
    <div className="main-header"><div className="container main-header-inner">
      <button className="mobile-toggle icon-button" aria-label="Open navigation" aria-expanded={menuOpen} onClick={() => { setDrawerTab('menu'); setMenuOpen(true); }}><Menu /></button>
      <Logo />
      <form className="searchbar desktop-searchbar" onSubmit={submitSearch}><input value={search} onFocus={event => { const rect = event.currentTarget.getBoundingClientRect(); notifyMascot({ kind: 'search', coords: { x: rect.right - 60, y: rect.top - 86 } }); }} onChange={e => setSearch(e.target.value)} placeholder="Search for products" aria-label="Search products" /><button type="button" className="search-category" onClick={() => setSearchCategoryOpen(v => !v)}>SELECT CATEGORY <ChevronDown size={15}/></button><button className="search-submit" aria-label="Search"><Search size={22}/></button>{searchCategoryOpen && <div className="search-dropdown">{categories.map(category => <button type="button" key={category} onClick={() => { setSearch(category); setSearchCategoryOpen(false); navigate(`/shop?category=${encodeURIComponent(category)}`); }}>{category}</button>)}</div>}</form>
      <Link className="login-link" to="/my-account">LOGIN / REGISTER</Link>
      <div className="header-actions"><Link to="/wishlist" aria-label="Wishlist" className="header-action"><Heart/><b>{wishlist.length}</b></Link><Link to="/compare" aria-label="Compare" className="header-action"><Shuffle/><b>{compare.length}</b></Link><Link to="/cart" aria-label="Shopping cart" className="header-cart"><span className="header-action"><ShoppingBag/><b>{qty}</b></span><span>Rs.{total.toFixed(2)}</span></Link></div>
    </div><div className="mobile-search-row container"><form className="searchbar mobile-searchbar" onSubmit={submitSearch}><input value={search} onFocus={event => { const rect = event.currentTarget.getBoundingClientRect(); notifyMascot({ kind: 'search', coords: { x: rect.right - 60, y: rect.top - 86 } }); }} onChange={e => setSearch(e.target.value)} placeholder="Search for books" aria-label="Search products"/><button className="search-submit" aria-label="Search"><Search size={20}/></button></form></div></div>
    <nav className="nav-row"><div className="container nav-inner"><div className="category-holder"><button className="browse-button" onClick={() => setCategoryOpen(v => !v)}><Menu size={21}/><span>BROWSE CATEGORIES</span><ChevronDown size={16}/></button>{categoryOpen && <div className="category-menu">{categories.map(category => <Link key={category} to={`/shop?category=${encodeURIComponent(category)}`} onClick={() => setCategoryOpen(false)}>{category}</Link>)}</div>}</div><div className="main-nav"><NavLink to="/" end>HOME</NavLink><NavLink to="/shop">SHOP</NavLink><NavLink to="/about-us">ABOUT US</NavLink><NavLink to="/contact-us">CONTACT US</NavLink></div></div></nav>
    {menuOpen && <div className="mobile-overlay" onClick={closeDrawer}><aside className="mobile-drawer" role="dialog" aria-modal="true" aria-label="Store navigation" onClick={e => e.stopPropagation()}><div className="drawer-head"><Logo/><button className="icon-button" aria-label="Close navigation" onClick={closeDrawer}><X/></button></div><form className="searchbar drawer-search" onSubmit={submitSearch}><input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search for books" aria-label="Search products"/><button className="search-submit" aria-label="Search"><Search size={20}/></button></form><div className="drawer-tabs" role="tablist" aria-label="Navigation sections"><button role="tab" aria-selected={drawerTab === 'menu'} className={drawerTab === 'menu' ? 'active' : ''} onClick={() => setDrawerTab('menu')}>MENU</button><button role="tab" aria-selected={drawerTab === 'categories'} className={drawerTab === 'categories' ? 'active' : ''} onClick={() => setDrawerTab('categories')}>CATEGORIES</button></div><div className="drawer-links">{drawerTab === 'menu' ? <><NavLink onClick={closeDrawer} to="/" end>Home</NavLink><NavLink onClick={closeDrawer} to="/shop">Shop</NavLink><NavLink onClick={closeDrawer} to="/about-us">About us</NavLink><NavLink onClick={closeDrawer} to="/contact-us">Contact us</NavLink><NavLink onClick={closeDrawer} to="/my-account">Login / Register</NavLink><NavLink onClick={closeDrawer} to="/wishlist">Wishlist ({wishlist.length})</NavLink><NavLink onClick={closeDrawer} to="/track-order">Track order</NavLink><NavLink onClick={closeDrawer} to="/faqs">FAQs</NavLink></> : categoryLinks(closeDrawer)}</div></aside></div>}
  </header>;
}
