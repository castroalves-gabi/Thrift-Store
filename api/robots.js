export default function robotsHandler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    res.status(405).end();
    return;
  }
  const appUrl = process.env.APP_URL;
  if (!appUrl) {
    res.status(503).end('Robots indisponível.');
    return;
  }
  res.status(200);
  res.setHeader('Content-Type', 'text/plain; charset=utf-8');
  res.setHeader('Cache-Control', 'public, max-age=3600');
  res.end([
    'User-agent: *',
    'Allow: /',
    'Disallow: /admin',
    'Disallow: /checkout',
    'Disallow: /pedido/',
    'Disallow: /api/',
    `Sitemap: ${appUrl.replace(/\/$/, '')}/sitemap.xml`,
  ].join('\n'));
}
