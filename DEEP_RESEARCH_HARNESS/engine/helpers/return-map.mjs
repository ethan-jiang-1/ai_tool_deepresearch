// Navigation: public API — RETURN_MAP_FIELDS, RETURN_MAP_RELATIONSHIPS, RETURN_MAP_STATUS_LABELS, extractReturnMapEntries, extractSeedSectionFamily, isLimitationReturnMapEntry, isEvidenceBearingReturnMapEntry, extractConcreteReferenceRefs, validateReturnMapContent, extractExactProjectionIdentities, extractSeedFamilyEntries, evaluateSeedTopicProjectionReadiness, inspectSeedTopicReturnMaps
import { existsSync, lstatSync, readFileSync, readdirSync } from 'node:fs';
import { join, resolve as resolvePath } from 'node:path';

import {
  evaluateCanonicalSeedBindings,
  locateSeedProjectionSlots,
  projectionSlotsForWave,
  splitSeedProjectionCard,
} from './canonical-topic-state.mjs';
import { makeContractFinding } from './wave-contract-findings.mjs';
import {
  collectEligibleWorkUnitProjection,
  collectSubmittedWave0ContributionProjection,
  readProjectionProfileRound,
} from '../work-unit-projection.mjs';
import {
  EMPTY_PROJECTION_REFS_RE,
  PROJECTION_ENTRY_FIELDS,
  evaluateProjectionEntryNavigation,
  extractConcreteProjectionReferences,
  extractProjectionBundleRefs,
  isAcceptedDeferredProjectionEntry,
  isEvidenceBearingProjectionEntry,
  isLimitationProjectionEntry,
  parseProjectionEntries,
  projectionEntryFieldPresent,
} from './projection-entry-contract.mjs';

// @impl RRM-005, WTS-004, WTS-007

export const RETURN_MAP_FIELDS = PROJECTION_ENTRY_FIELDS;
export const RETURN_MAP_RELATIONSHIPS = ['supports', 'refutes', 'partial', 'opens', 'defers', 'context'];
export const RETURN_MAP_STATUS_LABELS = ['supported', 'refuted', 'partial', 'open', 'emergent', 'deferred'];

const EMPTY_REFS_RE = EMPTY_PROJECTION_REFS_RE;

function readText(absPath) {
  if (!existsSync(absPath)) return null;
  return readFileSync(absPath, 'utf-8');
}

function readReferenceNavigationFact(bundlePath) {
  if (!bundlePath) return { referencePaths: [], requireExisting: false };
  const root = join(bundlePath, 'reference');
  if (!existsSync(root) || lstatSync(root).isSymbolicLink() || !lstatSync(root).isDirectory()) {
    return { referencePaths: [], requireExisting: true };
  }
  const referencePaths = readdirSync(root).sort().flatMap((name) => {
    const target = join(root, name);
    if (!name.endsWith('.md') || lstatSync(target).isSymbolicLink() || !lstatSync(target).isFile()) return [];
    return [`reference/${name}`];
  });
  return { referencePaths, requireExisting: true };
}

// @impl RRM-006
const WAVE_TOKEN_MAP = Object.freeze(Object.fromEntries(['wave0', 'wave1', 'wave2'].map((wave) => [
  wave,
  projectionSlotsForWave(wave).map((slot) => slot.initialToken),
])));


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
  const hasMapField = RETURN_MAP_FIELDS.some((field) => projectionEntryFieldPresent(body, field));
  return !hasAnyPath && !hasMapField;
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
  return parseProjectionEntries(content);
}

const SEED_SECTION_FAMILIES = Object.freeze(Object.fromEntries(['wave0', 'wave1', 'wave2'].map((wave) => [
  wave,
  projectionSlotsForWave(wave).map((slot) => slot.canonicalHeading),
])));

// @impl RRM-007
export function extractSeedSectionFamily(content, wave) {
  const slots = projectionSlotsForWave(wave);
  const sections = locateSeedProjectionSlots(content, { slotIds: slots.map((slot) => slot.slotId) }).map((occurrence) => {
    const card = occurrence.headingKind === 'canonical' ? splitSeedProjectionCard(occurrence.content, occurrence.slot) : null;
    const lineCount = occurrence.content.split(/\r?\n/).length;
    return {
      slotId: occurrence.slotId,
      heading: occurrence.slotId,
      headingKind: occurrence.headingKind,
      headingBase: occurrence.headingBase,
      canonicalHeading: occurrence.slot.canonicalHeading,
      startLine: occurrence.startLine,
      contentStartLine: occurrence.contentStartLine,
      entryContentStartLine: occurrence.contentStartLine + (card ? card.prefix.split(/\r?\n/).length - 1 : 0),
      endLine: occurrence.contentStartLine + lineCount - 1,
      content: occurrence.content,
      entryContent: card ? card.entryArea : occurrence.content,
      cardPresent: Boolean(card),
    };
  });
  return { usable: sections.length > 0, sections };
}

function fieldValue(entry, field) {
  return String(entry?.fields?.[field] || '').trim().toLowerCase();
}

export function isLimitationReturnMapEntry(entry) {
  return isLimitationProjectionEntry(entry);
}

export function isEvidenceBearingReturnMapEntry(entry) {
  return isEvidenceBearingProjectionEntry(entry);
}

export function extractConcreteReferenceRefs(content, { bundlePath = null } = {}) {
  return extractConcreteProjectionReferences(content, readReferenceNavigationFact(bundlePath));
}

function validateConcreteReferenceNavigation(entries, relPath, bundlePath, referenceFact) {
  const inspect = [];
  const advice = [];
  const findings = [];

  for (const entry of entries) {
    if (RETURN_MAP_FIELDS.some((field) => !String(entry.fields?.[field] || '').trim())) continue;
    const navigation = evaluateProjectionEntryNavigation(entry, referenceFact);
    if (navigation.passed) continue;
    const internalRefs = extractProjectionBundleRefs(entry.text).filter((ref) => /^(?:artifacts|_cache|_work_units)\//.test(ref));
    const invalid = navigation.invalid_refs?.[0] || null;
    const missing = navigation.missing_refs?.[0] || null;
    const needsConcrete = navigation.reason_code === 'projection_entry_concrete_ref_missing'
      || navigation.reason_code === 'projection_entry_deferred_limitation_missing';
    const ruleId = needsConcrete ? 'return_map_missing_concrete_reference' : 'return_map_concrete_reference';
    const invalidReason = invalid?.reason === 'glob_or_count_summary'
      ? 'refs must enumerate concrete reference/*.md files; glob/count summaries such as reference/topic-*.md (N files) are not navigable'
      : invalid?.reason === 'unsafe_ref'
        ? 'reference ref is unsafe or escapes the bundle'
        : invalid
          ? 'reference ref is not a flat concrete reference/*.md file'
          : missing
            ? 'referenced concrete reference file does not exist under the current run bundle root'
            : navigation.message;
    const detail = needsConcrete
      ? `[${ruleId}] ${relPath}:${entry.startLine}: evidence-bearing return-map entry must include one concrete existing reference/*.md ref or an explicit defers/deferred limitation; ${internalRefs.length > 0 ? `found only internal provenance refs (${internalRefs.join(', ')})` : navigation.message}. Classification: blocking. Repair target: add concrete reference/*.md refs or record the accepted deferred disposition.`
      : `[${ruleId}] ${relPath}:${entry.startLine}: ${invalidReason}.${navigation.near_matches?.length ? ` Near matches: ${navigation.near_matches.join(', ')}.` : ''} Classification: blocking. Repair target: replace refs with concrete existing bundle-relative reference/*.md entries or record the accepted deferred disposition.`;
    inspect.push(detail);
    findings.push(returnMapFinding({
      ruleId,
      relPath,
      bundlePath,
      line: entry.startLine,
      blockingBasis: 'binding_integrity',
      expected: 'Every evidence-bearing return-map entry includes one safe, concrete, existing flat reference/*.md consumer-navigation ref or the accepted deferred disposition.',
      observed: {
        reason_code: navigation.reason_code,
        ref: invalid?.ref || missing || null,
        near_matches: navigation.near_matches || [],
        internal_refs: internalRefs,
      },
      missingFact: `${relPath}:${entry.startLine} has invalid return-map navigation: ${navigation.message}`,
      detail,
      repair: `Add a concrete existing reference/*.md ref in ${relPath}, or record the accepted defers/deferred limitation.`,
    }));
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
  referenceFact = null,
} = {}) {
  const inspect = [];
  const advice = [];
  const findings = [];
  const text = String(content || '');
  const missingFields = requireFields.filter((field) => !projectionEntryFieldPresent(text, field));
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
    const navigation = validateConcreteReferenceNavigation(entries, relPath, bundlePath, referenceFact || readReferenceNavigationFact(bundlePath));
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
  const refFindingIds = new Set();
  for (const rawRef of String(entry?.fields?.refs || '').split(/\r?\n/)) {
    const ref = rawRef.trim().replace(/^['"`]|['"`]$/g, '').replace(/[.,;:]$/g, '');
    if (/^wu-w[0-9]+-b[0-9]{3}-[a-z][a-z0-9]{1,7}-i[0-9]{4}$/.test(ref)) refWorkIds.add(ref);
    if (/^W2F-[0-9]{3,}$/.test(ref)) refFindingIds.add(ref);
    for (const segment of ref.split(/[\\/]+/)) {
      if (/^wu-w[0-9]+-b[0-9]{3}-[a-z][a-z0-9]{1,7}-i[0-9]{4}$/.test(segment)) refWorkIds.add(segment);
      if (/^W2F-[0-9]{3,}$/.test(segment)) refFindingIds.add(segment);
    }
  }
  const metadata = entry?.metadataIssues?.length === 0 && entry?.fields?.evidence_meaning
    ? String(entry?.metadata?.entry_id || '').match(/^(wu-w[0-9]+-b[0-9]{3}-[a-z][a-z0-9]{1,7}-i[0-9]{4})\/[1-9][0-9]*$/)
    : null;
  const metadataCandidateId = metadata?.[0] || null;
  const metadataWorkId = metadata?.[1] || null;
  const rawMetadataWorkIds = new Set((entry?.metadataIds || []).flatMap((value) => {
    const match = String(value).match(/^(wu-w[0-9]+-b[0-9]{3}-[a-z][a-z0-9]{1,7}-i[0-9]{4})\/[1-9][0-9]*$/);
    return match ? [match[1]] : [];
  }));
  const metadataFindingId = entry?.metadataIssues?.length === 0 && entry?.fields?.evidence_meaning
    ? String(entry?.metadata?.entry_id || '').match(/^W2F-[0-9]{3,}$/)?.[0] || null
    : null;
  const rawMetadataFindingIds = new Set((entry?.metadataIds || []).filter((value) => /^W2F-[0-9]{3,}$/.test(String(value))));
  return {
    workIds: new Set([...refWorkIds, ...(metadataWorkId ? [metadataWorkId] : [])]),
    refWorkIds,
    metadataCandidateId,
    metadataWorkId,
    rawMetadataWorkIds,
    findingIds: new Set([...refFindingIds, ...(metadataFindingId ? [metadataFindingId] : [])]),
    refFindingIds,
    metadataFindingId,
    rawMetadataFindingIds,
  };
}

function metadataIdentityCanCoverRow(entry) {
  const refs = fieldValue(entry, 'refs');
  if (!EMPTY_REFS_RE.test(refs)) return true;
  return isExplicitDeferredProjectionDisposition(entry);
}

function isExplicitDeferredProjectionDisposition(entry) {
  return isAcceptedDeferredProjectionEntry(entry);
}

export function extractSeedFamilyEntries(content, wave) {
  const family = extractSeedSectionFamily(content, wave);
  const entries = [];
  for (const section of family.sections) {
    for (const entry of extractReturnMapEntries(section.entryContent)) {
      entry.startLine += section.entryContentStartLine - 1;
      entry.endLine += section.entryContentStartLine - 1;
      entry.section = section.slotId;
      entry.sectionStartLine = section.startLine;
      const ids = extractExactProjectionIdentities(entry);
      if (section.slotId === 'pending_questions') {
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
    repair: `Run node DEEP_RESEARCH_HARNESS/cli/operate-topic-state.mjs inspect --bundle ${resolvePath(bundlePath)} to diagnose canonical topic state; repair through its owning lifecycle path.`,
    detail: `[return_map_seed_binding] ${relPath}: ${binding.reason_code}`,
  });
}

function familyUnavailableFinding(bundlePath, relPath, wave, topicUid, missingSlotIds = []) {
  const surface = resolvePath(bundlePath, relPath);
  const missingDescription = missingSlotIds.length > 0
    ? `missing required ${wave} slot(s): ${missingSlotIds.join(', ')}`
    : `no usable ${wave} target section family`;
  return makeContractFinding({
    id: `return_map_target_family_unavailable:${wave}:${topicUid}`,
    ruleId: 'return_map_target_family_unavailable',
    findingSource: 'checker',
    classification: 'blocking',
    blockingBasis: 'required_structure',
    surface,
    expected: { section_family: SEED_SECTION_FAMILIES[wave], required_slot_ids: projectionSlotsForWave(wave).map((slot) => slot.slotId) },
    observed: { located_sections: [], missing_slot_ids: missingSlotIds },
    missingFact: `${relPath} has ${missingDescription} for current projection demand.`,
    repairKind: 'missing_contract',
    writeTo: 'Canonical Seed Topic layout migration boundary',
    repair: 'Do not hand-edit or infer a seed layout. Keep the direct layout boundary for an explicit sanctioned migration design.',
    detail: `[return_map_target_family_unavailable] ${relPath}: ${wave} current demand has ${missingDescription}.`,
  });
}

function projectionReadinessFinding(bundlePath, {
  ruleId,
  topicUid,
  slotId = null,
  relPath,
  line = null,
  blockingBasis = 'binding_integrity',
  expected,
  observed,
  missingFact,
  detail,
}) {
  const surface = resolvePath(bundlePath, relPath);
  const suffix = line ? `#L${line}` : '';
  return makeContractFinding({
    id: `${ruleId}:${topicUid}${slotId ? `:${slotId}` : ''}${line ? `:${line}` : ''}`,
    ruleId,
    findingSource: 'checker',
    classification: 'blocking',
    blockingBasis,
    surface: `${surface}${suffix}`,
    expected,
    observed,
    missingFact,
    repairKind: 'agent_action',
    writeTo: 'Projection Packet -> operate-topic-state apply -> same Wave inspect',
    repair: 'Read the current direct authority, repair the retained Projection Packet through operate-topic-state apply, then rerun this same Wave inspect.',
    detail,
  });
}

function projectionNavigationFinding(bundlePath, {
  topicUid,
  slotId,
  relPath,
  line,
  entry,
  navigation,
}) {
  const ruleId = navigation.reason_code === 'projection_entry_generic_prose'
    ? 'seed_projection_generic_prose'
    : navigation.reason_code === 'projection_entry_deferred_limitation_missing'
      ? 'seed_projection_deferred_disposition_invalid'
      : navigation.reason_code === 'projection_entry_concrete_ref_missing'
        ? 'return_map_missing_concrete_reference'
        : 'return_map_concrete_reference';
  const nearMatches = navigation.near_matches?.length ? ` Near matches: ${navigation.near_matches.join(', ')}.` : '';
  const internalRefs = extractProjectionBundleRefs(entry?.text || '').filter((ref) => /^(?:artifacts|_cache|_work_units)\//.test(ref));
  const detail = navigation.reason_code === 'projection_entry_concrete_ref_missing' && internalRefs.length > 0
    ? `[${ruleId}] ${relPath}:${line}: evidence-bearing Projection Entry has found only internal provenance refs (${internalRefs.join(', ')}); add a concrete existing reference/*.md consumer-navigation ref or the accepted deferred disposition.`
    : `[${ruleId}] ${relPath}:${line}: ${navigation.message}${nearMatches}`;
  return projectionReadinessFinding(bundlePath, {
    ruleId,
    topicUid,
    slotId,
    relPath,
    line,
    expected: 'A complete Projection Entry has concrete existing reference/*.md navigation or the accepted defers/deferred limitation disposition.',
    observed: {
      reason_code: navigation.reason_code,
      missing_refs: navigation.missing_refs || [],
      invalid_refs: navigation.invalid_refs || [],
      near_matches: navigation.near_matches || [],
    },
    missingFact: `${relPath}:${line} has invalid Projection Entry navigation: ${navigation.message}`,
    detail,
  });
}

function projectionOmissionFinding(bundlePath, relPath, wave, topicUid, identity, { legacy = false, candidate = false } = {}) {
  const ruleId = candidate
    ? 'return_map_current_candidate_omission'
    : identity.startsWith('W2F-')
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
    expected: candidate
      ? `${identity} is an exact entry_id in the ${wave} target section family.`
      : `${identity} is referenced or identity-bound in the ${wave} target section family.`,
    observed: { topic_uid: topicUid, identity, projected: false, candidate },
    missingFact: `${relPath} omits ${identity} from the ${wave} target section family.`,
    repairKind: 'agent_action',
    writeTo: surface,
    repair: `Add an exact identity-bound ${identity} projection or disposition to ${relPath}.`,
    detail: `[${ruleId}] ${relPath}: missing ${identity} for ${topicUid}.`,
  });
}

function projectionCandidateOmissionBatchFinding(bundlePath, relPath, topicUid, missingCandidateIds) {
  const surface = resolvePath(bundlePath, relPath);
  const finding = makeContractFinding({
    id: `return_map_current_candidate_omission:${topicUid}`,
    ruleId: 'return_map_current_candidate_omission',
    findingSource: 'checker',
    classification: 'blocking',
    blockingBasis: 'binding_integrity',
    surface,
    expected: {
      wave: 'wave0',
      topic_uid: topicUid,
      candidate_coverage: 'Every current <work_id>/<ordinal> has one exact Projection Entry or accepted identity-bound disposition.',
    },
    observed: {
      topic_uid: topicUid,
      wave: 'wave0',
      missing_candidate_ids: missingCandidateIds,
      projected: false,
    },
    missingFact: `${relPath} omits current Wave0 candidate projection identities: ${missingCandidateIds.join(', ')}.`,
    repairKind: 'agent_action',
    writeTo: 'Projection Packet -> operate-topic-state apply -> same Wave inspect',
    repair: 'Read the current contribution authority, repair the retained Projection Packet through operate-topic-state apply, then rerun this same Wave inspect.',
    detail: `[return_map_current_candidate_omission] ${relPath}: missing Wave0 candidates for ${topicUid}: ${missingCandidateIds.join(', ')}.`,
  });
  return { ...finding, missing_candidate_ids: [...missingCandidateIds] };
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

function findingIndexAuthorityFinding(bundlePath, findingIndexFact) {
  const relPath = findingIndexFact?.relPath || 'artifacts/wave2/finding-index.yaml';
  return makeContractFinding({
    id: 'return_map_finding_index_authority',
    ruleId: 'return_map_finding_index_authority',
    findingSource: 'checker',
    classification: 'blocking',
    blockingBasis: 'authority_integrity',
    surface: resolvePath(bundlePath, relPath),
    expected: 'A readable Wave2 finding-index object with a findings array for current-round projection authority.',
    observed: { kind: findingIndexFact?.kind || 'unavailable' },
    missingFact: `Wave2 finding-index authority is unavailable: ${findingIndexFact?.inspect?.[0] || relPath}.`,
    repairKind: 'missing_contract',
    writeTo: 'Wave2 finding-index authority recovery boundary',
    detail: `[return_map_finding_index_authority] ${findingIndexFact?.inspect?.[0] || `missing ${relPath}`}`,
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
    blockers.push(findingIndexAuthorityFinding(bundlePath, findingIndexFact));
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
// Read-only and deterministic: it interprets direct authority facts plus seed
// bytes, but never receives a packet target or performs a mutation decision.
export function evaluateSeedTopicProjectionReadiness(bundlePath, {
  wave,
  topicRegistryFact = null,
  findingIndexFact = null,
} = {}) {
  const findings = [];
  const acceptedDeferredCandidateIds = new Set();
  if (!topicRegistryFact?.topic_registry || !topicRegistryFact?.layouts) {
    // A pre-canonical bundle has no current packet target or legal projection
    // writer. Keep its established read-only return-map behavior intact; the
    // canonical lifecycle owns migration before projection readiness applies.
    return projectionReadinessResult(findings, { accepted_deferred_candidate_ids: [] });
  }

  let eligible = { passed: true, rows: [], root_findings: [] };
  let candidateProjection = { passed: true, candidates: [], root_findings: [] };
  if (wave === 'wave0') {
    candidateProjection = collectSubmittedWave0ContributionProjection(bundlePath, { topicRegistryFact });
    if (!candidateProjection.passed) return projectionReadinessResult(candidateProjection.root_findings || [], { accepted_deferred_candidate_ids: [] });
  } else if (wave === 'wave1') {
    eligible = collectEligibleWorkUnitProjection(bundlePath, { phase: wave, topicRegistryFact });
    if (!eligible.passed) return projectionReadinessResult(eligible.root_findings || []);
  }
  const findingDemands = wave === 'wave2'
    ? wave2FindingDemands(bundlePath, topicRegistryFact, findingIndexFact)
    : { parentUsable: true, blockers: [], current: new Map(), legacy: new Map() };
  if (!findingDemands.parentUsable) return projectionReadinessResult(findingDemands.blockers, { accepted_deferred_candidate_ids: [] });
  if (findingDemands.blockers.length > 0) return projectionReadinessResult(findingDemands.blockers, { accepted_deferred_candidate_ids: [] });
  const referenceFact = readReferenceNavigationFact(bundlePath);

  const bindingByUid = new Map(evaluateCanonicalSeedBindings(bundlePath, { topic_registry: topicRegistryFact.topic_registry })
    .map((binding) => [binding.topic_uid, binding]));
  for (const topic of topicRegistryFact.topic_registry) {
    const binding = bindingByUid.get(topic.topic_uid);
    if (!binding?.ok) {
      findings.push(seedBindingFinding(bundlePath, binding || { topic_uid: topic.topic_uid, slug: topic.slug, reason_code: 'binding_missing', fact_refs: [] }));
      continue;
    }

    const relPath = `seed_topics/${topic.slug}.md`;
    const content = readText(join(bundlePath, relPath));
    if (content === null) {
      findings.push(seedBindingFinding(bundlePath, { topic_uid: topic.topic_uid, slug: topic.slug, reason_code: 'seed_missing', fact_refs: [] }));
      continue;
    }
    const currentRows = eligible.rows.filter((row) => row.topic_uid === topic.topic_uid);
    const currentCandidates = candidateProjection.candidates.filter((candidate) => candidate.topic_uid === topic.topic_uid);
    const currentFindingIds = findingDemands.current.get(topic.topic_uid) || [];
    const legacyFindingIds = findingDemands.legacy.get(topic.topic_uid) || [];
    const hasCurrentDemand = wave === 'wave0'
      ? currentCandidates.length > 0
      : currentRows.length > 0 || currentFindingIds.length > 0;
    const family = extractSeedFamilyEntries(content, wave);

    const missingCards = family.sections.filter((section) => section.headingKind === 'canonical' && !section.cardPresent);
    if (missingCards.length > 0) {
      for (const section of missingCards) findings.push(projectionReadinessFinding(bundlePath, {
        ruleId: 'seed_projection_card_missing', topicUid: topic.topic_uid, slotId: section.slotId, relPath, line: section.startLine,
        blockingBasis: 'required_structure', expected: 'A canonical projection heading is immediately followed by its fixed read-only card.',
        observed: { heading_kind: section.headingKind, card_present: false },
        missingFact: `${relPath}:${section.startLine} canonical ${section.slotId} heading is missing its ${'回填卡（只读操作约束，不是 Projection Entry）'} card.`,
        detail: `[seed_projection_card_missing] ${relPath}:${section.startLine} lacks the required card for ${section.slotId}.`,
      }));
      continue;
    }
    const demandedSlotIds = wave === 'wave2'
      ? new Set(currentFindingIds.length > 0 ? ['wave2_judgment'] : [])
      : new Set(hasCurrentDemand ? projectionSlotsForWave(wave).map((slot) => slot.slotId) : []);
    const presentSlotIds = new Set(family.sections.map((section) => section.slotId));
    const missingSlotIds = [...demandedSlotIds].filter((slotId) => !presentSlotIds.has(slotId));
    if (!family.usable || missingSlotIds.length > 0) {
      if (hasCurrentDemand) findings.push(familyUnavailableFinding(bundlePath, relPath, wave, topic.topic_uid, missingSlotIds));
      continue;
    }

    const tokenFailures = [];
    for (const section of family.sections) {
      const slot = projectionSlotsForWave(wave).find((candidate) => candidate.slotId === section.slotId);
      if (slot && demandedSlotIds.has(slot.slotId) && section.entryContent.includes(slot.initialToken)) {
        tokenFailures.push(projectionReadinessFinding(bundlePath, {
          ruleId: 'seed_projection_token', topicUid: topic.topic_uid, slotId: slot.slotId, relPath, line: section.startLine,
          blockingBasis: 'required_structure', expected: `Current ${wave} authority demand has a materialized identity-bound entry instead of ${slot.initialToken}.`,
          observed: { token: slot.initialToken, current_demand: true },
          missingFact: `${relPath}:${section.startLine} retains demanded ${slot.initialToken}.`,
          detail: `[seed_projection_token] ${relPath}:${section.startLine} retains ${slot.initialToken} while current ${wave} authority demand exists.`,
        }));
      }
    }
    if (tokenFailures.length > 0) {
      findings.push(...tokenFailures);
      continue;
    }

    const entries = family.entries;
    let structuralFailure = false;
    for (const section of family.sections) {
      const sectionEntries = entries.filter((entry) => entry.sectionStartLine === section.startLine);
      const slot = projectionSlotsForWave(wave).find((candidate) => candidate.slotId === section.slotId);
      const body = (slot ? section.entryContent.replace(slot.initialToken, '') : section.entryContent).trim();
      if (!body || sectionEntries.length > 0) continue;
      const generic = /\bWave[012]\s+submitted\b/i.test(body);
      if (generic || demandedSlotIds.has(section.slotId)) {
        findings.push(projectionReadinessFinding(bundlePath, {
          ruleId: generic ? 'seed_projection_generic_prose' : 'seed_projection_entry_missing',
          topicUid: topic.topic_uid, slotId: section.slotId, relPath, line: section.startLine,
          blockingBasis: 'required_structure', expected: 'A complete identity-bound Projection Entry or explicit deferred disposition.',
          observed: generic ? 'generic WaveN submitted prose' : 'unparseable slot content',
          missingFact: `${relPath}:${section.startLine} has ${generic ? 'generic submitted prose' : 'no parseable Projection Entry'}${hasCurrentDemand ? ' for current demand' : ''}.`,
          detail: `[${generic ? 'seed_projection_generic_prose' : 'seed_projection_entry_missing'}] ${relPath}:${section.startLine} needs an identity-bound Projection Entry.`,
        }));
        structuralFailure = true;
      } else {
        const local = validateReturnMapContent(body, relPath, {
          requireConcreteReferenceNavigation: true,
          bundlePath,
          referenceFact,
        });
        findings.push(...local.findings);
        if (!local.passed) structuralFailure = true;
      }
    }

    const validWorkIds = new Set();
    const validCandidateIds = new Set();
    const validFindingIds = new Set();
    const currentWorkIds = new Set(currentRows.map((row) => row.work_id));
    const currentCandidateIds = new Set(currentCandidates.map((candidate) => candidate.entry_id));
    const currentCandidateWorkIds = new Set(currentCandidates.map((candidate) => candidate.work_id));
    const currentFindingSet = new Set(currentFindingIds);
    const knownFindingIds = new Set([...currentFindingIds, ...legacyFindingIds]);
    for (const entry of entries) {
      const validation = validateReturnMapContent(entry.text, relPath, {
        bundlePath,
        referenceFact,
      });
      for (const finding of validation.findings) {
        finding.surface = `${resolvePath(bundlePath, relPath)}#L${entry.startLine}`;
        finding.write_to = 'Projection Packet -> operate-topic-state apply -> same Wave inspect';
      }
      findings.push(...validation.findings);
      if (!validation.passed) structuralFailure = true;
      const navigation = validation.passed ? evaluateProjectionEntryNavigation(entry, referenceFact) : null;
      if (navigation && !navigation.passed) {
        findings.push(projectionNavigationFinding(bundlePath, {
          topicUid: topic.topic_uid,
          slotId: entry.section,
          relPath,
          line: entry.startLine,
          entry,
          navigation,
        }));
        structuralFailure = true;
      }
      const entryUsable = validation.passed && navigation?.passed;
      const identities = extractExactProjectionIdentities(entry);
      if (wave === 'wave0') {
        const candidateId = identities.metadataCandidateId;
        const candidateWorkId = candidateId?.split('/')[0] || null;
        const rawEntryId = String(entry.metadata.entry_id || '');
        const rawEntryWorkId = rawEntryId.match(/^(wu-w[0-9]+-b[0-9]{3}-[a-z][a-z0-9]{1,7}-i[0-9]{4})/)?.[1] || null;
        const currentRefWorkIds = new Set([...identities.refWorkIds].filter((id) => currentCandidateWorkIds.has(id)));
        const malformedCurrentIdentity = Boolean(rawEntryId)
          && !candidateId
          && (currentCandidateWorkIds.has(rawEntryWorkId) || currentRefWorkIds.size > 0);
        const outOfRangeCurrentCandidate = candidateId
          && currentCandidateWorkIds.has(candidateWorkId)
          && !currentCandidateIds.has(candidateId);
        const conflictingCurrentRef = candidateId
          && [...currentRefWorkIds].some((id) => id !== candidateWorkId);
        if (entry.metadataIssues.length > 0 || malformedCurrentIdentity || outOfRangeCurrentCandidate || conflictingCurrentRef) {
          findings.push(projectionReadinessFinding(bundlePath, {
            ruleId: 'seed_projection_entry_identity', topicUid: topic.topic_uid, slotId: entry.section, relPath, line: entry.startLine,
            expected: 'One exact current <work_id>/<positive source.yaml ordinal> entry_id; bare work IDs in refs are secondary provenance only.',
            observed: {
              entry_id: entry.metadata.entry_id || null,
              candidate_id: candidateId,
              current_candidate_ids: [...currentCandidateIds],
              current_ref_work_ids: [...currentRefWorkIds],
              metadata_issues: entry.metadataIssues,
            },
            missingFact: `${relPath}:${entry.startLine} lacks one valid current Wave0 candidate identity.`,
            detail: `[seed_projection_entry_identity] ${relPath}:${entry.startLine} has invalid Wave0 candidate identity binding.`,
          }));
          structuralFailure = true;
        } else if (entryUsable && candidateId && currentCandidateIds.has(candidateId)) {
          validCandidateIds.add(candidateId);
          if (isAcceptedDeferredProjectionEntry(entry)) acceptedDeferredCandidateIds.add(candidateId);
        }
      } else if (wave === 'wave2') {
        const ids = identities.metadataFindingId ? new Set([identities.metadataFindingId]) : identities.refFindingIds;
        const conflictingRef = identities.metadataFindingId && [...identities.refFindingIds].some((id) => id !== identities.metadataFindingId);
        if (entry.metadataIssues.length > 0 || ids.size !== 1 || conflictingRef || [...ids].some((id) => !knownFindingIds.has(id))) {
          findings.push(projectionReadinessFinding(bundlePath, {
            ruleId: 'seed_projection_entry_identity', topicUid: topic.topic_uid, slotId: entry.section, relPath, line: entry.startLine,
            expected: 'One exact current or accepted historical W2F identity; packet-created entries use matching entry_id and historical entries use an exact refs token.',
            observed: { entry_id: entry.metadata.entry_id || null, finding_ids: [...ids], metadata_issues: entry.metadataIssues, conflicting_ref: conflictingRef },
            missingFact: `${relPath}:${entry.startLine} lacks one valid Wave2 projection identity.`,
            detail: `[seed_projection_entry_identity] ${relPath}:${entry.startLine} has invalid Wave2 identity binding.`,
          }));
          structuralFailure = true;
        } else if (entryUsable) {
          validFindingIds.add([...ids][0]);
        }
      } else {
        const ids = identities.metadataWorkId && metadataIdentityCanCoverRow(entry)
          ? new Set([identities.metadataWorkId])
          : identities.workIds;
        const metadataInvalid = entry.metadata.entry_id && !/^(?:wu-w[0-9]+-b[0-9]{3}-[a-z][a-z0-9]{1,7}-i[0-9]{4})\/[1-9][0-9]*$/.test(entry.metadata.entry_id);
        const currentIds = new Set([...ids].filter((id) => currentWorkIds.has(id)));
        // A retained entry may be valid history from an earlier round. Current
        // direct authority selects which identities are required now; it does
        // not retroactively make historical identities malformed.
        const currentIdentityInvalid = currentIds.size > 0 && (ids.size !== 1 || currentIds.size !== 1);
        const historicalIdentityInvalid = !hasCurrentDemand && (ids.size > 1 || (ids.size === 0 && entry.metadata.entry_id));
        if (entry.metadataIssues.length > 0 || (currentIds.size > 0 && metadataInvalid) || currentIdentityInvalid || historicalIdentityInvalid) {
          findings.push(projectionReadinessFinding(bundlePath, {
            ruleId: 'seed_projection_entry_identity', topicUid: topic.topic_uid, slotId: entry.section, relPath, line: entry.startLine,
            expected: 'One exact current submitted work identity in entry_id or accepted refs form.',
            observed: { entry_id: entry.metadata.entry_id || null, work_ids: [...ids], metadata_issues: entry.metadataIssues },
            missingFact: `${relPath}:${entry.startLine} lacks one valid current ${wave} submitted-work identity.`,
            detail: `[seed_projection_entry_identity] ${relPath}:${entry.startLine} has invalid ${wave} identity binding.`,
          }));
          structuralFailure = true;
        } else if (entryUsable && currentIds.size === 1) {
          validWorkIds.add([...currentIds][0]);
        }
      }
    }
    if (structuralFailure) continue;

    const missingCandidateIds = currentCandidates
      .filter((candidate) => !validCandidateIds.has(candidate.entry_id))
      .map((candidate) => candidate.entry_id);
    if (missingCandidateIds.length > 0) {
      findings.push(projectionCandidateOmissionBatchFinding(bundlePath, relPath, topic.topic_uid, missingCandidateIds));
    }
    for (const row of currentRows) {
      if (!validWorkIds.has(row.work_id)) findings.push(projectionOmissionFinding(bundlePath, relPath, wave, topic.topic_uid, row.work_id));
    }
    for (const findingId of currentFindingIds) {
      if (!validFindingIds.has(findingId)) findings.push(projectionOmissionFinding(bundlePath, relPath, wave, topic.topic_uid, findingId));
    }
    for (const findingId of legacyFindingIds) {
      if (!validFindingIds.has(findingId)) findings.push(projectionOmissionFinding(bundlePath, relPath, wave, topic.topic_uid, findingId, { legacy: true }));
    }
  }
  return projectionReadinessResult(findings, {
    accepted_deferred_candidate_ids: [...acceptedDeferredCandidateIds].sort(),
  });
}

function projectionReadinessResult(findings, extras = {}) {
  const blocking = findings.filter((finding) => finding.classification === 'blocking');
  const inspect = blocking.map((finding) => finding.detail);
  const advice = findings.filter((finding) => finding.classification === 'advisory').map((finding) => finding.detail);
  return {
    passed: blocking.length === 0,
    inspect,
    advice,
    findings,
    diagnosticOnly: blocking.length === 0,
    classification: blocking.length === 0 ? 'diagnostic-only' : 'blocking',
    ...extras,
  };
}

