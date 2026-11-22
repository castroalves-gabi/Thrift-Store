import { useEffect, useState } from 'react';
import PageMeta from '../components/PageMeta.jsx';
import { apiRequest } from '../lib/api.js';
import { getPublicWhatsAppUrl } from '../lib/supabase.js';

export default function ContactPage() {
  const [settings, setSettings] = useState({});
  const [settingsError, setSettingsError] = useState('');
  useEffect(() => {
    apiRequest('/api/storefront')
      .then((result) => setSettings(result.settings))
      .catch((requestError) => setSettingsError(requestError.message));
  }, []);

  return (
    <main className="container page">
      <PageMeta
        title="Contato"
        description="Fale com a equipe do Ammi Maju pelo WhatsApp para tirar dúvidas sobre peças e pedidos."
      />
      <section className="contact-hero">
        <p className="eyebrow">Estamos por aqui</p>
        <h1>Vamos conversar?</h1>
        <p>Dúvidas sobre uma peça ou sobre seu pedido? Fale com a gente pelo WhatsApp.</p>
        <a
          className="button-secondary"
          href={getPublicWhatsAppUrl('Olá! Gostaria de falar com o Ammi Maju.')}
          target="_blank"
          rel="noreferrer"
        >
          <i className="bx bxl-whatsapp" aria-hidden="true" />
          Chamar no WhatsApp
        </a>
      </section>
      {settingsError && <p className="notice" role="status">As informações locais não estão disponíveis agora; confirme os detalhes pelo WhatsApp.</p>}
      <div className="contact-grid">
        <article className="contact-card">
          <i className="bx bx-package" aria-hidden="true" />
          <h2>Entrega em Porto Alegre</h2>
          <p>{settings.local_delivery_note?.text || 'Para entrega local, o pagamento das peças é feito primeiro; depois combinamos pelo WhatsApp a forma e o custo da entrega.'}</p>
        </article>
        <article className="contact-card">
          <i className="bx bx-map" aria-hidden="true" />
          <h2>Retirada</h2>
          <p>{settings.pickup_address?.address || 'Confirme o ponto de retirada com a equipe.'}</p>
          {settings.pickup_address?.hours && <p><strong>Horários:</strong> {settings.pickup_address.hours}</p>}
        </article>
      </div>
    </main>
  );
}
