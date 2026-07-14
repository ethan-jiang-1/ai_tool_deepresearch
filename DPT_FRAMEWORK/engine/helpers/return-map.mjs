import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { basename, join, resolve as resolvePath } from 'node:path';

import { makeContractFinding } from './wave-contract-findings.mjs';

// @impl RRM-005

export const RETURN_MAP_FIELDS = ['evidence_meaning', 'relationship', 'refs', 'status', 'next_hop'];
export const RETURN_MAP_RELATIONSHIPS = ['supports', 'refutes', 'partial', 'opens', 'defers', 'context'];
export const RETURN_MAP_STATUS_LABELS = ['supported', 'refuted', 'partial', 'open', 'emergent', 'deferred'];

const FIELD_PATTERNS = Object.fromEntries(
  RETURN_MAP_FIELDS.map((field) => [field, new RegExp(`(?:\\*\\*${field}\\*\\*|${field})\\s*:`, 'i')]),
);
const FIELD_LINE_RE = /(?:\*\*(evidence_meaning|relationship|refs|status|next_hop)\*\*|(evidence_meaning|relationship|refs|status|next_hop))\s*:\s*(.*)$/i;
const BUNDLE_REF_RE = /\b(?:reference|artifacts|_cache|_work_units|seed_topics)\/[^\s,;)\]）(（]+/gi;
const REF_COUNT_SUFFIX_RE = /(?:\([^)]+\)|（[^）]+）)/;
const LIMITATION_NEXT_HOP_RE = /\b(?:limitation|defer(?:red)?|hitl2|no materializable evidence|not materializable|record[-_ ]?only|requires[-_ ]?internal[-_ ]?data|blocked|not source[-_ ]?backed)\b/i;
const EMPTY_REFS_RE = /^\s*(?:none|n\/a|no materializable evidence|not materialized|no concrete reference|无|暂无|none yet)?\s*$/i;

function readText(absPath) {
  if (!existsSync(absPath)) return null;
  return readFileSync(absPath, 'utf-8');
}

function hasBackfillToken(content) {
  return /__BACKFILL_[A-Z0-9_]+__/.test(content || '');
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
  const lines = String(content || '').split(/\r?\n/);

  const pushCurrent = () => {
    if (!current) return;
    current.text = current.rawLines.join('\n');
    entries.push(current);
    current = null;
    activeField = null;
  };

  lines.forEach((line, index) => {
    const match = line.match(FIELD_LINE_RE);
    if (match) {
      const field = (match[1] || match[2]).toLowerCase();
      const value = match[3].trim();
      if (field === 'evidence_meaning' && current && Object.hasOwn(current.fields, 'evidence_meaning')) {
        pushCurrent();
      }
      if (!current) {
        current = { fields: {}, rawLines: [], startLine: index + 1, endLine: index + 1 };
      }
      current.rawLines.push(line);
      current.endLine = index + 1;
      current.fields[field] = current.fields[field] ? `${current.fields[field]}\n${value}` : value;
      activeField = field;
      return;
    }

    if (!current) return;
    current.rawLines.push(line);
    current.endLine = index + 1;
    if (activeField === 'refs' && /^\s*[-*]\s+/.test(line)) {
      const refValue = line.replace(/^\s*[-*]\s+/, '').trim();
      current.fields.refs = current.fields.refs ? `${current.fields.refs}\n${refValue}` : refValue;
    }
  });

  pushCurrent();
  return entries;
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
      if (value && !RETURN_MAP_RELATIONSHIPS.some((allowed) => value.includes(allowed))) {
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
      if (value && !RETURN_MAP_STATUS_LABELS.some((allowed) => value.includes(allowed))) {
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

  if (requireWave1Refs && evidenceEntries.length > 0 && !/\b(?:artifacts\/wave1\/[^/\s]+\/(?:evidence-summary|question-list)\.md|reference\/[^)\s]+\.md|_cache\/|_work_units\/)/.test(text)) {
    const detail = `[return_map_missing_wave1_refs] ${relPath}: Wave1 backfill should point to evidence-summary.md, question-list.md, concrete reference/*.md, cache, or work-unit surfaces. Classification: blocking for this inspect command.`;
    inspect.push(detail);
    findings.push(returnMapFinding({
      ruleId: 'return_map_missing_wave1_refs',
      relPath,
      bundlePath,
      blockingBasis: 'binding_integrity',
      expected: 'Wave1 return-map content binds to concrete Wave1 artifact/reference/cache/work-unit surfaces.',
      observed: 'no accepted Wave1 refs',
      missingFact: `${relPath} has Wave1 return-map content without an accepted Wave1 evidence ref.`,
      detail,
      repair: `Add concrete Wave1 artifact/reference/cache/work-unit refs to ${relPath}.`,
    }));
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

export function inspectSeedTopicReturnMaps(bundlePath, {
  wave,
  topicSlugs = [],
} = {}) {
  const inspect = [];
  const advice = [];
  const findings = [];
  const seedDir = join(bundlePath, 'seed_topics');
  if (!existsSync(seedDir)) {
    return { passed: true, inspect, advice, findings, diagnosticOnly: true, classification: 'diagnostic-only' };
  }

  const files = topicSlugs.length > 0
    ? topicSlugs.map((slug) => `${slug}.md`)
    : readdirSync(seedDir).filter((file) => file.endsWith('.md'));

  for (const file of files) {
    const relPath = `seed_topics/${file}`;
    const content = readText(join(seedDir, file));
    if (content === null || hasBackfillToken(content)) continue;

    const validation = validateReturnMapContent(content, relPath, {
      requireFindingId: wave === 'wave2',
      requireWave1Refs: wave === 'wave1',
      requireWave2Refs: wave === 'wave2',
      requireConcreteReferenceNavigation: ['wave0', 'wave1', 'wave2'].includes(wave),
      bundlePath,
    });
    inspect.push(...validation.inspect);
    advice.push(...validation.advice);
    findings.push(...validation.findings);
  }

  return { passed: inspect.length === 0, inspect, advice, findings, diagnosticOnly: inspect.length === 0, classification: inspect.length === 0 ? 'diagnostic-only' : 'blocking' };
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
