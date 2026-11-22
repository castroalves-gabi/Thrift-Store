import { handleError, requireMethod, sendJson } from '../server/http.js';
import { withPublicImageUrls } from '../server/catalog.js';
import { supabaseRequest } from '../server/supabase.js';

export default async function looksHandler(req, res) {
  if (!requireMethod(req, res, ['GET'])) return;
  try {
    const looks = await supabaseRequest(
      'looks?select=id,slug,title,description,image_path,product_ids&active=eq.true&order=created_at.desc',
    );
    const productIds = [...new Set(looks.flatMap((look) => look.product_ids))];
    const products = productIds.length
      ? await supabaseRequest(`products?id=in.(${productIds.join(',')})&active=eq.true&stock=gt.0&select=id,slug,name,price_cents,images,stock`)
      : [];
    const productsById = new Map(products.map((product) => [product.id, product]));
    const publicBase = process.env.SUPABASE_URL?.replace(/\/$/, '');
    sendJson(res, 200, {
      looks: looks.map((look) => ({
        ...look,
        image_url: look.image_path
          ? `${publicBase}/storage/v1/object/public/product-images/${look.image_path}`
          : null,
        products: look.product_ids
          .map((id) => productsById.get(id))
          .filter(Boolean)
          .map(withPublicImageUrls),
      })).filter((look) => look.products.length > 0),
    });
  } catch (error) {
    handleError(res, error);
  }
}
