import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import PageMeta from '../components/PageMeta.jsx';
import { supabase } from '../lib/supabase.js';

function getLoginErrorMessage(error) {
  if (error?.code === 'invalid_credentials') return 'E-mail ou senha inválidos.';
  if (error?.code === 'email_not_confirmed') return 'Confirme seu e-mail antes de entrar.';
  if (error?.status === 429) return 'Muitas tentativas de login. Aguarde um pouco e tente novamente.';
  if (error?.name === 'AbortError' || error?.code === 'timeout') {
    return 'A tentativa de login demorou demais. Verifique sua conexão e tente novamente.';
  }
  if (
    error instanceof TypeError ||
    error?.code === 'network_error' ||
    error?.name === 'AuthRetryableFetchError' ||
    /fetch failed|network error/i.test(error?.message || '')
  ) {
    return 'Não foi possível estabelecer conexão com o servidor. Verifique sua internet e tente novamente.';
  }
  if (error?.status >= 500) {
    return 'O servidor de autenticação apresentou um erro. Tente novamente.';
  }
  return 'Não foi possível concluir a autenticação. Tente novamente ou peça acesso à administração.';
}

export default function AdminLoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState(
    location.state?.logoutSuccess ? 'Sessão encerrada com sucesso.' : '',
  );
  const [busy, setBusy] = useState(false);

  async function submit(event) {
    event.preventDefault();
    if (!supabase) {
      setError('Configure o projeto Supabase antes de entrar na administração.');
      return;
    }
    setBusy(true);
    setError('');
    setMessage('');
    try {
      const { data, error: loginError } = await supabase.auth.signInWithPassword({ email, password });
      if (loginError) throw loginError;
      if (!data.session) {
        throw new Error('O Supabase autenticou sem retornar uma sessão.');
      }

      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
      if (sessionError) throw sessionError;
      if (!sessionData.session) {
        throw new Error('A sessão não foi persistida pelo Supabase.');
      }

      setMessage('Login realizado com sucesso. Carregando painel administrativo...');
      navigate('/admin', { replace: true, state: { loginSuccess: true } });
    } catch (loginError) {
      console.error('Admin sign-in failed:', {
        name: loginError.name,
        code: loginError.code,
        status: loginError.status,
      });
      setError(getLoginErrorMessage(loginError));
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="container page">
      <PageMeta title="Acesso administrativo" description="Área administrativa protegida do Ammi Maju." noIndex />
      <section className="form-section" style={{ maxWidth: 480, marginInline: 'auto' }}>
        <p className="eyebrow">Área restrita</p>
        <h1>Entrar na administração</h1>
        {!supabase && <p className="notice">O acesso ao Supabase ainda não foi configurado.</p>}
        {error && <p className="error-message" role="alert">{error}</p>}
        {message && <p className="success-message" role="status">{message}</p>}
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
