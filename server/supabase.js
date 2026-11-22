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
  const response = await fetch(`${url}/rest/v1/${path}`, {
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
  const text = await response.text();
  const payload = text ? JSON.parse(text) : null;

  if (!response.ok) {
    const error = new Error(payload?.message || 'A solicitação ao Supabase falhou.');
    error.status = response.status < 500 ? response.status : 502;
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
  const userResponse = await fetch(`${url}/auth/v1/user`, {
    headers: { apikey: anonKey, Authorization: `Bearer ${token}` },
  });
  if (!userResponse.ok) {
    const error = new Error('A sessão expirou. Entre novamente.');
    error.status = 401;
    throw error;
  }

  const user = await userResponse.json();
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
