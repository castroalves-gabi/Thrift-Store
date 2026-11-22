export default function ContactPage() {
  return (
    <main>
      <section className="contato">
        <div className="titulo">
          <h1>Como você prefere falar com a gente?</h1>
        </div>
        <div className="opcoes">
          <div className="email">
            <i className="bx bx-envelope" aria-hidden="true" />
            <h2 className="email-h2">E-mail</h2>
            <p>Não vamos demorar, promessa é dívida.</p>
            <a href="mailto:meuemail@gmail.com">meuemail@gmail.com</a>
          </div>
          <div className="whatsapp">
            <i className="bx bxl-whatsapp" aria-hidden="true" />
            <h2 className="whatsapp">Whatsapp</h2>
            <p>Somente mensagens. Sem ligações ou áudios, por gentileza.</p>
            <span>Link do WhatsApp em breve</span>
          </div>
          <div className="instagram">
            <i className="bx bxl-instagram" aria-hidden="true" />
            <h2 className="instagram-h2">Instagram</h2>
            <p>Aproveita pra seguir e acompanhar nossa seleção toda especial.</p>
            <span>Link do Instagram em breve</span>
          </div>
        </div>
      </section>
    </main>
  );
}
