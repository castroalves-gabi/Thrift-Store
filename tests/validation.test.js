import assert from 'node:assert/strict';
import { createHmac } from 'node:crypto';
import test from 'node:test';
import { validateCoupon } from '../api/admin/coupons.js';
import { validateLook } from '../api/admin/looks.js';
import { normalizePostalCode, validateCartItems, validateProduct } from '../server/validation.js';
import { verifyMercadoPagoSignature } from '../server/signatures.js';

test('normalizes Brazilian postal codes and rejects incomplete values', () => {
  assert.equal(normalizePostalCode('90000-000'), '90000000');
  assert.throws(() => normalizePostalCode('1234'), /CEP válido/);
});

test('combines duplicate product quantities in checkout carts', () => {
  const id = '11111111-1111-4111-8111-111111111111';
  assert.deepEqual(validateCartItems([{ id, quantity: 1 }, { id, quantity: 2 }]), [
    { id, quantity: 3 },
  ]);
});

test('rejects invalid quantities before they reach the order service', () => {
  const id = '11111111-1111-4111-8111-111111111111';
  assert.throws(() => validateCartItems([{ id, quantity: 0 }]), /quantidade/);
});

test('requires real package dimensions before publishing shipping-eligible products', () => {
  const product = {
    slug: 'camisa-listrada',
    name: 'Camisa listrada',
    audience: 'feminino',
    category: 'Camisas',
    size: 'M',
    condition: 'otimo',
    price_cents: 5000,
    stock: 1,
    weight_kg: 0.3,
    length_cm: 30,
    width_cm: 20,
    height_cm: 5,
    images: [],
  };
  assert.equal(validateProduct(product).active, false);
  assert.throws(() => validateProduct({ ...product, weight_kg: 0 }), /peso e dimensões/);
  assert.throws(() => validateProduct(null), /dados do produto/);
  assert.throws(() => validateProduct({ ...product, active: 'true' }), /status de publicação/);
  assert.throws(() => validateProduct({ ...product, active: true }), /ao menos uma foto real/);
  assert.throws(() => validateProduct({ ...product, active: true, stock: 0, images: [{ path: 'products/item.jpg', alt: 'Peça' }] }), /sem estoque/);
});

test('verifies Mercado Pago webhook signatures and rejects tampering', () => {
  const secret = 'local-test-secret';
  const requestId = 'request-123';
  const dataId = '987654321';
  const timestamp = '1712345678';
  const manifest = `id:${dataId};request-id:${requestId};ts:${timestamp};`;
  const signature = createHmac('sha256', secret).update(manifest).digest('hex');
  const headers = {
    signature: `ts=${timestamp},v1=${signature}`,
    requestId,
    dataId,
    secret,
  };

  assert.equal(verifyMercadoPagoSignature(headers), true);
  assert.equal(verifyMercadoPagoSignature({ ...headers, requestId: 'other-request' }), false);
  assert.equal(verifyMercadoPagoSignature({ ...headers, signature: 'ts=x,v1=not-hex' }), false);
});

test('rejects invalid coupon limits and date ranges', () => {
  const coupon = {
    code: 'GARIMPO15',
    kind: 'percent',
    value: 1500,
    min_subtotal_cents: 0,
    max_redemptions: 10,
    active: true,
  };
  assert.equal(validateCoupon(coupon).value, 1500);
  assert.throws(() => validateCoupon({ ...coupon, max_redemptions: 0 }), /limite de usos/);
  assert.throws(() => validateCoupon({ ...coupon, starts_at: '2026-02-01', expires_at: '2026-01-01' }), /período de validade/);
  assert.throws(() => validateCoupon(null), /dados do cupom/);
});

test('requires available products before publishing a look', () => {
  const productId = '11111111-1111-4111-8111-111111111111';
  const look = { slug: 'look-teste', title: 'Look teste', product_ids: [productId], active: true };
  assert.equal(validateLook(look).product_ids.length, 1);
  assert.throws(() => validateLook({ ...look, product_ids: [] }), /ao menos uma peça/);
  assert.throws(() => validateLook({ ...look, product_ids: [productId, productId] }), /peças repetidas/);
  assert.throws(() => validateLook(null), /dados da vitrine/);
});
