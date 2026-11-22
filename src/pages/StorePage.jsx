import { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import CatalogFeedback from '../components/CatalogFeedback.jsx';
import ProductCard from '../components/ProductCard.jsx';
import PageMeta from '../components/PageMeta.jsx';
import { useCatalog } from '../context/CatalogContext.jsx';

export default function StorePage() {
  const { products, loading, error, refresh } = useCatalog();
  const [searchParams, setSearchParams] = useSearchParams();
  const [search, setSearch] = useState(searchParams.get('q') ?? '');
  const audience = searchParams.get('audience') ?? '';
  const category = searchParams.get('category') ?? '';
  const size = searchParams.get('size') ?? '';
  const condition = searchParams.get('condition') ?? '';
  const minPrice = searchParams.get('minPrice') ?? '';
  const maxPrice = searchParams.get('maxPrice') ?? '';
  const order = searchParams.get('order') ?? 'recent';

  const categories = useMemo(
    () => [...new Set(products.map((product) => product.category))].sort((a, b) => a.localeCompare(b, 'pt-BR')),
    [products],
  );
  const sizes = useMemo(
    () => [...new Set(products.map((product) => product.size))].sort((a, b) => a.localeCompare(b, 'pt-BR')),
    [products],
  );
  const filteredProducts = useMemo(() => {
    const term = search.trim().toLocaleLowerCase('pt-BR');
    const filtered = products.filter((product) => {
      const matchesTerm = !term || [
        product.name, product.description, product.brand, product.category,
        product.audience, product.size, product.condition, product.condition_details,
      ].some((value) => value?.toLocaleLowerCase('pt-BR').includes(term));
      return matchesTerm
        && (!audience || product.audience === audience)
        && (!category || product.category === category)
        && (!size || product.size === size)
        && (!condition || product.condition === condition)
        && (!minPrice || product.price_cents >= Math.round(Number(minPrice) * 100))
        && (!maxPrice || product.price_cents <= Math.round(Number(maxPrice) * 100));
    });

    return filtered.sort((left, right) => {
      if (order === 'price-asc') return left.price_cents - right.price_cents;
      if (order === 'price-desc') return right.price_cents - left.price_cents;
      return new Date(right.created_at) - new Date(left.created_at);
    });
  }, [products, search, audience, category, size, condition, minPrice, maxPrice, order]);

  function updateFilter(key, value) {
    const next = new URLSearchParams(searchParams);
    if (value) next.set(key, value);
    else next.delete(key);
    setSearchParams(next, { replace: true });
  }

  return (
    <main className="container page">
      <PageMeta
        title="Loja"
        description="Explore roupas femininas, masculinas e infantis disponíveis no Brechó Ammi Maju."
      />
      <div className="page-heading">
        <p className="eyebrow">Garimpe sem pressa</p>
        <h1>Peças disponíveis</h1>
        <p>Confira tamanho, condição e disponibilidade de cada peça antes de levar.</p>
      </div>

      <div className="store-toolbar" aria-label="Pesquisa e filtros do catálogo">
        <div className="field search-field">
          <label htmlFor="product-search">Buscar por peça, marca ou detalhe</label>
          <input
            id="product-search"
            type="search"
            placeholder="Ex.: jaqueta jeans"
            value={search}
            onChange={(event) => {
              setSearch(event.target.value);
              updateFilter('q', event.target.value);
            }}
          />
        </div>
        <div className="field">
          <label htmlFor="audience-filter">Público</label>
          <select id="audience-filter" value={audience} onChange={(event) => updateFilter('audience', event.target.value)}>
            <option value="">Todos</option>
            <option value="feminino">Feminino</option>
            <option value="masculino">Masculino</option>
            <option value="infantil">Infantil</option>
            <option value="unissex">Unissex</option>
          </select>
        </div>
        <div className="field">
          <label htmlFor="category-filter">Categoria</label>
          <select id="category-filter" value={category} onChange={(event) => updateFilter('category', event.target.value)}>
            <option value="">Todas</option>
            {categories.map((value) => <option key={value} value={value}>{value}</option>)}
          </select>
        </div>
        <div className="field">
          <label htmlFor="size-filter">Tamanho</label>
          <select id="size-filter" value={size} onChange={(event) => updateFilter('size', event.target.value)}>
            <option value="">Todos</option>
            {sizes.map((value) => <option key={value} value={value}>{value}</option>)}
          </select>
        </div>
        <div className="field">
          <label htmlFor="condition-filter">Condição</label>
          <select id="condition-filter" value={condition} onChange={(event) => updateFilter('condition', event.target.value)}>
            <option value="">Todas</option>
            <option value="novo">Novo</option>
            <option value="otimo">Ótimo</option>
            <option value="bom">Bom</option>
            <option value="marcas-de-uso">Marcas de uso</option>
          </select>
        </div>
        <div className="field">
          <label htmlFor="min-price">Preço mínimo (R$)</label>
          <input id="min-price" type="number" min="0" step="0.01" value={minPrice} onChange={(event) => updateFilter('minPrice', event.target.value)} />
        </div>
        <div className="field">
          <label htmlFor="max-price">Preço máximo (R$)</label>
          <input id="max-price" type="number" min="0" step="0.01" value={maxPrice} onChange={(event) => updateFilter('maxPrice', event.target.value)} />
        </div>
        <div className="field">
          <label htmlFor="order-filter">Ordenar</label>
          <select id="order-filter" value={order} onChange={(event) => updateFilter('order', event.target.value)}>
            <option value="recent">Mais recentes</option>
            <option value="price-asc">Menor preço</option>
            <option value="price-desc">Maior preço</option>
          </select>
        </div>
      </div>

      <CatalogFeedback loading={loading} error={error} onRetry={refresh} />
      {!loading && !error && products.length === 0 && (
        <div className="empty-state">
          <h2>Novos achados em breve</h2>
          <p>Não há peças publicadas no momento. Volte para conferir as novidades.</p>
        </div>
      )}
      {!loading && !error && products.length > 0 && (
        <>
          <p className="muted" aria-live="polite">{filteredProducts.length} {filteredProducts.length === 1 ? 'peça encontrada' : 'peças encontradas'}</p>
          {filteredProducts.length
            ? <div className="product-grid">{filteredProducts.map((product) => <ProductCard key={product.id} product={product} />)}</div>
            : <div className="empty-state"><h2>Nenhuma peça encontrada</h2><p>Experimente remover algum filtro ou buscar por outro termo.</p></div>}
        </>
      )}
    </main>
  );
}
