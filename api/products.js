import { handleError, requireMethod, sendJson } from '../server/http.js';
import { withPublicImageUrls } from '../server/catalog.js';
import { releaseExpiredOrders, supabaseRequest } from '../server/supabase.js';

export default async function productsHandler(req, res) {
  if (!requireMethod(req, res, ['GET'])) return;
  try {
    await releaseExpiredOrders();
    const rows = await supabaseRequest(
      'products?select=id,slug,name,description,brand,audience,category,size,measurements,condition,condition_details,price_cents,stock,weight_kg,length_cm,width_cm,height_cm,images,created_at&active=eq.true&stock=gt.0&order=created_at.desc',
    );
    sendJson(res, 200, { products: rows.map(withPublicImageUrls) });
  } catch (error) {
    handleError(res, error);
  }
}
