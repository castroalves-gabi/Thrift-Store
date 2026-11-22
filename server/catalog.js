export function withPublicImageUrls(product) {
  const baseUrl = process.env.SUPABASE_URL?.replace(/\/$/, '');
  if (!baseUrl) {
    const error = new Error('O armazenamento do catálogo ainda não está configurado.');
    error.status = 503;
    throw error;
  }
  return {
    ...product,
    images: (product.images ?? []).map((image) => ({
      url: `${baseUrl}/storage/v1/object/public/product-images/${image.path}`,
      alt: image.alt,
    })),
  };
}
