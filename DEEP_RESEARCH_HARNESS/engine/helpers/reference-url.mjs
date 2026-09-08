// @impl REF-001, REF-008, REF-012, RWG-012
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

// @impl REF-012, EEX-001
// Single deterministic `source_url` multi-URL split authority: a `;` opens a
// new URL only when the text after it (optionally with whitespace) begins with
// an `http://` or `https://` URL prefix (case-insensitive, mirroring URL
// scheme parsing); a literal `;` inside a URL path is an opaque path
// character. Every reference `source_url` surface splits through this helper,
// so one URL cannot be parseable under one surface and unparseable under
// another.
export function splitSourceUrls(raw) {
  const value = String(raw || '');
  const segments = [];
  let start = 0;
  for (let index = 0; index < value.length; index++) {
    if (value[index] !== ';') continue;
    const rest = value.slice(index + 1).replace(/^\s+/, '');
    if (/^https?:\/\//i.test(rest)) {
      segments.push(value.slice(start, index));
      start = index + 1;
    }
  }
  segments.push(value.slice(start));
  return segments.map((segment) => segment.trim()).filter(Boolean);
}
