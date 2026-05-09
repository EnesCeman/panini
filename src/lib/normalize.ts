// Letters that don't decompose via NFD into base + combining mark.
// These are mapped manually so search treats them like their ASCII cousin.
const SPECIAL: Record<string, string> = {
  'ı': 'i', 'İ': 'i', // ı, İ
  'ł': 'l', 'Ł': 'l', // ł, Ł
  'ø': 'o', 'Ø': 'o', // ø, Ø
  'đ': 'd', 'Đ': 'd', // đ, Đ
  'ð': 'd', 'Ð': 'd', // ð, Ð
  'þ': 'th', 'Þ': 'th', // þ, Þ
  'ß': 'ss', // ß
  'æ': 'ae', 'Æ': 'ae', // æ, Æ
  'œ': 'oe', 'Œ': 'oe', // œ, Œ
}

/**
 * Normalize a string for substring search. Lowercases, replaces special
 * letters with ASCII equivalents, strips combining diacritics, and
 * collapses punctuation/whitespace so users don't have to match dots or
 * hyphens exactly.
 *
 *   normalizeForSearch('João Cancelo')   -> 'joao cancelo'
 *   normalizeForSearch('St. Clair')      -> 'st clair'
 *   normalizeForSearch('Çağlar Söyüncü') -> 'caglar soyuncu'
 *   normalizeForSearch('Müller-Hofstein')-> 'muller hofstein'
 */
export function normalizeForSearch(s: string): string {
  let out = s.toLowerCase()
  for (const [from, to] of Object.entries(SPECIAL)) {
    if (out.includes(from)) out = out.split(from).join(to)
  }
  out = out.normalize('NFD').replace(/[̀-ͯ]/g, '')
  // collapse common punctuation so 'st clair' matches 'st. clair'
  out = out.replace(/[.\-'’]/g, ' ').replace(/\s+/g, ' ').trim()
  return out
}
