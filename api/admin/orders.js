import { handleError, readJsonBody, requireMethod, sendJson } from '../../server/http.js';
import { requireAdmin, supabaseRequest } from '../../server/supabase.js';
import { validationError } from '../../server/validation.js';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const fulfillmentStatuses = new Set([
  'awaiting_delivery_quote',
  'awaiting_shipment',
  'ready_for_pickup',
  'in_transit',
  'delivered',
]);

export default async function adminOrdersHandler(req, res) {
  try {
    await requireAdmin(req);
    if (!requireMethod(req, res, ['GET', 'PATCH'])) return;
    if (req.method === 'GET') {
      const orders = await supabaseRequest(
        'orders?select=id,buyer_name,buyer_email,buyer_phone,fulfillment_method,postal_code,shipping_service,subtotal_cents,shipping_cents,discount_cents,total_cents,local_delivery_pending,payment_status,fulfillment_status,created_at,order_items(product_name,product_slug,unit_price_cents,quantity)&order=created_at.desc&limit=100',
      );
      sendJson(res, 200, { orders });
      return;
    }

    const body = readJsonBody(req);
    const id = String(body.id ?? '');
    if (!UUID.test(id) || !fulfillmentStatuses.has(body.fulfillment_status)) {
      throw validationError('Pedido ou status inválido.');
    }
    const rows = await supabaseRequest(`orders?id=eq.${id}&payment_status=eq.paid`, {
      method: 'PATCH',
      body: { fulfillment_status: body.fulfillment_status },
      prefer: 'return=representation',
    });
    if (!rows.length) {
      sendJson(res, 404, { error: 'Pedido pago não encontrado.' });
      return;
    }
    sendJson(res, 200, { order: rows[0] });
  } catch (error) {
    handleError(res, error);
  }
}
