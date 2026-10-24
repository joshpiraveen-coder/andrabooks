import { useState } from 'react';
import type { FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { useStore } from '../context/StoreContext';
import { Seo } from '../components/storefront/Seo';

const districts = ['Ampara','Anuradhapura','Badulla','Batticaloa','Colombo','Galle','Gampaha','Hambantota','Jaffna','Kalutara','Kandy','Kegalle','Kilinochchi','Kurunegala','Mannar','Matale','Matara','Monaragala','Mullaitivu','Nuwara Eliya','Polonnaruwa','Puttalam','Ratnapura','Trincomalee','Vavuniya'];

export function CheckoutPage() {
  const { cart, products, placeOrder } = useStore();
  const [payment, setPayment] = useState('cod');
  const [discount] = useState(() => Number(sessionStorage.getItem('andra:discount') || 0));
  const [complete, setComplete] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [orderError, setOrderError] = useState('');
  const [orderNumber, setOrderNumber] = useState('');
  const [form, setForm] = useState({ firstName: '', lastName: '', email: '', phone: '', address: '', city: '', district: 'Jaffna', postcode: '', notes: '' });
  const items = products.filter(p => cart[p.id]);
  const subtotal = items.reduce((sum, p) => sum + p.price * cart[p.id], 0);
  const total = Math.max(0, subtotal - discount);
  const change = (key: keyof typeof form, value: string) => setForm(old => ({ ...old, [key]: value }));
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setSubmitting(true);
    setOrderError('');
    try {
      const order = await placeOrder({ customer: `${form.firstName} ${form.lastName}`.trim(), email: form.email, phone: form.phone, address: form.address, city: form.city, district: form.district, notes: form.notes, discount, paymentMethod: payment as 'cod' | 'online', total, items: items.map(p => ({ productId: p.id, quantity: cart[p.id] })) });
      setOrderNumber(order.id);
      setComplete(true);
      sessionStorage.removeItem('andra:discount');
    } catch (error) {
      setOrderError(error instanceof Error ? error.message : 'We could not place your order. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };
  if (complete) return <main className="container order-confirmation"><Seo title="Order received" description="Your order has been received."/><div className="confirmation-icon">✓</div><span className="eyebrow">THANK YOU FOR SHOPPING WITH US</span><h1>Your order is on its way!</h1><p>We’ve received order <strong>#{orderNumber}</strong>. Our Jaffna team will contact you to confirm delivery details.</p><Link to="/shop" className="pill-button">CONTINUE SHOPPING</Link></main>;
  if (!items.length) return <main className="container empty-checkout"><Seo title="Checkout" description="Complete your Andra Books order."/><h1>Your cart is empty</h1><p>Add a book to your cart before checking out.</p><Link to="/shop" className="pill-button">BROWSE BOOKS</Link></main>;
  return <main className="container checkout-page"><Seo title="Checkout" description="Complete your Andra Books order with secure local payment options."/><h1 className="page-heading">Checkout</h1><form className="checkout-grid" onSubmit={submit}><section className="billing-form"><h2>Billing details</h2><div className="form-row"><label>First name<input required value={form.firstName} onChange={e => change('firstName', e.target.value)}/></label><label>Last name<input required value={form.lastName} onChange={e => change('lastName', e.target.value)}/></label></div><label>Country / Region<input value="Sri Lanka" readOnly/></label><label>Street address<input required placeholder="House number and street name" value={form.address} onChange={e => change('address', e.target.value)}/></label><div className="form-row"><label>Town / City<input required value={form.city} onChange={e => change('city', e.target.value)}/></label><label>District<select value={form.district} onChange={e => change('district', e.target.value)}>{districts.map(d => <option key={d}>{d}</option>)}</select></label></div><div className="form-row"><label>Postcode / ZIP (optional)<input value={form.postcode} onChange={e => change('postcode', e.target.value)}/></label><label>Phone<input required type="tel" value={form.phone} onChange={e => change('phone', e.target.value)}/></label></div><label>Email address<input required type="email" value={form.email} onChange={e => change('email', e.target.value)}/></label><label>Order notes (optional)<textarea rows={3} placeholder="Notes about your order" value={form.notes} onChange={e => change('notes', e.target.value)}/></label></section><aside className="order-box"><h2>Your order</h2>{items.map(p => <div className="order-line" key={p.id}><span>{p.name} × {cart[p.id]}</span><strong>Rs.{(p.price * cart[p.id]).toFixed(2)}</strong></div>)}<div className="order-line"><span>Subtotal</span><strong>Rs.{subtotal.toFixed(2)}</strong></div>{discount > 0 && <div className="order-line"><span>ANDRA10 discount</span><strong>− Rs.{discount.toFixed(2)}</strong></div>}<div className="order-line"><span>Shipping</span><strong>Confirmed by phone</strong></div><div className="order-line order-total"><span>Total</span><strong>Rs.{total.toFixed(2)}</strong></div><label className="payment-option"><input type="radio" name="payment" value="cod" checked={payment === 'cod'} onChange={e => setPayment(e.target.value)}/><span><strong>Cash on Delivery</strong><small>Pay when your books arrive.</small></span></label><label className="payment-option"><input type="radio" name="payment" value="online" checked={payment === 'online'} onChange={e => setPayment(e.target.value)}/><span><strong>Online Payment</strong><small>Our team will share a secure payment link after confirming your order.</small></span></label><p className="checkout-privacy">Your personal data will be used to process your order and support your experience throughout this website.</p>{orderError && <p className="checkout-error" role="alert">{orderError}</p>}<button className="pill-button" disabled={submitting}>{submitting ? 'PLACING ORDER…' : 'PLACE ORDER'}</button></aside></form></main>;
}
