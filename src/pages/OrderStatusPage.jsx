import { useEffect, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import PageMeta from '../components/PageMeta.jsx';
import { apiRequest } from '../lib/api.js';
import { formatPrice } from '../lib/format.js';
import { getPublicWhatsAppUrl } from '../lib/supabase.js';

const paymentLabels = {
  pending: 'Aguardando confirmação do pagamento',
  paid: 'Pagamento aprovado',
  rejected: 'Pagamento não aprovado',
  expired: 'Pedido expirado',
  refunded: 'Pagamento estornado',
};

const fulfillmentLabels = {
  awaiting_delivery_quote: 'Aguardando combinação da entrega pelo WhatsApp',
  awaiting_shipment: 'Pagamento aprovado; preparando envio',
  ready_for_pickup: 'Pagamento aprovado; retirada a combinar',
  in_transit: 'Em trânsito',
  delivered: 'Entregue',
  cancelled: 'Cancelado',
};

export default function OrderStatusPage() {
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const accessToken = searchParams.get('access') || window.location.hash.slice(1);
  const [order, setOrder] = useState(null);
  const [items, setItems] = useState([]);
  const [error, setError] = useState('');
  const [refresh, setRefresh] = useState(0);

  useEffect(() => {
    if (!accessToken) {
      setError('O link deste pedido está incompleto. Use o link enviado após o pagamento.');
      return;
    }
    let active = true;
    let timer;
    let checks = 0;
    const loadOrder = async () => {
      try {
        const result = await apiRequest(`/api/orders/${encodeURIComponent(id)}`, {
          headers: { 'X-Order-Access': accessToken },
        });
        if (!active) return;
        setOrder(result.order);
        setItems(result.items);
        setError('');
        if (result.order.payment_status === 'pending' && checks < 18) {
          checks += 1;
          timer = window.setTimeout(loadOrder, 5000);
        }
      } catch (requestError) {
        if (active) setError(requestError.message);
      }
    };
    loadOrder();
    return () => {
      active = false;
      window.clearTimeout(timer);
    };
  }, [id, accessToken, refresh]);

  const contactMessage = order
    ? `Olá! Quero combinar a entrega do pedido ${order.id}.`
    : 'Olá! Preciso de ajuda com meu pedido no Ammi Maju.';

  return (
    <main className="container page">
      <PageMeta title="Acompanhamento do pedido" description="Consulte o status do seu pedido no Ammi Maju." noIndex />
      {error && <div className="error-message" role="alert">{error}</div>}
      {!order && !error && <p className="loading-state" role="status">Consultando pedido…</p>}
      {error && accessToken && <button className="button-secondary" type="button" onClick={() => setRefresh((current) => current + 1)}>Tentar consultar novamente</button>}
      {order && (
        <section className="page-heading">
          <p className="eyebrow">Pedido {order.id.slice(0, 8).toUpperCase()}</p>
          <h1>{paymentLabels[order.payment_status] || 'Pedido recebido'}</h1>
          <p>{fulfillmentLabels[order.fulfillment_status] || 'Acompanhe as próximas atualizações.'}</p>
          {order.payment_status === 'pending' && (
            <button className="button-secondary" type="button" onClick={() => setRefresh((current) => current + 1)}>
              Atualizar status do pagamento
            </button>
          )}
          <div className="form-section">
            {items.map((item) => (
              <div className="summary-row" key={`${item.product_slug}-${item.quantity}`}>
                <span>{item.product_name} × {item.quantity}</span>
                <strong>{formatPrice(item.unit_price_cents * item.quantity)}</strong>
              </div>
            ))}
            <div className="summary-row"><span>Peças</span><strong>{formatPrice(order.subtotal_cents)}</strong></div>
            <div className="summary-row"><span>Frete</span><strong>{formatPrice(order.shipping_cents)}</strong></div>
            {order.discount_cents > 0 && <div className="summary-row"><span>Desconto</span><strong>− {formatPrice(order.discount_cents)}</strong></div>}
            <div className="summary-row summary-total"><span>Total pago no checkout</span><strong>{formatPrice(order.total_cents)}</strong></div>
            {order.local_delivery_pending && <p className="notice">A taxa de entrega local não está incluída. Combine e pague o valor da entrega pelo WhatsApp.</p>}
          </div>
          {order.payment_status === 'paid' && (order.local_delivery_pending || order.fulfillment_method === 'pickup') && (
            <a className="button" href={getPublicWhatsAppUrl(contactMessage)} target="_blank" rel="noreferrer">
              <i className="bx bxl-whatsapp" aria-hidden="true" />Combinar com a loja
            </a>
          )}
          <p><Link className="text-link" to="/loja">Voltar à loja</Link></p>
        </section>
      )}
    </main>
  );
}
