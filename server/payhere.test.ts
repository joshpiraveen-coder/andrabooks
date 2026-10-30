import test from 'node:test';
import assert from 'node:assert/strict';
import { payhereCheckoutHash, verifyPayHereNotification } from './payhere';

test('PayHere hashes are uppercase hexadecimal and bind the amount and order', () => {
  const hash = payhereCheckoutHash('merchant-1', 'AB-123', '1200.00', 'LKR', 'secret-example');
  assert.match(hash, /^[A-F0-9]{32}$/);
  assert.notEqual(hash, payhereCheckoutHash('merchant-1', 'AB-124', '1200.00', 'LKR', 'secret-example'));
  assert.notEqual(hash, payhereCheckoutHash('merchant-1', 'AB-123', '1201.00', 'LKR', 'secret-example'));
});

test('PayHere notification signature rejects changed payment facts', () => {
  const secret = 'secret-example';
  const notification = { merchant_id: 'merchant-1', order_id: 'AB-123', payhere_amount: '1200.00', payhere_currency: 'LKR', status_code: '2', md5sig: '8F035910C9A675233BC30685E96B8E4B' };
  // The fixed signature is independently computed from PayHere's documented MD5 formula.
  assert.equal(verifyPayHereNotification(notification, secret), true);
  assert.equal(verifyPayHereNotification({ ...notification, payhere_amount: '1201.00' }, secret), false);
  assert.equal(verifyPayHereNotification({ ...notification, status_code: '-2' }, secret), false);
  assert.equal(verifyPayHereNotification({ ...notification, md5sig: 'not-a-signature' }, secret), false);
});
