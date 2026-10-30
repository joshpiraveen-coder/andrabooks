import { createHash, timingSafeEqual } from 'node:crypto';

const md5Upper = (value: string) => createHash('md5').update(value, 'utf8').digest('hex').toUpperCase();

/** PayHere Checkout API hash; the merchant secret must remain server-side. */
export function payhereCheckoutHash(merchantId: string, orderId: string, amount: string, currency: string, merchantSecret: string) {
  return md5Upper(merchantId + orderId + amount + currency + md5Upper(merchantSecret));
}

export type PayHereNotification = { merchant_id: string; order_id: string; payhere_amount: string; payhere_currency: string; status_code: string; md5sig: string; payment_id?: string };

/** Verify the provider's notification before changing an order's payment status. */
export function verifyPayHereNotification(notification: PayHereNotification, merchantSecret: string) {
  if (!/^[A-Fa-f0-9]{32}$/.test(notification.md5sig)) return false;
  const expected = md5Upper(notification.merchant_id + notification.order_id + notification.payhere_amount + notification.payhere_currency + notification.status_code + md5Upper(merchantSecret));
  return timingSafeEqual(Buffer.from(expected, 'hex'), Buffer.from(notification.md5sig, 'hex'));
}
