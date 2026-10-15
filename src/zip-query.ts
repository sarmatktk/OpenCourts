export const ZIP_FORMAT_ERROR = 'Enter a five-digit U.S. ZIP code or ZIP+4 (12345-6789).';

export function normalizeLocationQuery(value: string): { query: string; zip: string | null; zipOnly: boolean; error: string | null } {
  const query = value.trim();
  if (/^[\d\s-]+$/.test(query)) {
    const match = /^(\d{5})(?:\s*-\s*\d{4}|\d{4})?$/.exec(query);
    return match ? { query: match[1], zip: match[1], zipOnly: true, error: null }
      : { query, zip: null, zipOnly: false, error: ZIP_FORMAT_ERROR };
  }
  const suffix = /(?:^|[\s,])(\d{5})(?:-\d{4})?$/.exec(query);
  if (!suffix) return { query, zip: null, zipOnly: false, error: null };
  const zip = suffix[1];
  return { query: query.replace(/\d{5}(?:-\d{4})?$/, zip), zip, zipOnly: false, error: null };
}
