import { Link } from 'react-router-dom';
import { useCart } from '../context/CartContext.jsx';
import { useFavorites } from '../context/FavoritesContext.jsx';
import { formatPrice } from '../lib/format.js';

export default function ProductCard({ product }) {
  const { cart, addToCart } = useCart();
  const { ids: favorites, toggle } = useFavorites();
  const favorite = favorites.includes(product.id);
  const availableInCart = cart[product.id] ?? 0;
  const unavailable = availableInCart >= product.stock;
  const cover = product.images?.[0];

  return (
    <article className="product-card">
      <Link to={`/produto/${product.slug}`} className="product-card__image">
        {cover
          ? <img src={cover.url} alt={cover.alt || product.name} width="640" height="640" loading="lazy" decoding="async" />
          : <span className="product-placeholder"><i className="bx bx-image" aria-hidden="true" />Foto em breve</span>}
        <span className="product-badge">{product.audience} · {product.category}</span>
      </Link>
      <button
        className="favorite-toggle"
        type="button"
        aria-label={favorite ? `Remover ${product.name} dos favoritos` : `Adicionar ${product.name} aos favoritos`}
        aria-pressed={favorite}
        onClick={() => toggle(product.id)}
      >
        <i className={`bx ${favorite ? 'bxs-heart' : 'bx-heart'}`} aria-hidden="true" />
      </button>
      <div className="product-card__body">
        <div className="product-meta">
          <span>{product.condition.replaceAll('-', ' ')}</span>
          <span aria-hidden="true">·</span>
          <span>Tam. {product.size}</span>
        </div>
        <h2><Link to={`/produto/${product.slug}`}>{product.name}</Link></h2>
        <p className="product-price">{formatPrice(product.price_cents)}</p>
        <p className="product-stock">{product.stock} {product.stock === 1 ? 'unidade disponível' : 'unidades disponíveis'}</p>
        <button className="button" type="button" disabled={unavailable} onClick={() => addToCart(product)}>
          <i className="bx bx-cart-add" aria-hidden="true" />
          {unavailable ? 'No carrinho' : 'Adicionar à sacola'}
        </button>
      </div>
    </article>
  );
}
