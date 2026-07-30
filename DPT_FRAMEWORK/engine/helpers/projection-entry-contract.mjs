// @impl CTS-004, RRM-004, RRM-007
//
// Pure projection-entry contract. Callers supply Markdown bytes and any
// reference-root facts; this module never reads a bundle or mutates one.

export const PROJECTION_ENTRY_FIELDS = Object.freeze([
  'evidence_meaning', 'relationship', 'refs', 'status', 'next_hop',
]);

export const EMPTY_PROJECTION_REFS_RE = /^\s*(?:none|n\/a|no materializable evidence|not materialized|no concrete reference|无|暂无|none yet)?\s*$/i;

const FIELD_PATTERNS = Object.fromEntries(
  PROJECTION_ENTRY_FIELDS.map((field) => [field, new RegExp(`^\\s*(?:[-*]\\s+)?(?:\\*\\*${field}\\*\\*|${field})\\s*:`, 'im')]),
);
const FIELD_LINE_RE = /^\s*(?:[-*]\s+)?(?:\*\*(evidence_meaning|relationship|refs|status|next_hop)\*\*|(evidence_meaning|relationship|refs|status|next_hop))\s*:\s*(.*)$/i;
const ENTRY_ID_LINE_RE = /^\s*(?:[-*]\s+)?(?:\*\*entry_id\*\*|entry_id)\s*:\s*(\S+)\s*$/i;
const BLOCK_ENTRY_ID_LINE_RE = /^(\s*)(?:-\s+)?(?:\*\*entry_id\*\*|entry_id)\s*:\s*(\S+)\s*$/i;
const BLOCK_EVIDENCE_LINE_RE = /^(\s*)(?:-\s+)?(?:\*\*evidence_meaning\*\*|evidence_meaning)\s*:/i;
const BUNDLE_REF_RE = /\b(?:reference|artifacts|_cache|_work_units|seed_topics)\/[^\s,;)\]）(（]+/gi;
const REF_COUNT_SUFFIX_RE = /(?:\([^)]+\)|（[^）]+）)/;
const LIMITATION_NEXT_HOP_RE = /\b(?:limitation|defer(?:red)?|hitl2|no materializable evidence|not materializable|record[-_ ]?only|requires[-_ ]?internal[-_ ]?data|blocked|not source[-_ ]?backed)\b/i;
const INLINE_ENTRY_MARKER_RE = /[^\r\n]-\s+(?:\*\*entry_id\*\*|entry_id)\s*:/i;

function contractError(reasonCode, message, extras = {}) {
  return Object.assign(new Error(message), { reason_code: reasonCode, ...extras });
}

function cleanRef(ref) {
  return String(ref || '')
    .trim()
    .replace(/^["'`]+|["'`]+$/g, '')
    .replace(/[.。,:;]+$/g, '');
}

function escapeRegex(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function refHasCountSummary(text, ref) {
  return new RegExp(`${escapeRegex(ref)}\\s*(?:\\([^)]+\\)|（[^）]+）)`, 'i').test(text);
}

function entryValue(entry, field) {
  const value = entry?.fields?.[field] ?? entry?.[field] ?? '';
  if (Array.isArray(value)) return value.join('\n');
  return String(value || '').trim();
}

function entryRefs(entry) {
  if (Array.isArray(entry?.refs)) return entry.refs.map(cleanRef).filter(Boolean);
  return entryValue(entry, 'refs').split(/\r?\n/).map(cleanRef).filter(Boolean);
}

function normalizedReferenceBasename(ref) {
  return String(ref || '')
    .replace(/^reference\//, '')
    .toLowerCase()
    .replace(/\d+/g, (digits) => String(Number.parseInt(digits, 10)));
}

export function projectionEntryFieldPresent(content, field) {
  return FIELD_PATTERNS[field]?.test(String(content || '')) || false;
}

export function projectionEntryFieldValue(entry, field) {
  return entryValue(entry, field).toLowerCase();
}

export function extractProjectionBundleRefs(text) {
  const refs = [];
  for (const match of String(text || '').matchAll(BUNDLE_REF_RE)) {
    const ref = cleanRef(match[0]);
    if (ref) refs.push(ref);
  }
  return [...new Set(refs)];
}

export function isSafeProjectionRef(ref) {
  return typeof ref === 'string'
    && ref.length > 0
    && !ref.startsWith('/')
    && !/^[A-Za-z]:[\\/]/.test(ref)
    && !ref.split(/[\\/]+/).includes('..');
}

export function isAcceptedDeferredProjectionEntry(entry) {
  const refs = entryRefs(entry);
  return projectionEntryFieldValue(entry, 'relationship').replace(/[`"'.,;]+$/g, '') === 'defers'
    && projectionEntryFieldValue(entry, 'status').replace(/[`"'.,;]+$/g, '') === 'deferred'
    && refs.length > 0
    && refs.every((ref) => EMPTY_PROJECTION_REFS_RE.test(ref))
    && LIMITATION_NEXT_HOP_RE.test(entryValue(entry, 'next_hop'));
}

export function isLimitationProjectionEntry(entry) {
  return isAcceptedDeferredProjectionEntry(entry);
}

export function isEvidenceBearingProjectionEntry(entry) {
  if (!entry || isAcceptedDeferredProjectionEntry(entry)) return false;
  const relationship = projectionEntryFieldValue(entry, 'relationship');
  const status = projectionEntryFieldValue(entry, 'status');
  const refs = entryRefs(entry);
  const hasRefs = refs.length > 0 || /\bhttps?:\/\//i.test(String(entry?.text || ''));
  return hasRefs
    || /\b(?:supports|refutes|partial|context)\b/.test(relationship)
    || /\b(?:supported|refuted|partial|emergent)\b/.test(status);
}

export function parseProjectionEntries(content) {
  const entries = [];
  let current = null;
  let activeField = null;
  let activeFieldIndent = -1;
  const lines = String(content || '').split(/\r?\n/);

  const pushCurrent = () => {
    if (!current) return;
    if (current.metadata?.entry_id && Object.keys(current.fields).length === 0) current.metadataIssues.push('dangling_entry_id');
    current.text = current.rawLines.join('\n');
    entries.push(current);
    current = null;
    activeField = null;
    activeFieldIndent = -1;
  };

  lines.forEach((line, index) => {
    const indent = line.match(/^\s*/)[0].length;
    const listMarker = line.match(/^(\s*)[-*]\s+/);
    const listIndent = listMarker ? listMarker[1].length : null;
    const match = line.match(FIELD_LINE_RE);
    if (match) {
      const field = (match[1] || match[2]).toLowerCase();
      const value = match[3].trim();
      const startsPeerItem = current && listIndent !== null && current.listIndent !== null && listIndent <= current.listIndent;
      if (startsPeerItem || (field === 'evidence_meaning' && current && Object.hasOwn(current.fields, 'evidence_meaning'))) pushCurrent();
      if (!current) current = { fields: {}, metadata: {}, metadataIds: [], metadataIssues: [], rawLines: [], startLine: index + 1, endLine: index + 1, listIndent };
      current.rawLines.push(line);
      current.endLine = index + 1;
      current.fields[field] = current.fields[field] ? `${current.fields[field]}\n${value}` : value;
      activeField = field;
      activeFieldIndent = indent;
      return;
    }

    const metadata = line.match(ENTRY_ID_LINE_RE);
    if (metadata) {
      const startsPeerItem = current && listIndent !== null && current.listIndent !== null && listIndent <= current.listIndent;
      if (startsPeerItem) pushCurrent();
      if (!current) current = { fields: {}, metadata: {}, metadataIds: [], metadataIssues: [], rawLines: [], startLine: index + 1, endLine: index + 1, listIndent };
      if (current.metadata.entry_id) current.metadataIssues.push('duplicate_entry_id');
      current.metadata.entry_id = metadata[1];
      current.metadataIds.push(metadata[1]);
      current.rawLines.push(line);
      current.endLine = index + 1;
      return;
    }

    if (!current) return;
    if (/^\s*##\s+/.test(line) || (/^\s*[-*]\s+/.test(line) && !/^\s{2,}[-*]\s+/.test(line) && activeField !== 'refs')) {
      pushCurrent();
      return;
    }
    if (activeField === 'refs' && /^\s*[-*]\s+/.test(line) && indent > activeFieldIndent) {
      current.rawLines.push(line);
      current.endLine = index + 1;
      const refValue = line.replace(/^\s*[-*]\s+/, '').trim();
      current.fields.refs = current.fields.refs ? `${current.fields.refs}\n${refValue}` : refValue;
      return;
    }
    if (line.trim() === '') return;
    pushCurrent();
  });

  pushCurrent();
  return entries;
}

export function renderProjectionEntry(entry) {
  return [
    `- **entry_id**: ${entry.entry_id}`,
    `  - **evidence_meaning**: ${entry.evidence_meaning}`,
    `  - **relationship**: ${entry.relationship}`,
    '  - **refs**:',
    ...entry.refs.map((ref) => `    - ${ref}`),
    `  - **status**: ${entry.status}`,
    `  - **next_hop**: ${entry.next_hop}`,
  ].join('\n');
}

export function extractProjectionEntryBlocks(content) {
  const source = String(content || '');
  const lines = source.split(/(?<=\n)/);
  const blocks = [];
  let offset = 0;
  let current = null;
  const finish = (endOffset) => {
    if (!current) return;
    blocks.push({ ...current, endOffset, text: source.slice(current.startOffset, endOffset) });
    current = null;
  };
  for (const raw of lines) {
    const line = raw.replace(/\r?\n$/, '');
    const entryId = line.match(BLOCK_ENTRY_ID_LINE_RE);
    const evidence = line.match(BLOCK_EVIDENCE_LINE_RE);
    const marker = entryId || evidence;
    if (marker) {
      const indent = marker[1].length;
      const listMarker = /^\s*-\s+/.test(line);
      const startsPeer = !current
        || (entryId && (listMarker ? indent <= current.indent : (indent <= current.indent && current.hasEvidence)))
        || (evidence && (listMarker ? indent <= current.indent : current.hasEvidence));
      if (startsPeer) {
        finish(offset);
        current = { startOffset: offset, indent, entryId: entryId?.[2] || null, hasEvidence: Boolean(evidence) };
      }
      if (entryId && current) current.entryId = entryId[2];
      if (evidence && current) current.hasEvidence = true;
    }
    offset += raw.length;
  }
  finish(source.length);
  return blocks;
}

function nonWhitespaceGaps(source, blocks) {
  const gaps = [];
  let cursor = 0;
  for (const block of blocks) {
    const gap = source.slice(cursor, block.startOffset);
    if (gap.trim()) gaps.push(gap);
    cursor = block.endOffset;
  }
  const tail = source.slice(cursor);
  if (tail.trim()) gaps.push(tail);
  return gaps;
}

export function parseProjectionEntryArea(content, { requiredFields = PROJECTION_ENTRY_FIELDS } = {}) {
  const source = String(content || '');
  const blocks = extractProjectionEntryBlocks(source);
  const issues = [];
  const entries = [];
  const gaps = nonWhitespaceGaps(source, blocks);
  if (gaps.length > 0) issues.push({ code: 'unparsed_content', count: gaps.length });
  for (const block of blocks) {
    if (INLINE_ENTRY_MARKER_RE.test(block.text)) issues.push({ code: 'inline_entry_marker', entry_id: block.entryId || null });
    const parsed = parseProjectionEntries(block.text);
    if (parsed.length !== 1) {
      issues.push({ code: 'entry_boundary_unparseable', entry_id: block.entryId || null, parsed_count: parsed.length });
      continue;
    }
    const entry = parsed[0];
    const missingFields = requiredFields.filter((field) => !Object.hasOwn(entry.fields, field) || !String(entry.fields[field]).trim());
    if (!entry.metadata.entry_id || entry.metadataIssues.length > 0 || missingFields.length > 0) {
      issues.push({
        code: 'entry_fields_invalid',
        entry_id: entry.metadata.entry_id || block.entryId || null,
        missing_fields: missingFields,
        metadata_issues: entry.metadataIssues,
      });
    }
    entries.push({ ...entry, block });
  }
  if (blocks.length === 0 && source.trim()) issues.push({ code: 'entry_boundary_unparseable', entry_id: null, parsed_count: 0 });
  return { passed: issues.length === 0, blocks, entries, issues };
}

function stripProjectionToken(entryArea, initialToken) {
  const source = String(entryArea || '');
  const occurrences = source.split(initialToken).length - 1;
  if (occurrences > 1) throw contractError('seed_projection_token_ambiguous', `Projection slot contains ${initialToken} more than once.`);
  return occurrences === 1 ? source.replace(initialToken, '') : source;
}

function blockTrailingSeparator(source, block) {
  let cursor = block.endOffset;
  while (cursor > block.startOffset && /\s/.test(source[cursor - 1])) cursor -= 1;
  return source.slice(cursor, block.endOffset);
}

export function upsertProjectionEntryArea(entryArea, { initialToken, entries }) {
  let updated = stripProjectionToken(entryArea, initialToken).trim();
  for (const entry of entries) {
    const blocks = extractProjectionEntryBlocks(updated);
    const matches = blocks.filter((block) => block.entryId === entry.entry_id);
    if (matches.length > 1) {
      throw contractError('seed_projection_duplicate_entry_id', `Projection slot has multiple existing entries with entry_id ${entry.entry_id}.`);
    }
    const rendered = renderProjectionEntry(entry);
    if (matches.length === 1) {
      const match = matches[0];
      const separator = blockTrailingSeparator(updated, match);
      updated = `${updated.slice(0, match.startOffset)}${rendered}${separator}${updated.slice(match.endOffset)}`;
    } else {
      updated = updated ? `${updated}\n\n${rendered}` : rendered;
    }
  }
  return updated.trim();
}

export function evaluateProjectionEntryNavigation(entry, {
  referencePaths = [],
  requireExisting = true,
  nearMatchLimit = 5,
} = {}) {
  const evidenceMeaning = entryValue(entry, 'evidence_meaning');
  if (/\bwave[012]\s+submitted\b/i.test(evidenceMeaning)) {
    return {
      passed: false,
      reason_code: 'projection_entry_generic_prose',
      message: 'Projection entry evidence_meaning cannot be generic WaveN submitted prose.',
      near_matches: [],
    };
  }

  const refs = entryRefs(entry);
  if (isAcceptedDeferredProjectionEntry(entry)) {
    return { passed: true, disposition: 'deferred', concrete_refs: [], near_matches: [] };
  }
  const emptyRefs = refs.length > 0 && refs.every((ref) => EMPTY_PROJECTION_REFS_RE.test(ref));
  if (emptyRefs) {
    return {
      passed: false,
      reason_code: 'projection_entry_deferred_limitation_missing',
      message: 'A Projection Entry with refs: none requires the accepted defers/deferred limitation disposition.',
      near_matches: [],
    };
  }

  const available = [...new Set(referencePaths)]
    .filter((ref) => /^reference\/[^/]+\.md$/.test(ref))
    .sort();
  const availableSet = new Set(available);
  const concreteRefs = [];
  const invalidRefs = [];
  const missingRefs = [];
  for (const ref of refs) {
    if (!isSafeProjectionRef(ref)) {
      invalidRefs.push({ ref, reason: 'unsafe_ref' });
      continue;
    }
    if (!ref.startsWith('reference/')) continue;
    if (ref.includes('*') || REF_COUNT_SUFFIX_RE.test(ref)) {
      invalidRefs.push({ ref, reason: 'glob_or_count_summary' });
      continue;
    }
    if (!/^reference\/[^/]+\.md$/.test(ref)) {
      invalidRefs.push({ ref, reason: 'not_concrete_reference_md' });
      continue;
    }
    if (requireExisting && !availableSet.has(ref)) {
      missingRefs.push(ref);
      continue;
    }
    concreteRefs.push(ref);
  }

  const nearMatches = [...new Set(missingRefs.flatMap((missing) => {
    const normalized = normalizedReferenceBasename(missing);
    return available.filter((candidate) => normalizedReferenceBasename(candidate) === normalized && candidate !== missing);
  }))].slice(0, nearMatchLimit);
  if (invalidRefs.length > 0) {
    const rejected = invalidRefs[0];
    return {
      passed: false,
      reason_code: 'projection_entry_ref_invalid',
      message: `Projection Entry ref is not a safe flat concrete reference/*.md path: ${rejected.ref}.`,
      invalid_refs: invalidRefs,
      concrete_refs: concreteRefs,
      near_matches: [],
    };
  }
  if (missingRefs.length > 0) {
    return {
      passed: false,
      reason_code: 'projection_entry_ref_missing',
      message: `Projection Entry concrete reference is unavailable: ${missingRefs[0]}.`,
      missing_refs: missingRefs,
      concrete_refs: concreteRefs,
      near_matches: nearMatches,
    };
  }
  if (concreteRefs.length === 0) {
    return {
      passed: false,
      reason_code: 'projection_entry_concrete_ref_missing',
      message: 'An evidence-bearing Projection Entry requires a concrete existing reference/*.md consumer ref or an explicit deferred disposition.',
      concrete_refs: [],
      near_matches: [],
    };
  }
  return { passed: true, disposition: 'concrete', concrete_refs: [...new Set(concreteRefs)], near_matches: [] };
}

export function extractConcreteProjectionReferences(content, {
  referencePaths = [],
  requireExisting = false,
} = {}) {
  const text = String(content || '');
  const refs = [];
  const rejectedRefs = [];
  const available = new Set(referencePaths);
  for (const ref of extractProjectionBundleRefs(text).filter((value) => value.startsWith('reference/'))) {
    if (ref.includes('*') || refHasCountSummary(text, ref)) {
      rejectedRefs.push({ ref, reason: 'glob_or_count_summary' });
    } else if (!isSafeProjectionRef(ref)) {
      rejectedRefs.push({ ref, reason: 'unsafe_ref' });
    } else if (!/^reference\/[^/]+\.md$/.test(ref)) {
      rejectedRefs.push({ ref, reason: 'not_concrete_reference_md' });
    } else if (requireExisting && !available.has(ref)) {
      rejectedRefs.push({ ref, reason: 'missing_reference_file' });
    } else {
      refs.push(ref);
    }
  }
  return { refs: [...new Set(refs)], rejectedRefs };
}
