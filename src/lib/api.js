import { supabase } from './supabase.js';

export class ApiError extends Error {
  constructor(message, { status = null, code = 'api_error', cause } = {}) {
    super(message, { cause });
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
  }
}

export function getApiErrorMessage(error) {
  if (error?.code === 'session_expired' || error?.status === 401) {
    return 'Sua sessão expirou. Entre novamente para continuar.';
  }
  if (error?.status === 403) {
    return 'Sua conta não possui autorização para acessar o painel administrativo.';
  }
  if (error?.code === 'timeout') {
    return 'A solicitação demorou demais para responder. Verifique sua conexão e tente novamente.';
  }
  if (error?.code === 'connection') {
    return 'Não foi possível estabelecer conexão com o servidor. Verifique sua internet e tente novamente.';
  }
  if (error?.code === 'invalid_response') {
    return 'O servidor respondeu em um formato inesperado. Verifique se as funções da API estão em execução e tente novamente.';
  }
  if (error?.code === 'session_error') {
    return 'Não foi possível validar sua sessão. Tente novamente.';
  }
  if (error?.status >= 500 || error?.status === 429) {
    return 'Não foi possível validar suas permissões porque o servidor apresentou um erro. Tente novamente.';
  }
  return error?.message || 'Não foi possível concluir a solicitação. Tente novamente.';
}

export async function apiRequest(path, options = {}) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 20000);
  let response;
  try {
    response = await fetch(path, {
      ...options,
      signal: options.signal || controller.signal,
      headers: {
        ...(options.body ? { 'Content-Type': 'application/json' } : {}),
        ...options.headers,
      },
    });
  } catch (error) {
    const timedOut = controller.signal.aborted;
    clearTimeout(timeout);
    console.error('API request failed:', { path, name: error.name, message: error.message });
    throw new ApiError(
      timedOut ? 'A solicitação expirou.' : 'Não foi possível conectar ao servidor.',
      { code: timedOut ? 'timeout' : 'connection', cause: error },
    );
  }

  const contentType = response.headers.get('content-type') || '';
  let text;
  try {
    text = await response.text();
  } catch (error) {
    const timedOut = controller.signal.aborted;
    clearTimeout(timeout);
    if (timedOut) {
      console.error('API response timed out:', { path, status: response.status, contentType });
      throw new ApiError('A solicitação expirou.', {
        status: response.status,
        code: 'timeout',
        cause: error,
      });
    }
    console.error('API response could not be read:', { path, status: response.status, contentType });
    throw new ApiError('Não foi possível ler a resposta do servidor.', {
      status: response.status,
      code: 'invalid_response',
      cause: error,
    });
  } finally {
    clearTimeout(timeout);
  }
  let payload = null;
  if (text.trim()) {
    try {
      payload = JSON.parse(text);
    } catch (error) {
      console.error('API returned a non-JSON response:', { path, status: response.status, contentType });
      throw new ApiError('O servidor retornou uma resposta que não está em formato JSON.', {
        status: response.status,
        code: 'invalid_response',
        cause: error,
      });
    }
  } else if (response.ok) {
    console.error('API returned an empty response:', { path, status: response.status, contentType });
    throw new ApiError('O servidor retornou uma resposta vazia.', {
      status: response.status,
      code: 'invalid_response',
    });
  }

  if (!response.ok) {
    console.error('API request returned an HTTP error:', {
      path,
      status: response.status,
      contentType,
    });
    throw new ApiError(
      typeof payload?.error === 'string' ? payload.error : 'Não foi possível concluir a solicitação.',
      { status: response.status, code: 'http_error' },
    );
  }
  return payload;
}

export async function adminRequest(path, options = {}) {
  if (!supabase) {
    throw new ApiError('Configure o acesso ao Supabase antes de usar a administração.', {
      code: 'configuration',
    });
  }
  const { data, error } = await supabase.auth.getSession();
  if (error) {
    console.error('Could not read the Supabase session:', { name: error.name, code: error.code });
    throw new ApiError('Não foi possível validar a sessão administrativa.', {
      code: 'session_error',
      cause: error,
    });
  }
  const token = data.session?.access_token;
  if (!token) {
    throw new ApiError('Entre novamente para continuar.', { status: 401, code: 'session_expired' });
  }

  return apiRequest(path, {
    ...options,
    headers: { ...options.headers, Authorization: `Bearer ${token}` },
  });
}
