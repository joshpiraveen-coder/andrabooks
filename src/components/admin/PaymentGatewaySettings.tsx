import { useEffect, useState, type FormEvent } from 'react';
import type { PaymentSettings } from '../../types';
import { API_URL, apiJson, apiRequest } from '../../services/api';
import { useStore } from '../../context/StoreContext';

type Props = { value: PaymentSettings; onChange: (next: PaymentSettings) => void };
type SecretStatus = { payhere: boolean; dialog: boolean };

export function PaymentGatewaySettings({ value, onChange }: Props) {
  const { settings } = useStore();
  const [secrets, setSecrets] = useState({ payhereSecret: '', dialogApiKey: '' });
  const [status, setStatus] = useState<SecretStatus>({ payhere: false, dialog: false });
  const [message, setMessage] = useState('');
  useEffect(() => {
    if (!API_URL) return;
    void apiRequest<SecretStatus>('/payment-config', {}, true).then(setStatus).catch(() => setMessage('Could not read server payment configuration.'));
  }, []);
  const saveSecrets = async (event: FormEvent) => {
    event.preventDefault();
    if (!API_URL) return;
    setMessage('');
    try {
      const result = await apiRequest<SecretStatus>('/payment-config', apiJson('PUT', secrets), true);
      setStatus(result);
      setSecrets({ payhereSecret: '', dialogApiKey: '' });
      setMessage('Gateway secrets saved securely on the API server.');
    } catch (error) { setMessage(error instanceof Error ? error.message : 'Could not save gateway secrets.'); }
  };
  const setPayhere = (patch: Partial<PaymentSettings['payhere']>) => onChange({ ...value, payhere: { ...value.payhere, ...patch } });
  const setDialog = (patch: Partial<PaymentSettings['dialog']>) => onChange({ ...value, dialog: { ...value.dialog, ...patch } });
  const setBank = (patch: Partial<PaymentSettings['bank']>) => onChange({ ...value, bank: { ...value.bank, ...patch } });
  const confirmSettings = async () => {
    if (!API_URL) { setMessage('Payment display settings are saved in this browser only.'); return; }
    try { await apiRequest('/settings', apiJson('PUT', settings), true); setMessage('Gateway display settings saved on the API server.'); }
    catch (error) { setMessage(error instanceof Error ? error.message : 'Could not save gateway settings.'); }
  };
  return <section className="admin-panel payment-settings-panel"><div className="panel-heading"><div><h2>Payment gateways</h2><p>Choose checkout methods and publish the instructions customers see.</p></div></div>
    <p className="gateway-admin-warning">{API_URL ? 'Public display settings save with the site. Gateway secrets are sent separately to the API server and never returned to the browser.' : 'This Vercel storefront is in browser-only demo mode. Live payment credentials cannot be stored here. Connect the Express API and database before entering secrets or accepting live charges.'}</p>
    <div className="gateway-settings-grid">
      <article className="gateway-settings-card"><h3>PayHere</h3><label className="toggle-line"><input type="checkbox" checked={value.payhere.enabled} onChange={event => setPayhere({ enabled: event.target.checked })}/> Enable PayHere</label><label>Mode<select value={value.payhere.mode} onChange={event => setPayhere({ mode: event.target.value as PaymentSettings['payhere']['mode'] })}><option value="demo">Interactive demo</option><option value="sandbox">PayHere sandbox</option><option value="live">Live production</option></select></label><label>Merchant ID<input value={value.payhere.merchantId} onChange={event => setPayhere({ merchantId: event.target.value })} placeholder="PayHere merchant ID"/></label><label>Checkout title<input value={value.payhere.title} onChange={event => setPayhere({ title: event.target.value })}/></label><label>Description<input value={value.payhere.description} onChange={event => setPayhere({ description: event.target.value })}/></label><p className="admin-hint">Visa · Mastercard · Amex · Frimi · Genie · eZ Cash. LankaQR availability depends on the merchant account.</p></article>
      <article className="gateway-settings-card"><h3>Dialog Pay Business</h3><label className="toggle-line"><input type="checkbox" checked={value.dialog.enabled} onChange={event => setDialog({ enabled: event.target.checked })}/> Enable Dialog Pay</label><label>Mode<select value={value.dialog.mode} onChange={event => setDialog({ mode: event.target.value as PaymentSettings['dialog']['mode'] })}><option value="demo">Interactive demo</option><option value="sandbox">Dialog sandbox</option><option value="live">Live production</option></select></label><label>Merchant / client ID<input value={value.dialog.merchantId} onChange={event => setDialog({ merchantId: event.target.value })}/></label><label>eZ Cash merchant wallet<input value={value.dialog.walletNumber} onChange={event => setDialog({ walletNumber: event.target.value })} placeholder="+94 77 ..."/></label><div className="gateway-channel-list"><span>Channels</span>{([['genie','Genie'],['ezcash','eZ Cash'],['lankaqr','LankaQR']] as const).map(([channel, label]) => <label key={channel}><input type="checkbox" checked={value.dialog.channels.includes(channel)} onChange={event => setDialog({ channels: event.target.checked ? [...value.dialog.channels, channel] : value.dialog.channels.filter(item => item !== channel) })}/>{label}</label>)}</div><label>Checkout title<input value={value.dialog.title} onChange={event => setDialog({ title: event.target.value })}/></label><label>Description<input value={value.dialog.description} onChange={event => setDialog({ description: event.target.value })}/></label></article>
      <article className="gateway-settings-card"><h3>Cash on delivery and shipping</h3><label className="toggle-line"><input type="checkbox" checked={value.cod.enabled} onChange={event => onChange({ ...value, cod: { enabled: event.target.checked } })}/> Enable cash on delivery</label><label>Flat shipping (LKR)<input type="number" min="0" step="0.01" value={value.flatShipping} onChange={event => onChange({ ...value, flatShipping: Math.max(0, Number(event.target.value)) })}/></label><label>Free shipping from (LKR; 0 disables)<input type="number" min="0" step="0.01" value={value.freeShippingThreshold} onChange={event => onChange({ ...value, freeShippingThreshold: Math.max(0, Number(event.target.value)) })}/></label></article>
      <article className="gateway-settings-card"><h3>Bank transfer</h3><label className="toggle-line"><input type="checkbox" checked={value.bank.enabled} onChange={event => setBank({ enabled: event.target.checked })}/> Enable direct transfer</label><label>Bank name<input value={value.bank.bankName} onChange={event => setBank({ bankName: event.target.value })}/></label><label>Branch<input value={value.bank.branch} onChange={event => setBank({ branch: event.target.value })}/></label><label>Account name<input value={value.bank.accountName} onChange={event => setBank({ accountName: event.target.value })}/></label><label>Account number<input value={value.bank.accountNumber} onChange={event => setBank({ accountNumber: event.target.value })}/></label><label>WhatsApp receipt number<input value={value.bank.whatsappReceipt} onChange={event => setBank({ whatsappReceipt: event.target.value })}/></label></article>
    </div>
    <button type="button" className="admin-primary gateway-confirm" onClick={confirmSettings}>Confirm gateway settings</button>
    {API_URL && <form className="gateway-secrets" onSubmit={saveSecrets}><h3>Server-held credentials</h3><p>Stored encrypted on the API server. Existing secrets are never shown here.</p><div className="gateway-settings-grid"><label>PayHere Merchant Secret <small>{status.payhere ? 'Configured' : 'Missing'}</small><input type="password" autoComplete="new-password" value={secrets.payhereSecret} onChange={event => setSecrets({ ...secrets, payhereSecret: event.target.value })} placeholder="Leave blank to keep current"/></label><label>Dialog Pay API Key <small>{status.dialog ? 'Configured' : 'Missing'}</small><input type="password" autoComplete="new-password" value={secrets.dialogApiKey} onChange={event => setSecrets({ ...secrets, dialogApiKey: event.target.value })} placeholder="Leave blank to keep current"/></label></div><button type="submit" className="admin-primary" disabled={!secrets.payhereSecret && !secrets.dialogApiKey}>Save server credentials</button></form>}
    {message && <p role="status" className="admin-hint">{message}</p>}
  </section>;
}
