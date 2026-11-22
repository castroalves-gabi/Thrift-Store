export function normalizePostalCode(value) {
  const postalCode = String(value ?? '').replace(/\D/g, '');
  if (postalCode.length !== 8) {
    const error = new Error('Informe um CEP válido com 8 dígitos.');
    error.status = 400;
    throw error;
  }
  return postalCode;
}

export function validateProduct(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    throw validationError('Os dados do produto são inválidos.');
  }
  if (input.active !== undefined && typeof input.active !== 'boolean') {
    throw validationError('O status de publicação do produto é inválido.');
  }
  if (input.images !== undefined && !Array.isArray(input.images)) {
    throw validationError('As imagens do produto são inválidas.');
  }

  const product = {
    id: input.id,
    slug: String(input.slug ?? '').trim().toLowerCase(),
    name: String(input.name ?? '').trim(),
    description: String(input.description ?? '').trim(),
    brand: String(input.brand ?? '').trim(),
    audience: String(input.audience ?? ''),
    category: String(input.category ?? '').trim(),
    size: String(input.size ?? '').trim(),
    measurements: String(input.measurements ?? '').trim(),
    condition: String(input.condition ?? ''),
    condition_details: String(input.condition_details ?? '').trim(),
    price_cents: Number(input.price_cents),
    stock: Number(input.stock),
    weight_kg: Number(input.weight_kg),
    length_cm: Number(input.length_cm),
    width_cm: Number(input.width_cm),
    height_cm: Number(input.height_cm),
    active: input.active ?? false,
    images: input.images ?? [],
  };

  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(product.slug)) {
    throw validationError('O endereço do produto deve usar letras minúsculas, números e hífens.');
  }
  if (!product.name || !product.category || !product.size) {
    throw validationError('Nome, categoria e tamanho são obrigatórios.');
  }
  if (!['feminino', 'masculino', 'infantil', 'unissex'].includes(product.audience)) {
    throw validationError('Selecione um público válido.');
  }
  if (!['novo', 'otimo', 'bom', 'marcas-de-uso'].includes(product.condition)) {
    throw validationError('Selecione uma condição válida.');
  }
  if (!Number.isInteger(product.price_cents) || product.price_cents <= 0) {
    throw validationError('O preço deve ser maior que zero e informado em centavos.');
  }
  if (!Number.isInteger(product.stock) || product.stock < 0) {
    throw validationError('O estoque deve ser um número inteiro igual ou maior que zero.');
  }
  if (product.active && product.stock === 0) {
    throw validationError('Uma peça sem estoque não pode ser publicada.');
  }
  if (
    !Number.isFinite(product.weight_kg) ||
    !Number.isFinite(product.length_cm) ||
    !Number.isFinite(product.width_cm) ||
    !Number.isFinite(product.height_cm) ||
    product.weight_kg <= 0 ||
    product.length_cm <= 0 ||
    product.width_cm <= 0 ||
    product.height_cm <= 0
  ) {
    throw validationError('Informe peso e dimensões reais para calcular o frete.');
  }
  if (
    !Array.isArray(product.images) ||
    product.images.some(
      (image) =>
        !image ||
        typeof image.path !== 'string' ||
        !/^products\/[a-zA-Z0-9._/-]+$/.test(image.path) ||
        image.path.includes('..') ||
        typeof image.alt !== 'string',
    )
  ) {
    throw validationError('As imagens precisam estar no armazenamento do catálogo.');
  }
  if (product.active && product.images.length === 0) {
    throw validationError('Adicione ao menos uma foto real antes de publicar a peça.');
  }
  return product;
}

export function validateCartItems(input) {
  if (!Array.isArray(input) || input.length === 0 || input.length > 50) {
    throw validationError('O carrinho está vazio ou contém itens demais.');
  }
  const combined = new Map();
  for (const item of input) {
    const id = String(item?.id ?? '');
    const quantity = Number(item?.quantity);
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id)) {
      throw validationError('O carrinho contém um produto inválido.');
    }
    if (!Number.isInteger(quantity) || quantity <= 0) {
      throw validationError('A quantidade solicitada é inválida.');
    }
    combined.set(id, (combined.get(id) ?? 0) + quantity);
  }
  return [...combined].map(([id, quantity]) => ({ id, quantity }));
}

export function validationError(message) {
  const error = new Error(message);
  error.status = 400;
  return error;
}
