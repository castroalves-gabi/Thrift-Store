import { Link } from 'react-router-dom';
import CatalogFeedback from '../components/CatalogFeedback.jsx';
import PageMeta from '../components/PageMeta.jsx';
import ProductCard from '../components/ProductCard.jsx';
import { useCatalog } from '../context/CatalogContext.jsx';
import { useFavorites } from '../context/FavoritesContext.jsx';

export default function FavoritesPage() {
  const { products, loading, error, refresh } = useCatalog();
  const { ids, error: storageError } = useFavorites();
  const favorites = products.filter((product) => ids.includes(product.id));

  return (
    <main className="container page">
      <PageMeta title="Favoritos" description="Suas peças favoritas salvas neste navegador." />
      <div className="page-heading">
        <p className="eyebrow">Seus garimpos guardados</p>
        <h1>Favoritos</h1>
        <p>Os favoritos ficam salvos neste navegador; não enviamos avisos externos.</p>
      </div>
      {storageError && <p className="notice" role="status">{storageError}</p>}
      <CatalogFeedback loading={loading} error={error} onRetry={refresh} />
      {!loading && !error && favorites.length === 0 && (
        <div className="empty-state">
          <h2>Ainda não há peças favoritas</h2>
          <p>Toque no coração de uma peça para guardá-la aqui.</p>
          <Link className="button" to="/loja">Explorar a loja</Link>
        </div>
      )}
      {!loading && !error && favorites.length > 0 && (
        <div className="product-grid">
          {favorites.map((product) => <ProductCard key={product.id} product={product} />)}
        </div>
      )}
    </main>
  );
}
