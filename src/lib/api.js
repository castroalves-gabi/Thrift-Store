import { supabase } from './supabase.js';

export async function apiRequest(path, options = {}) {
  const response = await fetch(path, {
    ...options,
    headers: {
      ...(options.body ? { 'Content-Type': 'application/json' } : {}),
      ...options.headers,
    },
  });
  let payload;
  try {
    payload = await response.json();
  } catch (error) {
    throw new Error('O servidor retornou uma resposta inválida.', { cause: error });
  }
  if (!response.ok) {
    const requestError = new Error(payload?.error || 'Não foi possível concluir a solicitação.');
    requestError.status = response.status;
    throw requestError;
  }
  return payload;
}

export async function adminRequest(path, options = {}) {
  if (!supabase) {
    throw new Error('Configure o acesso ao Supabase antes de usar a administração.');
  }
  const { data, error } = await supabase.auth.getSession();
  if (error) throw new Error('Não foi possível validar a sessão administrativa.', { cause: error });
  const token = data.session?.access_token;
  if (!token) throw new Error('Entre novamente para continuar.');

  return apiRequest(path, {
    ...options,
    headers: { ...options.headers, Authorization: `Bearer ${token}` },
  });
}
