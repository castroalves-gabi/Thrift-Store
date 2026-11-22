import { handleError, readJsonBody, requireMethod, sendJson } from '../../server/http.js';
import { requireAdmin, supabaseRequest } from '../../server/supabase.js';
import { validationError } from '../../server/validation.js';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function validateCoupon(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    throw validationError('Os dados do cupom são inválidos.');
  }
  if (input.active !== undefined && typeof input.active !== 'boolean') {
    throw validationError('O status do cupom é inválido.');
  }

  const startsAt = input.starts_at || null;
  const expiresAt = input.expires_at || null;
  const maxRedemptions = input.max_redemptions === '' || input.max_redemptions === null || input.max_redemptions === undefined
    ? null
    : Number(input.max_redemptions);
  const coupon = {
    id: input.id,
    code: String(input.code ?? '').trim().toUpperCase(),
    kind: input.kind,
    value: Number(input.value),
    min_subtotal_cents: Number(input.min_subtotal_cents ?? 0),
    starts_at: startsAt,
    expires_at: expiresAt,
    max_redemptions: maxRedemptions,
    active: input.active === true,
  };
  if (!/^[A-Z0-9_-]{3,30}$/.test(coupon.code)) throw validationError('Use de 3 a 30 letras, números, hífens ou sublinhados no cupom.');
  if (!['percent', 'fixed'].includes(coupon.kind)) throw validationError('Selecione um tipo de desconto válido.');
  if (!Number.isInteger(coupon.value) || coupon.value <= 0 || (coupon.kind === 'percent' && coupon.value > 10000)) {
    throw validationError('O valor do cupom está fora dos limites permitidos.');
  }
  if (!Number.isInteger(coupon.min_subtotal_cents) || coupon.min_subtotal_cents < 0) {
    throw validationError('O valor mínimo da compra é inválido.');
  }
  if (coupon.max_redemptions !== null && (!Number.isInteger(coupon.max_redemptions) || coupon.max_redemptions <= 0)) {
    throw validationError('O limite de usos deve ser um inteiro maior que zero.');
  }
  if (
    (coupon.starts_at && !Number.isFinite(Date.parse(coupon.starts_at))) ||
    (coupon.expires_at && !Number.isFinite(Date.parse(coupon.expires_at))) ||
    (coupon.starts_at && coupon.expires_at && Date.parse(coupon.expires_at) <= Date.parse(coupon.starts_at))
  ) {
    throw validationError('O período de validade do cupom é inválido.');
  }
  if (coupon.id && !UUID.test(coupon.id)) throw validationError('Cupom inválido.');
  return coupon;
}

export default async function adminCouponsHandler(req, res) {
  try {
    await requireAdmin(req);
    if (!requireMethod(req, res, ['GET', 'POST', 'PATCH', 'DELETE'])) return;
    if (req.method === 'GET') {
      const coupons = await supabaseRequest('coupons?select=*&order=created_at.desc');
      sendJson(res, 200, { coupons });
      return;
    }

    const body = req.method === 'DELETE' ? null : readJsonBody(req);
    if (req.method === 'DELETE') {
      const id = String(req.query.id ?? '');
      if (!UUID.test(id)) throw validationError('Cupom inválido.');
      const rows = await supabaseRequest(`coupons?id=eq.${id}`, {
        method: 'PATCH',
        body: { active: false },
        prefer: 'return=representation',
      });
      sendJson(res, rows.length ? 200 : 404, { coupon: rows[0] ?? null });
      return;
    }

    const coupon = validateCoupon(body.coupon ?? body);
    let rows;
    if (req.method === 'POST') {
      const { id, ...newCoupon } = coupon;
      rows = await supabaseRequest('coupons', {
        method: 'POST',
        body: newCoupon,
        prefer: 'return=representation',
      });
    } else {
      if (!coupon.id) throw validationError('Cupom inválido.');
      const { id, ...changes } = coupon;
      rows = await supabaseRequest(`coupons?id=eq.${id}`, {
        method: 'PATCH',
        body: changes,
        prefer: 'return=representation',
      });
    }
    if (!rows.length) {
      sendJson(res, 404, { error: 'Cupom não encontrado.' });
      return;
    }
    sendJson(res, req.method === 'POST' ? 201 : 200, { coupon: rows[0] });
  } catch (error) {
    handleError(res, error);
  }
}
