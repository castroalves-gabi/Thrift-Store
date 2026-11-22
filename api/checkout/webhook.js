import { handleError, sendJson } from '../../server/http.js';
import {
  getMercadoPagoPayment,
  refundMercadoPagoPayment,
} from '../../server/providers.js';
import { verifyMercadoPagoSignature } from '../../server/signatures.js';
import { supabaseRequest } from '../../server/supabase.js';

const ORDER_ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export default async function mercadoPagoWebhook(req, res) {
  if (req.method !== 'POST' && req.method !== 'GET') {
    res.setHeader('Allow', 'GET, POST');
    res.status(405).end();
    return;
  }

  try {
    const paymentId = String(req.query['data.id'] ?? req.query.id ?? req.body?.data?.id ?? '');
    if (!paymentId) {
      sendJson(res, 200, { received: true });
      return;
    }

    const validSignature = verifyMercadoPagoSignature({
      signature: req.headers['x-signature'],
      requestId: req.headers['x-request-id'],
      dataId: paymentId,
      secret: process.env.MERCADO_PAGO_WEBHOOK_SECRET,
    });
    if (!validSignature) {
      sendJson(res, 401, { error: 'Assinatura do webhook inválida.' });
      return;
    }

    const payment = await getMercadoPagoPayment(paymentId);
    if (!ORDER_ID.test(String(payment.external_reference ?? ''))) {
      sendJson(res, 200, { received: true });
      return;
    }

    if (payment.status === 'approved') {
      const amountCents = Math.round(Number(payment.transaction_amount) * 100);
      if (!Number.isInteger(amountCents) || payment.currency_id !== 'BRL') {
        const error = new Error('O pagamento confirmado possui valores inconsistentes.');
        error.status = 409;
        throw error;
      }

      const confirmed = await supabaseRequest('rpc/confirm_paid_order', {
        method: 'POST',
        body: {
          p_order_id: payment.external_reference,
          p_payment_id: String(payment.id),
          p_amount_cents: amountCents,
        },
      });
      if (confirmed !== true) {
        const orders = await supabaseRequest(
          `orders?id=eq.${payment.external_reference}&select=id,payment_status,mp_payment_id&limit=1`,
        );
        if (
          orders.length &&
          (orders[0].payment_status !== 'paid' || orders[0].mp_payment_id !== String(payment.id))
        ) {
          await refundMercadoPagoPayment(payment.id);
        }
      }
    } else if (['rejected', 'cancelled'].includes(payment.status)) {
      await supabaseRequest('rpc/cancel_pending_order', {
        method: 'POST',
        body: { p_order_id: payment.external_reference },
      });
    }

    sendJson(res, 200, { received: true });
  } catch (error) {
    handleError(res, error);
  }
}
