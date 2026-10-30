import { useEffect, useState, type FormEvent } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useStore } from '../context/StoreContext';
import { Seo } from '../components/storefront/Seo';
import { API_URL, apiJson, apiRequest } from '../services/api';
import type { Order, PaymentMethod } from '../types';

const districts = ['Ampara','Anuradhapura','Badulla','Batticaloa','Colombo','Galle','Gampaha','Hambantota','Jaffna','Kalutara','Kandy','Kegalle','Kilinochchi','Kurunegala','Mannar','Matale','Matara','Monaragala','Mullaitivu','Nuwara Eliya','Polonnaruwa','Puttalam','Ratnapura','Trincomalee','Vavuniya'];
type PayHereStart = { action: string; fields: Record<string, string> };
type ReturnOrder = { id: string; email: string; number: string };

function postPayHere({ action, fields }: PayHereStart) {
  if (!['https://sandbox.payhere.lk/pay/checkout', 'https://www.payhere.lk/pay/checkout'].includes(action)) throw new Error('The payment server returned an invalid PayHere destination.');
  const form = document.createElement('form');
  form.method = 'POST'; form.action = action; form.style.display = 'none';
  Object.entries(fields).forEach(([name, value]) => { const input = document.createElement('input'); input.name = name; input.value = value; form.appendChild(input); });
  document.body.appendChild(form);
  form.submit();
}

export function CheckoutPage() {
  const { cart, products, placeOrder, settings } = useStore();
  const [params] = useSearchParams();
  const paymentReturned = params.has('payment_return');
  const [payment, setPayment] = useState<PaymentMethod>('cod');
  const [couponApplied] = useState(() => sessionStorage.getItem('andra:discount') !== null);
  const [complete, setComplete] = useState<Order | null>(null);
  const [pendingOrder, setPendingOrder] = useState<ReturnOrder | null>(null);
  const [returnOrder] = useState<ReturnOrder | null>(() => { try { const value: unknown = JSON.parse(sessionStorage.getItem('andra:payhere-pending') || 'null'); return value && typeof value === 'object' && !Array.isArray(value) && typeof (value as ReturnOrder).id === 'string' && typeof (value as ReturnOrder).email === 'string' && typeof (value as ReturnOrder).number === 'string' ? value as ReturnOrder : null; } catch { return null; } });
  const [returnStatus, setReturnStatus] = useState<'loading' | 'pending' | 'paid' | 'failed'>('loading');
  const [demoModal, setDemoModal] = useState(false);
  const [demoChannel, setDemoChannel] = useState('Card');
  const [submitting, setSubmitting] = useState(false);
  const [orderError, setOrderError] = useState('');
  const [form, setForm] = useState({ firstName: '', lastName: '', email: '', phone: '', address: '', city: '', district: 'Jaffna', postcode: '', notes: '' });
  const items = products.filter(product => cart[product.id]);
  const subtotal = items.reduce((sum, product) => sum + product.price * cart[product.id], 0);
  const discount = couponApplied ? Math.round(subtotal * 10) / 100 : 0;
  const shipping = settings.payments.flatShipping > 0 && (settings.payments.freeShippingThreshold <= 0 || subtotal < settings.payments.freeShippingThreshold) ? settings.payments.flatShipping : 0;
  const total = Math.max(0, subtotal - discount) + shipping;
  const payhereAvailable = settings.payments.payhere.enabled && (settings.payments.payhere.mode === 'demo' || Boolean(API_URL));
  const dialogAvailable = settings.payments.dialog.enabled && settings.payments.dialog.mode === 'demo';
  const enabledMethods: PaymentMethod[] = [payhereAvailable && 'payhere', dialogAvailable && 'dialog', settings.payments.cod.enabled && 'cod', settings.payments.bank.enabled && Boolean(settings.payments.bank.accountNumber) && 'bank'].filter(Boolean) as PaymentMethod[];
  const selected = enabledMethods.includes(payment) ? payment : enabledMethods[0];
  const isDemo = selected === 'payhere' ? settings.payments.payhere.mode === 'demo' : selected === 'dialog' ? settings.payments.dialog.mode === 'demo' : false;
  const change = (key: keyof typeof form, value: string) => setForm(old => ({ ...old, [key]: value }));
  const orderInput = (status: Order['paymentStatus'] = 'pending', reference?: string): Omit<Order, 'id' | 'createdAt' | 'status'> => ({ customer: `${form.firstName} ${form.lastName}`.trim(), email: form.email, phone: form.phone, address: form.address, city: form.city, district: form.district, notes: form.notes, discount, paymentMethod: selected, paymentStatus: status, paymentReference: reference, total, items: items.map(product => ({ productId: product.id, quantity: cart[product.id] })) });
  useEffect(() => {
    if (!paymentReturned || !returnOrder || !API_URL) return;
    let cancelled = false;
    let attempts = 0;
    const check = async () => {
      let state: 'pending' | 'paid' | 'failed' = 'pending';
      try {
        const result = await apiRequest<{ paymentStatus: string }>(`/payments/status/${encodeURIComponent(returnOrder.id)}?email=${encodeURIComponent(returnOrder.email)}`);
        if (cancelled) return;
        state = result.paymentStatus === 'PAID' ? 'paid' : result.paymentStatus === 'FAILED' ? 'failed' : 'pending';
        setReturnStatus(state);
        if (state !== 'pending') sessionStorage.removeItem('andra:payhere-pending');
      } catch { if (!cancelled) setReturnStatus('pending'); }
      attempts++;
      if (!cancelled && attempts < 12 && state === 'pending') window.setTimeout(check, 3000);
    };
    void check();
    return () => { cancelled = true; };
  }, [paymentReturned, returnOrder]);
  const beginPayHere = async (order: ReturnOrder) => {
    setOrderError('');
    const payload = await apiRequest<PayHereStart>('/payments/payhere/start', apiJson('POST', { orderId: order.id, email: order.email }));
    sessionStorage.setItem('andra:payhere-pending', JSON.stringify(order));
    postPayHere(payload);
  };
  const submit = async (event: FormEvent) => {
    event.preventDefault(); setOrderError('');
    if (!selected) { setOrderError('No payment method is currently available.'); return; }
    if (selected === 'dialog' && !isDemo) { setOrderError('Dialog Pay live checkout needs the merchant API and verification service. Please choose another method.'); return; }
    if (selected === 'payhere' && !isDemo && !API_URL) { setOrderError('PayHere live checkout needs the connected payment API. Please choose another method.'); return; }
    if (isDemo) { setDemoChannel(selected === 'payhere' ? 'Card' : 'Genie'); setDemoModal(true); return; }
    setSubmitting(true);
    try {
      const order = await placeOrder(orderInput());
      sessionStorage.removeItem('andra:discount');
      if (selected === 'payhere') {
        if (!order.remoteId) throw new Error('The payment server did not return an order ID.');
        const pending = { id: order.remoteId, email: order.email, number: order.id };
        setPendingOrder(pending);
        await beginPayHere(pending);
      } else setComplete(order);
    } catch (error) { setOrderError(error instanceof Error ? error.message : 'We could not place your order. Please try again.'); }
    finally { setSubmitting(false); }
  };
  const finishDemo = async () => {
    setSubmitting(true); setOrderError('');
    try {
      const reference = `${selected === 'payhere' ? 'PH' : 'DLG'}-DEMO-${crypto.randomUUID().slice(0, 8).toUpperCase()}`;
      const order = await placeOrder(orderInput('demo-paid', reference));
      sessionStorage.removeItem('andra:discount');
      setDemoModal(false); setComplete(order);
    } catch (error) { setOrderError(error instanceof Error ? error.message : 'Could not save the demo order.'); }
    finally { setSubmitting(false); }
  };
  if (paymentReturned && returnOrder) return <main className="container order-confirmation"><Seo title="Payment status" description="Check your Andra Books payment status."/><div className="confirmation-icon">{returnStatus === 'paid' ? '✓' : '…'}</div><h1>{returnStatus === 'paid' ? 'Payment confirmed' : returnStatus === 'failed' ? 'Payment was not completed' : 'Checking payment status'}</h1><p>Order <strong>#{returnOrder.number}</strong>: {returnStatus === 'paid' ? 'PayHere confirmed your payment to our server.' : returnStatus === 'failed' ? 'Please contact us or try another payment method.' : 'We are waiting for PayHere’s verified server notification. Please keep your order number.'}</p><Link to="/shop" className="pill-button">CONTINUE SHOPPING</Link></main>;
  if (complete) return <main className="container order-confirmation"><Seo title="Order received" description="Your Andra Books order has been received."/><div className="confirmation-icon">✓</div><span className="eyebrow">THANK YOU FOR SHOPPING WITH US</span><h1>{complete.paymentStatus === 'demo-paid' ? 'Demo order complete' : 'Order received'}</h1><p>Order <strong>#{complete.id}</strong> {complete.paymentStatus === 'demo-paid' ? 'was completed in demo mode. No real payment was collected.' : 'has been received. Our team will contact you about delivery.'}</p>{complete.paymentReference && <p>Reference: <strong>{complete.paymentReference}</strong></p>}{complete.paymentMethod === 'bank' && <p>Transfer to {settings.payments.bank.accountName}, {settings.payments.bank.bankName} ({settings.payments.bank.branch}), account {settings.payments.bank.accountNumber}. Send your receipt via <a href={`https://wa.me/${settings.payments.bank.whatsappReceipt.replace(/\D/g, '')}?text=${encodeURIComponent(`Bank transfer receipt for order ${complete.id}`)}`}>WhatsApp</a>.</p>}<Link to="/shop" className="pill-button">CONTINUE SHOPPING</Link></main>;
  if (pendingOrder) return <main className="container order-confirmation"><Seo title="Continue payment" description="Continue your Andra Books PayHere payment."/><h1>Order #{pendingOrder.number} is pending payment</h1><p>PayHere checkout did not open. You can retry safely without creating another order.</p>{orderError && <p className="checkout-error" role="alert">{orderError}</p>}<button className="pill-button" disabled={submitting} onClick={() => { setSubmitting(true); void beginPayHere(pendingOrder).catch(error => setOrderError(error instanceof Error ? error.message : 'Could not open PayHere.')).finally(() => setSubmitting(false)); }}>RETRY PAYHERE</button></main>;
  if (!items.length) return <main className="container empty-checkout"><Seo title="Checkout" description="Complete your Andra Books order."/><h1>Your cart is empty</h1><p>Add a book to your cart before checking out.</p><Link to="/shop" className="pill-button">BROWSE BOOKS</Link></main>;
  return <main className="container checkout-page"><Seo title="Checkout" description="Choose an Andra Books payment method."/><h1 className="page-heading">Checkout</h1><form className="checkout-grid" onSubmit={submit}><section className="billing-form"><h2>Billing details</h2><div className="form-row"><label>First name<input required value={form.firstName} onChange={event => change('firstName', event.target.value)}/></label><label>Last name<input required value={form.lastName} onChange={event => change('lastName', event.target.value)}/></label></div><label>Country / Region<input value="Sri Lanka" readOnly/></label><label>Street address<input required value={form.address} onChange={event => change('address', event.target.value)}/></label><div className="form-row checkout-city-row"><label>Town / City *<input required autoComplete="address-level2" placeholder="Enter your town or city" value={form.city} onChange={event => change('city', event.target.value)}/></label><label>District<select value={form.district} onChange={event => change('district', event.target.value)}>{districts.map(district => <option key={district}>{district}</option>)}</select></label></div><div className="form-row"><label>Postcode / ZIP (optional)<input value={form.postcode} onChange={event => change('postcode', event.target.value)}/></label><label>Phone<input required type="tel" value={form.phone} onChange={event => change('phone', event.target.value)}/></label></div><label>Email address<input required type="email" value={form.email} onChange={event => change('email', event.target.value)}/></label><label>Order notes (optional)<textarea rows={3} value={form.notes} onChange={event => change('notes', event.target.value)}/></label></section><aside className="order-box"><h2>Your order</h2>{items.map(product => <div className="order-line" key={product.id}><span>{product.name} × {cart[product.id]}</span><strong>Rs.{(product.price * cart[product.id]).toFixed(2)}</strong></div>)}<div className="order-line"><span>Subtotal</span><strong>Rs.{subtotal.toFixed(2)}</strong></div>{discount > 0 && <div className="order-line"><span>ANDRA10 discount</span><strong>− Rs.{discount.toFixed(2)}</strong></div>}<div className="order-line"><span>Shipping</span><strong>{shipping ? `Rs.${shipping.toFixed(2)}` : 'Free'}</strong></div><div className="order-line order-total"><span>Total</span><strong>Rs.{total.toFixed(2)}</strong></div><div className="checkout-methods" role="radiogroup" aria-label="Payment method">
    {settings.payments.payhere.enabled && <label className="payment-option"><input type="radio" name="payment" value="payhere" disabled={!payhereAvailable} checked={selected === 'payhere'} onChange={() => setPayment('payhere')}/><span><strong>PayHere {settings.payments.payhere.mode === 'demo' && <em>DEMO</em>}</strong><small>{payhereAvailable ? settings.payments.payhere.description : 'Connect the payment API to enable live checkout.'}</small><img className="gateway-provider-logo payhere-logo" src="/payments/payhere-short-banner.png" alt="PayHere, cards and mobile wallets"/><span className="gateway-marks">LankaQR availability depends on your PayHere account.</span></span></label>}
    {settings.payments.dialog.enabled && <label className="payment-option"><input type="radio" name="payment" value="dialog" disabled={!dialogAvailable} checked={selected === 'dialog'} onChange={() => setPayment('dialog')}/><span><strong>Dialog Pay {settings.payments.dialog.mode === 'demo' && <em>DEMO</em>}</strong><small>{dialogAvailable ? settings.payments.dialog.description : 'Live merchant integration is not connected yet.'}</small><img className="gateway-provider-logo dialog-logo" src="/payments/dialog-pay-business.svg" alt="Dialog Pay Business"/><span className="gateway-marks">Genie · eZ Cash · LankaQR</span></span></label>}
    {settings.payments.cod.enabled && <label className="payment-option"><input type="radio" name="payment" value="cod" checked={selected === 'cod'} onChange={() => setPayment('cod')}/><span><strong>Cash on Delivery</strong><small>Pay the courier when your books arrive.</small></span></label>}
    {settings.payments.bank.enabled && Boolean(settings.payments.bank.accountNumber) && <label className="payment-option"><input type="radio" name="payment" value="bank" checked={selected === 'bank'} onChange={() => setPayment('bank')}/><span><strong>Direct Bank Transfer</strong><small>Transfer to {settings.payments.bank.bankName} and share your receipt.</small></span></label>}
    </div>{selected === 'bank' && <div className="bank-transfer-details"><strong>{settings.payments.bank.bankName}</strong><span>{settings.payments.bank.branch}</span><span>{settings.payments.bank.accountName}</span><span>Account: {settings.payments.bank.accountNumber}</span></div>}{(selected === 'payhere' || selected === 'dialog') && isDemo && <p className="payment-demo-note">Demo checkout only. No card, wallet, PIN or OTP details are collected, and no money is charged.</p>}<p className="checkout-privacy">Your personal data will be used to process your order and support your experience throughout this website.</p>{orderError && <p className="checkout-error" role="alert">{orderError}</p>}<button className="pill-button" disabled={submitting || !selected}>{submitting ? 'PLEASE WAIT…' : isDemo ? 'OPEN DEMO CHECKOUT' : selected === 'payhere' ? 'CONTINUE TO PAYHERE' : 'PLACE ORDER'}</button></aside></form>
    {demoModal && <div className="payment-demo-overlay" role="presentation" onMouseDown={event => { if (event.target === event.currentTarget) setDemoModal(false); }}><div className="payment-demo-modal" role="dialog" aria-modal="true" aria-label={`${selected === 'payhere' ? 'PayHere' : 'Dialog Pay'} demo checkout`}><button className="payment-demo-close" type="button" onClick={() => setDemoModal(false)} aria-label="Close demo checkout">×</button><span className="payment-demo-brand">{selected === 'payhere' ? 'PayHere' : 'Dialog Pay'} <em>DEMO</em></span><h2>Test payment</h2><p>No real charge will be made. Choose a channel and approve a simulated transaction.</p><div className="payment-demo-amount">Rs.{total.toFixed(2)} <small>LKR</small></div><div className="payment-demo-channels">{(selected === 'payhere' ? ['Card', 'LankaQR', 'Mobile wallet'] : settings.payments.dialog.channels.map(channel => ({ genie: 'Genie', ezcash: 'eZ Cash', lankaqr: 'LankaQR' })[channel])).map(channel => <button type="button" key={channel} className={demoChannel === channel ? 'active' : ''} onClick={() => setDemoChannel(channel)}>{channel}</button>)}</div><p className="payment-demo-note">This test does not ask for a card number, PIN or OTP.</p>{orderError && <p className="checkout-error" role="alert">{orderError}</p>}<button type="button" className="pill-button" onClick={finishDemo} disabled={submitting}>{submitting ? 'SAVING DEMO ORDER…' : 'APPROVE DEMO PAYMENT'}</button></div></div>}
  </main>;
}
