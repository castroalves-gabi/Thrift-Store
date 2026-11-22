import { Link, useParams } from 'react-router-dom';
import CatalogFeedback from '../components/CatalogFeedback.jsx';
import PageMeta from '../components/PageMeta.jsx';
import { useCart } from '../context/CartContext.jsx';
import { useCatalog } from '../context/CatalogContext.jsx';
import { formatPrice } from '../lib/format.js';
import { getPublicWhatsAppUrl } from '../lib/supabase.js';

export default function ProductPage() {
  const { slug } = useParams();
  const { products, loading, error, refresh } = useCatalog();
  const { addToCart, cart } = useCart();
  const product = products.find((item) => item.slug === slug);

  if (loading) {
    return <main className="container page"><CatalogFeedback loading={loading} /></main>;
  }
  if (error) {
    return <main className="container page"><CatalogFeedback error={error} onRetry={refresh} /></main>;
  }
  if (!product) {
    return (
      <main className="container page">
        <div className="empty-state">
          <h1>Esta peça não está disponível</h1>
          <p>Ela pode ter sido vendida ou removida do catálogo.</p>
          <Link className="button" to="/loja">Voltar à loja</Link>
        </div>
      </main>
    );
  }

  const inCart = cart[product.id] ?? 0;
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: product.name,
    description: product.description,
    image: product.images.map((image) => image.url),
    brand: product.brand ? { '@type': 'Brand', name: product.brand } : undefined,
    offers: {
      '@type': 'Offer',
      priceCurrency: 'BRL',
      price: (product.price_cents / 100).toFixed(2),
      availability: product.stock > 0 ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock',
      url: window.location.href.split(/[?#]/)[0],
    },
  };

  return (
    <main className="container page">
      <PageMeta
        title={product.name}
        description={`${product.name}: tamanho ${product.size}, condição ${product.condition.replaceAll('-', ' ')}. Consulte detalhes e disponibilidade no Ammi Maju.`}
      />
      <script type="application/ld+json">{JSON.stringify(schema)}</script>
      <nav aria-label="Trilha de navegação" className="product-meta">
        <Link to="/">Início</Link><span aria-hidden="true">/</span>
        <Link to="/loja">Loja</Link><span aria-hidden="true">/</span>
        <span aria-current="page">{product.name}</span>
      </nav>
      <section className="product-detail">
        <div className="product-gallery" aria-label={`Fotos de ${product.name}`}>
          {product.images.length
            ? product.images.map((image) => (
              <img key={image.url} src={image.url} alt={image.alt || product.name} width="800" height="800" />
            ))
            : <div className="empty-state">Fotos em breve</div>}
        </div>
        <div className="product-detail__info">
          <p className="eyebrow">{product.audience} · {product.category}</p>
          <h1>{product.name}</h1>
          <p className="product-detail__price">{formatPrice(product.price_cents)}</p>
          <p>{product.description || 'Peça de segunda mão selecionada pela equipe Ammi Maju.'}</p>
          <dl className="detail-list">
            <div><dt>Tamanho</dt><dd>{product.size}</dd></div>
            <div><dt>Condição</dt><dd>{product.condition.replaceAll('-', ' ')}</dd></div>
            {product.brand && <div><dt>Marca</dt><dd>{product.brand}</dd></div>}
            <div><dt>Disponibilidade</dt><dd>{product.stock} {product.stock === 1 ? 'unidade' : 'unidades'}</dd></div>
          </dl>
          {product.measurements && (
            <section>
              <h2>Medidas aproximadas</h2>
              <p>{product.measurements}</p>
            </section>
          )}
          {product.condition_details && (
            <section>
              <h2>Detalhes da condição</h2>
              <p>{product.condition_details}</p>
            </section>
          )}
          <button
            className="button"
            type="button"
            disabled={inCart >= product.stock}
            onClick={() => addToCart(product)}
          >
            {inCart >= product.stock ? 'Unidade no carrinho' : 'Adicionar à sacola'}
          </button>
          <a
            className="button-secondary"
            href={getPublicWhatsAppUrl(`Olá! Tenho uma dúvida sobre a peça ${product.name}: ${window.location.href.split(/[?#]/)[0]}`)}
            target="_blank"
            rel="noreferrer"
          >
            <i className="bx bxl-whatsapp" aria-hidden="true" />Perguntar sobre esta peça
          </a>
        </div>
      </section>
    </main>
  );
}
