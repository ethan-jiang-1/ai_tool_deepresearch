// @impl REF-001, REF-008, RWG-012
// Shared HTTP(S) URL identity for submitted Wave1 backing and projections.

export function normalizeWave1ReferenceUrl(value) {
  try {
    const parsed = new URL(String(value || '').trim());
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return null;
    parsed.hash = '';
    return parsed.toString();
  } catch {
    return null;
  }
}
