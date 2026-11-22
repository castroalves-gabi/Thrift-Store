import { Link } from 'react-router-dom';
import { useCart } from '../context/CartContext.jsx';

const currency = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
});

export default function CartPage() {
  const { items, itemCount, total, changeQuantity, removeFromCart } = useCart();

  return (
    <main className="cart-page">
      <h1>Carrinho</h1>
      {items.length === 0 ? (
        <div className="empty-cart">
          <p>Seu carrinho está vazio.</p>
          <Link to="/loja" className="home-btn">Ver produtos</Link>
        </div>
      ) : (
        <>
          <div className="cart-items">
            {items.map((item) => (
              <article className="cart-item" key={item.id}>
                <img src={item.img} alt="" />
                <div className="cart-item-info">
                  <h2>{item.nome}</h2>
                  <p>{currency.format(item.valor)} cada</p>
                  <div className="quantity-controls" aria-label={`Quantidade de ${item.nome}`}>
                    <button
                      type="button"
                      aria-label={`Diminuir quantidade de ${item.nome}`}
                      onClick={() => changeQuantity(item.id, -1)}
                    >
                      −
                    </button>
                    <span>{item.quantidade}</span>
                    <button
                      type="button"
                      aria-label={`Aumentar quantidade de ${item.nome}`}
                      onClick={() => changeQuantity(item.id, 1)}
                    >
                      +
                    </button>
                  </div>
                </div>
                <strong>{currency.format(item.valor * item.quantidade)}</strong>
                <button
                  type="button"
                  className="remove-item"
                  onClick={() => removeFromCart(item.id)}
                  aria-label={`Remover ${item.nome} do carrinho`}
                >
                  Remover
                </button>
              </article>
            ))}
          </div>
          <div className="cart-summary">
            <p>Total ({itemCount} {itemCount === 1 ? 'item' : 'itens'})</p>
            <strong>{currency.format(total)}</strong>
          </div>
          <Link to="/loja" className="continue-shopping">Continuar comprando</Link>
        </>
      )}
    </main>
  );
}
