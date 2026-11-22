import { handleError, requireMethod, sendJson } from '../server/http.js';
import { supabaseRequest } from '../server/supabase.js';

export default async function storefrontHandler(req, res) {
  if (!requireMethod(req, res, ['GET'])) return;
  try {
    const rows = await supabaseRequest(
      'site_settings?key=in.(pickup_address,local_delivery_note,legal_pages)&select=key,value',
    );
    sendJson(res, 200, { settings: Object.fromEntries(rows.map((row) => [row.key, row.value])) });
  } catch (error) {
    handleError(res, error);
  }
}
