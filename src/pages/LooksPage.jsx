import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import PageMeta from '../components/PageMeta.jsx';
import CatalogFeedback from '../components/CatalogFeedback.jsx';
import { apiRequest } from '../lib/api.js';
import { formatPrice } from '../lib/format.js';

export default function LooksPage() {
  const [looks, setLooks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  async function loadLooks() {
    setLoading(true);
    setError('');
    try {
      const result = await apiRequest('/api/looks');
      setLooks(result.looks);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadLooks(); }, []);

  return (
    <main className="container page">
      <PageMeta title="Looks da curadoria" description="Combinações e seleções de peças reais disponíveis no Ammi Maju." />
      <div className="page-heading">
        <p className="eyebrow">Ideias para combinar</p>
        <h1>Looks da curadoria</h1>
        <p>Combinações montadas com peças que estão disponíveis no catálogo.</p>
      </div>
      <CatalogFeedback loading={loading} error={error} onRetry={loadLooks} />
      {!loading && !error && looks.length === 0 && (
        <div className="empty-state"><h2>Novas combinações em breve</h2><p>A equipe está preparando vitrines com peças reais do catálogo.</p></div>
      )}
      {!loading && !error && looks.length > 0 && (
        <div className="look-grid">
          {looks.map((look) => (
            <article className="look-card" key={look.id}>
              {look.image_url && <img className="look-card__cover" src={look.image_url} alt={look.title} loading="lazy" decoding="async" />}
              <div className="look-card__body">
                <h2>{look.title}</h2>
                <p>{look.description}</p>
                <div className="look-products">
                  {look.products.map((product) => (
                    <Link key={product.id} to={`/produto/${product.slug}`}>
                      {product.images[0] && <img src={product.images[0].url} alt="" loading="lazy" decoding="async" />}
                      {product.name}<br />{formatPrice(product.price_cents)}
                    </Link>
                  ))}
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
    </main>
  );
}
