import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ShoppingCart, X, Minus, Plus, Trash2 } from 'lucide-react';
import { useStore } from '../context/StoreContext';
import { BookCover } from '../components/storefront/BookCover';
import { Seo } from '../components/storefront/Seo';

export function CartPage() {
  const { cart, products, setQty, removeFromCart } = useStore();
  const [coupon, setCoupon] = useState('');
  const [discount, setDiscount] = useState(0);
  const [notice, setNotice] = useState('');
  const items = products.filter(p => cart[p.id]);
  const subtotal = useMemo(() => items.reduce((sum, p) => sum + p.price * cart[p.id], 0), [items, cart]);
  const applyCoupon = () => { if (coupon.trim().toUpperCase() === 'ANDRA10') { const amount = subtotal * .1; setDiscount(amount); sessionStorage.setItem('andra:discount', String(amount)); setNotice('10% discount applied.'); } else { setNotice('That coupon code is not valid.'); setDiscount(0); sessionStorage.removeItem('andra:discount'); } };
  return <main className="container cart-page"><Seo title="Shopping cart" description="Review the books in your Andra Books shopping cart."/>
    {items.length === 0 ? <section className="empty-cart" data-mascot-anchor="cart"><div className="empty-cart-icon"><ShoppingCart/><X/></div><h1>Your cart is currently empty.</h1><p>Before proceed to checkout you must add some products to your shopping cart.<br/>You will find a lot of interesting products on our "Shop" page.</p><Link to="/shop" className="pill-button">RETURN TO SHOP</Link></section> : <>
      <h1 className="page-heading">Your cart</h1><div className="cart-content"><div className="cart-table-wrap"><table className="cart-table"><thead><tr><th></th><th>Product</th><th>Price</th><th>Quantity</th><th>Subtotal</th><th></th></tr></thead><tbody>{items.map(p => <tr key={p.id}><td><BookCover product={p} className="cart-cover"/></td><td><Link to={`/product/${p.id}`}>{p.name}</Link></td><td>Rs.{p.price.toFixed(2)}</td><td><div className="quantity-control"><button aria-label="Decrease quantity" onClick={() => setQty(p.id, cart[p.id] - 1)}><Minus size={14}/></button><span>{cart[p.id]}</span><button aria-label="Increase quantity" onClick={() => setQty(p.id, cart[p.id] + 1)}><Plus size={14}/></button></div></td><td>Rs.{(p.price * cart[p.id]).toFixed(2)}</td><td><button className="remove-button" aria-label={`Remove ${p.name}`} onClick={() => removeFromCart(p.id)}><Trash2 size={17}/></button></td></tr>)}</tbody></table><div className="coupon-row"><input placeholder="Coupon code" value={coupon} onChange={e => setCoupon(e.target.value)}/><button className="secondary-button" onClick={applyCoupon}>APPLY COUPON</button>{notice && <small>{notice}</small>}</div></div><aside className="cart-totals"><h2>Cart totals</h2><div><span>Subtotal</span><strong>Rs.{subtotal.toFixed(2)}</strong></div><div><span>Shipping</span><strong>Calculated at checkout</strong></div>{discount > 0 && <div><span>Discount</span><strong>− Rs.{discount.toFixed(2)}</strong></div>}<div className="cart-total"><span>Total</span><strong>Rs.{(subtotal - discount).toFixed(2)}</strong></div><Link to="/checkout" className="pill-button">PROCEED TO CHECKOUT</Link></aside></div>
    </>}
  </main>;
}
