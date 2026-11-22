import { createHmac, timingSafeEqual } from 'node:crypto';

export function verifyMercadoPagoSignature({ signature, requestId, dataId, secret }) {
  if (!signature || !requestId || !dataId || !secret) return false;
  const values = Object.fromEntries(
    signature.split(',').map((part) => {
      const separator = part.indexOf('=');
      return separator < 0
        ? ['', '']
        : [part.slice(0, separator).trim(), part.slice(separator + 1).trim()];
    }),
  );
  if (!values.ts || !values.v1) return false;

  const manifest = `id:${dataId.toLowerCase()};request-id:${requestId};ts:${values.ts};`;
  const expected = createHmac('sha256', secret).update(manifest).digest();
  let actual;
  try {
    actual = Buffer.from(values.v1, 'hex');
  } catch {
    return false;
  }
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}
