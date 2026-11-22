import { useState } from 'react';
import { Link, NavLink } from 'react-router-dom';
import { useCart } from '../context/CartContext.jsx';
import { useFavorites } from '../context/FavoritesContext.jsx';

export default function Header() {
  const [menuOpen, setMenuOpen] = useState(false);
  const { itemCount, message } = useCart();
  const { ids: favoriteIds } = useFavorites();
  const menuClass = menuOpen ? 'nav-menu ativo' : 'nav-menu';

  function closeMenu() {
    setMenuOpen(false);
  }

  return (
    <header className="site-header">
      <nav className="navigation" aria-label="Navegação principal">
        <Link to="/" className="logo" onClick={closeMenu}>
          <span className="logo-mark" aria-hidden="true">A</span>
          <span>Ammi <strong>Maju</strong></span>
        </Link>
        <ul id="main-navigation" className={menuClass}>
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
            <NavLink to="/looks" onClick={closeMenu}>Looks</NavLink>
          </li>
          <li className="nav-item">
            <Link to="/favoritos" className="icon-link" onClick={closeMenu} aria-label={`Favoritos, ${favoriteIds.length} ${favoriteIds.length === 1 ? 'item' : 'itens'}`}>
              <i className="bx bx-heart" aria-hidden="true" />
              <span className="cart-count">{favoriteIds.length}</span>
            </Link>
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
          aria-controls="main-navigation"
          aria-expanded={menuOpen}
          onClick={() => setMenuOpen((isOpen) => !isOpen)}
        >
          <span className="bar" />
          <span className="bar" />
          <span className="bar" />
        </button>
      </nav>
      <span className="visually-hidden" role="status" aria-live="polite">{message}</span>
    </header>
  );
}
