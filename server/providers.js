function configurationError(message) {
  const error = new Error(message);
  error.status = 503;
  return error;
}

async function providerResponse(response, provider) {
  const text = await response.text();
  let payload = null;
  if (text) {
    try {
      payload = JSON.parse(text);
    } catch (error) {
      const invalidResponse = new Error(`${provider} retornou uma resposta inválida.`);
      invalidResponse.status = 502;
      invalidResponse.cause = error;
      throw invalidResponse;
    }
  }
  if (!response.ok) {
    const error = new Error(`${provider} recusou a solicitação (HTTP ${response.status}).`);
    error.status = response.status < 500 ? 422 : 502;
    throw error;
  }
  return payload;
}

export async function quoteMelhorEnvio({ postalCode, items }) {
  const token = process.env.MELHOR_ENVIO_TOKEN;
  const originPostalCode = process.env.MELHOR_ENVIO_ORIGIN_POSTAL_CODE;
  const userAgent = process.env.MELHOR_ENVIO_USER_AGENT;
  if (!token || !originPostalCode || !userAgent) {
    throw configurationError('A cotação de frete ainda não está configurada.');
  }

  const apiUrl = (process.env.MELHOR_ENVIO_API_URL || 'https://melhorenvio.com.br/api/v2')
    .replace(/\/$/, '');
  const response = await fetch(`${apiUrl}/me/shipment/calculate`, {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      'User-Agent': userAgent,
    },
    body: JSON.stringify({
      from: { postal_code: originPostalCode.replace(/\D/g, '') },
      to: { postal_code: postalCode },
      products: items.map((item) => ({
        id: item.id,
        width: item.width_cm,
        height: item.height_cm,
        length: item.length_cm,
        weight: item.weight_kg,
        insurance_value: item.price_cents / 100,
        quantity: item.quantity,
      })),
    }),
  });

  const payload = await providerResponse(response, 'Melhor Envio');
  if (!Array.isArray(payload)) {
    throw configurationError('A resposta de frete não está no formato esperado.');
  }
  return payload
    .filter((service) => !service.error && service.id && Number.isFinite(Number(service.price)))
    .map((service) => ({
      id: String(service.id),
      name: [service.company?.name, service.name].filter(Boolean).join(' - '),
      price_cents: Math.round(Number(service.price) * 100),
      delivery_days: Number(service.delivery_time) || null,
    }));
}

export async function createMercadoPagoPreference({ order, items, appUrl, publicToken }) {
  const accessToken = process.env.MERCADO_PAGO_ACCESS_TOKEN;
  if (!accessToken) {
    throw configurationError('O pagamento Mercado Pago ainda não está configurado.');
  }
  if (!appUrl) {
    throw configurationError('A URL pública da loja ainda não está configurada.');
  }
  const baseUrl = new URL(appUrl);
  const backUrl = new URL(`/pedido/${order.id}`, baseUrl);
  backUrl.hash = publicToken;

  function paymentReturnUrl(status) {
    const url = new URL(backUrl.href);
    url.searchParams.set('payment', status);
    return url.href;
  }

  const preference = {
    items: [{
      id: order.id,
      title: `Pedido Ammi Maju ${order.id.slice(0, 8)}`,
      quantity: 1,
      unit_price: order.total_cents / 100,
      currency_id: 'BRL',
    }],
    payer: { email: order.buyer_email },
    external_reference: order.id,
    metadata: { order_id: order.id },
    additional_info: {
      items: items.map((item) => ({
        id: item.id,
        title: item.name,
        quantity: item.quantity,
        unit_price: item.price_cents / 100,
      })),
    },
    back_urls: {
      success: paymentReturnUrl('success'),
      pending: paymentReturnUrl('pending'),
      failure: paymentReturnUrl('failure'),
    },
    auto_return: 'approved',
    notification_url: new URL('/api/checkout/webhook', baseUrl).href,
    expires: true,
    expiration_date_from: new Date().toISOString(),
    expiration_date_to: new Date(Date.now() + 20 * 60 * 1000).toISOString(),
  };
  const response = await fetch('https://api.mercadopago.com/checkout/preferences', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
      'X-Idempotency-Key': order.id,
    },
    body: JSON.stringify(preference),
  });
  const result = await providerResponse(response, 'Mercado Pago');
  if (!result?.id || !result?.init_point) {
    throw configurationError('Mercado Pago não retornou o link para pagamento.');
  }
  return { id: String(result.id), url: result.init_point };
}

export async function getMercadoPagoPayment(paymentId) {
  const accessToken = process.env.MERCADO_PAGO_ACCESS_TOKEN;
  if (!accessToken) {
    throw configurationError('O pagamento Mercado Pago ainda não está configurado.');
  }
  const response = await fetch(
    `https://api.mercadopago.com/v1/payments/${encodeURIComponent(paymentId)}`,
    { headers: { Authorization: `Bearer ${accessToken}` } },
  );
  return providerResponse(response, 'Mercado Pago');
}

export async function refundMercadoPagoPayment(paymentId) {
  const accessToken = process.env.MERCADO_PAGO_ACCESS_TOKEN;
  if (!accessToken) {
    throw configurationError('O pagamento Mercado Pago ainda não está configurado.');
  }
  const response = await fetch(
    `https://api.mercadopago.com/v1/payments/${encodeURIComponent(paymentId)}/refunds`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        'X-Idempotency-Key': `late-payment-refund-${paymentId}`,
      },
      body: JSON.stringify({}),
    },
  );
  return providerResponse(response, 'Mercado Pago');
}
