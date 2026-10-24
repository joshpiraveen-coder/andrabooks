import { useEffect } from 'react';
import { Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import { SiteHeader } from './components/storefront/SiteHeader';
import { SiteFooter } from './components/storefront/SiteFooter';
import { AndraMascot } from './components/storefront/AndraMascot';
import { HomePage } from './pages/HomePage';
import { ShopPage } from './pages/ShopPage';
import { AboutPage } from './pages/AboutPage';
import { ContactPage } from './pages/ContactPage';
import { CartPage } from './pages/CartPage';
import { CheckoutPage } from './pages/CheckoutPage';
import { ProductDetail } from './pages/ProductDetail';
import { AdminPage } from './pages/AdminPage';
import { AccountPage } from './pages/AccountPage';
import { ComparePage, StaticPage, WishlistPage } from './pages/CollectionPages';
import { API_URL, apiRequest } from './services/api';

function StoreLayout() {
  return <><SiteHeader/><Routes>
    <Route path="/" element={<HomePage/>}/><Route path="/shop" element={<ShopPage/>}/><Route path="/about-us" element={<AboutPage/>}/><Route path="/contact-us" element={<ContactPage/>}/>
    <Route path="/cart" element={<CartPage/>}/><Route path="/checkout" element={<CheckoutPage/>}/><Route path="/my-account" element={<AccountPage/>}/><Route path="/wishlist" element={<WishlistPage/>}/><Route path="/compare" element={<ComparePage/>}/><Route path="/product/:slug" element={<ProductDetail/>}/>
    <Route path="/faqs" element={<StaticPage page="faqs"/>}/><Route path="/privacy-policy" element={<StaticPage page="privacy-policy"/>}/><Route path="/refund-policy" element={<StaticPage page="refund-policy"/>}/><Route path="/terms" element={<StaticPage page="terms"/>}/><Route path="/track-order" element={<StaticPage page="track-order"/>}/>
    <Route path="*" element={<div className="container not-found"><h1>Page not found</h1><a className="pill-button" href="/">BACK TO HOME</a></div>}/>
  </Routes><SiteFooter/><AndraMascot/></>;
}

export function App() {
  const location = useLocation();
  const navigate = useNavigate();
  useEffect(() => {
    if (!API_URL || location.pathname.startsWith('/admin')) return;
    void apiRequest<{ toPath: string | null }>(`/redirects/resolve?path=${encodeURIComponent(location.pathname)}`).then(result => { if (result.toPath && result.toPath !== location.pathname) navigate(result.toPath, { replace: true }); }).catch(() => undefined);
  }, [location.pathname, navigate]);
  if (location.pathname.startsWith('/admin')) return <Routes><Route path="/admin/*" element={<AdminPage/>}/></Routes>;
  return <StoreLayout/>;
}
