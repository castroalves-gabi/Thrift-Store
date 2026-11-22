import { Link } from 'react-router-dom';
import PageMeta from '../components/PageMeta.jsx';
import { useCart } from '../context/CartContext.jsx';
import { useCatalog } from '../context/CatalogContext.jsx';
import { formatPrice } from '../lib/format.js';

export default function CartPage() {
  const { cart, itemCount, storageError, changeQuantity, removeFromCart } = useCart();
  const { products, loading, error, refresh } = useCatalog();
  const productsById = new Map(products.map((product) => [product.id, product]));
  const items = Object.entries(cart).map(([id, quantity]) => ({
    product: productsById.get(id),
    id,
    quantity,
  }));
  const total = items.reduce((sum, item) => (
    item.product ? sum + item.product.price_cents * item.quantity : sum
  ), 0);
  const hasUnavailableItems = items.some((item) => !item.product || item.quantity > item.product.stock);

  return (
    <main className="container page">
      <PageMeta title="Sacola" description="Revise as peças selecionadas no seu carrinho do Ammi Maju." />
      <div className="page-heading">
        <p className="eyebrow">Quase lá</p>
        <h1>Sua sacola</h1>
      </div>
      {storageError && <p className="notice" role="status">{storageError}</p>}
      {error && <div className="error-message" role="alert">{error} <button type="button" className="text-link" onClick={refresh}>Tentar novamente</button></div>}
      {loading && <p className="loading-state" role="status">Conferindo disponibilidade…</p>}
      {!loading && items.length === 0 && (
        <div className="empty-state">
          <h2>Sua sacola está vazia</h2>
          <p>Encontre um novo achado na loja.</p>
          <Link className="button" to="/loja">Ir para a loja</Link>
        </div>
      )}
      {!loading && items.length > 0 && (
        <div className="cart-layout">
          <div className="cart-list">
            {items.map(({ product, id, quantity }) => (
              <article className="cart-item" key={id}>
                {product?.images?.[0]
                  ? <img src={product.images[0].url} alt={product.images[0].alt || product.name} width="96" height="96" />
                  : <div className="product-placeholder"><i className="bx bx-image" aria-hidden="true" /></div>}
                <div>
                  <h2>{product?.name || 'Peça não disponível'}</h2>
                  <p className="muted">{product ? `Tamanho ${product.size} · ${formatPrice(product.price_cents)}` : 'Esta peça não está mais no catálogo.'}</p>
                  <div className="cart-item__actions" aria-label={`Quantidade de ${product?.name || 'peça'}`}>
                    <button className="quantity-button" type="button" disabled={quantity <= 1} aria-label="Diminuir quantidade" onClick={() => changeQuantity(id, -1, product?.stock)}>−</button>
                    <span>{quantity}</span>
                    <button className="quantity-button" type="button" disabled={!product || quantity >= product.stock} aria-label="Aumentar quantidade" onClick={() => product && changeQuantity(id, 1, product.stock)}>+</button>
                    {product && <span className="product-stock">Estoque: {product.stock}</span>}
                  </div>
                </div>
                <strong className="cart-item__price">{product ? formatPrice(product.price_cents * quantity) : 'Indisponível'}</strong>
                <button className="cart-item__remove" type="button" onClick={() => removeFromCart(id)}>Remover</button>
              </article>
            ))}
          </div>
          <aside className="cart-summary" aria-label="Resumo da sacola">
            <h2>Resumo</h2>
            <div className="summary-row"><span>Itens ({itemCount})</span><strong>{formatPrice(total)}</strong></div>
            <p className="muted">Frete e entrega são escolhidos no próximo passo.</p>
            {hasUnavailableItems && <p className="error-message">Remova ou ajuste as peças indisponíveis antes de continuar.</p>}
            <Link className="button" aria-disabled={hasUnavailableItems || error} to="/checkout" onClick={(event) => {
              if (hasUnavailableItems || error) event.preventDefault();
            }}>
              Continuar para entrega
            </Link>
            <Link className="text-link" to="/loja">Continuar garimpando</Link>
          </aside>
        </div>
      )}
    </main>
  );
}
