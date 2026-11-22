import { useMemo, useState } from 'react';
import { products } from '../data/products.js';
import { useCart } from '../context/CartContext.jsx';

const currency = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
});

export default function StorePage() {
  const [search, setSearch] = useState('');
  const { addToCart } = useCart();
  const filteredProducts = useMemo(() => {
    const term = search.trim().toLocaleLowerCase('pt-BR');
    if (!term) return products;

    return products.filter((product) =>
      [product.nome, product.detalhes, product.tamanho, product.marca, product.condicao]
        .some((value) => value.toLocaleLowerCase('pt-BR').includes(term)),
    );
  }, [search]);

  return (
    <main className="store-page">
      <form className="store-search" onSubmit={(event) => event.preventDefault()}>
        <label className="visually-hidden" htmlFor="product-search">Buscar produtos</label>
        <input
          id="product-search"
          type="search"
          placeholder="Jaqueta jeans..."
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />
        <i className="bx bx-search" aria-hidden="true" />
      </form>

      <section id="produtos" aria-label="Produtos disponíveis">
        {filteredProducts.map((product) => (
          <article className="produto-single" key={product.id}>
            <img src={product.img} alt={product.nome} />
            <h2>{currency.format(product.valor)}</h2>
            <p>{product.nome}</p>
            <div className="detalhes">
              <span>{product.marca}</span>
              <span aria-hidden="true">•</span>
              <span>{product.condicao}</span>
              <span aria-hidden="true">•</span>
              <span>{product.tamanho}</span>
            </div>
            <button
              type="button"
              className="add-carrinho"
              aria-label={`Adicionar ${product.nome} ao carrinho`}
              onClick={() => addToCart(product.id)}
            >
              <i className="bx bx-cart-add" aria-hidden="true" />
            </button>
          </article>
        ))}
        {filteredProducts.length === 0 && (
          <p className="no-products">Nenhum produto encontrado.</p>
        )}
      </section>
    </main>
  );
}
