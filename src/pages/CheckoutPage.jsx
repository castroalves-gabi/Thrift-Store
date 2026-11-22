import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import CatalogFeedback from '../components/CatalogFeedback.jsx';
import PageMeta from '../components/PageMeta.jsx';
import { useCart } from '../context/CartContext.jsx';
import { useCatalog } from '../context/CatalogContext.jsx';
import { apiRequest } from '../lib/api.js';
import { formatPrice } from '../lib/format.js';
import { getPublicWhatsAppUrl } from '../lib/supabase.js';

function createAttempt() {
  const bytes = window.crypto.getRandomValues(new Uint8Array(32));
  return {
    idempotencyKey: window.crypto.randomUUID(),
    accessToken: [...bytes].map((byte) => byte.toString(16).padStart(2, '0')).join(''),
  };
}

export default function CheckoutPage() {
  const navigate = useNavigate();
  const { cart, itemCount } = useCart();
  const { products, loading, error: catalogError } = useCatalog();
  const [buyer, setBuyer] = useState({ name: '', email: '', phone: '', city: '', state: 'RS' });
  const [address, setAddress] = useState({ street: '', number: '', complement: '', neighborhood: '' });
  const [fulfillmentMethod, setFulfillmentMethod] = useState('shipping');
  const [postalCode, setPostalCode] = useState('');
  const [services, setServices] = useState([]);
  const [serviceId, setServiceId] = useState('');
  const [couponCode, setCouponCode] = useState('');
  const [couponValidation, setCouponValidation] = useState(null);
  const [couponBusy, setCouponBusy] = useState(false);
  const [settings, setSettings] = useState({});
  const [attempt, setAttempt] = useState(createAttempt);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [quoteBusy, setQuoteBusy] = useState(false);

  const productsById = useMemo(() => new Map(products.map((product) => [product.id, product])), [products]);
  const items = Object.entries(cart).map(([id, quantity]) => ({ id, quantity, product: productsById.get(id) }));
  const cartSignature = JSON.stringify(cart);
  const subtotalCents = items.reduce((sum, item) => item.product ? sum + item.product.price_cents * item.quantity : sum, 0);
  const invalidCart = loading || !items.length || items.some((item) => !item.product || item.quantity > item.product.stock);
  const selectedService = services.find((service) => service.id === serviceId);
  const policiesReady = Boolean(settings.legal_pages?.privacy && settings.legal_pages?.terms);
  const [policyAccepted, setPolicyAccepted] = useState(false);

  useEffect(() => {
    setServices([]);
    setServiceId('');
    setCouponValidation(null);
  }, [cartSignature]);

  useEffect(() => {
    apiRequest('/api/storefront')
      .then((result) => setSettings(result.settings))
      .catch((requestError) => setError(requestError.message));
  }, []);

  function updateBuyer(event) {
    setBuyer((current) => ({ ...current, [event.target.name]: event.target.value }));
  }

  async function calculateShipping() {
    setQuoteBusy(true);
    setError('');
    setServices([]);
    setServiceId('');
    try {
      const result = await apiRequest('/api/shipping/quote', {
        method: 'POST',
        body: JSON.stringify({
          postalCode,
          items: items.map(({ id, quantity }) => ({ id, quantity })),
        }),
      });
      setServices(result.services);
      if (!result.services.length) setError('Não há opções de frete disponíveis para este CEP.');
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setQuoteBusy(false);
    }
  }

  async function validateCoupon() {
    if (!couponCode.trim()) {
      setCouponValidation(null);
      setError('Informe um código de cupom.');
      return;
    }
    setCouponBusy(true);
    setError('');
    try {
      const result = await apiRequest('/api/coupons/validate', {
        method: 'POST',
        body: JSON.stringify({
          code: couponCode,
          items: items.map(({ id, quantity }) => ({ id, quantity })),
        }),
      });
      setCouponValidation(result);
    } catch (requestError) {
      setCouponValidation(null);
      setError(requestError.message);
    } finally {
      setCouponBusy(false);
    }
  }

  async function submitOrder(event) {
    event.preventDefault();
    setError('');
    if (invalidCart || catalogError) {
      setError('Atualize o carrinho e confira o estoque antes de continuar.');
      return;
    }
    if (couponCode.trim() && !couponValidation) {
      setError('Aplique e valide o cupom antes de continuar, ou remova o código.');
      return;
    }
    if (!policiesReady || !policyAccepted) {
      setError('Leia e aceite a política de privacidade e as condições de compra para continuar.');
      return;
    }
    if (fulfillmentMethod === 'shipping' && !selectedService) {
      setError('Calcule e selecione uma opção de frete.');
      return;
    }
    setBusy(true);
    try {
      const result = await apiRequest('/api/checkout/create-payment', {
        method: 'POST',
        headers: { 'Idempotency-Key': attempt.idempotencyKey },
        body: JSON.stringify({
          buyer,
          fulfillment: {
            method: fulfillmentMethod,
            postalCode,
            serviceId,
            address,
          },
          couponCode,
          items: items.map(({ id, quantity }) => ({ id, quantity })),
          accessToken: attempt.accessToken,
        }),
      });
      window.location.assign(result.paymentUrl);
    } catch (requestError) {
      setError(requestError.message);
      if (requestError.status) setAttempt(createAttempt());
      setBusy(false);
    }
  }

  if (loading) {
    return <main className="container page"><CatalogFeedback loading /></main>;
  }
  if (catalogError) {
    return <main className="container page"><CatalogFeedback error={catalogError} /></main>;
  }
  if (!items.length) {
    return (
      <main className="container page">
        <PageMeta title="Finalizar pedido" description="Finalize seu pedido no Ammi Maju." noIndex />
        <div className="empty-state"><h1>Sua sacola está vazia</h1><Link className="button" to="/loja">Ir para a loja</Link></div>
      </main>
    );
  }

  return (
    <main className="container page">
      <PageMeta title="Finalizar pedido" description="Informe seus dados e escolha entrega ou retirada para suas peças." noIndex />
      <div className="page-heading">
        <p className="eyebrow">Pagamento seguro pelo Mercado Pago</p>
        <h1>Entrega e pagamento</h1>
      </div>
      {error && <p className="error-message" role="alert">{error}</p>}
      {invalidCart && <p className="error-message">Alguma peça não está mais disponível na quantidade solicitada. <Link to="/carrinho">Revise sua sacola.</Link></p>}

      <form className="checkout-layout" onSubmit={submitOrder}>
        <div>
          <section className="form-section">
            <h2>Seus dados</h2>
            <div className="form-grid">
              <div className="field span-2"><label htmlFor="buyer-name">Nome completo</label><input id="buyer-name" name="name" autoComplete="name" required value={buyer.name} onChange={updateBuyer} /></div>
              <div className="field"><label htmlFor="buyer-email">E-mail</label><input id="buyer-email" name="email" type="email" autoComplete="email" required value={buyer.email} onChange={updateBuyer} /></div>
              <div className="field"><label htmlFor="buyer-phone">Telefone com DDD</label><input id="buyer-phone" name="phone" type="tel" autoComplete="tel" required value={buyer.phone} onChange={updateBuyer} /></div>
            </div>
          </section>

          <section className="form-section">
            <h2>Como receber</h2>
            <label className="radio-card">
              <input type="radio" name="fulfillment" value="shipping" checked={fulfillmentMethod === 'shipping'} onChange={() => { setFulfillmentMethod('shipping'); setServices([]); setServiceId(''); }} />
              <span><strong>Enviar pelo Melhor Envio</strong><br />Calcule as opções pelo CEP antes do pagamento.</span>
            </label>
            <label className="radio-card">
              <input type="radio" name="fulfillment" value="local_delivery" checked={fulfillmentMethod === 'local_delivery'} onChange={() => { setFulfillmentMethod('local_delivery'); setServices([]); setServiceId(''); }} />
              <span><strong>Entrega local em Porto Alegre</strong><br />Após pagar as peças, combinamos pelo WhatsApp o valor e a entrega. A taxa não está incluída no total pago agora.</span>
            </label>
            <label className="radio-card">
              <input type="radio" name="fulfillment" value="pickup" checked={fulfillmentMethod === 'pickup'} onChange={() => { setFulfillmentMethod('pickup'); setServices([]); setServiceId(''); }} />
              <span><strong>Retirada local</strong><br />{settings.pickup_address?.address || 'O ponto será informado pela equipe após a confirmação do pedido.'}</span>
            </label>

            {fulfillmentMethod === 'shipping' && (
              <>
                <div className="form-grid">
                  <div className="field"><label htmlFor="postal-code">CEP</label><input id="postal-code" inputMode="numeric" autoComplete="postal-code" required value={postalCode} onChange={(event) => { setPostalCode(event.target.value); setServices([]); setServiceId(''); }} /></div>
                  <div className="field"><label htmlFor="buyer-city">Cidade</label><input id="buyer-city" name="city" autoComplete="address-level2" required value={buyer.city} onChange={updateBuyer} /></div>
                  <div className="field"><label htmlFor="buyer-state">UF</label><input id="buyer-state" name="state" maxLength="2" autoComplete="address-level1" required value={buyer.state} onChange={updateBuyer} /></div>
                  <div className="field"><label htmlFor="address-street">Rua/avenida</label><input id="address-street" autoComplete="address-line1" required value={address.street} onChange={(event) => setAddress({ ...address, street: event.target.value })} /></div>
                  <div className="field"><label htmlFor="address-number">Número</label><input id="address-number" required value={address.number} onChange={(event) => setAddress({ ...address, number: event.target.value })} /></div>
                  <div className="field"><label htmlFor="address-neighborhood">Bairro</label><input id="address-neighborhood" required value={address.neighborhood} onChange={(event) => setAddress({ ...address, neighborhood: event.target.value })} /></div>
                  <div className="field span-2"><label htmlFor="address-complement">Complemento (opcional)</label><input id="address-complement" autoComplete="address-line2" value={address.complement} onChange={(event) => setAddress({ ...address, complement: event.target.value })} /></div>
                </div>
                <button className="button-secondary" type="button" disabled={quoteBusy || !postalCode} onClick={calculateShipping}>
                  {quoteBusy ? 'Calculando…' : 'Calcular frete'}
                </button>
                {services.length > 0 && (
                  <fieldset className="shipping-options">
                    <legend>Escolha uma opção de envio</legend>
                    {services.map((service) => (
                      <label key={service.id}>
                        <span><input type="radio" name="shipping-service" value={service.id} checked={serviceId === service.id} onChange={() => setServiceId(service.id)} /> {service.name}{service.delivery_days ? ` · até ${service.delivery_days} dias úteis` : ''}</span>
                        <strong>{formatPrice(service.price_cents)}</strong>
                      </label>
                    ))}
                  </fieldset>
                )}
              </>
            )}
            {fulfillmentMethod === 'local_delivery' && (
              <>
                <div className="form-grid">
                  <div className="field"><label htmlFor="local-city">Cidade</label><input id="local-city" name="city" autoComplete="address-level2" required value={buyer.city} onChange={updateBuyer} /></div>
                  <div className="field"><label htmlFor="local-state">UF</label><input id="local-state" name="state" maxLength="2" autoComplete="address-level1" required value={buyer.state} onChange={updateBuyer} /></div>
                </div>
                <div className="notice">A entrega local é combinada e cobrada à parte após o pagamento das peças, pelo WhatsApp.</div>
              </>
            )}
          </section>

          <section className="form-section">
            <h2>Desconto</h2>
            <div className="field">
              <label htmlFor="coupon-code">Código do cupom</label>
              <input id="coupon-code" value={couponCode} onChange={(event) => {
                setCouponCode(event.target.value.toUpperCase());
                setCouponValidation(null);
              }} placeholder="Se tiver um cupom" />
            </div>
            <button className="button-secondary" type="button" disabled={couponBusy || !couponCode.trim()} onClick={validateCoupon}>
              {couponBusy ? 'Validando…' : 'Aplicar cupom'}
            </button>
            {couponValidation && <p className="success-message" role="status">Cupom aplicado: economia de {formatPrice(couponValidation.discountCents)}.</p>}
          </section>
          <section className="form-section">
            <h2>Antes de pagar</h2>
            {!policiesReady && <p className="notice">As políticas da loja ainda não foram publicadas. O checkout será liberado quando estiverem configuradas.</p>}
            <label>
              <input type="checkbox" checked={policyAccepted} disabled={!policiesReady} onChange={(event) => setPolicyAccepted(event.target.checked)} />
              {' '}Li e aceito a <a href="/privacidade" target="_blank" rel="noreferrer">política de privacidade</a> e as <a href="/termos" target="_blank" rel="noreferrer">condições de compra</a>.
            </label>
          </section>
        </div>

        <aside className="cart-summary">
          <h2>Resumo do pedido</h2>
          <div className="order-lines">
            {items.map(({ product, id, quantity }) => (
              <div className="order-line" key={id}>
                <span>{product?.name || 'Peça indisponível'} × {quantity}</span>
                <strong>{product ? formatPrice(product.price_cents * quantity) : '—'}</strong>
              </div>
            ))}
          </div>
          <div className="summary-row"><span>Peças</span><strong>{formatPrice(subtotalCents)}</strong></div>
          {couponValidation && <div className="summary-row"><span>Desconto</span><strong>− {formatPrice(couponValidation.discountCents)}</strong></div>}
          {fulfillmentMethod === 'shipping' && selectedService && <div className="summary-row"><span>Frete</span><strong>{formatPrice(selectedService.price_cents)}</strong></div>}
          {fulfillmentMethod === 'local_delivery' && <p className="notice">Entrega local será combinada e cobrada à parte.</p>}
          {fulfillmentMethod === 'pickup' && <div className="summary-row"><span>Retirada</span><strong>Sem custo</strong></div>}
          <div className="summary-row summary-total">
            <span>Total no Mercado Pago</span>
            <strong>{formatPrice(Math.max(0, subtotalCents - (couponValidation?.discountCents ?? 0)) + (fulfillmentMethod === 'shipping' ? (selectedService?.price_cents ?? 0) : 0))}</strong>
          </div>
          <button className="button" type="submit" disabled={busy || invalidCart || (fulfillmentMethod === 'shipping' && !selectedService) || (Boolean(couponCode.trim()) && !couponValidation) || !policiesReady || !policyAccepted}>
            {busy ? 'Preparando pagamento…' : 'Ir para o Mercado Pago'}
          </button>
          <p className="muted">O pedido só será confirmado após o retorno verificado do Mercado Pago.</p>
          <button className="button-quiet" type="button" onClick={() => navigate('/carrinho')}>Voltar à sacola</button>
        </aside>
      </form>
    </main>
  );
}
