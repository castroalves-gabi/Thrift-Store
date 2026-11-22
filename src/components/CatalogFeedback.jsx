export default function CatalogFeedback({ loading, error, onRetry }) {
  if (loading) return <p className="loading-state" role="status">Carregando as peças disponíveis…</p>;
  if (!error) return null;
  return (
    <div className="empty-state" role="alert">
      <h2>Não foi possível carregar o catálogo</h2>
      <p>{error}</p>
      <button className="button-secondary" type="button" onClick={onRetry}>Tentar novamente</button>
    </div>
  );
}
