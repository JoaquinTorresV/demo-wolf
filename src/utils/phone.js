// Normaliza un número a formato E.164 simple: dígitos con prefijo +.
// Wolf Control opera en España; si el número viene sin prefijo internacional
// asumimos España (+34).
export function normalizePhone(raw) {
  if (!raw) return null;
  const hadPlus = String(raw).trim().startsWith('+');
  let digits = String(raw).replace(/\D/g, '');
  if (!digits) return null;
  // Número español sin prefijo (9 dígitos) → anteponer 34.
  if (!hadPlus && digits.length === 9) {
    digits = '34' + digits;
  }
  return '+' + digits;
}
