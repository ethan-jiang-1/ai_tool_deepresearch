// @impl RTI-007
// Pure, presentation-tolerant parsing for rerun direction projections.

export const RERUN_DIRECTION_FIELDS = Object.freeze([
  'rerun_count',
  'action',
  'new_search_dimensions',
  'adjusted_depth',
  'search_guardrails',
  'rationale_excerpt',
]);

const REQUIRED_GUIDANCE_FIELDS = Object.freeze(RERUN_DIRECTION_FIELDS.slice(2));
const FIELD_LINE = /^\s*(?:[-*]\s+)?(?:\*\*(rerun_count|action|new_search_dimensions|adjusted_depth|search_guardrails|rationale_excerpt|[a-z][a-z0-9_]*)\*\*|([a-z][a-z0-9_]*))\s*:\s*(.*)$/i;
const RERUN_DIRECTION_HEADING = /^##[ \t]+本轮重跑方向[^\n]*$/gim;
const LEVEL_TWO_HEADING = /^##(?!#)[ \t]+[^\n]*$/gim;

function root(kind, { section = null, field = null, detail = null, observed = null } = {}) {
  return { kind, section, field, detail, observed };
}

function sectionEntries(content) {
  const headings = [...content.matchAll(RERUN_DIRECTION_HEADING)];
  const levelTwoHeadings = [...content.matchAll(LEVEL_TWO_HEADING)];
  return headings.map((match, index) => {
    const start = match.index;
    const headingEnd = start + match[0].length;
    const end = levelTwoHeadings.find((heading) => heading.index > start)?.index ?? content.length;
    const body = content.slice(headingEnd, end);
    const fields = {};
    const occurrences = [];
    const extensions = {};
    for (const [lineOffset, line] of body.split(/\r?\n/).entries()) {
      const parsed = line.match(FIELD_LINE);
      if (!parsed) continue;
      const field = (parsed[1] || parsed[2]).toLowerCase();
      const value = parsed[3].trim();
      const occurrence = { field, value, line: content.slice(0, headingEnd).split(/\r?\n/).length + lineOffset + 1 };
      occurrences.push(occurrence);
      if (Object.hasOwn(fields, field)) {
        fields[field] = Array.isArray(fields[field]) ? [...fields[field], value] : [fields[field], value];
      } else {
        fields[field] = value;
      }
      if (!RERUN_DIRECTION_FIELDS.includes(field)) extensions[field] = value;
    }
    return {
      index,
      heading: match[0],
      start_line: content.slice(0, start).split(/\r?\n/).length,
      fields,
      occurrences,
      extensions,
    };
  });
}

function integerCount(value) {
  if (Array.isArray(value) || !/^\d+$/.test(String(value || ''))) return null;
  const number = Number(value);
  return Number.isSafeInteger(number) && number >= 0 ? number : null;
}

function uniqueFields(section) {
  const duplicate = Object.entries(section.fields)
    .filter(([, value]) => Array.isArray(value))
    .map(([field]) => field);
  const fields = Object.fromEntries(Object.entries(section.fields).map(([field, value]) => [field, Array.isArray(value) ? value[0] : value]));
  return { fields, duplicate };
}

/**
 * Parse one seed's rerun direction without IO, persistence, routing, or
 * semantic scoring. Structural roots are intentionally separate from state so
 * a complete future candidate can be routed to the profile-count owner.
 */
export function evaluateRerunDirection(content, profileRerunCount) {
  const sections = sectionEntries(String(content || ''));
  if (sections.length === 0) {
    return {
      state: 'legacy_unbound', rerun_count: null, sections, selected_section: null,
      fields: {}, duplicate_fields: [], extensions: {}, structural_roots: [], has_direction: false,
    };
  }

  const candidates = sections.map((section) => {
    const { fields, duplicate } = uniqueFields(section);
    const hasCount = Object.hasOwn(fields, 'rerun_count');
    return { section, fields, duplicate, hasCount, count: hasCount ? integerCount(fields.rerun_count) : null };
  });
  const invalidCount = candidates.find((candidate) => candidate.hasCount && candidate.count === null);
  if (invalidCount) {
    return {
      state: 'invalid', rerun_count: null, sections, selected_section: invalidCount.section,
      fields: invalidCount.fields, duplicate_fields: invalidCount.duplicate, extensions: invalidCount.section.extensions,
      structural_roots: [root('invalid_field', { section: invalidCount.section.index, field: 'rerun_count', observed: invalidCount.fields.rerun_count })], has_direction: true,
    };
  }

  const bound = candidates.filter((candidate) => candidate.count !== null);
  if (bound.length === 0) {
    const first = candidates[0];
    return {
      state: 'legacy_unbound', rerun_count: null, sections, selected_section: first.section,
      fields: first.fields, duplicate_fields: first.duplicate, extensions: first.section.extensions,
      structural_roots: [], has_direction: true,
    };
  }

  const currentOrFuture = bound.filter((candidate) => candidate.count >= profileRerunCount);
  const selected = currentOrFuture[0] || bound.reduce((latest, candidate) => candidate.count > latest.count ? candidate : latest);
  const state = selected.count === profileRerunCount ? 'matching' : (selected.count < profileRerunCount ? 'stale' : 'future');
  const structuralRoots = [];
  const duplicateFields = [...selected.duplicate];

  if (currentOrFuture.length > 1) structuralRoots.push(root('duplicate_section', { section: selected.section.index, detail: 'multiple current/future direction sections' }));
  for (const field of duplicateFields) structuralRoots.push(root('duplicate_field', { section: selected.section.index, field }));

  if (state === 'matching' || state === 'future') {
    if (!['add', 'supplement'].includes(selected.fields.action)) {
      structuralRoots.push(root('invalid_field', { section: selected.section.index, field: 'action', observed: selected.fields.action ?? null }));
    }
    for (const field of REQUIRED_GUIDANCE_FIELDS) {
      if (!String(selected.fields[field] || '').trim()) structuralRoots.push(root('missing_field', { section: selected.section.index, field }));
    }
    if (state === 'future' && selected.count !== profileRerunCount + 1) {
      structuralRoots.push(root('invalid_field', { section: selected.section.index, field: 'rerun_count', observed: selected.count, detail: 'future direction must target exactly profile + 1' }));
    }
  }

  const reportedState = structuralRoots.some((item) => item.kind === 'duplicate_section' || item.kind === 'duplicate_field' || (item.kind === 'invalid_field' && item.field === 'action'))
    ? 'invalid'
    : state;

  return {
    state: reportedState,
    rerun_count: selected.count,
    sections,
    selected_section: selected.section,
    fields: selected.fields,
    duplicate_fields: duplicateFields,
    extensions: selected.section.extensions,
    structural_roots: structuralRoots,
    has_direction: true,
  };
}
