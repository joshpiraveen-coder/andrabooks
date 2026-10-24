import { useEffect, useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { LockKeyhole, UserRound } from 'lucide-react';
import { useStore } from '../context/StoreContext';
import { API_URL, apiJson, apiRequest } from '../services/api';
import { Seo } from '../components/storefront/Seo';

type Account = { name: string; email: string; phone?: string };
type LocalAccount = Account & { salt: string; passwordHash: string };
type RemoteOrder = { id: string; orderNumber: string; status: string; total: number | string; createdAt: string; items: { quantity: number; product: { name: string } }[] };

function toHex(bytes: Uint8Array) { return [...bytes].map(byte => byte.toString(16).padStart(2, '0')).join(''); }
async function passwordHash(password: string, salt: Uint8Array) {
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(password), 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt, iterations: 120_000 }, key, 256);
  return toHex(new Uint8Array(bits));
}

export function AccountPage() {
  const { orders } = useStore();
  const [account, setAccount] = useState<Account | null>(() => { try { const saved = JSON.parse(localStorage.getItem('andra:customer') || 'null') as Account | null; return saved && (!API_URL || Boolean(localStorage.getItem('andra:customer-token'))) ? saved : null; } catch { return null; } });
  const [registerMode, setRegisterMode] = useState(false);
  const [error, setError] = useState('');
  const [remoteOrders, setRemoteOrders] = useState<RemoteOrder[]>([]);
  const [form, setForm] = useState({ name: '', email: '', phone: '', password: '' });
  const localOrders = orders.filter(order => account && order.email.toLowerCase() === account.email.toLowerCase());

  useEffect(() => {
    if (!account || !API_URL || !localStorage.getItem('andra:customer-token')) return;
    void apiRequest<RemoteOrder[]>('/account/orders', {}, 'andra:customer-token').then(setRemoteOrders).catch(() => undefined);
  }, [account]);

  const submit = async (event: FormEvent) => {
    event.preventDefault(); setError('');
    try {
      if (API_URL) {
        const endpoint = registerMode ? '/account/register' : '/account/login';
        const result = await apiRequest<{ token: string; user: Account }>(endpoint, apiJson('POST', form));
        localStorage.setItem('andra:customer-token', result.token); localStorage.setItem('andra:customer', JSON.stringify(result.user)); setAccount(result.user); return;
      }
      const email = form.email.trim().toLowerCase();
      if (registerMode) {
        if (form.password.length < 8) { setError('Choose a password with at least 8 characters.'); return; }
        const salt = crypto.getRandomValues(new Uint8Array(16));
        const record: LocalAccount = { name: form.name.trim(), email, phone: form.phone, salt: toHex(salt), passwordHash: await passwordHash(form.password, salt) };
        localStorage.setItem(`andra:account:${email}`, JSON.stringify(record));
        const next = { name: record.name, email: record.email, phone: record.phone }; localStorage.setItem('andra:customer', JSON.stringify(next)); setAccount(next);
      } else {
        const record = JSON.parse(localStorage.getItem(`andra:account:${email}`) || 'null') as LocalAccount | null;
        if (!record || await passwordHash(form.password, Uint8Array.from(record.salt.match(/.{2}/g)?.map(value => parseInt(value, 16)) || [])) !== record.passwordHash) { setError('Email or password did not match.'); return; }
        const next = { name: record.name, email: record.email, phone: record.phone }; localStorage.setItem('andra:customer', JSON.stringify(next)); setAccount(next);
      }
    } catch (issue) { setError(issue instanceof Error ? issue.message : 'We could not complete your request.'); }
  };

  const signOut = () => { localStorage.removeItem('andra:customer'); localStorage.removeItem('andra:customer-token'); setAccount(null); setRemoteOrders([]); };
  return <main className="container account-page"><Seo title="My account" description="Sign in or create your Andra Books customer account."/><div className="account-heading"><span className="eyebrow">YOUR ANDRA BOOKS ACCOUNT</span><h1>My account</h1><p>Keep your reading list close and follow your recent orders.</p></div>{account ? <div className="account-dashboard"><section className="account-profile"><div className="account-user-icon"><UserRound/></div><div><span className="eyebrow">SIGNED IN</span><h2>{account.name}</h2><p>{account.email}</p>{account.phone && <p>{account.phone}</p>}</div><button className="secondary-button" onClick={signOut}>SIGN OUT</button></section><section className="account-orders"><div className="account-section-head"><h2>Recent orders</h2><Link to="/shop">Shop books</Link></div>{remoteOrders.length ? remoteOrders.map(order => <div className="account-order" key={order.id}><div><strong>#{order.orderNumber}</strong><span>{new Date(order.createdAt).toLocaleDateString()}</span></div><span>{order.items.reduce((sum, item) => sum + item.quantity, 0)} books</span><strong>Rs.{Number(order.total).toFixed(2)}</strong><span className="status-pill">{order.status}</span></div>) : localOrders.length ? localOrders.map(order => <div className="account-order" key={order.id}><div><strong>#{order.id}</strong><span>{new Date(order.createdAt).toLocaleDateString()}</span></div><span>{order.items.reduce((sum, item) => sum + item.quantity, 0)} books</span><strong>Rs.{order.total.toFixed(2)}</strong><span className="status-pill">{order.status}</span></div>) : <div className="admin-empty">Your orders will appear here after checkout.</div>}</section></div> : <div className="account-auth"><div className="account-auth-intro"><div className="account-lock-icon"><LockKeyhole/></div><h2>{registerMode ? 'Join our reading community' : 'Welcome back'}</h2><p>{registerMode ? 'Create an account to keep track of your orders and favorite books.' : 'Sign in to see your saved books and recent orders.'}</p><button className="text-button" onClick={() => { setRegisterMode(value => !value); setError(''); }}>{registerMode ? 'Already have an account? Sign in' : 'New to Andra Books? Create an account'}</button></div><form className="account-form" onSubmit={submit}>{registerMode && <label>Your name<input required value={form.name} onChange={e => setForm({ ...form, name: e.target.value })}/></label>}<label>Email address<input required type="email" autoComplete="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })}/></label>{registerMode && <label>Phone number (optional)<input type="tel" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })}/></label>}<label>Password<input required type="password" minLength={registerMode ? 8 : undefined} autoComplete={registerMode ? 'new-password' : 'current-password'} value={form.password} onChange={e => setForm({ ...form, password: e.target.value })}/></label>{error && <span className="account-error">{error}</span>}<button className="pill-button">{registerMode ? 'CREATE ACCOUNT' : 'SIGN IN'}</button><small>Guest checkout is also available. Your cart and wishlist stay saved on this device.</small></form></div>}</main>;
}
