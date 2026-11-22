export const currency = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
});

export function formatPrice(cents) {
  return currency.format(Number(cents) / 100);
}
