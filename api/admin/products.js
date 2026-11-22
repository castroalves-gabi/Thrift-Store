import { handleError, readJsonBody, requireMethod, sendJson } from '../../server/http.js';
import { requireAdmin, supabaseRequest } from '../../server/supabase.js';
import { validateProduct } from '../../server/validation.js';

const columns = 'id,slug,name,description,brand,audience,category,size,measurements,condition,condition_details,price_cents,stock,weight_kg,length_cm,width_cm,height_cm,images,active,created_at,updated_at';
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export default async function adminProductsHandler(req, res) {
  try {
    await requireAdmin(req);
    if (!requireMethod(req, res, ['GET', 'POST', 'PATCH', 'DELETE'])) return;

    if (req.method === 'GET') {
      const products = await supabaseRequest(`products?select=${columns}&order=created_at.desc`);
      sendJson(res, 200, { products });
      return;
    }

    if (req.method === 'DELETE') {
      const id = String(req.query.id ?? '');
      if (!UUID.test(id)) {
        const error = new Error('Produto inválido.');
        error.status = 400;
        throw error;
      }
      const updated = await supabaseRequest(`products?id=eq.${id}`, {
        method: 'PATCH',
        body: { active: false, stock: 0 },
        prefer: 'return=representation',
      });
      sendJson(res, updated.length ? 200 : 404, { product: updated[0] ?? null });
      return;
    }

    const body = readJsonBody(req);
    const product = validateProduct(body.product ?? body);
    let rows;
    if (req.method === 'POST') {
      rows = await supabaseRequest('products', {
        method: 'POST',
        body: product,
        prefer: 'return=representation',
      });
    } else {
      if (!UUID.test(String(product.id ?? ''))) {
        const error = new Error('Produto inválido.');
        error.status = 400;
        throw error;
      }
      const { id, ...changes } = product;
      rows = await supabaseRequest(`products?id=eq.${id}`, {
        method: 'PATCH',
        body: changes,
        prefer: 'return=representation',
      });
    }
    if (!rows.length) {
      sendJson(res, 404, { error: 'Produto não encontrado.' });
      return;
    }
    sendJson(res, req.method === 'POST' ? 201 : 200, { product: rows[0] });
  } catch (error) {
    handleError(res, error);
  }
}
