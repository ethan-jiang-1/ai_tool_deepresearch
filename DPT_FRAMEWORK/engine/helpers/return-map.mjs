import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { basename, join, resolve as resolvePath } from 'node:path';

import { evaluateCanonicalSeedBindings } from './canonical-topic-state.mjs';
import { makeContractFinding } from './wave-contract-findings.mjs';
import { collectEligibleWorkUnitProjection, readProjectionProfileRound } from '../work-unit-projection.mjs';

// @impl RRM-005

export const RETURN_MAP_FIELDS = ['evidence_meaning', 'relationship', 'refs', 'status', 'next_hop'];
export const RETURN_MAP_RELATIONSHIPS = ['supports', 'refutes', 'partial', 'opens', 'defers', 'context'];
export const RETURN_MAP_STATUS_LABELS = ['supported', 'refuted', 'partial', 'open', 'emergent', 'deferred'];

const FIELD_PATTERNS = Object.fromEntries(
  RETURN_MAP_FIELDS.map((field) => [field, new RegExp(`^\\s*(?:[-*]\\s+)?(?:\\*\\*${field}\\*\\*|${field})\\s*:`, 'im')]),
);
const FIELD_LINE_RE = /^\s*(?:[-*]\s+)?(?:\*\*(evidence_meaning|relationship|refs|status|next_hop)\*\*|(evidence_meaning|relationship|refs|status|next_hop))\s*:\s*(.*)$/i;
const ENTRY_ID_LINE_RE = /^\s*(?:[-*]\s+)?(?:\*\*entry_id\*\*|entry_id)\s*:\s*(\S+)\s*$/i;
const BUNDLE_REF_RE = /\b(?:reference|artifacts|_cache|_work_units|seed_topics)\/[^\s,;)\]）(（]+/gi;
const REF_COUNT_SUFFIX_RE = /(?:\([^)]+\)|（[^）]+）)/;
const LIMITATION_NEXT_HOP_RE = /\b(?:limitation|defer(?:red)?|hitl2|no materializable evidence|not materializable|record[-_ ]?only|requires[-_ ]?internal[-_ ]?data|blocked|not source[-_ ]?backed)\b/i;
const EMPTY_REFS_RE = /^\s*(?:none|n\/a|no materializable evidence|not materialized|no concrete reference|无|暂无|none yet)?\s*$/i;

function readText(absPath) {
  if (!existsSync(absPath)) return null;
  return readFileSync(absPath, 'utf-8');
}

// @impl RRM-006
const WAVE_TOKEN_MAP = {
  wave0: ['__BACKFILL_WAVE0_EVIDENCE__'],
  wave1: ['__BACKFILL_WAVE1_MECHANISMS__', '__BACKFILL_WAVE1_TRENDS__', '__BACKFILL_PENDING_QUESTIONS__'],
  wave2: ['__BACKFILL_WAVE2_JUDGMENT__'],
};

function hasBackfillToken(content, wave = null) {
  if (!content) return false;
  if (wave && WAVE_TOKEN_MAP[wave]) {
    return WAVE_TOKEN_MAP[wave].some((token) => content.includes(token));
  }
  return /__BACKFILL_[A-Z0-9_]+__/.test(content);
}

function hasNakedEvidenceList(content) {
  const lines = String(content || '').split(/\r?\n/);
  const evidenceLines = lines.filter((line) =>
    /^\s*[-*]\s+(?:https?:\/\/|\[[^\]]+\]\([^)]+\)|reference\/|artifacts\/|_cache\/|_work_units\/)/i.test(line)
  ).length;
  return evidenceLines >= 2;
}

function hasUnsupportedProse(content) {
  const body = String(content || '').replace(/^---[\s\S]*?---\s*/m, '').trim();
  if (body.length < 80) return false;
  const hasAnyPath = /\b(?:reference|artifacts|_cache|_work_units|seed_topics)\//.test(body);
  const hasMapField = RETURN_MAP_FIELDS.some((field) => FIELD_PATTERNS[field].test(body));
  return !hasAnyPath && !hasMapField;
}

function cleanRef(ref) {
  return String(ref || '')
    .trim()
    .replace(/^["'`]+|["'`]+$/g, '')
    .replace(/[.。,:;]+$/g, '');
}

function isSafeBundleRelative(ref) {
  if (!ref || ref.startsWith('/') || /^[A-Za-z]:[\\/]/.test(ref)) return false;
  return !ref.split(/[\\/]+/).includes('..');
}

function extractBundleRefs(text) {
  const refs = [];
  for (const match of String(text || '').matchAll(BUNDLE_REF_RE)) {
    const ref = cleanRef(match[0]);
    if (ref) refs.push(ref);
  }
  return [...new Set(refs)];
}

function escapeRegex(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function refHasCountSummary(text, ref) {
  const pattern = new RegExp(`${escapeRegex(ref)}\\s*(?:\\([^)]+\\)|（[^）]+）)`, 'i');
  return pattern.test(text);
}

function returnMapFinding({
  ruleId,
  relPath,
  bundlePath = null,
  line = null,
  blockingBasis = 'required_structure',
  expected,
  observed,
  missingFact,
  detail,
  repair,
}) {
  const coordinate = bundlePath ? resolvePath(bundlePath, relPath) : relPath;
  const suffix = line ? `:${line}` : '';
  return makeContractFinding({
    id: `${ruleId}:${relPath}${suffix}`,
    ruleId,
    findingSource: 'checker',
    classification: 'blocking',
    blockingBasis,
    surface: line ? `${coordinate}#L${line}` : coordinate,
    expected,
    observed,
    missingFact,
    repairKind: 'agent_action',
    writeTo: line ? `${coordinate}#L${line}` : coordinate,
    repair,
    detail,
  });
}

export function extractReturnMapEntries(content) {
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
      if (startsPeerItem || (field === 'evidence_meaning' && current && Object.hasOwn(current.fields, 'evidence_meaning'))) {
        pushCurrent();
      }
      if (!current) {
        current = { fields: {}, metadata: {}, metadataIds: [], metadataIssues: [], rawLines: [], startLine: index + 1, endLine: index + 1, listIndent };
      }
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

const SEED_SECTION_FAMILIES = Object.freeze({
  wave0: ['本轮新增证据'],
  wave1: ['本轮新增机制理解', '本轮新增趋势与难点', '待验证问题'],
  wave2: ['当前判断', '待验证问题'],
});

function headingMatches(rawHeading, base) {
  const value = rawHeading.trim();
  if (value === base) return true;
  if (!value.startsWith(base)) return false;
  const suffix = value.slice(base.length);
  return /^(?:\s|\(|（|:|：|-|—)/.test(suffix);
}

// @impl RRM-007
export function extractSeedSectionFamily(content, wave) {
  const bases = SEED_SECTION_FAMILIES[wave] || [];
  const lines = String(content || '').split(/\r?\n/);
  const headings = [];
  lines.forEach((line, index) => {
    const match = line.match(/^\s*##\s+(.+?)\s*$/);
    if (match) headings.push({ index, title: match[1] });
  });
  const sections = [];
  headings.forEach((heading, index) => {
    const base = bases.find((candidate) => headingMatches(heading.title, candidate));
    if (!base) return;
    const end = headings[index + 1]?.index ?? lines.length;
    sections.push({
      heading: base,
      startLine: heading.index + 1,
      contentStartLine: heading.index + 2,
      endLine: end,
      content: lines.slice(heading.index + 1, end).join('\n'),
    });
  });
  return { usable: sections.length > 0, sections };
}

function fieldValue(entry, field) {
  return String(entry?.fields?.[field] || '').trim().toLowerCase();
}

export function isLimitationReturnMapEntry(entry) {
  const relationship = fieldValue(entry, 'relationship');
  const status = fieldValue(entry, 'status');
  const refs = fieldValue(entry, 'refs');
  const nextHop = fieldValue(entry, 'next_hop');
  const refsAreEmpty = EMPTY_REFS_RE.test(refs) || extractBundleRefs(entry?.text || '').length === 0;
  const relationshipLimits = /\b(?:opens|defers|context)\b/.test(relationship);
  const statusLimits = /\b(?:open|deferred)\b/.test(status);
  return refsAreEmpty && relationshipLimits && statusLimits && LIMITATION_NEXT_HOP_RE.test(nextHop);
}

export function isEvidenceBearingReturnMapEntry(entry) {
  if (!entry || isLimitationReturnMapEntry(entry)) return false;
  const relationship = fieldValue(entry, 'relationship');
  const status = fieldValue(entry, 'status');
  const hasRefs = extractBundleRefs(entry.text).length > 0 || /\bhttps?:\/\//i.test(entry.text);
  const relationshipClaimsEvidence = /\b(?:supports|refutes|partial|context)\b/.test(relationship);
  const statusClaimsEvidence = /\b(?:supported|refuted|partial|emergent)\b/.test(status);
  return hasRefs || relationshipClaimsEvidence || statusClaimsEvidence;
}

export function extractConcreteReferenceRefs(content, { bundlePath = null } = {}) {
  const refs = [];
  const rejectedRefs = [];
  const text = String(content || '');

  for (const ref of extractBundleRefs(text).filter((entry) => entry.startsWith('reference/'))) {
    if (ref.includes('*') || (REF_COUNT_SUFFIX_RE.test(text) && refHasCountSummary(text, ref))) {
      rejectedRefs.push({ ref, reason: 'glob_or_count_summary' });
      continue;
    }
    if (!isSafeBundleRelative(ref)) {
      rejectedRefs.push({ ref, reason: 'unsafe_ref' });
      continue;
    }
    if (!/^reference\/[^/]+\.md$/.test(ref)) {
      rejectedRefs.push({ ref, reason: 'not_concrete_reference_md' });
      continue;
    }
    if (bundlePath && !existsSync(join(bundlePath, ref))) {
      rejectedRefs.push({ ref, reason: 'missing_reference_file' });
      continue;
    }
    refs.push(ref);
  }

  return { refs: [...new Set(refs)], rejectedRefs };
}

function validateConcreteReferenceNavigation(entries, relPath, bundlePath) {
  const inspect = [];
  const advice = [];
  const findings = [];

  for (const entry of entries) {
    if (!isEvidenceBearingReturnMapEntry(entry)) continue;
    const concrete = extractConcreteReferenceRefs(entry.text, { bundlePath });
    const internalRefs = extractBundleRefs(entry.text).filter((ref) => /^(?:artifacts|_cache|_work_units)\//.test(ref));

    for (const rejected of concrete.rejectedRefs) {
      const reason = rejected.reason === 'glob_or_count_summary'
        ? 'refs must enumerate concrete reference/*.md files; glob/count summaries such as reference/topic-*.md (N files) are not navigable'
        : rejected.reason === 'missing_reference_file'
          ? 'referenced concrete reference file does not exist under the active bundle root'
          : rejected.reason === 'unsafe_ref'
            ? 'reference ref is unsafe or escapes the bundle'
            : 'reference ref is not a flat concrete reference/*.md file';
      const detail = `[return_map_concrete_reference] ${relPath}:${entry.startLine}: ${rejected.ref} invalid (${reason}). Classification: blocking. Repair target: replace refs with concrete existing bundle-relative reference/*.md entries or mark the entry as an explicit limitation/no-materializable-evidence state.`;
      inspect.push(detail);
      findings.push(returnMapFinding({
        ruleId: 'return_map_concrete_reference',
        relPath,
        bundlePath,
        line: entry.startLine,
        blockingBasis: 'binding_integrity',
        expected: 'Every evidence-bearing return-map ref names one safe, concrete, existing flat reference/*.md file.',
        observed: { ref: rejected.ref, reason: rejected.reason },
        missingFact: `${relPath}:${entry.startLine} contains invalid return-map reference '${rejected.ref}' (${rejected.reason}).`,
        detail,
        repair: `Replace the invalid ref in ${relPath} with a concrete existing reference/*.md path or record an explicit limitation.`,
      }));
    }

    if (concrete.refs.length === 0) {
      const detail = `[return_map_missing_concrete_reference] ${relPath}:${entry.startLine}: evidence-bearing return-map entry must include at least one concrete existing reference/*.md ref; ${internalRefs.length > 0 ? `found only internal provenance refs (${internalRefs.join(', ')})` : 'found no concrete reference refs'}. Classification: blocking. Repair target: add concrete reference/*.md refs, or rewrite this entry as a deterministic limitation/no-materializable-evidence entry.`;
      inspect.push(detail);
      findings.push(returnMapFinding({
        ruleId: 'return_map_missing_concrete_reference',
        relPath,
        bundlePath,
        line: entry.startLine,
        blockingBasis: 'binding_integrity',
        expected: 'Every evidence-bearing return-map entry includes at least one concrete existing reference/*.md consumer-navigation ref.',
        observed: { concrete_reference_refs: [], internal_refs: internalRefs },
        missingFact: `${relPath}:${entry.startLine} has an evidence-bearing return-map entry without a concrete existing reference/*.md ref.`,
        detail,
        repair: `Add a concrete existing reference/*.md ref in ${relPath}, or rewrite the entry as an explicit limitation.`,
      }));
    }
  }

  if (inspect.length > 0) {
    advice.push(`Repair return-map refs in ${relPath}: evidence-bearing entries need concrete existing reference/*.md consumer navigation; artifacts/, _cache/, and _work_units/ may supplement but cannot replace it.`);
  }

  return { inspect, advice, findings };
}

export function validateReturnMapContent(content, relPath, {
  requireFields = RETURN_MAP_FIELDS,
  requireFindingId = false,
  requireWave1Refs = false,
  requireWave2Refs = false,
  requireConcreteReferenceNavigation = false,
  bundlePath = null,
} = {}) {
  const inspect = [];
  const advice = [];
  const findings = [];
  const text = String(content || '');
  const missingFields = requireFields.filter((field) => !FIELD_PATTERNS[field].test(text));
  const entries = extractReturnMapEntries(text);
  const evidenceEntries = entries.filter(isEvidenceBearingReturnMapEntry);

  if (missingFields.length > 0) {
    const detail = `[return_map_missing_fields] ${relPath}: missing ${missingFields.join(', ')}. Classification: blocking for this inspect command when counted into check.passed=false; return maps still do not establish or revoke delegated gate coverage.`;
    inspect.push(detail);
    advice.push(`Add return-map entries to ${relPath} with evidence_meaning, relationship, refs, status, and next_hop. Keep refs bundle-relative and repair through normal work-unit/gate paths; do not bypass phase status or user-surface.`);
    findings.push(returnMapFinding({
      ruleId: 'return_map_missing_fields',
      relPath,
      bundlePath,
      expected: { required_fields: requireFields },
      observed: { missing_fields: missingFields },
      missingFact: `${relPath} is missing required return-map field(s): ${missingFields.join(', ')}.`,
      detail,
      repair: `Add return-map entries to ${relPath} with evidence_meaning, relationship, refs, status, and next_hop. Keep refs bundle-relative and repair through normal work-unit/gate paths; do not bypass phase status or user-surface.`,
    }));
  }

  for (const entry of entries) {
    if (entry.fields.relationship) {
      const value = fieldValue(entry, 'relationship').replace(/[`"'.,;]+$/g, '');
      if (value && !RETURN_MAP_RELATIONSHIPS.includes(value)) {
        const detail = `[return_map_relationship] ${relPath}:${entry.startLine}: relationship should use supports/refutes/partial/opens/defers/context, got "${value}".`;
        inspect.push(detail);
        findings.push(returnMapFinding({
          ruleId: 'return_map_relationship',
          relPath,
          bundlePath,
          line: entry.startLine,
          expected: { relationship: RETURN_MAP_RELATIONSHIPS },
          observed: value,
          missingFact: `${relPath}:${entry.startLine} uses unsupported return-map relationship '${value}'.`,
          detail,
          repair: `Replace the relationship at ${relPath}:${entry.startLine} with an accepted value.`,
        }));
      }
    }
    if (entry.fields.status) {
      const value = fieldValue(entry, 'status').replace(/[`"'.,;]+$/g, '');
      if (value && !RETURN_MAP_STATUS_LABELS.includes(value)) {
        const detail = `[return_map_status] ${relPath}:${entry.startLine}: status should use supported/refuted/partial/open/emergent/deferred, got "${value}".`;
        inspect.push(detail);
        findings.push(returnMapFinding({
          ruleId: 'return_map_status',
          relPath,
          bundlePath,
          line: entry.startLine,
          expected: { status: RETURN_MAP_STATUS_LABELS },
          observed: value,
          missingFact: `${relPath}:${entry.startLine} uses unsupported return-map status '${value}'.`,
          detail,
          repair: `Replace the status at ${relPath}:${entry.startLine} with an accepted value.`,
        }));
      }
    }
  }

  if (hasNakedEvidenceList(text) && missingFields.length > 0) {
    const detail = `[return_map_naked_evidence_list] ${relPath}: evidence paths/URLs appear without the minimum return-map fields.`;
    inspect.push(detail);
    findings.push(returnMapFinding({
      ruleId: 'return_map_naked_evidence_list',
      relPath,
      bundlePath,
      expected: 'Evidence paths and URLs are carried inside complete return-map entries.',
      observed: 'naked evidence list',
      missingFact: `${relPath} contains evidence paths or URLs outside the minimum return-map structure.`,
      detail,
      repair: `Wrap the evidence list in complete return-map entries in ${relPath}.`,
    }));
  }

  if (hasUnsupportedProse(text)) {
    const detail = `[return_map_unsupported_prose] ${relPath}: prose conclusion lacks bundle-relative refs and return-map fields.`;
    inspect.push(detail);
    findings.push(returnMapFinding({
      ruleId: 'return_map_unsupported_prose',
      relPath,
      bundlePath,
      expected: 'Evidence-bearing conclusions expose bundle-relative refs and complete return-map fields.',
      observed: 'unsupported prose-only conclusion',
      missingFact: `${relPath} contains an evidence-bearing prose conclusion without bundle-relative refs or return-map fields.`,
      detail,
      repair: `Add direct bundle refs and return-map fields to the conclusion in ${relPath}.`,
    }));
  }

  if (requireFindingId && evidenceEntries.length > 0 && !/\bW2F-\d{3,}\b/.test(text)) {
    const detail = `[return_map_missing_finding_id] ${relPath}: Wave2 backfill should preserve W2F-xxx finding ids. Classification: blocking for this inspect command.`;
    inspect.push(detail);
    advice.push(`Add W2F-xxx ids in ${relPath} and link them to artifacts/wave2/finding-index.yaml and artifacts/wave2/cross-topic-ledger.md.`);
    findings.push(returnMapFinding({
      ruleId: 'return_map_missing_finding_id',
      relPath,
      bundlePath,
      blockingBasis: 'binding_integrity',
      expected: 'Wave2 evidence-bearing return-map entries preserve a W2F-xxx finding id.',
      observed: 'no W2F-xxx id',
      missingFact: `${relPath} has Wave2 evidence-bearing return-map content without a W2F-xxx finding id.`,
      detail,
      repair: `Add the bound W2F-xxx finding id and Wave2 ledger/index refs to ${relPath}.`,
    }));
  }

  if (requireWave1Refs) {
    for (const entry of evidenceEntries.filter((candidate) => !/\bartifacts\/wave1\/[^/\s]+\/(?:evidence-summary|question-list)\.md\b/.test(candidate.text))) {
      const detail = `[return_map_missing_wave1_refs] ${relPath}:${entry.startLine}: each Wave1 evidence-bearing entry must point to evidence-summary.md or question-list.md. Classification: blocking for this inspect command.`;
      inspect.push(detail);
      findings.push(returnMapFinding({
        ruleId: 'return_map_missing_wave1_refs',
        relPath,
        bundlePath,
        line: entry.startLine,
        blockingBasis: 'binding_integrity',
        expected: 'Each Wave1 evidence-bearing return-map entry binds to its evidence-summary.md or question-list.md lineage artifact.',
        observed: 'no Wave1 evidence-summary/question-list lineage ref',
        missingFact: `${relPath}:${entry.startLine} has a Wave1 entry without evidence-summary.md or question-list.md lineage.`,
        detail,
        repair: `Add the exact Wave1 evidence-summary.md or question-list.md lineage ref at ${relPath}:${entry.startLine}.`,
      }));
    }
  }

  if (requireWave2Refs && evidenceEntries.length > 0 && !/\b(?:artifacts\/wave2\/(?:cross-topic-ledger\.md|finding-index\.yaml)|finding-index\.yaml|cross-topic-ledger\.md)/.test(text)) {
    const detail = `[return_map_missing_wave2_refs] ${relPath}: Wave2 backfill should link to cross-topic-ledger.md and finding-index.yaml. Classification: blocking for this inspect command.`;
    inspect.push(detail);
    findings.push(returnMapFinding({
      ruleId: 'return_map_missing_wave2_refs',
      relPath,
      bundlePath,
      blockingBasis: 'binding_integrity',
      expected: 'Wave2 return-map content binds to cross-topic-ledger.md and finding-index.yaml.',
      observed: 'missing Wave2 ledger/index refs',
      missingFact: `${relPath} has Wave2 return-map content without cross-topic-ledger.md and finding-index.yaml refs.`,
      detail,
      repair: `Add the concrete Wave2 ledger and finding-index refs to ${relPath}.`,
    }));
  }

  if (requireConcreteReferenceNavigation) {
    const navigation = validateConcreteReferenceNavigation(entries, relPath, bundlePath);
    inspect.push(...navigation.inspect);
    advice.push(...navigation.advice);
    findings.push(...navigation.findings);
  }

  return {
    passed: inspect.length === 0,
    inspect,
    advice,
    findings,
    missingFields,
    entries,
    diagnosticOnly: inspect.length === 0,
    classification: inspect.length === 0 ? 'diagnostic-only' : 'blocking',
  };
}

export function extractExactProjectionIdentities(entry) {
  const refWorkIds = new Set();
  const findingIds = new Set();
  for (const rawRef of String(entry?.fields?.refs || '').split(/\r?\n/)) {
    const ref = rawRef.trim().replace(/^['"`]|['"`]$/g, '').replace(/[.,;:]$/g, '');
    if (/^wu-w[0-9]+-b[0-9]{3}-[a-z][a-z0-9]{1,7}-i[0-9]{4}$/.test(ref)) refWorkIds.add(ref);
    if (/^W2F-[0-9]{3,}$/.test(ref)) findingIds.add(ref);
    for (const segment of ref.split(/[\\/]+/)) {
      if (/^wu-w[0-9]+-b[0-9]{3}-[a-z][a-z0-9]{1,7}-i[0-9]{4}$/.test(segment)) refWorkIds.add(segment);
      if (/^W2F-[0-9]{3,}$/.test(segment)) findingIds.add(segment);
    }
  }
  const metadata = entry?.metadataIssues?.length === 0 && entry?.fields?.evidence_meaning
    ? String(entry?.metadata?.entry_id || '').match(/^(wu-w[0-9]+-b[0-9]{3}-[a-z][a-z0-9]{1,7}-i[0-9]{4})\/[1-9][0-9]*$/)
    : null;
  const metadataWorkId = metadata?.[1] || null;
  const rawMetadataWorkIds = new Set((entry?.metadataIds || []).flatMap((value) => {
    const match = String(value).match(/^(wu-w[0-9]+-b[0-9]{3}-[a-z][a-z0-9]{1,7}-i[0-9]{4})\/[1-9][0-9]*$/);
    return match ? [match[1]] : [];
  }));
  return { workIds: new Set([...refWorkIds, ...(metadataWorkId ? [metadataWorkId] : [])]), refWorkIds, metadataWorkId, rawMetadataWorkIds, findingIds };
}

function metadataIdentityCanCoverRow(entry) {
  const refs = fieldValue(entry, 'refs');
  if (!EMPTY_REFS_RE.test(refs)) return true;
  const relationship = fieldValue(entry, 'relationship').replace(/[`"'.,;]+$/g, '');
  const status = fieldValue(entry, 'status').replace(/[`"'.,;]+$/g, '');
  const nextHop = fieldValue(entry, 'next_hop');
  return (relationship === 'defers' || status === 'deferred') && LIMITATION_NEXT_HOP_RE.test(nextHop);
}

export function extractSeedFamilyEntries(content, wave) {
  const family = extractSeedSectionFamily(content, wave);
  const entries = [];
  for (const section of family.sections) {
    for (const entry of extractReturnMapEntries(section.content)) {
      entry.startLine += section.contentStartLine - 1;
      entry.endLine += section.contentStartLine - 1;
      entry.section = section.heading;
      entry.sectionStartLine = section.startLine;
      const ids = extractExactProjectionIdentities(entry);
      if (section.heading === '待验证问题') {
        if (wave === 'wave1' && ids.findingIds.size > 0) continue;
        if (wave === 'wave2' && ids.findingIds.size === 0) continue;
      }
      entries.push(entry);
    }
  }
  return { ...family, entries };
}

function seedBindingFinding(bundlePath, binding) {
  const relPath = `seed_topics/${binding.slug}.md`;
  const surface = resolvePath(bundlePath, relPath);
  return makeContractFinding({
    id: `return_map_seed_binding:${binding.topic_uid}`,
    ruleId: 'return_map_seed_binding',
    findingSource: 'checker',
    classification: 'blocking',
    blockingBasis: 'binding_integrity',
    surface,
    expected: 'The plan-bound seed file exists and matches every canonical topic binding field.',
    observed: { reason_code: binding.reason_code, fact_refs: binding.fact_refs },
    missingFact: `${relPath} failed canonical seed binding: ${binding.reason_code}.`,
    repairKind: 'missing_contract',
    writeTo: `Canonical topic-state seed-binding boundary for ${binding.topic_uid}`,
    repair: `Run node DPT_FRAMEWORK/cli/operate-topic-state.mjs inspect --bundle ${resolvePath(bundlePath)} to diagnose canonical topic state; repair through its owning lifecycle path.`,
    detail: `[return_map_seed_binding] ${relPath}: ${binding.reason_code}`,
  });
}

function familyUnavailableFinding(bundlePath, relPath, wave, topicUid) {
  const surface = resolvePath(bundlePath, relPath);
  return makeContractFinding({
    id: `return_map_target_family_unavailable:${wave}:${topicUid}`,
    ruleId: 'return_map_target_family_unavailable',
    findingSource: 'checker',
    classification: 'blocking',
    blockingBasis: 'required_structure',
    surface,
    expected: { section_family: SEED_SECTION_FAMILIES[wave] },
    observed: { located_sections: [] },
    missingFact: `${relPath} has no usable ${wave} target section family for current projection demand.`,
    repairKind: 'agent_action',
    writeTo: surface,
    repair: `Add the demanded ${wave} return-map projection under one canonical target section in ${relPath}.`,
    detail: `[return_map_target_family_unavailable] ${relPath}: ${wave} current demand has no target section.`,
  });
}

function projectionOmissionFinding(bundlePath, relPath, wave, topicUid, identity, { legacy = false } = {}) {
  const ruleId = identity.startsWith('W2F-')
    ? (legacy ? 'return_map_legacy_finding_omission' : 'return_map_current_finding_omission')
    : 'return_map_current_row_omission';
  const classification = legacy ? 'advisory' : 'blocking';
  const surface = resolvePath(bundlePath, relPath);
  return makeContractFinding({
    id: `${ruleId}:${topicUid}:${identity}`,
    ruleId,
    findingSource: 'checker',
    classification,
    blockingBasis: legacy ? 'advisory' : 'binding_integrity',
    surface,
    expected: `${identity} is referenced or identity-bound in the ${wave} target section family.`,
    observed: { topic_uid: topicUid, identity, projected: false },
    missingFact: `${relPath} omits ${identity} from the ${wave} target section family.`,
    repairKind: 'agent_action',
    writeTo: surface,
    repair: `Add an exact identity-bound ${identity} projection or disposition to ${relPath}.`,
    detail: `[${ruleId}] ${relPath}: missing ${identity} for ${topicUid}.`,
  });
}

function projectionFieldFinding(bundlePath, indexRel, findingId, field, reason) {
  const surface = `${resolvePath(bundlePath, indexRel)}#findings/${findingId}/${field}`;
  return makeContractFinding({
    id: `return_map_finding_projection_field:${findingId}:${field}`,
    ruleId: 'return_map_finding_projection_field',
    findingSource: 'checker',
    classification: 'blocking',
    blockingBasis: 'binding_integrity',
    surface,
    expected: field === 'affected_topics' ? 'A non-empty array of exact canonical topic tokens with one owner each.' : 'An absent or non-negative current/prior rerun_count.',
    observed: reason,
    missingFact: `${findingId}.${field} cannot establish seed projection demand: ${reason}.`,
    repairKind: 'agent_action',
    writeTo: surface,
    repair: `Repair ${findingId}.${field} in ${indexRel}, then rerun Wave2 inspect.`,
    detail: `[return_map_finding_projection_field] ${findingId}.${field}: ${reason}`,
  });
}

function profileRoundAuthorityFinding(bundlePath, reason) {
  const surface = resolvePath(bundlePath, 'rb_profile.yaml');
  return makeContractFinding({
    id: 'return_map_profile_round_authority',
    ruleId: 'return_map_profile_round_authority',
    findingSource: 'checker',
    classification: 'blocking',
    blockingBasis: 'authority_integrity',
    surface,
    expected: 'A valid human_decision_checkpoints.hitl2 parent with absent or non-negative integer rerun_count.',
    observed: reason,
    missingFact: `Wave2 finding projection cannot establish the current round: ${reason}.`,
    repairKind: 'missing_contract',
    writeTo: 'Research profile authority recovery boundary',
    detail: `[return_map_profile_round_authority] rb_profile.yaml: ${reason}`,
  });
}

function resolveFindingTopicTokens(layouts, tokens) {
  const resolved = new Map();
  for (const token of tokens) {
    const candidates = new Map();
    const add = (layout) => {
      if (!layout) return;
      candidates.set(layout.topic_uid || `legacy:${layout.current.id}:${layout.current.slug}`, layout);
    };
    add(layouts.currentByUid.get(token));
    for (const layout of layouts.referenceByAnySlug.get(token) || []) add(layout);
    for (const layout of layouts.referenceByAnyId.get(token) || []) add(layout);
    if (candidates.size !== 1) return { ok: false, reason: candidates.size === 0 ? `unknown topic token '${token}'` : `ambiguous topic token '${token}'` };
    const [key, layout] = [...candidates.entries()][0];
    resolved.set(key, layout);
  }
  return { ok: true, layouts: [...resolved.values()] };
}

function wave2FindingDemands(bundlePath, topicRegistryFact, findingIndexFact) {
  const blockers = [];
  const current = new Map();
  const legacy = new Map();
  if (!findingIndexFact?.ok || !Array.isArray(findingIndexFact.data?.findings)) {
    return { parentUsable: false, blockers, current, legacy };
  }
  let round;
  try {
    round = readProjectionProfileRound(bundlePath);
  } catch (error) {
    blockers.push(profileRoundAuthorityFinding(bundlePath, error.message));
    return { parentUsable: false, blockers, current, legacy };
  }
  for (const finding of findingIndexFact.data.findings) {
    if (!/^W2F-[0-9]{3,}$/.test(finding?.id || '')) continue;
    if (!Array.isArray(finding.affected_topics) || finding.affected_topics.length === 0 || finding.affected_topics.some((token) => typeof token !== 'string' || !token.trim())) {
      blockers.push(projectionFieldFinding(bundlePath, findingIndexFact.relPath, finding.id, 'affected_topics', 'expected non-empty string-token array'));
      continue;
    }
    const topics = resolveFindingTopicTokens(topicRegistryFact.layouts, finding.affected_topics);
    if (!topics.ok) {
      blockers.push(projectionFieldFinding(bundlePath, findingIndexFact.relPath, finding.id, 'affected_topics', topics.reason));
      continue;
    }
    const markerPresent = Object.hasOwn(finding, 'created_in_rerun_count');
    if (markerPresent && (!Number.isInteger(finding.created_in_rerun_count) || finding.created_in_rerun_count < 0 || finding.created_in_rerun_count > round)) {
      blockers.push(projectionFieldFinding(bundlePath, findingIndexFact.relPath, finding.id, 'created_in_rerun_count', `invalid value ${JSON.stringify(finding.created_in_rerun_count)} for profile round ${round}`));
      continue;
    }
    const target = markerPresent && finding.created_in_rerun_count === round ? current : legacy;
    for (const layout of topics.layouts) {
      const rows = target.get(layout.topic_uid) || [];
      if (!rows.includes(finding.id)) rows.push(finding.id);
      target.set(layout.topic_uid, rows);
    }
  }
  return { parentUsable: true, blockers, current, legacy };
}

// @impl RRM-007, IOC-005
export function inspectSeedTopicReturnMaps(bundlePath, {
  wave,
  topicRegistryFact = null,
  findingIndexFact = null,
} = {}) {
  const inspect = [];
  const advice = [];
  const findings = [];
  if (!topicRegistryFact?.topic_registry || !topicRegistryFact?.layouts) {
    return { passed: true, inspect, advice, findings, diagnosticOnly: true, classification: 'diagnostic-only' };
  }

  const bindingByUid = new Map(evaluateCanonicalSeedBindings(bundlePath, { topic_registry: topicRegistryFact.topic_registry }).map((binding) => [binding.topic_uid, binding]));
  let eligible = { passed: true, rows: [], root_findings: [], warnings: [] };
  if (wave === 'wave0' || wave === 'wave1') {
    eligible = collectEligibleWorkUnitProjection(bundlePath, { phase: wave, topicRegistryFact });
    if (!eligible.passed) findings.push(...eligible.root_findings);
  }
  const findingDemands = wave === 'wave2'
    ? wave2FindingDemands(bundlePath, topicRegistryFact, findingIndexFact)
    : { parentUsable: true, blockers: [], current: new Map(), legacy: new Map() };
  findings.push(...findingDemands.blockers);

  for (const topic of topicRegistryFact.topic_registry) {
    const binding = bindingByUid.get(topic.topic_uid);
    if (!binding?.ok) {
      findings.push(seedBindingFinding(bundlePath, binding || { topic_uid: topic.topic_uid, slug: topic.slug, reason_code: 'binding_missing', fact_refs: [] }));
      continue;
    }
    const relPath = `seed_topics/${topic.slug}.md`;
    const content = readText(join(bundlePath, relPath));
    if (content === null || hasBackfillToken(content, wave)) continue;
    const family = extractSeedFamilyEntries(content, wave);
    const currentRows = eligible.passed ? eligible.rows.filter((row) => row.topic_uid === topic.topic_uid) : [];
    const currentFindingIds = findingDemands.current.get(topic.topic_uid) || [];
    const legacyFindingIds = findingDemands.legacy.get(topic.topic_uid) || [];
    const hasCurrentDemand = currentRows.length > 0 || currentFindingIds.length > 0;

    if (!family.usable) {
      if (hasCurrentDemand && eligible.passed && findingDemands.parentUsable) findings.push(familyUnavailableFinding(bundlePath, relPath, wave, topic.topic_uid));
      if (!hasCurrentDemand) {
        for (const findingId of legacyFindingIds) findings.push(projectionOmissionFinding(bundlePath, relPath, wave, topic.topic_uid, findingId, { legacy: true }));
      }
      continue;
    }

    const entries = family.entries;
    for (const section of family.sections.filter((candidate) => candidate.content.trim())) {
      if (wave === 'wave2' && section.heading === '待验证问题') continue;
      if (!entries.some((entry) => entry.sectionStartLine === section.startLine)) {
        const local = validateReturnMapContent(section.content, relPath, {
          requireConcreteReferenceNavigation: true,
          bundlePath,
        });
        findings.push(...local.findings);
      }
    }
    const validWorkIds = new Set();
    const validFindingIds = new Set();
    const invalidWorkIds = new Set();
    const invalidFindingIds = new Set();
    for (const entry of entries) {
      const validation = validateReturnMapContent(entry.text, relPath, {
        requireWave1Refs: wave === 'wave1',
        requireConcreteReferenceNavigation: true,
        bundlePath,
      });
      if (entry.metadataIssues.length > 0 || (entry.metadata.entry_id && !/^(?:wu-w[0-9]+-b[0-9]{3}-[a-z][a-z0-9]{1,7}-i[0-9]{4})\/[1-9][0-9]*$/.test(entry.metadata.entry_id))) {
        const detail = `[return_map_entry_identity] ${relPath}:${entry.startLine}: invalid or duplicate entry_id metadata.`;
        validation.findings.push(returnMapFinding({
          ruleId: 'return_map_entry_identity', relPath, bundlePath, line: entry.startLine,
          blockingBasis: 'binding_integrity', expected: 'At most one entry-local <work_id>/<positive integer> entry_id.',
          observed: { entry_id: entry.metadata.entry_id || null, issues: entry.metadataIssues },
          missingFact: `${relPath}:${entry.startLine} has invalid entry-local identity metadata.`, detail,
          repair: `Repair or remove the invalid entry_id at ${relPath}:${entry.startLine}.`,
        }));
        validation.passed = false;
      }
      for (const finding of validation.findings) {
        finding.surface = `${resolvePath(bundlePath, relPath)}#L${entry.startLine}`;
        finding.write_to = `${resolvePath(bundlePath, relPath)}#L${entry.startLine}`;
      }
      findings.push(...validation.findings);
      const identities = extractExactProjectionIdentities(entry);
      const targetWork = validation.passed ? validWorkIds : invalidWorkIds;
      const targetFindings = validation.passed ? validFindingIds : invalidFindingIds;
      identities.refWorkIds.forEach((id) => targetWork.add(id));
      if (identities.metadataWorkId && metadataIdentityCanCoverRow(entry)) targetWork.add(identities.metadataWorkId);
      if (!validation.passed) identities.rawMetadataWorkIds.forEach((id) => invalidWorkIds.add(id));
      identities.findingIds.forEach((id) => targetFindings.add(id));
    }
    if (wave === 'wave2' && entries.some(isEvidenceBearingReturnMapEntry)) {
      const familyValidation = validateReturnMapContent(entries.map((entry) => entry.text).join('\n'), relPath, { requireFields: [], requireWave2Refs: true, bundlePath });
      findings.push(...familyValidation.findings.filter((finding) => finding.rule_id === 'return_map_missing_wave2_refs'));
    }

    if (eligible.passed) {
      for (const row of currentRows) {
        if (!validWorkIds.has(row.work_id) && !invalidWorkIds.has(row.work_id)) {
          findings.push(projectionOmissionFinding(bundlePath, relPath, wave, topic.topic_uid, row.work_id));
        }
      }
    }
    if (findingDemands.parentUsable) {
      for (const findingId of currentFindingIds) {
        if (!validFindingIds.has(findingId) && !invalidFindingIds.has(findingId)) findings.push(projectionOmissionFinding(bundlePath, relPath, wave, topic.topic_uid, findingId));
      }
      for (const findingId of legacyFindingIds) {
        if (!validFindingIds.has(findingId) && !invalidFindingIds.has(findingId)) findings.push(projectionOmissionFinding(bundlePath, relPath, wave, topic.topic_uid, findingId, { legacy: true }));
      }
    }
  }

  const blocking = findings.filter((finding) => finding.classification === 'blocking');
  inspect.push(...blocking.map((finding) => finding.detail));
  advice.push(...findings.filter((finding) => finding.classification === 'advisory').map((finding) => finding.detail));
  return { passed: blocking.length === 0, inspect, advice, findings, diagnosticOnly: blocking.length === 0, classification: blocking.length === 0 ? 'diagnostic-only' : 'blocking' };
}

export function inspectWaveArtifactReturnMaps(bundlePath, wave, topicSlugs = []) {
  const inspect = [];
  const advice = [];
  const findings = [];

  if (wave === 'wave1') {
    for (const topic of topicSlugs) {
      for (const file of ['evidence-summary.md', 'question-list.md']) {
        const relPath = `artifacts/wave1/${topic}/${file}`;
        const content = readText(join(bundlePath, relPath));
        if (content === null) continue;
        const validation = validateReturnMapContent(content, relPath, { requireWave1Refs: true, bundlePath });
        inspect.push(...validation.inspect);
        advice.push(...validation.advice);
        findings.push(...validation.findings);
      }
    }
  }

  if (wave === 'wave2') {
    for (const file of ['cross-topic-ledger.md', 'synthesis.md']) {
      const relPath = `artifacts/wave2/${file}`;
      const content = readText(join(bundlePath, relPath));
      if (content === null) continue;
      const validation = validateReturnMapContent(content, relPath, {
        requireFindingId: true,
        requireWave2Refs: file === 'synthesis.md',
        bundlePath,
      });
      inspect.push(...validation.inspect);
      advice.push(...validation.advice);
      findings.push(...validation.findings);
    }
    const indexRel = 'artifacts/wave2/finding-index.yaml';
    const indexContent = readText(join(bundlePath, indexRel));
    if (indexContent !== null && !/\b(?:id|origin_refs|trigger_refs|synthesis_refs|handoff_refs)\s*:/.test(indexContent)) {
      const detail = `[return_map_missing_finding_lineage] ${indexRel}: finding index lacks id/origin_refs/trigger_refs lineage fields.`;
      inspect.push(detail);
      advice.push(`Add finding ids and lineage refs to ${indexRel}; this is diagnostic guidance and does not replace gate or handoff evidence.`);
      findings.push(returnMapFinding({
        ruleId: 'return_map_missing_finding_lineage',
        relPath: indexRel,
        bundlePath,
        blockingBasis: 'binding_integrity',
        expected: 'finding-index.yaml exposes finding ids and origin/trigger/synthesis/handoff refs.',
        observed: 'lineage fields absent',
        missingFact: `${indexRel} lacks finding id and lineage ref fields required by this inspect contract.`,
        detail,
        repair: `Add the missing finding lineage fields to ${indexRel}.`,
      }));
    }
  }

  return { passed: inspect.length === 0, inspect, advice, findings, diagnosticOnly: inspect.length === 0, classification: inspect.length === 0 ? 'diagnostic-only' : 'blocking' };
}

export function inspectReferenceReturnMaps(bundlePath, prefix = '') {
  const inspect = [];
  const advice = [];
  const findings = [];
  const refDir = join(bundlePath, 'reference');
  if (!existsSync(refDir)) return { passed: true, inspect, advice, findings, diagnosticOnly: true, classification: 'diagnostic-only' };

  for (const file of readdirSync(refDir).filter((entry) => entry.endsWith('.md'))) {
    if (file === '_INDEX.md' || file === 'README.md') continue;
    if (prefix && !file.startsWith(prefix)) continue;
    const relPath = `reference/${basename(file)}`;
    const content = readText(join(refDir, file));
    if (content === null) continue;
    const validation = validateReturnMapContent(content, relPath, { bundlePath });
    inspect.push(...validation.inspect);
    advice.push(...validation.advice);
    findings.push(...validation.findings);
  }

  return { passed: inspect.length === 0, inspect, advice, findings, diagnosticOnly: inspect.length === 0, classification: inspect.length === 0 ? 'diagnostic-only' : 'blocking' };
}
