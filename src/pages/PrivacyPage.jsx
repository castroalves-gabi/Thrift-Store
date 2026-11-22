import { useEffect, useState } from 'react';
import PageMeta from '../components/PageMeta.jsx';
import { apiRequest } from '../lib/api.js';

export default function PrivacyPage({ page }) {
  const [content, setContent] = useState('');
  const [error, setError] = useState('');
  const key = page === 'privacy' ? 'privacy' : 'terms';
  const title = page === 'privacy' ? 'Privacidade' : 'Condições de compra';

  useEffect(() => {
    apiRequest('/api/storefront')
      .then((result) => setContent(result.settings.legal_pages?.[key] ?? ''))
      .catch((requestError) => setError(requestError.message));
  }, [key]);

  return (
    <main className="container page">
      <PageMeta title={title} description={`${title} da loja Ammi Maju.`} />
      <article className="about-copy">
        <p className="eyebrow">Informações da loja</p>
        <h1>{title}</h1>
        {error && <p className="error-message" role="alert">{error}</p>}
        {content
          ? <div className="policy-copy">{content.split(/\n{2,}/).map((paragraph, index) => <p key={index}>{paragraph}</p>)}</div>
          : <p className="notice">Esta informação está sendo preparada pela loja e será publicada antes da abertura do checkout.</p>}
      </article>
    </main>
  );
}
