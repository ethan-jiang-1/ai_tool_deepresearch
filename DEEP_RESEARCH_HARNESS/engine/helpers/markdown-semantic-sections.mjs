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
  const matches = [...content.matchAll(/^[ \t]{0,3}#{1,6}[ \t]+(.+?)[ \t]*#*[ \t]*$/gm)];
  return matches.map((match, index) => ({
    name: normalizeMarkdownSemanticHeading(match[1]),
    body: content.slice(
      match.index + match[0].length,
      matches[index + 1]?.index ?? content.length,
    ).trim(),
  }));
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
