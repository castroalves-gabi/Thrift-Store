import { Link } from 'react-router-dom';

export default function HomePage() {
  return (
    <main>
      <section className="home">
        <div className="home-text">
          <h2 className="text-h4">Brechó Ammi Maju</h2>
          <h1 className="text-h1">Qualidade e preço baixo</h1>
          <p>Roupas estilosas e de qualidade para pessoas que se preocupam com o bem estar social.</p>
          <Link to="/loja" className="home-btn">Comprar</Link>
        </div>
        <div className="home-img">
          <img src="/img/home.png" alt="Seleção de roupas do Brechó Ammi Maju" />
        </div>
      </section>
    </main>
  );
}
