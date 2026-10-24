import { useState } from 'react';
import type { FormEvent } from 'react';
import { Facebook, Instagram, MessageCircle, Music2, MapPin, Phone, Smartphone, Truck, CreditCard, Headset, ShieldCheck, PackageCheck, Heart } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useStore } from '../../context/StoreContext';
import { Logo } from './Logo';

const promises = [
  { title: 'FREE SHIPPING', text: 'Carrier information', Icon: Truck }, { title: 'ONLINE PAYMENT', text: 'Payment methods', Icon: CreditCard },
  { title: '24/7 SUPPORT', text: 'Unlimited help desk', Icon: Headset }, { title: '100% SAFE', text: 'View our benefits', Icon: ShieldCheck }, { title: 'FREE RETURNS', text: 'Track or off orders', Icon: PackageCheck },
];

export function SiteFooter() {
  const { settings, subscribe } = useStore();
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [messageIsError, setMessageIsError] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const signup = async (event: FormEvent) => {
    event.preventDefault();
    if (!email.includes('@')) { setMessageIsError(true); setMessage('Enter a valid email address.'); return; }
    setSubmitting(true);
    setMessageIsError(false);
    setMessage('');
    try {
      await subscribe(email);
      setMessageIsError(false);
      setMessage('Thanks for joining our reading community!');
      setEmail('');
    } catch (error) {
      setMessageIsError(true);
      setMessage(error instanceof Error ? error.message : 'We could not save your subscription. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };
  return <>
    <section className="promise-strip"><div className="container promise-grid">{promises.map(({ title, text, Icon }) => <div className="promise-item" key={title}><Icon strokeWidth={1.35}/><div><strong>{title}</strong><span>{text}</span></div></div>)}</div></section>
    <footer className="site-footer"><div className="container footer-grid">
      <div className="footer-brand"><Logo light/><p><MapPin/> {settings.address}</p>{settings.phones.slice(0, 2).map(phone => <a href={`tel:${phone.replaceAll(' ', '')}`} key={phone}><Phone/>{phone}</a>)}<a href={`tel:${settings.phones[2]?.replaceAll(' ', '')}`}><Smartphone/>{settings.phones[2]}</a><div className="social-buttons"><a href={settings.socialLinks.facebook} aria-label="Facebook"><Facebook/></a><a href={settings.socialLinks.instagram} aria-label="Instagram"><Instagram/></a><a href={settings.socialLinks.whatsapp} aria-label="WhatsApp"><MessageCircle/></a><a href={settings.socialLinks.tiktok} aria-label="TikTok"><Music2/></a></div></div>
      <div><h3>HELP LINKS</h3><Link to="/privacy-policy">Privacy Policy</Link><Link to="/refund-policy">Refund and Returns Policy</Link><Link to="/terms">Terms of use</Link></div>
      <div><h3>QUICK MENU</h3><Link to="/cart">Cart</Link><Link to="/checkout">Checkout</Link><Link to="/my-account">My account</Link><Link to="/track-order">Track My Order</Link><Link to="/wishlist">Wishlist</Link></div>
      <div className="newsletter"><h3>Join our newsletter!</h3><p>Will be used in accordance with our <Link to="/privacy-policy">Privacy Policy</Link></p><form onSubmit={signup}><input type="email" required placeholder="Your email address" value={email} onChange={e => setEmail(e.target.value)}/><button className="pill-button" disabled={submitting}>{submitting ? 'SENDING…' : 'SIGN UP'}</button></form>{message && <small className={`newsletter-message ${messageIsError ? 'is-error' : 'is-success'}`} role={messageIsError ? 'alert' : 'status'}>{message}</small>}</div>
    </div></footer>
    <div className="copyright"><div className="container copyright-inner"><div><span>Copyright © 2026 <strong>Andra Publication (Pvt) Ltd.</strong> All Rights Reserved</span><span>Design &amp; Development By <Heart size={14} fill="#ff684f" stroke="none"/> <strong>Inspiro Desk</strong></span></div><div className="payment-badges"><span>VISA</span><span>● Mastercard</span><span>PayPal</span><span>AMEX</span><span>VISA Electron</span><span>Maestro</span></div></div></div>
    <a className="whatsapp-float" href={`https://wa.me/${settings.whatsapp}`} aria-label="Chat with Andra Books on WhatsApp"><MessageCircle size={24}/></a>
  </>;
}
