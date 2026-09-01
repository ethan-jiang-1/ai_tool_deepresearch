// topic-state-wave-projection.mjs
// Wave projection write engine: authority checks, slot materialization,
// deferred contributions (W2 carve).
// @impl CTS-003

import {
  closeSync, constants, existsSync, fsyncSync, lstatSync, mkdirSync, openSync,
  readFileSync, readdirSync, renameSync, rmSync, statSync, writeFileSync,
} from 'node:fs';
import { createHash, randomUUID } from 'node:crypto';
import path from 'node:path';
import { parse as parseYaml, stringify as stringifyYaml } from 'yaml';
import { z } from 'zod';
import { CanonicalPlanSchema } from '../../schema/contracts/plan.mjs';
import { WorkUnitManifestSchema } from '../../schema/contracts/work-unit.mjs';
import { checkPhaseHandoffPreflight } from './handoff-helpers.mjs';
import { readSubmittedWorkUnitDeclarations } from './gate-helpers-readers.mjs';
import { acceptedTopicSlugs, buildTopicLayoutTarget, evaluateTopicLayouts, losslessTopicSlugStem, resolveStructuredTopicBinding } from './topic-layout.mjs';
import { makeContractFinding } from './wave-contract-findings.mjs';
import { evaluateRerunDirection } from './rerun-direction.mjs';
import { locateCanonicalSections } from './plan-hostfile-sections.mjs';
import { evaluateSeedTopicAuthoring, renderSeedInitializationRegion } from './seed-topic-authoring-evaluator.mjs';
import { buildResearchStyleApplyCommand, RESEARCH_STYLE_WRITER_PATH } from './research-style-projection.mjs';
import {
  collectEligibleWorkUnitProjection,
  collectSubmittedWave0ContributionProjection,
  readProjectionProfileRound,
} from '../work-unit-projection.mjs';
import { loadWave2FindingIndexFact } from './wave-depth-contracts.mjs';
import {
  PROJECTION_ENTRY_FIELDS,
  evaluateProjectionEntryNavigation,
  isAcceptedDeferredProjectionEntry,
  parseProjectionEntryArea,
  upsertProjectionEntryArea,
} from './projection-entry-contract.mjs';
import {
  readSeed,
  evaluateCanonicalSeedBindings,
} from './topic-state-bundle-io.mjs';
import { SEED_TOPIC_PROJECTION_ENTRY_FIELDS, SEED_TOPIC_PROJECTION_CARD_LABEL, SEED_TOPIC_PROJECTION_SLOTS, PROJECTION_SLOT_BY_ID, projectionSlotForId, projectionSlotsForWave, projectionSlotHeadingMatches, locateSeedProjectionSlots, renderSeedProjectionCard, renderSeedProjectionSlot, renderSeedProjectionAppendix, splitSeedProjectionCard } from "./topic-schema-projection.mjs";

export function projectionError(reasonCode, message, extras = {}) {
  return Object.assign(new Error(message), { reason_code: reasonCode, ...extras });
}

export function readProjectionReferenceFact(bundle) {
  const root = path.join(bundle, 'reference');
  if (!existsSync(root) || lstatSync(root).isSymbolicLink() || !lstatSync(root).isDirectory()) return { referencePaths: [], requireExisting: true };
  const referencePaths = readdirSync(root).sort().flatMap((name) => {
    const target = path.join(root, name);
    if (!name.endsWith('.md') || lstatSync(target).isSymbolicLink() || !lstatSync(target).isFile()) return [];
    return [`reference/${name}`];
  });
  return { referencePaths, requireExisting: true };
}

export function validateProjectionEntryNavigation(entry, referenceFact) {
  const navigation = evaluateProjectionEntryNavigation(entry, referenceFact);
  if (navigation.passed) return navigation;
  throw projectionError(navigation.reason_code, navigation.message, {
    near_matches: navigation.near_matches,
    missing_refs: navigation.missing_refs,
    invalid_refs: navigation.invalid_refs,
  });
}

export function assertProjectionPostcondition(body, input, referenceFact) {
  const postOccurrences = locateSeedProjectionSlots(body, { slotIds: input.updates.map((update) => update.slot_id) });
  for (const update of input.updates) {
    const slot = projectionSlotForId(update.slot_id);
    const targets = postOccurrences.filter((occurrence) => (
      occurrence.slotId === slot.slotId
      && occurrence.headingKind === 'canonical'
      && splitSeedProjectionCard(occurrence.content, slot)
    ));
    if (targets.length !== 1) {
      throw projectionError('writer_postcondition_failed', `Projection writer failed post-write parser/readiness assertion for ${slot.slotId}.`);
    }
    const card = splitSeedProjectionCard(targets[0].content, slot);
    if (card.entryArea.includes(slot.initialToken)) {
      throw projectionError('writer_postcondition_failed', `Projection writer failed to consume ${slot.initialToken} for ${slot.slotId}.`);
    }
    const parsed = parseProjectionEntryArea(card.entryArea, { requiredFields: SEED_TOPIC_PROJECTION_ENTRY_FIELDS });
    if (!parsed.passed) {
      throw projectionError('writer_postcondition_failed', `Projection writer failed post-write parser/readiness assertion for ${slot.slotId}.`);
    }
    for (const entry of update.entries) {
      const matching = parsed.entries.filter((candidate) => candidate.metadata.entry_id === entry.entry_id);
      if (matching.length !== 1) {
        throw projectionError('writer_postcondition_failed', `Projection writer failed post-write parser/readiness assertion for ${slot.slotId}.`);
      }
    }
    for (const entry of parsed.entries) {
      const navigation = evaluateProjectionEntryNavigation(entry, referenceFact);
      if (!navigation.passed) {
        throw projectionError('writer_postcondition_failed', `Projection writer failed post-write navigation assertion for ${slot.slotId}.`);
      }
    }
  }
}

export function upgradedProjectionHeading(body, occurrence, slot) {
  const headingLine = body.slice(occurrence.startOffset, occurrence.contentStartOffset);
  return occurrence.headingKind === 'legacy'
    ? headingLine.replace(occurrence.headingBase, slot.canonicalHeading)
    : headingLine;
}

export function materializeProjectionSlot(body, occurrence, slot, entries) {
  const card = occurrence.headingKind === 'canonical' ? splitSeedProjectionCard(occurrence.content, slot) : null;
  if (occurrence.headingKind === 'canonical' && !card) {
    throw projectionError('seed_projection_layout_missing', `${slot.slotId} has a canonical heading without its required ${SEED_TOPIC_PROJECTION_CARD_LABEL}.`);
  }
  const updatedEntries = upsertProjectionEntryArea(card ? card.entryArea : occurrence.content, {
    initialToken: slot.initialToken,
    entries,
  });
  const heading = upgradedProjectionHeading(body, occurrence, slot);
  const replacement = card
    ? `${heading}${card.prefix}\n\n${updatedEntries}\n`
    : `${heading}\n${renderSeedProjectionCard(slot)}\n\n${updatedEntries}\n`;
  return { startOffset: occurrence.startOffset, endOffset: occurrence.endOffset, replacement };
}

export function resolveWave2AffectedTopics(layouts, affectedTopics) {
  const resolved = new Set();
  for (const token of affectedTopics || []) {
    const candidates = new Map();
    const add = (layout) => {
      if (layout) candidates.set(layout.topic_uid || `legacy:${layout.current.id}:${layout.current.slug}`, layout);
    };
    add(layouts.currentByUid.get(token));
    for (const layout of layouts.referenceByAnySlug.get(token) || []) add(layout);
    for (const layout of layouts.referenceByAnyId.get(token) || []) add(layout);
    if (candidates.size !== 1) {
      throw projectionError('wave2_finding_topic_invalid', candidates.size === 0
        ? `Wave2 finding affected_topics contains unknown token ${JSON.stringify(token)}.`
        : `Wave2 finding affected_topics contains ambiguous token ${JSON.stringify(token)}.`);
    }
    resolved.add([...candidates.values()][0].topic_uid);
  }
  return resolved;
}

export function validateWave2ProjectionAuthority(bundle, topicRegistryFact, topicUid, entries) {
  const findingIndexFact = loadWave2FindingIndexFact(bundle);
  if (!findingIndexFact.ok || !Array.isArray(findingIndexFact.data?.findings)) {
    throw projectionError('wave2_finding_index_unavailable', findingIndexFact.inspect?.[0] || 'Wave2 finding-index authority is unavailable.');
  }
  let round;
  try { round = readProjectionProfileRound(bundle); } catch (error) {
    throw projectionError('wave2_profile_round_invalid', error.message);
  }
  const findingById = new Map(findingIndexFact.data.findings.map((finding) => [finding?.id, finding]));
  for (const entry of entries) {
    const findingId = entry.source_identity.finding_id;
    const finding = findingById.get(findingId);
    if (!finding) {
      const formatInvalid = !/^W2F-[0-9]{3,}$/.test(findingId);
      throw projectionError('wave2_finding_not_found', formatInvalid
        ? `Wave2 finding ${findingId} is absent from the current finding index and its id does not match the required W2F-\\d{3} format (three or more digits after W2F-).`
        : `Wave2 finding ${findingId} is absent from the current finding index.`);
    }
    if (!Array.isArray(finding.affected_topics) || finding.affected_topics.length === 0) {
      throw projectionError('wave2_finding_affected_topics_invalid', `Wave2 finding ${findingId} has no usable affected_topics authority.`);
    }
    if (!Object.hasOwn(finding, 'created_in_rerun_count')) {
      throw projectionError('wave2_finding_not_current', `Wave2 finding ${findingId} is missing created_in_rerun_count; a current finding must carry created_in_rerun_count equal to the current rerun_count ${round}.`);
    }
    if (finding.created_in_rerun_count !== round) {
      throw projectionError('wave2_finding_not_current', `Wave2 finding ${findingId} created_in_rerun_count is ${finding.created_in_rerun_count}, not the current round ${round}; update created_in_rerun_count or the finding id.`);
    }
    const affected = resolveWave2AffectedTopics(topicRegistryFact.layouts, finding.affected_topics);
    if (!affected.has(topicUid)) {
      throw projectionError('wave2_finding_topic_mismatch', `Wave2 finding ${findingId} does not resolve to packet topic ${topicUid}.`);
    }
  }
  return findingIndexFact;
}

export function validateProjectionAuthority(bundle, canonical, input, topic) {
  const topicRegistryFact = {
    topic_registry: canonical.topic_registry,
    layouts: evaluateTopicLayouts(canonical.topic_registry),
  };
  const entries = input.updates.flatMap((update) => update.entries || []);
  if (input.wave === 'wave2') {
    validateWave2ProjectionAuthority(bundle, topicRegistryFact, topic.topic_uid, entries);
    return { topicRegistryFact };
  }
  if (input.wave === 'wave0') {
    const candidateProjection = collectSubmittedWave0ContributionProjection(bundle, { topicRegistryFact });
    if (!candidateProjection.passed) {
      const root = candidateProjection.root_findings?.[0];
      throw projectionError(root?.rule_id || 'submitted_source_contribution', root?.missing_fact || 'Submitted Wave0 source-contribution lineage authority is unavailable.');
    }
    const eligibleCandidateIds = new Set(candidateProjection.candidates
      .filter((candidate) => candidate.topic_uid === topic.topic_uid)
      .map((candidate) => candidate.entry_id));
    for (const entry of entries) {
      if (!eligibleCandidateIds.has(entry.entry_id)) {
        throw projectionError('projection_source_identity_not_current', `${entry.entry_id} is not a retained contribution-owned Wave0 source identity for ${topic.topic_uid}.`);
      }
    }
    return { topicRegistryFact, candidateProjection };
  }
  const eligible = collectEligibleWorkUnitProjection(bundle, { phase: input.wave, topicRegistryFact });
  if (!eligible.passed) {
    const root = eligible.root_findings?.[0];
    throw projectionError(root?.rule_id || 'submitted_projection_authority', root?.missing_fact || 'Current submitted work-unit authority is unavailable.');
  }
  const eligibleIds = new Set(eligible.rows.filter((row) => row.topic_uid === topic.topic_uid).map((row) => row.work_id));
  for (const entry of entries) {
    if (!eligibleIds.has(entry.source_identity.work_id)) {
      throw projectionError('projection_source_identity_not_current', `${entry.source_identity.work_id} is not a current eligible ${input.wave} submitted work identity for ${topic.topic_uid}.`);
    }
  }
  return { topicRegistryFact, eligible };
}

export function projectionSlotTarget(seed, slot) {
  const candidates = locateSeedProjectionSlots(seed.body, { slotIds: [slot.slotId] }).filter((occurrence) => (
    occurrence.slotId === slot.slotId
    && (occurrence.headingKind === 'legacy' || splitSeedProjectionCard(occurrence.content, slot))
  ));
  if (candidates.length === 0) {
    throw projectionError('seed_projection_layout_missing', `${slot.slotId} has no unique recognized canonical/card or declared legacy write target.`);
  }
  if (candidates.length > 1) {
    throw projectionError('seed_projection_layout_ambiguous', `${slot.slotId} has multiple recognized write targets.`);
  }
  return candidates[0];
}

export function projectionTargetEntryArea(target, slot) {
  const card = target.headingKind === 'canonical' ? splitSeedProjectionCard(target.content, slot) : null;
  return card ? card.entryArea : target.content;
}

export function deferredContributionEntry(workId, candidate, deferred) {
  return {
    source_identity: { kind: 'submitted_work', work_id: workId },
    entry_id: candidate.entry_id,
    evidence_meaning: deferred.evidence_meaning,
    relationship: 'defers',
    refs: ['none'],
    status: 'deferred',
    next_hop: deferred.next_hop,
  };
}

export function entryField(entry, field) {
  return String(entry?.fields?.[field] || '').trim();
}

export function isEquivalentDeferredContributionEntry(existing, expected) {
  return existing?.metadata?.entry_id === expected.entry_id
    && isAcceptedDeferredProjectionEntry(existing)
    && entryField(existing, 'evidence_meaning') === expected.evidence_meaning
    && entryField(existing, 'relationship').toLowerCase() === 'defers'
    && entryField(existing, 'refs').toLowerCase() === 'none'
    && entryField(existing, 'status').toLowerCase() === 'deferred'
    && entryField(existing, 'next_hop') === expected.next_hop;
}

export function expandWave0DeferredContribution(bundle, canonical, input, topic, seed) {
  const update = input.updates[0];
  if (!Object.hasOwn(update, 'deferred_contribution')) {
    return { input, deferred_contribution: null };
  }

  const deferred = update.deferred_contribution;
  const topicRegistryFact = {
    topic_registry: canonical.topic_registry,
    layouts: evaluateTopicLayouts(canonical.topic_registry),
  };
  const candidateProjection = collectSubmittedWave0ContributionProjection(bundle, { topicRegistryFact });
  if (!candidateProjection.passed) {
    const root = candidateProjection.root_findings?.[0];
    throw projectionError(root?.rule_id || 'submitted_source_contribution', root?.missing_fact || 'Submitted Wave0 source-contribution lineage authority is unavailable.');
  }

  const selectedWorkId = deferred.source_identity.work_id;
  const selectedCandidates = candidateProjection.candidates
    .filter((candidate) => candidate.work_id === selectedWorkId && candidate.topic_uid === topic.topic_uid)
    .sort((left, right) => left.source_ordinal - right.source_ordinal);
  if (selectedCandidates.length === 0) {
    const boundElsewhere = candidateProjection.candidates.some((candidate) => candidate.work_id === selectedWorkId);
    throw projectionError(
      boundElsewhere ? 'projection_deferred_contribution_cross_topic' : 'projection_deferred_contribution_not_current',
      boundElsewhere
        ? `${selectedWorkId} is not a retained submitted Wave0 contribution for ${topic.topic_uid}.`
        : `${selectedWorkId} is not a retained submitted Wave0 contribution with exact source identities for ${topic.topic_uid}.`,
    );
  }

  const generated = selectedCandidates.map((candidate) => deferredContributionEntry(selectedWorkId, candidate, deferred));
  if (!isAcceptedDeferredProjectionEntry({ fields: {
    relationship: 'defers',
    refs: 'none',
    status: 'deferred',
    next_hop: deferred.next_hop,
  } })) {
    throw projectionError('projection_deferred_contribution_limitation_invalid', 'deferred_contribution.next_hop must satisfy the accepted deferred-limitation rule.');
  }

  const slot = projectionSlotForId('wave0_evidence');
  const target = projectionSlotTarget(seed, slot);
  const parsed = parseProjectionEntryArea(projectionTargetEntryArea(target, slot));
  const existingById = new Map();
  for (const entry of parsed.entries) {
    const entryId = entry?.metadata?.entry_id;
    if (!entryId) continue;
    const matches = existingById.get(entryId) || [];
    matches.push(entry);
    existingById.set(entryId, matches);
  }

  const entries = [];
  for (const expected of generated) {
    const existing = existingById.get(expected.entry_id) || [];
    if (existing.length > 1 || (existing.length === 1 && !isEquivalentDeferredContributionEntry(existing[0], expected))) {
      throw projectionError(
        'projection_deferred_contribution_collision',
        `${expected.entry_id} already has a different persisted Wave0 projection disposition; contribution-scoped deferred input cannot overwrite it. Defer the remaining ordinals with explicit wave0_evidence entries, then rerun the same inspect.`,
        { coordinate: `seed_topics/${topic.slug}.md#${expected.entry_id}` },
      );
    }
    if (existing.length === 0) entries.push(expected);
  }

  return {
    input: {
      ...input,
      updates: [{ slot_id: 'wave0_evidence', entries }],
    },
    deferred_contribution: {
      work_id: selectedWorkId,
      entry_ids: generated.map((entry) => entry.entry_id),
      newly_materialized_entry_ids: entries.map((entry) => entry.entry_id),
    },
  };
}

export function buildWaveProjectionMutation(bundle, current, input) {
  const canonical = CanonicalPlanSchema.parse(current);
  const topic = canonical.topic_registry.find((candidate) => candidate.topic_uid === input.topic_uid);
  if (!topic) throw projectionError('projection_topic_not_current', `Projection packet topic_uid is not current: ${input.topic_uid}`);
  const binding = evaluateCanonicalSeedBindings(bundle, canonical).find((candidate) => candidate.topic_uid === topic.topic_uid);
  if (!binding?.ok) throw projectionError('projection_seed_binding_invalid', `Current seed binding is unavailable for ${topic.topic_uid}: ${binding?.reason_code || 'missing'}.`);
  const seed = readSeed(bundle, topic.slug);
  if (!seed.exists) throw projectionError('projection_seed_missing', `Current seed is missing for ${topic.slug}.`);
  const expanded = input.wave === 'wave0'
    ? expandWave0DeferredContribution(bundle, canonical, input, topic, seed)
    : { input, deferred_contribution: null };
  const projectionInput = expanded.input;
  validateProjectionAuthority(bundle, canonical, projectionInput, topic);
  const referenceFact = readProjectionReferenceFact(bundle);
  for (const update of projectionInput.updates) for (const entry of update.entries) validateProjectionEntryNavigation(entry, referenceFact);

  const replacements = [];
  for (const update of projectionInput.updates) {
    const slot = projectionSlotForId(update.slot_id);
    if (!slot?.ownerWaves.includes(projectionInput.wave)) {
      throw projectionError('projection_slot_not_owned', `${update.slot_id} is not owned by ${projectionInput.wave}.`);
    }
    replacements.push(materializeProjectionSlot(seed.body, projectionSlotTarget(seed, slot), slot, update.entries));
  }
  let body = seed.body;
  for (const replacement of replacements.sort((left, right) => right.startOffset - left.startOffset)) {
    body = `${body.slice(0, replacement.startOffset)}${replacement.replacement}${body.slice(replacement.endOffset)}`;
  }
  assertProjectionPostcondition(body, projectionInput, referenceFact);
  const header = seed.raw.slice(0, seed.raw.length - seed.body.length);
  return {
    plan: current,
    touched: new Map([[topic.slug, `${header}${body}`]]),
    cleanup_files: [],
    affected_topic_uids: [topic.topic_uid],
    selected_topic: topic,
    projection: {
      wave: projectionInput.wave,
      topic_uid: topic.topic_uid,
      slots: projectionInput.updates.map((update) => update.slot_id),
      ...(expanded.deferred_contribution ? { deferred_contribution: expanded.deferred_contribution } : {}),
    },
  };
}
