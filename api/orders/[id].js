import { createHash } from 'node:crypto';
import { handleError, requireMethod, sendJson } from '../../server/http.js';
import { supabaseRequest } from '../../server/supabase.js';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export default async function publicOrderHandler(req, res) {
  if (!requireMethod(req, res, ['GET'])) return;
  try {
    const orderId = String(req.query.id ?? '');
    const accessToken = String(req.headers['x-order-access'] ?? '');
    if (!UUID.test(orderId) || !/^[0-9a-f]{64}$/.test(accessToken)) {
      sendJson(res, 404, { error: 'Pedido não encontrado.' });
      return;
    }
    const tokenHash = createHash('sha256').update(accessToken).digest('hex');
    const orders = await supabaseRequest(
      `orders?id=eq.${orderId}&public_token_hash=eq.${tokenHash}&select=id,fulfillment_method,postal_code,shipping_service,subtotal_cents,shipping_cents,discount_cents,total_cents,local_delivery_pending,payment_status,fulfillment_status,created_at&limit=1`,
    );
    if (!orders.length) {
      sendJson(res, 404, { error: 'Pedido não encontrado.' });
      return;
    }
    const items = await supabaseRequest(
      `order_items?order_id=eq.${orderId}&select=product_name,product_slug,unit_price_cents,quantity`,
    );
    sendJson(res, 200, { order: orders[0], items });
  } catch (error) {
    handleError(res, error);
  }
}
