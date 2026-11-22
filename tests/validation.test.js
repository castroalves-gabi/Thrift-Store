import assert from 'node:assert/strict';
import { createHmac } from 'node:crypto';
import test from 'node:test';
import { validateCoupon } from '../api/admin/coupons.js';
import { validateLook } from '../api/admin/looks.js';
import { requireAdmin } from '../server/supabase.js';
import { normalizePostalCode, validateCartItems, validateProduct } from '../server/validation.js';
import { verifyMercadoPagoSignature } from '../server/signatures.js';

async function withSupabaseEnvironment(run) {
  const previous = {
    SUPABASE_URL: process.env.SUPABASE_URL,
    SUPABASE_ANON_KEY: process.env.SUPABASE_ANON_KEY,
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
  };
  process.env.SUPABASE_URL = 'https://supabase.example';
  process.env.SUPABASE_ANON_KEY = 'test-anon-key';
  process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-key';
  try {
    await run();
  } finally {
    for (const [key, value] of Object.entries(previous)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  }
}

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

test('requires a valid Supabase user and an admin profile for administrative access', async () => {
  await withSupabaseEnvironment(async () => {
    const originalFetch = globalThis.fetch;
    const calls = [];
    globalThis.fetch = async (url, options) => {
      calls.push({ url: String(url), headers: options.headers });
      if (String(url).endsWith('/auth/v1/user')) {
        return new Response(JSON.stringify({ id: 'user-id' }), { status: 200 });
      }
      return new Response(JSON.stringify([{ role: 'admin' }]), { status: 200 });
    };
    try {
      const user = await requireAdmin({ headers: { authorization: 'Bearer user-token' } });
      assert.equal(user.id, 'user-id');
      assert.equal(calls[0].headers.Authorization, 'Bearer user-token');
      assert.equal(calls[0].headers.apikey, 'test-anon-key');
      assert.equal(calls[1].headers.Authorization, 'Bearer test-service-key');
    } finally {
      globalThis.fetch = originalFetch;
    }
  });
});

test('rejects authenticated users without an admin profile', async () => {
  await withSupabaseEnvironment(async () => {
    const originalFetch = globalThis.fetch;
    globalThis.fetch = async (url) => String(url).endsWith('/auth/v1/user')
      ? new Response(JSON.stringify({ id: 'user-id' }), { status: 200 })
      : new Response(JSON.stringify([{ role: 'customer' }]), { status: 200 });
    try {
      await assert.rejects(
        requireAdmin({ headers: { authorization: 'Bearer user-token' } }),
        { status: 403, message: 'Acesso restrito à administração.' },
      );
    } finally {
      globalThis.fetch = originalFetch;
    }
  });
});

test('distinguishes an expired session from Supabase authentication service failures', async () => {
  await withSupabaseEnvironment(async () => {
    const originalFetch = globalThis.fetch;
    try {
      globalThis.fetch = async () => new Response('{}', { status: 401 });
      await assert.rejects(
        requireAdmin({ headers: { authorization: 'Bearer expired-token' } }),
        { status: 401, message: 'A sessão expirou. Entre novamente.' },
      );

      globalThis.fetch = async () => new Response('{}', { status: 503 });
      await assert.rejects(
        requireAdmin({ headers: { authorization: 'Bearer user-token' } }),
        { status: 503, message: 'Não foi possível validar a sessão no Supabase.' },
      );
    } finally {
      globalThis.fetch = originalFetch;
    }
  });
});
