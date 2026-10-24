import { useMemo, useState } from 'react';
import type { FormEvent } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { Facebook, Heart, Instagram, Menu, MessageCircle, Search, ShoppingBag, Shuffle, X, ChevronDown, Music2 } from 'lucide-react';
import { useStore } from '../../context/StoreContext';
import { Logo } from './Logo';

export function SiteHeader() {
  const { cart, products, wishlist, compare, categories, settings, notifyMascot } = useStore();
  const [menuOpen, setMenuOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [searchCategoryOpen, setSearchCategoryOpen] = useState(false);
  const [categoryOpen, setCategoryOpen] = useState(false);
  const navigate = useNavigate();
  const qty = Object.values(cart).reduce((sum, n) => sum + n, 0);
  const total = useMemo(() => products.reduce((sum, p) => sum + p.price * (cart[p.id] || 0), 0), [products, cart]);
  const submitSearch = (event: FormEvent) => { event.preventDefault(); navigate(`/shop${search ? `?q=${encodeURIComponent(search)}` : ''}`); };
  return <header className="site-header">
    <div className="topbar"><div className="container topbar-inner"><span>{settings.announcement}</span><div className="toplinks"><a href={settings.socialLinks.facebook} aria-label="Facebook"><Facebook size={15} fill="currentColor" /></a><a href={settings.socialLinks.instagram} aria-label="Instagram"><Instagram size={15} /></a><a href={settings.socialLinks.whatsapp} aria-label="WhatsApp"><MessageCircle size={15} /></a><a href={settings.socialLinks.tiktok} aria-label="TikTok"><Music2 size={15} /></a><Link to="/contact-us">CONTACT US</Link><Link to="/faqs">FAQS</Link></div></div></div>
    <div className="main-header"><div className="container main-header-inner">
      <button className="mobile-toggle icon-button" aria-label="Open navigation" onClick={() => setMenuOpen(true)}><Menu /></button>
      <Logo />
      <form className="searchbar" onSubmit={submitSearch}><input value={search} onFocus={event => { const rect = event.currentTarget.getBoundingClientRect(); notifyMascot({ kind: 'search', coords: { x: rect.right - 60, y: rect.top - 86 } }); }} onChange={e => setSearch(e.target.value)} placeholder="Search for products" aria-label="Search products" /><button type="button" className="search-category" onClick={() => setSearchCategoryOpen(v => !v)}>SELECT CATEGORY <ChevronDown size={15}/></button><button className="search-submit" aria-label="Search"><Search size={22}/></button>{searchCategoryOpen && <div className="search-dropdown">{categories.map(category => <button type="button" key={category} onClick={() => { setSearch(category); setSearchCategoryOpen(false); navigate(`/shop?category=${encodeURIComponent(category)}`); }}>{category}</button>)}</div>}</form>
      <Link className="login-link" to="/my-account">LOGIN / REGISTER</Link>
      <div className="header-actions"><Link to="/wishlist" aria-label="Wishlist" className="header-action"><Heart/><b>{wishlist.length}</b></Link><Link to="/compare" aria-label="Compare" className="header-action"><Shuffle/><b>{compare.length}</b></Link><Link to="/cart" aria-label="Shopping cart" className="header-cart"><span className="header-action"><ShoppingBag/><b>{qty}</b></span><span>Rs.{total.toFixed(2)}</span></Link></div>
    </div></div>
    <nav className="nav-row"><div className="container nav-inner"><div className="category-holder"><button className="browse-button" onClick={() => setCategoryOpen(v => !v)}><Menu size={21}/><span>BROWSE CATEGORIES</span><ChevronDown size={16}/></button>{categoryOpen && <div className="category-menu">{categories.map(category => <Link key={category} to={`/shop?category=${encodeURIComponent(category)}`} onClick={() => setCategoryOpen(false)}>{category}</Link>)}</div>}</div><div className="main-nav"><NavLink to="/" end>HOME</NavLink><NavLink to="/shop">SHOP</NavLink><NavLink to="/about-us">ABOUT US</NavLink><NavLink to="/contact-us">CONTACT US</NavLink></div></div></nav>
    {menuOpen && <div className="mobile-overlay" onClick={() => setMenuOpen(false)}><aside className="mobile-drawer" onClick={e => e.stopPropagation()}><div className="drawer-head"><Logo/><button className="icon-button" aria-label="Close navigation" onClick={() => setMenuOpen(false)}><X/></button></div><div className="drawer-links"><NavLink onClick={() => setMenuOpen(false)} to="/">Home</NavLink><NavLink onClick={() => setMenuOpen(false)} to="/shop">Shop all</NavLink><NavLink onClick={() => setMenuOpen(false)} to="/about-us">About us</NavLink><NavLink onClick={() => setMenuOpen(false)} to="/contact-us">Contact us</NavLink><strong>Browse categories</strong>{categories.map(c => <Link onClick={() => setMenuOpen(false)} key={c} to={`/shop?category=${encodeURIComponent(c)}`}>{c}</Link>)}</div></aside></div>}
  </header>;
}
