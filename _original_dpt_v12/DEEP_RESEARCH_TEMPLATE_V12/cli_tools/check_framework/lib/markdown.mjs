export function cleanCell(value) {
  return String(value ?? "").trim().replace(/^`+|`+$/g, "").trim();
}

export function normalizedCell(value) {
  return cleanCell(value).toLowerCase().replace(/\s+/g, " ");
}

export function isPlaceholderCell(value) {
  const cleaned = cleanCell(value);
  return cleaned.startsWith("<") && cleaned.endsWith(">");
}

export function isBlankOrPlaceholder(value) {
  const cleaned = cleanCell(value);
  return !cleaned || isPlaceholderCell(cleaned);
}

export function splitTableRow(line) {
  return line.trim().replace(/^\|/, "").replace(/\|$/, "").split("|").map((cell) => cell.trim());
}

export function isSeparatorRow(cells) {
  return cells.length > 0 && cells.every((cell) => /^:?-{3,}:?$/.test(cell.trim()));
}

export function firstMarkdownTable(section) {
  return markdownTables(section)[0] ?? { headers: [], rows: [] };
}

export function markdownTables(section) {
  const tables = [];
  let current = [];
  for (const line of section.split(/\r?\n/)) {
    if (line.trim().startsWith("|")) {
      current.push(line);
    } else if (current.length > 0) {
      tables.push(current);
      current = [];
    }
  }
  if (current.length > 0) {
    tables.push(current);
  }

  return tables.map((lines) => {
    if (lines.length < 2) {
      return { headers: [], rows: [] };
    }
    const headers = splitTableRow(lines[0]);
    const rows = [];
    for (const line of lines.slice(1)) {
      const cells = splitTableRow(line);
      if (isSeparatorRow(cells)) {
        continue;
      }
      while (cells.length < headers.length) {
        cells.push("");
      }
      const row = {};
      headers.forEach((header, idx) => {
        row[header] = cells[idx] ?? "";
      });
      rows.push(row);
    }
    return { headers, rows };
  });
}

export function markdownSections(text) {
  const matches = [...text.matchAll(/^#{2,6}\s+(.+?)\s*$/gm)];
  const sections = {};
  for (let idx = 0; idx < matches.length; idx += 1) {
    const match = matches[idx];
    const start = match.index + match[0].length;
    const end = idx + 1 < matches.length ? matches[idx + 1].index : text.length;
    sections[match[1].trim()] = text.slice(start, end);
  }
  return sections;
}

export function hierarchicalSectionText(text, sectionName) {
  const escaped = sectionName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const heading = text.match(new RegExp(`^(#{2,6})\\s+${escaped}\\s*$`, "m"));
  if (!heading || heading.index === undefined) {
    return "";
  }
  const level = heading[1].length;
  const start = heading.index + heading[0].length;
  const rest = text.slice(start);
  const next = rest.match(new RegExp(`\\n#{2,${level}}\\s+.+$`, "m"));
  return next && next.index !== undefined ? rest.slice(0, next.index) : rest;
}

export function requiredColumnsMissing(headers, required) {
  const normalizedHeaders = new Set(headers.map((header) => normalizedCell(header)));
  return required.filter((column) => !normalizedHeaders.has(normalizedCell(column)));
}

export function parseBulletField(text, field) {
  const escaped = field.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = text.match(new RegExp(`^-\\s*\`?${escaped}\`?:\\s*\`?([^\`\\n]+)\`?\\s*$`, "m"));
  return match ? match[1].trim() : null;
}

export function hasPlaceholderResidue(text) {
  return /<[^>\n]+>/.test(text);
}

export function hasSkeletonResidue(text) {
  return /BEGIN [A-Z ]+ OUTPUT|END [A-Z ]+ OUTPUT|copy this skeleton|read the template/i.test(text);
}
