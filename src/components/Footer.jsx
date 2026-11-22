import { Link } from 'react-router-dom';
import { getPublicWhatsAppUrl } from '../lib/supabase.js';

export default function Footer() {
  return (
    <footer className="site-footer">
      <div className="container site-footer__inner">
        <div>
          <Link className="logo" to="/">Ammi <strong>Maju</strong></Link>
          <p>Garimpos com história, informação clara e preços acessíveis.</p>
        </div>
        <nav aria-label="Links do rodapé">
          <Link to="/loja">Loja</Link>
          <Link to="/sobre">Sobre</Link>
          <Link to="/contato">Contato</Link>
          <Link to="/privacidade">Privacidade</Link>
          <Link to="/termos">Condições de compra</Link>
        </nav>
        <a href={getPublicWhatsAppUrl('Olá! Gostaria de falar com o Ammi Maju.')} target="_blank" rel="noreferrer">
          <i className="bx bxl-whatsapp" aria-hidden="true" /> Fale com a gente
        </a>
        <small>© {new Date().getFullYear()} Ammi Maju</small>
      </div>
    </footer>
  );
}
