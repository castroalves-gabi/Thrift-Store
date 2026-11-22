import { handleError, readJsonBody, requireMethod, sendJson } from '../../server/http.js';
import { supabaseRequest } from '../../server/supabase.js';
import { validateCartItems, validationError } from '../../server/validation.js';

export default async function validateCouponHandler(req, res) {
  if (!requireMethod(req, res, ['POST'])) return;
  try {
    const body = readJsonBody(req);
    const code = String(body.code ?? '').trim().toUpperCase();
    if (!/^[A-Z0-9_-]{3,30}$/.test(code)) throw validationError('Informe um código de cupom válido.');
    const items = validateCartItems(body.items);
    const ids = `(${items.map((item) => item.id).join(',')})`;
    const products = await supabaseRequest(
      `products?id=in.${ids}&active=eq.true&select=id,price_cents,stock`,
    );
    if (products.length !== items.length) {
      const error = new Error('Uma peça do carrinho não está mais disponível.');
      error.status = 409;
      throw error;
    }

    let subtotal = 0;
    for (const item of items) {
      const product = products.find((candidate) => candidate.id === item.id);
      if (!product || product.stock < item.quantity) {
        const error = new Error('O estoque mudou. Atualize a sacola.');
        error.status = 409;
        throw error;
      }
      subtotal += product.price_cents * item.quantity;
    }

    const coupons = await supabaseRequest(
      `coupons?code=eq.${encodeURIComponent(code)}&active=eq.true&select=id,kind,value,min_subtotal_cents,starts_at,expires_at,max_redemptions,redemptions,reserved_redemptions&limit=1`,
    );
    const coupon = coupons[0];
    const now = Date.now();
    if (
      !coupon ||
      subtotal < coupon.min_subtotal_cents ||
      (coupon.starts_at && Date.parse(coupon.starts_at) > now) ||
      (coupon.expires_at && Date.parse(coupon.expires_at) <= now) ||
      (coupon.max_redemptions !== null &&
        coupon.redemptions + coupon.reserved_redemptions >= coupon.max_redemptions)
    ) {
      const error = new Error('Cupom inválido, expirado ou sem usos disponíveis.');
      error.status = 400;
      throw error;
    }

    const discountCents = coupon.kind === 'percent'
      ? Math.floor(subtotal * coupon.value / 10000)
      : Math.min(subtotal, coupon.value);
    sendJson(res, 200, { code, discountCents, subtotalCents: subtotal });
  } catch (error) {
    handleError(res, error);
  }
}
