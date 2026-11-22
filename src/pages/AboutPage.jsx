import PageMeta from '../components/PageMeta.jsx';

export default function AboutPage() {
  return (
    <main className="container page">
      <PageMeta
        title="Sobre o Ammi Maju"
        description="Conheça a proposta do Ammi Maju: garimpos de moda de segunda mão com informação clara e preços acessíveis."
      />
      <article className="about-copy">
        <p className="eyebrow">Nossa história</p>
        <h1>Moda boa merece novas histórias.</h1>
        <p>
          O Ammi Maju é um brechó online para quem gosta de encontrar peças
          especiais sem deixar o orçamento de lado. A curadoria reúne opções
          femininas, masculinas e infantis, sempre com informações claras para
          você escolher com tranquilidade.
        </p>
        <p>
          Cada roupa pode seguir um caminho diferente. Por isso, mostramos o
          tamanho, a condição e os detalhes da peça, para que você saiba o que
          está levando antes de fechar o pedido.
        </p>
        <p>
          Acreditamos em dar espaço para roupas que ainda podem ser usadas e
          apreciadas. O nosso compromisso é oferecer um garimpo acessível,
          transparente e feito com carinho.
        </p>
      </article>
    </main>
  );
}
