import { handleError, readJsonBody, requireMethod, sendJson } from '../../server/http.js';
import { quoteMelhorEnvio } from '../../server/providers.js';
import { releaseExpiredOrders, supabaseRequest } from '../../server/supabase.js';
import { normalizePostalCode, validateCartItems } from '../../server/validation.js';

export default async function shippingQuoteHandler(req, res) {
  if (!requireMethod(req, res, ['POST'])) return;
  try {
    const body = readJsonBody(req);
    const postalCode = normalizePostalCode(body.postalCode);
    const items = validateCartItems(body.items);
    await releaseExpiredOrders();
    const ids = `(${items.map((item) => item.id).join(',')})`;
    const products = await supabaseRequest(
      `products?id=in.${ids}&active=eq.true&select=id,name,price_cents,stock,weight_kg,length_cm,width_cm,height_cm`,
    );
    if (products.length !== items.length) {
      const error = new Error('Uma peça do carrinho não está mais disponível.');
      error.status = 409;
      throw error;
    }
    const shippingItems = items.map((item) => {
      const product = products.find((candidate) => candidate.id === item.id);
      if (!product || product.stock < item.quantity) {
        const error = new Error('O estoque mudou. Atualize o carrinho antes de continuar.');
        error.status = 409;
        throw error;
      }
      return { ...product, quantity: item.quantity };
    });
    const services = await quoteMelhorEnvio({ postalCode, items: shippingItems });
    sendJson(res, 200, { services });
  } catch (error) {
    handleError(res, error);
  }
}
