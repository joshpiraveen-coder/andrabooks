import { useState } from 'react';
import type { FormEvent } from 'react';
import { useStore } from '../context/StoreContext';
import { Seo } from '../components/storefront/Seo';
import { useCmsPage } from '../services/content';

export function ContactPage() {
  const { submitInquiry } = useStore();
  const [sent, setSent] = useState(false);
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState('');
  const customCopy = useCmsPage('Contact Us', 'contact-us');
  const [form, setForm] = useState({ name: '', email: '', phone: '', company: '', message: '' });
  const change = (key: keyof typeof form, value: string) => setForm(old => ({ ...old, [key]: value }));
  const send = async (event: FormEvent) => {
    event.preventDefault();
    setSending(true);
    setSent(false);
    setSendError('');
    try {
      await submitInquiry(form);
      setSent(true);
      setForm({ name: '', email: '', phone: '', company: '', message: '' });
    } catch (error) {
      setSendError(error instanceof Error ? error.message : 'Your message could not be sent. Please try again.');
    } finally {
      setSending(false);
    }
  };
  return <main className="container contact-layout"><Seo title="Contact Andra Books" description="Get in touch with Andra Books in Jaffna, Sri Lanka. Send us a question about books, orders or delivery."/>
    <div className="map-wrap"><iframe title="Andra Books location in Jaffna" loading="lazy" referrerPolicy="no-referrer-when-downgrade" src="https://maps.google.com/maps?q=356%20Kasthuriyar%20Road%2C%20Jaffna%2C%20Sri%20Lanka&t=&z=14&ie=UTF8&iwloc=&output=embed"/><a className="map-card" href="https://maps.google.com/?q=356+Kasthuriyar+Road,+Jaffna,+Sri+Lanka" target="_blank" rel="noreferrer"><strong>356 Kasthuriyar Rd</strong><span>356 Kasthuriyar Rd, Jaffna, Sri Lanka</span><b>↗ Open in Maps</b></a></div>
    <section className="contact-form-wrap"><span className="eyebrow eyebrow-muted">INFORMATION ABOUT US</span><h1>CONTACT US FOR ANY QUESTIONS</h1>{customCopy && <p className="contact-custom-copy">{customCopy}</p>}{sent && <div className="form-success" role="status">Thank you! Your message is on its way. Our team will get back to you soon.</div>}{sendError && <div className="form-error" role="alert">{sendError}</div>}<form onSubmit={send}><div className="form-row"><label>Your Name<input required value={form.name} onChange={e => change('name', e.target.value)}/></label><label>Your Email<input required type="email" value={form.email} onChange={e => change('email', e.target.value)}/></label></div><div className="form-row"><label>Phone Number<input value={form.phone} onChange={e => change('phone', e.target.value)}/></label><label>Company<input value={form.company} onChange={e => change('company', e.target.value)}/></label></div><label>Your Message<textarea required rows={7} value={form.message} onChange={e => change('message', e.target.value)}/></label><button className="pill-button" disabled={sending}>{sending ? 'SENDING…' : 'ASK A QUESTION'}</button></form></section>
  </main>;
}
