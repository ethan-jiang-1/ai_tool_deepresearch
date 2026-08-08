// Pure Markdown semantic-section parsing shared by direct-output and reference checks.

export function normalizeMarkdownSemanticHeading(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/\s*\/\s*/g, ' / ')
    .replace(/\s+/g, ' ');
}

export function markdownSemanticSectionEntries(mdContent) {
  const content = String(mdContent || '');
  const matches = [...content.matchAll(/^[ \t]{0,3}(#{1,6})[ \t]+(.+?)[ \t]*#*[ \t]*$/gm)];
  const parsed = matches.map((match) => ({
    level: match[1].length,
    start: match.index,
    end: match.index + match[0].length,
    name: normalizeMarkdownSemanticHeading(match[2]),
  }));
  // A section body extends from its own heading until the next heading of the
  // SAME or HIGHER level (fewer or equal `#`). Lower-level descendant headings
  // (e.g. `###` under `##`) are part of the parent section body (WAI-011).
  return parsed.map((entry, index) => {
    let bodyEnd = content.length;
    for (let next = index + 1; next < parsed.length; next++) {
      if (parsed[next].level <= entry.level) {
        bodyEnd = parsed[next].start;
        break;
      }
    }
    return {
      name: entry.name,
      body: content.slice(entry.end, bodyEnd).trim(),
    };
  });
}

/** Parse Markdown sections by semantic heading, independent of level, case, spacing, or order. */
export function parseMarkdownSemanticSections(mdContent) {
  const sections = new Map();
  for (const entry of markdownSemanticSectionEntries(mdContent)) {
    if (!sections.has(entry.name) || !sections.get(entry.name)) {
      sections.set(entry.name, entry.body);
    }
  }
  return sections;
}

/** Extract a named Markdown section body. */
export function extractSection(mdContent, sectionName) {
  return parseMarkdownSemanticSections(mdContent).get(normalizeMarkdownSemanticHeading(sectionName)) || '';
}
