import { createHash, randomBytes, randomUUID } from 'node:crypto';
import { handleError, readJsonBody, requireMethod, sendJson } from '../../server/http.js';
import { createMercadoPagoPreference, quoteMelhorEnvio } from '../../server/providers.js';
import { releaseExpiredOrders, supabaseRequest } from '../../server/supabase.js';
import { normalizePostalCode, validateCartItems, validationError } from '../../server/validation.js';

function validateBuyer(buyer) {
  const normalized = {
    name: String(buyer?.name ?? '').trim(),
    email: String(buyer?.email ?? '').trim().toLowerCase(),
    phone: String(buyer?.phone ?? '').replace(/\D/g, ''),
    city: String(buyer?.city ?? '').trim(),
    state: String(buyer?.state ?? '').trim().toUpperCase(),
  };
  if (normalized.name.length < 2) throw validationError('Informe seu nome completo.');
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized.email)) {
    throw validationError('Informe um e-mail válido.');
  }
  if (normalized.phone.length < 10 || normalized.phone.length > 13) {
    throw validationError('Informe um telefone com DDD.');
  }
  return normalized;
}

async function getSiteSetting(key) {
  const settings = await supabaseRequest(
    `site_settings?key=eq.${encodeURIComponent(key)}&select=value&limit=1`,
  );
  return settings?.[0]?.value ?? null;
}

export default async function createPaymentHandler(req, res) {
  if (!requireMethod(req, res, ['POST'])) return;
  try {
    const body = readJsonBody(req);
    const buyer = validateBuyer(body.buyer);
    const items = validateCartItems(body.items);
    const fulfillment = body.fulfillment;
    if (!['shipping', 'pickup', 'local_delivery'].includes(fulfillment?.method)) {
      throw validationError('Selecione uma forma de entrega.');
    }
    const idempotencyKey = req.headers['idempotency-key'] || randomUUID();
    if (!/^[\w-]{16,80}$/.test(idempotencyKey)) {
      throw validationError('A chave do pedido é inválida.');
    }

    await releaseExpiredOrders();
    const ids = `(${items.map((item) => item.id).join(',')})`;
    const products = await supabaseRequest(
      `products?id=in.${ids}&active=eq.true&select=id,name,slug,price_cents,stock,weight_kg,length_cm,width_cm,height_cm`,
    );
    if (products.length !== items.length) {
      const error = new Error('Uma peça do carrinho não está mais disponível.');
      error.status = 409;
      throw error;
    }
    for (const item of items) {
      const product = products.find((candidate) => candidate.id === item.id);
      if (!product || product.stock < item.quantity) {
        const error = new Error('O estoque mudou. Atualize o carrinho antes de continuar.');
        error.status = 409;
        throw error;
      }
    }

    let shippingCents = 0;
    let shippingService = null;
    let postalCode = null;
    let shippingAddress = {};
    let localDeliveryPending = false;
    if (fulfillment.method === 'shipping') {
      postalCode = normalizePostalCode(fulfillment.postalCode);
      shippingAddress = {
        street: String(fulfillment.address?.street ?? '').trim(),
        number: String(fulfillment.address?.number ?? '').trim(),
        complement: String(fulfillment.address?.complement ?? '').trim(),
        neighborhood: String(fulfillment.address?.neighborhood ?? '').trim(),
        city: buyer.city,
        state: buyer.state,
      };
      if (!shippingAddress.street || !shippingAddress.number || !shippingAddress.neighborhood || !buyer.city || !/^[A-Z]{2}$/.test(buyer.state)) {
        throw validationError('Complete o endereço de entrega.');
      }
      if (!fulfillment.serviceId) throw validationError('Calcule e selecione o frete.');
      const shippingItems = items.map((item) => ({
        ...products.find((product) => product.id === item.id),
        quantity: item.quantity,
      }));
      const services = await quoteMelhorEnvio({ postalCode, items: shippingItems });
      shippingService = services.find((service) => service.id === String(fulfillment.serviceId));
      if (!shippingService) {
        const error = new Error('A cotação de frete expirou. Calcule novamente.');
        error.status = 409;
        throw error;
      }
      shippingCents = shippingService.price_cents;
    } else if (fulfillment.method === 'local_delivery') {
      if (
        buyer.state !== 'RS' ||
        buyer.city.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase() !== 'porto alegre'
      ) {
        throw validationError('A entrega local está disponível somente em Porto Alegre, RS.');
      }
      localDeliveryPending = true;
    } else if (!(await getSiteSetting('pickup_address'))?.address) {
      const error = new Error('A retirada local ainda não foi configurada pela loja.');
      error.status = 409;
      throw error;
    }

    const publicToken = body.accessToken
      ? String(body.accessToken)
      : randomBytes(32).toString('hex');
    if (!/^[0-9a-f]{64}$/.test(publicToken)) {
      throw validationError('A chave de acesso do pedido é inválida.');
    }
    const publicTokenHash = createHash('sha256').update(publicToken).digest('hex');
    const orderResult = await supabaseRequest('rpc/create_pending_order', {
      method: 'POST',
      body: {
        p_idempotency_key: idempotencyKey,
        p_buyer_name: buyer.name,
        p_buyer_email: buyer.email,
        p_buyer_phone: buyer.phone,
        p_public_token_hash: publicTokenHash,
        p_fulfillment_method: fulfillment.method,
        p_postal_code: postalCode,
        p_shipping_address: shippingAddress,
        p_shipping_service: shippingService,
        p_shipping_cents: shippingCents,
        p_local_delivery_pending: localDeliveryPending,
        p_coupon_code: body.couponCode ? String(body.couponCode).trim() : null,
        p_items: items,
      },
    });
    if (orderResult.payment_status === 'expired' || orderResult.payment_status === 'rejected') {
      const error = new Error('Este pedido expirou. Inicie novamente o checkout.');
      error.status = 409;
      throw error;
    }

    let preferenceUrl = null;
    if (orderResult.mp_preference_id) {
      const saved = await supabaseRequest(
        `orders?id=eq.${orderResult.id}&select=mp_init_point`,
      );
      preferenceUrl = saved?.[0]?.mp_init_point || null;
    }
    if (!preferenceUrl) {
      const orderForPayment = {
        id: orderResult.id,
        total_cents: orderResult.total_cents,
        buyer_email: orderResult.buyer_email,
      };
      try {
        const preference = await createMercadoPagoPreference({
          order: orderForPayment,
          items: items.map((item) => {
            const product = products.find((candidate) => candidate.id === item.id);
            return { id: item.id, name: product.name, quantity: item.quantity, price_cents: product.price_cents };
          }),
          appUrl: process.env.APP_URL,
          publicToken,
        });
        await supabaseRequest(`orders?id=eq.${orderResult.id}`, {
          method: 'PATCH',
          body: { mp_preference_id: preference.id, mp_init_point: preference.url },
          prefer: 'return=minimal',
        });
        preferenceUrl = preference.url;
      } catch (error) {
        await supabaseRequest('rpc/cancel_pending_order', {
          method: 'POST',
          body: { p_order_id: orderResult.id },
        });
        throw error;
      }
    }

    sendJson(res, 201, {
      orderId: orderResult.id,
      accessToken: publicToken,
      paymentUrl: preferenceUrl,
      totalCents: orderResult.total_cents,
      localDeliveryPending,
    });
  } catch (error) {
    handleError(res, error);
  }
}
