import { useState } from 'react';
import { Link, NavLink } from 'react-router-dom';
import { useCart } from '../context/CartContext.jsx';

export default function Header() {
  const [menuOpen, setMenuOpen] = useState(false);
  const { itemCount } = useCart();
  const menuClass = menuOpen ? 'nav-menu ativo' : 'nav-menu';

  function closeMenu() {
    setMenuOpen(false);
  }

  return (
    <header>
      <nav className="navigation" aria-label="Navegação principal">
        <Link to="/" className="logo" onClick={closeMenu}>
          A<span>mm</span>i M<span>aj</span>u
        </Link>
        <ul className={menuClass}>
          <li className="nav-item">
            <NavLink to="/" end onClick={closeMenu}>Home</NavLink>
          </li>
          <li className="nav-item">
            <NavLink to="/sobre" onClick={closeMenu}>Sobre</NavLink>
          </li>
          <li className="nav-item">
            <NavLink to="/contato" onClick={closeMenu}>Contato</NavLink>
          </li>
          <li className="nav-item">
            <NavLink to="/loja" onClick={closeMenu}>Loja</NavLink>
          </li>
          <li className="nav-item">
            <Link
              to="/carrinho"
              className="cart-link"
              onClick={closeMenu}
              aria-label={`Carrinho, ${itemCount} ${itemCount === 1 ? 'item' : 'itens'}`}
            >
              <i className="bx bx-cart" aria-hidden="true" />
              <span className="cart-count">{itemCount}</span>
            </Link>
          </li>
        </ul>
        <button
          className={`menu${menuOpen ? ' ativo' : ''}`}
          type="button"
          aria-label={menuOpen ? 'Fechar menu' : 'Abrir menu'}
          aria-expanded={menuOpen}
          onClick={() => setMenuOpen((isOpen) => !isOpen)}
        >
          <span className="bar" />
          <span className="bar" />
          <span className="bar" />
        </button>
      </nav>
    </header>
  );
}
