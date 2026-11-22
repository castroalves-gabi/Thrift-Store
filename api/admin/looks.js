import { handleError, readJsonBody, requireMethod, sendJson } from '../../server/http.js';
import { requireAdmin, supabaseRequest } from '../../server/supabase.js';
import { validationError } from '../../server/validation.js';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function validateLook(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    throw validationError('Os dados da vitrine são inválidos.');
  }
  if (input.active !== undefined && typeof input.active !== 'boolean') {
    throw validationError('O status da vitrine é inválido.');
  }
  if (input.product_ids !== undefined && !Array.isArray(input.product_ids)) {
    throw validationError('Selecione as peças da vitrine.');
  }

  const look = {
    id: input.id,
    slug: String(input.slug ?? '').trim().toLowerCase(),
    title: String(input.title ?? '').trim(),
    description: String(input.description ?? '').trim(),
    image_path: input.image_path ? String(input.image_path) : null,
    product_ids: input.product_ids ?? [],
    active: input.active === true,
  };
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(look.slug) || !look.title) {
    throw validationError('Informe título e um endereço válido para o look.');
  }
  if (look.product_ids.some((id) => !UUID.test(id))) {
    throw validationError('O look contém um produto inválido.');
  }
  if (new Set(look.product_ids).size !== look.product_ids.length) {
    throw validationError('Remova peças repetidas da vitrine.');
  }
  if (look.active && look.product_ids.length === 0) {
    throw validationError('Selecione ao menos uma peça disponível antes de publicar a vitrine.');
  }
  if (look.image_path && (!/^products\/[a-zA-Z0-9._/-]+$/.test(look.image_path) || look.image_path.includes('..'))) {
    throw validationError('A imagem precisa estar no armazenamento da loja.');
  }
  if (look.id && !UUID.test(look.id)) throw validationError('Look inválido.');
  return look;
}

export default async function adminLooksHandler(req, res) {
  try {
    await requireAdmin(req);
    if (!requireMethod(req, res, ['GET', 'POST', 'PATCH', 'DELETE'])) return;
    if (req.method === 'GET') {
      sendJson(res, 200, {
        looks: await supabaseRequest('looks?select=*&order=created_at.desc'),
      });
      return;
    }

    if (req.method === 'DELETE') {
      const id = String(req.query.id ?? '');
      if (!UUID.test(id)) throw validationError('Look inválido.');
      const rows = await supabaseRequest(`looks?id=eq.${id}`, {
        method: 'PATCH',
        body: { active: false },
        prefer: 'return=representation',
      });
      sendJson(res, rows.length ? 200 : 404, { look: rows[0] ?? null });
      return;
    }

    const body = readJsonBody(req);
    const look = validateLook(body.look ?? body);
    if (look.active) {
      const availableProducts = await supabaseRequest(
        `products?id=in.(${look.product_ids.join(',')})&active=eq.true&stock=gt.0&select=id`,
      );
      if (availableProducts.length !== look.product_ids.length) {
        throw validationError('Publique apenas vitrines com peças ativas e em estoque.');
      }
    }
    let rows;
    if (req.method === 'POST') {
      const { id, ...newLook } = look;
      rows = await supabaseRequest('looks', {
        method: 'POST',
        body: newLook,
        prefer: 'return=representation',
      });
    } else {
      if (!look.id) throw validationError('Look inválido.');
      const { id, ...changes } = look;
      rows = await supabaseRequest(`looks?id=eq.${id}`, {
        method: 'PATCH',
        body: changes,
        prefer: 'return=representation',
      });
    }
    sendJson(res, rows.length ? 200 : 404, { look: rows[0] ?? null });
  } catch (error) {
    handleError(res, error);
  }
}
