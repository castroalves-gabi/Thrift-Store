import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import PageMeta from '../components/PageMeta.jsx';
import { supabase } from '../lib/supabase.js';

export default function AdminLoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(event) {
    event.preventDefault();
    if (!supabase) {
      setError('Configure o projeto Supabase antes de entrar na administração.');
      return;
    }
    setBusy(true);
    setError('');
    const { error: loginError } = await supabase.auth.signInWithPassword({ email, password });
    setBusy(false);
    if (loginError) {
      setError('Não foi possível entrar. Confira os dados ou peça acesso à administração.');
      return;
    }
    navigate('/admin', { replace: true });
  }

  return (
    <main className="container page">
      <PageMeta title="Acesso administrativo" description="Área administrativa protegida do Ammi Maju." noIndex />
      <section className="form-section" style={{ maxWidth: 480, marginInline: 'auto' }}>
        <p className="eyebrow">Área restrita</p>
        <h1>Entrar na administração</h1>
        {!supabase && <p className="notice">O acesso ao Supabase ainda não foi configurado.</p>}
        {error && <p className="error-message" role="alert">{error}</p>}
        <form className="form-section" onSubmit={submit}>
          <div className="field"><label htmlFor="admin-email">E-mail</label><input id="admin-email" type="email" autoComplete="username" required value={email} onChange={(event) => setEmail(event.target.value)} /></div>
          <div className="field"><label htmlFor="admin-password">Senha</label><input id="admin-password" type="password" autoComplete="current-password" required value={password} onChange={(event) => setPassword(event.target.value)} /></div>
          <button className="button" type="submit" disabled={busy || !supabase}>{busy ? 'Entrando…' : 'Entrar'}</button>
        </form>
        <Link className="text-link" to="/">Voltar à loja</Link>
      </section>
    </main>
  );
}
