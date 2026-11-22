export function sendJson(res, status, payload) {
  res.status(status).setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.end(JSON.stringify(payload));
}

export function methodNotAllowed(res, allowed) {
  res.setHeader('Allow', allowed.join(', '));
  sendJson(res, 405, { error: 'Método não permitido.' });
}

export function handleError(res, error) {
  const status = Number.isInteger(error?.status) ? error.status : 500;
  if (status >= 500) {
    console.error('API error:', error?.message || 'Unknown error');
  }
  sendJson(res, status, {
    error: status === 503
      ? error.message
      : status >= 500
        ? 'Não foi possível concluir a solicitação.'
        : error.message,
  });
}

export function requireMethod(req, res, allowed) {
  if (!allowed.includes(req.method)) {
    methodNotAllowed(res, allowed);
    return false;
  }
  return true;
}

export function readJsonBody(req) {
  if (req.body && typeof req.body === 'object') return req.body;
  if (typeof req.body === 'string') {
    try {
      return JSON.parse(req.body);
    } catch {
      const error = new Error('O corpo da solicitação não contém JSON válido.');
      error.status = 400;
      throw error;
    }
  }

  const error = new Error('O corpo da solicitação está ausente.');
  error.status = 400;
  throw error;
}
