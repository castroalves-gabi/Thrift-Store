const JSON_HEADERS = { 'Content-Type': 'application/json' };

export function getSupabaseConfig() {
  const url = process.env.SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const anonKey = process.env.SUPABASE_ANON_KEY;

  if (!url || !serviceKey || !anonKey) {
    const error = new Error('O backend Supabase não está configurado.');
    error.status = 503;
    throw error;
  }

  return { url: url.replace(/\/$/, ''), serviceKey, anonKey };
}

export async function supabaseRequest(path, { method = 'GET', body, prefer, headers = {} } = {}) {
  const { url, serviceKey } = getSupabaseConfig();
  let response;
  try {
    response = await fetch(`${url}/rest/v1/${path}`, {
      method,
      headers: {
        apikey: serviceKey,
        Authorization: `Bearer ${serviceKey}`,
        ...JSON_HEADERS,
        ...(prefer ? { Prefer: prefer } : {}),
        ...headers,
      },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    });
  } catch (cause) {
    const error = new Error('Não foi possível conectar ao banco de dados.');
    error.status = 503;
    error.cause = cause;
    throw error;
  }
  const text = await response.text();
  let payload;
  try {
    payload = text ? JSON.parse(text) : null;
  } catch (cause) {
    const error = new Error('O banco de dados retornou uma resposta inválida.');
    error.status = 502;
    error.cause = cause;
    throw error;
  }

  if (!response.ok) {
    const error = new Error(payload?.message || 'A solicitação ao Supabase falhou.');
    error.status = response.status === 429 ? 503 : response.status < 500 ? response.status : 502;
    throw error;
  }
  return payload;
}

export async function requireAdmin(req) {
  const authorization = req.headers.authorization || '';
  const token = authorization.match(/^Bearer (.+)$/i)?.[1];
  if (!token) {
    const error = new Error('É necessário entrar como administradora.');
    error.status = 401;
    throw error;
  }

  const { url, anonKey } = getSupabaseConfig();
  let userResponse;
  try {
    userResponse = await fetch(`${url}/auth/v1/user`, {
      headers: { apikey: anonKey, Authorization: `Bearer ${token}` },
    });
  } catch (cause) {
    const error = new Error('Não foi possível conectar ao serviço de autenticação do Supabase.');
    error.status = 503;
    error.cause = cause;
    throw error;
  }
  if (userResponse.status === 401) {
    const error = new Error('A sessão expirou. Entre novamente.');
    error.status = 401;
    throw error;
  }
  if (!userResponse.ok) {
    const error = new Error('Não foi possível validar a sessão no Supabase.');
    error.status = userResponse.status === 429 || userResponse.status >= 500 ? 503 : 502;
    throw error;
  }

  let user;
  try {
    user = await userResponse.json();
  } catch (cause) {
    const error = new Error('O serviço de autenticação retornou uma resposta inválida.');
    error.status = 502;
    error.cause = cause;
    throw error;
  }
  if (!user?.id) {
    const error = new Error('O serviço de autenticação retornou uma resposta inválida.');
    error.status = 502;
    throw error;
  }
  const profiles = await supabaseRequest(
    `profiles?id=eq.${encodeURIComponent(user.id)}&select=role&limit=1`,
  );
  if (profiles?.[0]?.role !== 'admin') {
    const error = new Error('Acesso restrito à administração.');
    error.status = 403;
    throw error;
  }
  return user;
}

export async function releaseExpiredOrders() {
  return supabaseRequest('rpc/release_expired_orders', { method: 'POST', body: {} });
}
