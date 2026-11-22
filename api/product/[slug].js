import { handleError, requireMethod, sendJson } from '../../server/http.js';
import { withPublicImageUrls } from '../../server/catalog.js';
import { releaseExpiredOrders, supabaseRequest } from '../../server/supabase.js';

export default async function productHandler(req, res) {
  if (!requireMethod(req, res, ['GET'])) return;
  try {
    await releaseExpiredOrders();
    const slug = String(req.query.slug ?? '');
    const products = await supabaseRequest(
      `products?select=id,slug,name,description,brand,audience,category,size,measurements,condition,condition_details,price_cents,stock,images,weight_kg,length_cm,width_cm,height_cm&slug=eq.${encodeURIComponent(slug)}&active=eq.true&stock=gt.0&limit=1`,
    );
    if (!products?.length) {
      sendJson(res, 404, { error: 'Esta peça não está disponível.' });
      return;
    }
    sendJson(res, 200, { product: withPublicImageUrls(products[0]) });
  } catch (error) {
    handleError(res, error);
  }
}
