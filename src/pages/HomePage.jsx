import { Link } from 'react-router-dom';
import CatalogFeedback from '../components/CatalogFeedback.jsx';
import ProductCard from '../components/ProductCard.jsx';
import PageMeta from '../components/PageMeta.jsx';
import { useCatalog } from '../context/CatalogContext.jsx';

const audiences = [
  { label: 'Feminino', value: 'feminino' },
  { label: 'Masculino', value: 'masculino' },
  { label: 'Infantil', value: 'infantil' },
];

export default function HomePage() {
  const { products, loading, error, refresh } = useCatalog();
  return (
    <main>
      <PageMeta
        title="Brechó Ammi Maju"
        description="Garimpe roupas de segunda mão com personalidade e preços acessíveis no Ammi Maju."
      />
      <section className="home-hero">
        <div className="hero-inner">
          <div className="hero-copy">
            <p className="eyebrow">Garimpos com história</p>
            <h1>Seu próximo achado está aqui.</h1>
            <p>
              Peças selecionadas, preços que cabem no bolso e um jeito mais
              gostoso de dar uma nova volta às roupas.
            </p>
            <Link to="/loja" className="button">Explorar a loja <i className="bx bx-right-arrow-alt" aria-hidden="true" /></Link>
          </div>
          <div className="hero-image">
            <img src="/img/home.png" alt="Seleção de roupas do Brechó Ammi Maju" width="800" height="800" fetchPriority="high" />
          </div>
        </div>
      </section>

      <div className="container">
        <div className="value-strip" aria-label="Vantagens do Ammi Maju">
          <div className="value-item"><i className="bx bx-heart" aria-hidden="true" />Garimpo com personalidade</div>
          <div className="value-item"><i className="bx bx-purchase-tag" aria-hidden="true" />Preços acessíveis</div>
          <div className="value-item"><i className="bx bx-recycle" aria-hidden="true" />Moda de segunda mão</div>
        </div>

        <section className="page">
          <div className="section-heading">
            <div>
              <p className="eyebrow">Encontre seu estilo</p>
              <h2>Explore por categoria</h2>
            </div>
          </div>
          <div className="category-grid">
            {audiences.map((audience) => (
              <Link
                className="category-tile"
                key={audience.value}
                to={`/loja?audience=${audience.value}`}
              >
                <span>{audience.label}</span>
              </Link>
            ))}
          </div>

          <div className="section-heading">
            <div>
              <p className="eyebrow">Peças disponíveis</p>
              <h2>Achados para chamar de seus</h2>
            </div>
            <Link className="text-link" to="/loja">Ver catálogo</Link>
          </div>
          <CatalogFeedback loading={loading} error={error} onRetry={refresh} />
          {!loading && !error && products.length === 0 && (
            <div className="empty-state">
              <h2>Estamos preparando novos garimpos</h2>
              <p>As peças entram no catálogo depois de cadastradas e conferidas pela loja.</p>
            </div>
          )}
          {!loading && !error && products.length > 0 && (
            <div className="product-grid">
              {products.slice(0, 3).map((product) => <ProductCard key={product.id} product={product} />)}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
