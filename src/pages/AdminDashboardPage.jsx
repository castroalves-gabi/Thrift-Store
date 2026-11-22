import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import PageMeta from '../components/PageMeta.jsx';
import { adminRequest, getApiErrorMessage } from '../lib/api.js';
import { supabase } from '../lib/supabase.js';
import { formatPrice } from '../lib/format.js';

const emptyProduct = {
  slug: '', name: '', description: '', brand: '', audience: 'feminino',
  category: '', size: '', measurements: '', condition: 'otimo',
  condition_details: '', price: '', stock: '1', weight_kg: '',
  length_cm: '', width_cm: '', height_cm: '', images: [], active: false,
};
const emptyCoupon = { code: '', kind: 'percent', value: '', min_subtotal: '0', starts_at: '', expires_at: '', max_redemptions: '', active: true };
const emptyLook = { slug: '', title: '', description: '', product_ids: [], active: false };
const orderStatuses = [
  ['awaiting_delivery_quote', 'Combinar entrega'],
  ['awaiting_shipment', 'Aguardando envio'],
  ['ready_for_pickup', 'Pronto para retirada'],
  ['in_transit', 'Em trânsito'],
  ['delivered', 'Entregue'],
];

function toProductForm(product) {
  return {
    ...product,
    price: (product.price_cents / 100).toFixed(2),
    stock: String(product.stock),
    images: product.images ?? [],
  };
}

function ErrorBanner({ message }) {
  return message ? <p className="error-message" role="alert">{message}</p> : null;
}

export default function AdminDashboardPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const loginSuccess = useRef(Boolean(location.state?.loginSuccess));
  const [tab, setTab] = useState('products');
  const [loading, setLoading] = useState(true);
  const [authorized, setAuthorized] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [products, setProducts] = useState([]);
  const [orders, setOrders] = useState([]);
  const [coupons, setCoupons] = useState([]);
  const [looks, setLooks] = useState([]);
  const [settings, setSettings] = useState({
    pickup_address: { address: '', hours: '' },
    local_delivery_note: { text: '' },
    legal_pages: { privacy: '', terms: '' },
  });
  const [productForm, setProductForm] = useState(emptyProduct);
  const [productFiles, setProductFiles] = useState([]);
  const [couponForm, setCouponForm] = useState(emptyCoupon);
  const [lookForm, setLookForm] = useState(emptyLook);
  const [saving, setSaving] = useState(false);

  const loadAdminData = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [productResult, orderResult, couponResult, lookResult, settingsResult] = await Promise.all([
        adminRequest('/api/admin/products'),
        adminRequest('/api/admin/orders'),
        adminRequest('/api/admin/coupons'),
        adminRequest('/api/admin/looks'),
        adminRequest('/api/admin/settings'),
      ]);
      setProducts(productResult.products);
      setOrders(orderResult.orders);
      setCoupons(couponResult.coupons);
      setLooks(lookResult.looks);
      setSettings((current) => ({ ...current, ...settingsResult.settings }));
      setAuthorized(true);
      if (loginSuccess.current) {
        loginSuccess.current = false;
        setMessage('Login realizado com sucesso. Painel administrativo carregado.');
        navigate(location.pathname, { replace: true, state: null });
      }
    } catch (requestError) {
      setAuthorized(false);
      setError(getApiErrorMessage(requestError));
    } finally {
      setLoading(false);
    }
  }, [location.pathname, navigate]);

  useEffect(() => {
    loadAdminData();
  }, [loadAdminData]);

  const productById = useMemo(() => new Map(products.map((product) => [product.id, product])), [products]);

  function setProductField(event) {
    const { name, value, type, checked } = event.target;
    setProductForm((current) => ({ ...current, [name]: type === 'checkbox' ? checked : value }));
  }

  async function uploadProductImages(files) {
    if (!files.length) return productForm.images;
    if (!supabase) throw new Error('Configure o Supabase antes de enviar imagens.');
    const uploaded = [...productForm.images];
    for (const file of files) {
      if (!['image/jpeg', 'image/png', 'image/webp', 'image/avif'].includes(file.type) || file.size > 8 * 1024 * 1024) {
        throw new Error('Cada imagem deve ser JPG, PNG, WebP ou AVIF com até 8 MB.');
      }
      const safeName = file.name.normalize('NFKD').replace(/[^a-zA-Z0-9._-]/g, '-').slice(-80);
      const path = `products/${window.crypto.randomUUID()}-${safeName}`;
      const { error: uploadError } = await supabase.storage
        .from('product-images')
        .upload(path, file, { cacheControl: '31536000', contentType: file.type, upsert: false });
      if (uploadError) throw new Error(`Não foi possível enviar ${file.name}: ${uploadError.message}`);
      uploaded.push({ path, alt: productForm.name || file.name });
    }
    return uploaded;
  }

  async function saveProduct(event) {
    event.preventDefault();
    setSaving(true);
    setError('');
    setMessage('');
    try {
      const images = await uploadProductImages(productFiles);
      const { price, ...fields } = productForm;
      const product = {
        ...fields,
        price_cents: Math.round(Number(price) * 100),
        stock: Number(productForm.stock),
        weight_kg: Number(productForm.weight_kg),
        length_cm: Number(productForm.length_cm),
        width_cm: Number(productForm.width_cm),
        height_cm: Number(productForm.height_cm),
        images,
      };
      await adminRequest('/api/admin/products', {
        method: product.id ? 'PATCH' : 'POST',
        body: JSON.stringify({ product }),
      });
      setProductForm(emptyProduct);
      setProductFiles([]);
      setMessage('Peça salva.');
      await loadAdminData();
    } catch (saveError) {
      setError(getApiErrorMessage(saveError));
    } finally {
      setSaving(false);
    }
  }

  async function deactivateProduct(id) {
    if (!window.confirm('Retirar esta peça do catálogo público? O histórico do pedido será preservado.')) return;
    try {
      await adminRequest(`/api/admin/products?id=${encodeURIComponent(id)}`, { method: 'DELETE' });
      setMessage('Peça retirada do catálogo.');
      await loadAdminData();
    } catch (requestError) {
      setError(getApiErrorMessage(requestError));
    }
  }

  async function saveCoupon(event) {
    event.preventDefault();
    setSaving(true);
    setError('');
    try {
      const coupon = {
        code: couponForm.code,
        kind: couponForm.kind,
        value: Math.round(Number(couponForm.value) * 100),
        min_subtotal_cents: Math.round(Number(couponForm.min_subtotal) * 100),
        starts_at: couponForm.starts_at ? new Date(couponForm.starts_at).toISOString() : null,
        expires_at: couponForm.expires_at ? new Date(couponForm.expires_at).toISOString() : null,
        max_redemptions: couponForm.max_redemptions ? Number(couponForm.max_redemptions) : null,
        active: couponForm.active,
      };
      await adminRequest('/api/admin/coupons', { method: 'POST', body: JSON.stringify({ coupon }) });
      setCouponForm(emptyCoupon);
      setMessage('Cupom criado.');
      await loadAdminData();
    } catch (requestError) {
      setError(getApiErrorMessage(requestError));
    } finally {
      setSaving(false);
    }
  }

  async function deactivateCoupon(id) {
    try {
      await adminRequest(`/api/admin/coupons?id=${encodeURIComponent(id)}`, { method: 'DELETE' });
      setMessage('Cupom desativado.');
      await loadAdminData();
    } catch (requestError) {
      setError(getApiErrorMessage(requestError));
    }
  }

  async function saveLook(event) {
    event.preventDefault();
    setSaving(true);
    setError('');
    try {
      const selectedProducts = lookForm.product_ids.map((id) => productById.get(id)).filter(Boolean);
      const look = {
        ...lookForm,
        product_ids: lookForm.product_ids,
        image_path: selectedProducts[0]?.images?.[0]?.path ?? null,
      };
      await adminRequest('/api/admin/looks', { method: 'POST', body: JSON.stringify({ look }) });
      setLookForm(emptyLook);
      setMessage('Vitrine criada.');
      await loadAdminData();
    } catch (requestError) {
      setError(getApiErrorMessage(requestError));
    } finally {
      setSaving(false);
    }
  }

  async function deactivateLook(id) {
    try {
      await adminRequest(`/api/admin/looks?id=${encodeURIComponent(id)}`, { method: 'DELETE' });
      setMessage('Vitrine desativada.');
      await loadAdminData();
    } catch (requestError) {
      setError(getApiErrorMessage(requestError));
    }
  }

  async function updateOrderStatus(id, fulfillment_status) {
    try {
      await adminRequest('/api/admin/orders', {
        method: 'PATCH',
        body: JSON.stringify({ id, fulfillment_status }),
      });
      setMessage('Status do pedido atualizado.');
      await loadAdminData();
    } catch (requestError) {
      setError(getApiErrorMessage(requestError));
    }
  }

  async function saveSettings(event) {
    event.preventDefault();
    setSaving(true);
    setError('');
    try {
      await Promise.all([
        adminRequest('/api/admin/settings', {
          method: 'PUT',
          body: JSON.stringify({ key: 'pickup_address', value: settings.pickup_address }),
        }),
        adminRequest('/api/admin/settings', {
          method: 'PUT',
          body: JSON.stringify({ key: 'local_delivery_note', value: settings.local_delivery_note }),
        }),
        adminRequest('/api/admin/settings', {
          method: 'PUT',
          body: JSON.stringify({ key: 'legal_pages', value: settings.legal_pages }),
        }),
      ]);
      setMessage('Informações de retirada e entrega salvas.');
      await loadAdminData();
    } catch (requestError) {
      setError(getApiErrorMessage(requestError));
    } finally {
      setSaving(false);
    }
  }

  async function signOut() {
    try {
      if (supabase) {
        const { error: signOutError } = await supabase.auth.signOut();
        if (signOutError) throw signOutError;
      }
      navigate('/admin/login', { state: { logoutSuccess: true } });
    } catch (signOutError) {
      console.error('Admin sign-out failed:', {
        name: signOutError.name,
        code: signOutError.code,
        status: signOutError.status,
      });
      setError('Não foi possível encerrar a sessão. Tente novamente.');
    }
  }

  if (loading) {
    return (
      <main className="container page">
        {loginSuccess.current && <p className="success-message" role="status">Login realizado com sucesso. Validando acesso e carregando o painel administrativo...</p>}
        <p className="loading-state">Validando acesso…</p>
      </main>
    );
  }
  if (!authorized) {
    return (
      <main className="container page">
        <ErrorBanner message={error} />
        <div className="empty-state">
          <h1>Acesso administrativo</h1>
          <p>O painel não foi carregado. Você pode tentar novamente sem perder a sessão atual.</p>
          <button className="button" type="button" onClick={loadAdminData}>Tentar novamente</button>
          {error.includes('sessão expirou') && <p><Link className="text-link" to="/admin/login">Entrar novamente</Link></p>}
        </div>
      </main>
    );
  }

  return (
    <main className="container page admin-shell">
      <PageMeta title="Administração" description="Área administrativa do Ammi Maju." noIndex />
      <div className="section-heading">
        <div><p className="eyebrow">Ammi Maju</p><h1>Administração</h1></div>
        <button className="button-quiet" type="button" onClick={signOut}>Sair</button>
      </div>
      <ErrorBanner message={error} />
      {message && <p className="success-message" role="status">{message}</p>}
      <nav className="admin-nav" aria-label="Seções administrativas">
        {[
          ['products', 'Peças'],
          ['orders', 'Pedidos'],
          ['coupons', 'Cupons'],
          ['looks', 'Vitrines'],
          ['settings', 'Retirada/entrega'],
        ].map(([value, label]) => (
          <button key={value} type="button" aria-pressed={tab === value} onClick={() => setTab(value)}>{label}</button>
        ))}
      </nav>

      {tab === 'products' && (
        <section>
          <h2>{productForm.id ? 'Editar peça' : 'Cadastrar uma peça'}</h2>
          <p className="muted">Informe dados reais. Peso e dimensões da embalagem são obrigatórios para cotar o frete. Peças novas ficam ocultas até serem ativadas.</p>
          <form className="admin-product-form" onSubmit={saveProduct}>
            {[
              ['name', 'Nome da peça', 'text', true],
              ['slug', 'Endereço (slug)', 'text', true],
              ['brand', 'Marca (opcional)', 'text', false],
              ['category', 'Categoria', 'text', true],
              ['size', 'Tamanho', 'text', true],
              ['price', 'Preço em reais', 'number', true],
              ['stock', 'Unidades em estoque', 'number', true],
            ].map(([name, label, type, required]) => (
              <div className="field" key={name}>
                <label htmlFor={`product-${name}`}>{label}</label>
                <input id={`product-${name}`} name={name} type={type} required={required} min={type === 'number' ? '0.01' : undefined} step={name === 'price' ? '0.01' : name === 'stock' ? '1' : undefined} value={productForm[name] ?? ''} onChange={setProductField} />
              </div>
            ))}
            <div className="field"><label htmlFor="product-audience">Público</label><select id="product-audience" name="audience" value={productForm.audience} onChange={setProductField}><option value="feminino">Feminino</option><option value="masculino">Masculino</option><option value="infantil">Infantil</option><option value="unissex">Unissex</option></select></div>
            <div className="field"><label htmlFor="product-condition">Condição</label><select id="product-condition" name="condition" value={productForm.condition} onChange={setProductField}><option value="novo">Novo</option><option value="otimo">Ótimo</option><option value="bom">Bom</option><option value="marcas-de-uso">Marcas de uso</option></select></div>
            <div className="field"><label htmlFor="product-weight">Peso embalado (kg)</label><input id="product-weight" name="weight_kg" type="number" min="0.001" step="0.001" required value={productForm.weight_kg} onChange={setProductField} /></div>
            <div className="field"><label htmlFor="product-length">Comprimento (cm)</label><input id="product-length" name="length_cm" type="number" min="1" step="0.1" required value={productForm.length_cm} onChange={setProductField} /></div>
            <div className="field"><label htmlFor="product-width">Largura (cm)</label><input id="product-width" name="width_cm" type="number" min="1" step="0.1" required value={productForm.width_cm} onChange={setProductField} /></div>
            <div className="field"><label htmlFor="product-height">Altura (cm)</label><input id="product-height" name="height_cm" type="number" min="1" step="0.1" required value={productForm.height_cm} onChange={setProductField} /></div>
            <div className="field span-2"><label htmlFor="product-description">Descrição da peça</label><textarea id="product-description" name="description" value={productForm.description} onChange={setProductField} /></div>
            <div className="field span-2"><label htmlFor="product-measurements">Medidas da roupa (ex.: busto, cintura e comprimento)</label><textarea id="product-measurements" name="measurements" value={productForm.measurements} onChange={setProductField} /></div>
            <div className="field span-2"><label htmlFor="product-condition-details">Detalhes/defeitos da condição</label><textarea id="product-condition-details" name="condition_details" value={productForm.condition_details} onChange={setProductField} /></div>
            <div className="field span-2"><label htmlFor="product-images">Fotos JPG, PNG, WebP ou AVIF (até 8 MB por imagem)</label><input id="product-images" type="file" accept="image/jpeg,image/png,image/webp,image/avif" multiple onChange={(event) => setProductFiles([...event.target.files])} /></div>
            {productForm.images.length > 0 && <p className="span-2 muted">{productForm.images.length} foto(s) cadastrada(s).</p>}
            <label className="span-2"><input type="checkbox" name="active" checked={productForm.active} onChange={setProductField} /> Publicar no catálogo (exige estoque maior que zero)</label>
            <div className="admin-actions span-2">
              <button className="button" type="submit" disabled={saving}>{saving ? 'Salvando…' : 'Salvar peça'}</button>
              {productForm.id && <button className="button-quiet" type="button" onClick={() => { setProductForm(emptyProduct); setProductFiles([]); }}>Cancelar edição</button>}
            </div>
          </form>
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead><tr><th>Peça</th><th>Preço</th><th>Estoque</th><th>Status</th><th>Ações</th></tr></thead>
              <tbody>{products.map((product) => (
                <tr key={product.id}>
                  <td>{product.name}<br /><small>{product.size} · {product.category}</small></td>
                  <td>{formatPrice(product.price_cents)}</td>
                  <td>{product.stock}</td>
                  <td><span className="status-pill">{product.active ? 'Publicada' : 'Oculta'}</span></td>
                  <td><div className="admin-actions">
                    <button className="button-secondary" type="button" onClick={() => { setProductForm(toProductForm(product)); window.scrollTo({ top: 0, behavior: 'smooth' }); }}>Editar</button>
                    {product.active && <button className="button-quiet" type="button" onClick={() => deactivateProduct(product.id)}>Retirar</button>}
                  </div></td>
                </tr>
              ))}</tbody>
            </table>
          </div>
        </section>
      )}

      {tab === 'orders' && (
        <section>
          <h2>Pedidos</h2>
          {!orders.length ? <div className="empty-state">Ainda não há pedidos.</div> : (
            <div className="admin-table-wrap"><table className="admin-table">
              <thead><tr><th>Pedido/cliente</th><th>Itens</th><th>Pagamento</th><th>Total</th><th>Entrega/status</th></tr></thead>
              <tbody>{orders.map((order) => (
                <tr key={order.id}>
                  <td>#{order.id.slice(0, 8)}<br />{order.buyer_name}<br /><small>{order.buyer_phone}</small></td>
                  <td>{order.order_items.map((item) => `${item.product_name} ×${item.quantity}`).join(', ')}</td>
                  <td><span className={`status-pill${order.payment_status === 'paid' ? ' status-pill--paid' : ''}`}>{order.payment_status}</span></td>
                  <td>{formatPrice(order.total_cents)}</td>
                  <td>
                    <select aria-label={`Atualizar entrega do pedido ${order.id.slice(0, 8)}`} disabled={order.payment_status !== 'paid'} value={order.fulfillment_status} onChange={(event) => updateOrderStatus(order.id, event.target.value)}>
                      {orderStatuses.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                      {!orderStatuses.some(([value]) => value === order.fulfillment_status) && <option value={order.fulfillment_status}>{order.fulfillment_status}</option>}
                    </select>
                    {order.fulfillment_method === 'shipping' && <p className="muted">{order.shipping_address.street}, {order.shipping_address.number} — {order.shipping_address.neighborhood}, {order.postal_code}</p>}
                    {order.local_delivery_pending && <p className="muted">Entrega local a combinar pelo WhatsApp.</p>}
                  </td>
                </tr>
              ))}</tbody>
            </table></div>
          )}
        </section>
      )}

      {tab === 'coupons' && (
        <section>
          <h2>Cupons</h2>
          <form className="admin-product-form" onSubmit={saveCoupon}>
            <div className="field"><label htmlFor="coupon-code-admin">Código</label><input id="coupon-code-admin" required value={couponForm.code} onChange={(event) => setCouponForm({ ...couponForm, code: event.target.value.toUpperCase() })} /></div>
            <div className="field"><label htmlFor="coupon-kind">Desconto</label><select id="coupon-kind" value={couponForm.kind} onChange={(event) => setCouponForm({ ...couponForm, kind: event.target.value })}><option value="percent">Percentual</option><option value="fixed">Valor fixo em R$</option></select></div>
            <div className="field"><label htmlFor="coupon-value">{couponForm.kind === 'percent' ? 'Percentual (1-100)' : 'Valor (R$)'}</label><input id="coupon-value" type="number" min="0.01" max={couponForm.kind === 'percent' ? '100' : undefined} step="0.01" required value={couponForm.value} onChange={(event) => setCouponForm({ ...couponForm, value: event.target.value })} /></div>
            <div className="field"><label htmlFor="coupon-minimum">Compra mínima (R$)</label><input id="coupon-minimum" type="number" min="0" step="0.01" value={couponForm.min_subtotal} onChange={(event) => setCouponForm({ ...couponForm, min_subtotal: event.target.value })} /></div>
            <div className="field"><label htmlFor="coupon-start">Início (opcional)</label><input id="coupon-start" type="datetime-local" value={couponForm.starts_at} onChange={(event) => setCouponForm({ ...couponForm, starts_at: event.target.value })} /></div>
            <div className="field"><label htmlFor="coupon-expiry">Validade (opcional)</label><input id="coupon-expiry" type="datetime-local" value={couponForm.expires_at} onChange={(event) => setCouponForm({ ...couponForm, expires_at: event.target.value })} /></div>
            <div className="field"><label htmlFor="coupon-limit">Limite de usos (opcional)</label><input id="coupon-limit" type="number" min="1" step="1" value={couponForm.max_redemptions} onChange={(event) => setCouponForm({ ...couponForm, max_redemptions: event.target.value })} /></div>
            <div className="admin-actions span-2"><button className="button" type="submit" disabled={saving}>{saving ? 'Salvando…' : 'Criar cupom'}</button></div>
          </form>
          <div className="admin-table-wrap"><table className="admin-table"><thead><tr><th>Código</th><th>Desconto</th><th>Usos</th><th>Status</th><th>Ação</th></tr></thead><tbody>
            {coupons.map((coupon) => <tr key={coupon.id}><td>{coupon.code}</td><td>{coupon.kind === 'percent' ? `${coupon.value / 100}%` : formatPrice(coupon.value)}</td><td>{coupon.redemptions}{coupon.max_redemptions ? ` / ${coupon.max_redemptions}` : ''}</td><td>{coupon.active ? 'Ativo' : 'Inativo'}</td><td>{coupon.active && <button className="button-quiet" type="button" onClick={() => deactivateCoupon(coupon.id)}>Desativar</button>}</td></tr>)}
          </tbody></table></div>
        </section>
      )}

      {tab === 'looks' && (
        <section>
          <h2>Vitrines de looks</h2>
          <p className="muted">Selecione peças reais já cadastradas. A primeira foto da primeira peça vira a capa.</p>
          <form className="admin-product-form" onSubmit={saveLook}>
            <div className="field"><label htmlFor="look-title">Título</label><input id="look-title" required value={lookForm.title} onChange={(event) => setLookForm({ ...lookForm, title: event.target.value })} /></div>
            <div className="field"><label htmlFor="look-slug">Endereço (slug)</label><input id="look-slug" required value={lookForm.slug} onChange={(event) => setLookForm({ ...lookForm, slug: event.target.value })} /></div>
            <div className="field span-2"><label htmlFor="look-description">Descrição</label><textarea id="look-description" value={lookForm.description} onChange={(event) => setLookForm({ ...lookForm, description: event.target.value })} /></div>
            <div className="field span-2"><label htmlFor="look-products">Peças (Ctrl/Cmd para selecionar mais de uma)</label><select id="look-products" multiple size="5" value={lookForm.product_ids} onChange={(event) => setLookForm({ ...lookForm, product_ids: [...event.target.selectedOptions].map((option) => option.value) })}>{products.filter((product) => product.active && product.stock > 0).map((product) => <option key={product.id} value={product.id}>{product.name} — {formatPrice(product.price_cents)}</option>)}</select></div>
            <label className="span-2"><input type="checkbox" checked={lookForm.active} onChange={(event) => setLookForm({ ...lookForm, active: event.target.checked })} /> Publicar vitrine</label>
            <button className="button span-2" type="submit" disabled={saving || !lookForm.product_ids.length}>{saving ? 'Salvando…' : 'Criar vitrine'}</button>
          </form>
          <ul>{looks.map((look) => <li key={look.id}>{look.title} — {look.active ? 'publicada' : 'oculta'} {look.active && <button type="button" className="text-link" onClick={() => deactivateLook(look.id)}>Desativar</button>}</li>)}</ul>
        </section>
      )}

      {tab === 'settings' && (
        <section>
          <h2>Retirada e entrega local</h2>
          <form className="form-section" onSubmit={saveSettings}>
            <div className="field"><label htmlFor="pickup-address">Endereço público de retirada</label><input id="pickup-address" value={settings.pickup_address?.address ?? ''} onChange={(event) => setSettings({ ...settings, pickup_address: { ...settings.pickup_address, address: event.target.value } })} /></div>
            <div className="field"><label htmlFor="pickup-hours">Horários de retirada</label><input id="pickup-hours" value={settings.pickup_address?.hours ?? ''} onChange={(event) => setSettings({ ...settings, pickup_address: { ...settings.pickup_address, hours: event.target.value } })} /></div>
            <div className="field"><label htmlFor="delivery-note">Nota sobre entrega local em Porto Alegre</label><textarea id="delivery-note" value={settings.local_delivery_note?.text ?? ''} onChange={(event) => setSettings({ ...settings, local_delivery_note: { text: event.target.value } })} /></div>
            <div className="field"><label htmlFor="privacy-policy">Política de privacidade</label><textarea id="privacy-policy" required value={settings.legal_pages?.privacy ?? ''} onChange={(event) => setSettings({ ...settings, legal_pages: { ...settings.legal_pages, privacy: event.target.value } })} /></div>
            <div className="field"><label htmlFor="purchase-terms">Condições de compra, entrega e troca</label><textarea id="purchase-terms" required value={settings.legal_pages?.terms ?? ''} onChange={(event) => setSettings({ ...settings, legal_pages: { ...settings.legal_pages, terms: event.target.value } })} /></div>
            <button className="button" type="submit" disabled={saving}>{saving ? 'Salvando…' : 'Salvar informações'}</button>
          </form>
        </section>
      )}
    </main>
  );
}
