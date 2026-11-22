import { supabaseRequest } from '../server/supabase.js';

function escapeXml(value) {
  return String(value).replace(/[<>&'"]/g, (character) => ({
    '<': '&lt;', '>': '&gt;', '&': '&amp;', "'": '&apos;', '"': '&quot;',
  })[character]);
}

export default async function sitemapHandler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    res.status(405).end();
    return;
  }

  try {
    const appUrl = process.env.APP_URL;
    if (!appUrl) {
      res.status(503).end('Sitemap indisponível.');
      return;
    }
    const products = await supabaseRequest('products?select=slug&active=eq.true&stock=gt.0');
    const base = appUrl.replace(/\/$/, '');
    const routes = [
      '/', '/sobre', '/contato', '/loja', '/looks',
      ...products.map((product) => `/produto/${encodeURIComponent(product.slug)}`),
    ];
    const entries = routes.map((route) => (
      `<url><loc>${escapeXml(`${base}${route}`)}</loc></url>`
    )).join('');
    res.status(200);
    res.setHeader('Content-Type', 'application/xml; charset=utf-8');
    res.setHeader('Cache-Control', 'public, max-age=900');
    res.end(`<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${entries}</urlset>`);
  } catch (error) {
    console.error('Sitemap error:', error.message);
    res.status(503).end('Sitemap indisponível.');
  }
}
