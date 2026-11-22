import { handleError, readJsonBody, requireMethod, sendJson } from '../../server/http.js';
import { requireAdmin, supabaseRequest } from '../../server/supabase.js';

const ALLOWED_KEYS = new Set(['pickup_address', 'local_delivery_note', 'legal_pages']);

export default async function adminSettingsHandler(req, res) {
  try {
    await requireAdmin(req);
    if (!requireMethod(req, res, ['GET', 'PUT'])) return;
    if (req.method === 'GET') {
      const rows = await supabaseRequest('site_settings?select=key,value');
      sendJson(res, 200, { settings: Object.fromEntries(rows.map((row) => [row.key, row.value])) });
      return;
    }

    const body = readJsonBody(req);
    if (!ALLOWED_KEYS.has(body.key) || !body.value || typeof body.value !== 'object') {
      const error = new Error('Configuração inválida.');
      error.status = 400;
      throw error;
    }
    const rows = await supabaseRequest('site_settings?on_conflict=key', {
      method: 'POST',
      body: { key: body.key, value: body.value },
      prefer: 'resolution=merge-duplicates,return=representation',
    });
    sendJson(res, 200, { setting: rows[0] });
  } catch (error) {
    handleError(res, error);
  }
}
