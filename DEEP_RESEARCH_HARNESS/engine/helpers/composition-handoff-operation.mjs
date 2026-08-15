// @impl CDG-002, CDG-004
// Bounded Engine-owned mutation surface for composition handoff repair.
import {
  closeSync,
  constants,
  existsSync,
  fsyncSync,
  openSync,
  readFileSync,
  renameSync,
  unlinkSync,
  writeFileSync,
} from 'node:fs';
import { createHash, randomUUID } from 'node:crypto';
import path from 'node:path';
import { parse as parseYaml, stringify as stringifyYaml } from 'yaml';
import { ProfileSchema } from '../../schema/contracts/profile.mjs';
import { appendExactTraceLine } from '../trace.mjs';
import { checkPhaseHandoffPreflight } from './handoff-helpers.mjs';
import {
  evaluateCompositionHandoffConsistency,
  evaluateLegacyCompositionMigration,
} from './composition-handoff.mjs';

export const COMPOSITION_HANDOFF_OPERATION_SCHEMA_VERSION = 'composition-handoff-operation/v1';

function sha256(bytes) {
  return createHash('sha256').update(bytes).digest('hex');
}

function fsyncPath(filePath) {
  const descriptor = openSync(filePath, constants.O_RDONLY);
  try {
    fsyncSync(descriptor);
  } finally {
    closeSync(descriptor);
  }
}

function atomicReplace(filePath, bytes, suffix) {
  const temporary = `${filePath}.composition-handoff-${suffix}`;
  if (existsSync(temporary)) throw new Error(`temporary target exists: ${temporary}`);
  try {
    writeFileSync(temporary, bytes, { flag: 'wx' });
    fsyncPath(temporary);
    renameSync(temporary, filePath);
    fsyncPath(path.dirname(filePath));
  } catch (error) {
    try { if (existsSync(temporary)) unlinkSync(temporary); } catch { /* preserve original error */ }
    throw error;
  }
}

function result(value) {
  return {
    schema_version: COMPOSITION_HANDOFF_OPERATION_SCHEMA_VERSION,
    operation: 'restore',
    verdict: 'blocked',
    reason_code: null,
    reason: null,
    next_action: null,
    ...value,
  };
}

function restoreCommand(bundlePath) {
  return `node DEEP_RESEARCH_HARNESS/cli/operate-composition-handoff.mjs restore --bundle ${bundlePath} --current-node phases/phase-readiness.md`;
}

function rerunCommand(bundlePath) {
  return `node DEEP_RESEARCH_HARNESS/cli/gates/check-gate-readiness-passed.mjs --bundle ${bundlePath} --current-node phases/phase-readiness.md`;
}

function readProfile(bundlePath) {
  const profilePath = path.join(bundlePath, 'rb_profile.yaml');
  if (!existsSync(profilePath)) return { ok: false, reason_code: 'profile_missing', reason: 'rb_profile.yaml is absent.' };
  const raw = readFileSync(profilePath);
  try {
    return { ok: true, profilePath, raw, profile: ProfileSchema.parse(parseYaml(raw.toString('utf8'))) };
  } catch (error) {
    return { ok: false, reason_code: 'profile_schema_invalid', reason: error.message || String(error) };
  }
}

function replacementProfile(profile, receipt) {
  const next = structuredClone(profile);
  const hitl2 = next.human_decision_checkpoints.hitl2;
  hitl2.final_report_view = receipt.final_report_view;
  if (receipt.custom_slug === null) delete hitl2.custom_slug;
  else hitl2.custom_slug = receipt.custom_slug;
  hitl2.composition_handoff = receipt.composition_handoff;
  return ProfileSchema.parse(next);
}

function restoreAuditEvent(bundlePath, handoff, receipt) {
  const eventId = `composition_handoff_restore:${handoff.index}:${receipt.projection_sha256}`;
  return {
    ts: new Date().toISOString(),
    event: 'composition_handoff_restore',
    event_id: eventId,
    schema_version: COMPOSITION_HANDOFF_OPERATION_SCHEMA_VERSION,
    source_gate: handoff.sourceGate,
    source_attempt_index: handoff.index,
    source_attempt_ts: handoff.sourceAttemptTs,
    source_attempt_sha256: handoff.sourceAttemptLineSha256,
    projection_sha256: receipt.projection_sha256,
    profile_context_sha256: receipt.profile_context_sha256,
    bundle: path.basename(bundlePath),
  };
}

function restoreOriginalState({ profilePath, profileRaw, tracePath, traceRaw, suffix }) {
  const errors = [];
  try { atomicReplace(profilePath, profileRaw, `${suffix}-rollback-profile`); } catch (error) { errors.push(error.message); }
  try { atomicReplace(tracePath, traceRaw, `${suffix}-rollback-trace`); } catch (error) { errors.push(error.message); }
  return errors;
}

function readMigrationInput(inputPath) {
  try {
    return { ok: true, input: parseYaml(readFileSync(inputPath, 'utf8')) };
  } catch (error) {
    return {
      ok: false,
      reason_code: 'migration_input_unreadable',
      reason: error.message || String(error),
    };
  }
}

function hasFinalEntry(traceEvents) {
  return traceEvents.some((item) => item.event?.event === 'load_complete' && item.event.entry === 'phases/phase-final.md');
}

function hasMigrationForHandoff(traceEvents, handoff) {
  return traceEvents.some((item) => item.event?.event === 'composition_handoff_migration'
    && item.event.source_gate === handoff.sourceGate
    && item.event.source_attempt_index === handoff.index
    && item.event.source_attempt_ts === handoff.sourceAttemptTs
    && item.event.source_attempt_sha256 === handoff.sourceAttemptLineSha256);
}

function migrationAuditEvent(bundlePath, handoff, receipt) {
  const eventId = `composition_handoff_migration:${handoff.sourceAttemptLineSha256}`;
  return {
    ts: new Date().toISOString(),
    event: 'composition_handoff_migration',
    event_id: eventId,
    schema_version: 'composition-handoff-migration/v1',
    source_gate: handoff.sourceGate,
    source_attempt_index: handoff.index,
    source_attempt_ts: handoff.sourceAttemptTs,
    source_attempt_sha256: handoff.sourceAttemptLineSha256,
    historical_context_equality: 'unproven',
    composition_handoff_receipt: receipt,
    bundle: path.basename(bundlePath),
  };
}

export function restoreCompositionHandoff({ bundlePath, currentNode = 'phases/phase-readiness.md' } = {}) {
  if (currentNode !== 'phases/phase-readiness.md') {
    return result({ reason_code: 'current_node_invalid', reason: 'restore is available only at phases/phase-readiness.md.' });
  }
  const handoff = checkPhaseHandoffPreflight(bundlePath, currentNode);
  if (!handoff.ok || handoff.handoff?.sourceGate !== 'hitl2-recorded') {
    return result({ reason_code: 'selected_handoff_invalid', reason: handoff.reason || 'The selected Readiness predecessor is not a legal HITL2 handoff.' });
  }

  const profile = readProfile(bundlePath);
  if (!profile.ok) return result(profile);
  const receipt = handoff.handoff.event?.composition_handoff_receipt;
  const consistency = evaluateCompositionHandoffConsistency(profile.profile, receipt);
  if (consistency.kind === 'match') {
    return result({
      verdict: 'unchanged',
      reason_code: 'projection_already_matches',
      reason: 'The current composition projection already equals the selected receipt.',
      next_action: { kind: 'rerun_gate', command: rerunCommand(bundlePath) },
    });
  }
  if (consistency.kind !== 'composition_projection_drift') {
    return result({
      reason_code: consistency.reason_code || consistency.kind || 'composition_consistency_invalid',
      reason: 'Restore requires projection-only drift with a valid selected receipt and matching non-composition context.',
    });
  }

  let afterProfile;
  try {
    afterProfile = replacementProfile(profile.profile, receipt);
  } catch (error) {
    return result({ reason_code: 'restore_profile_invalid', reason: error.message || String(error) });
  }
  if (evaluateCompositionHandoffConsistency(afterProfile, receipt).kind !== 'match') {
    return result({ reason_code: 'restore_result_invalid', reason: 'The complete restored profile does not match the selected receipt.' });
  }

  const tracePath = path.join(bundlePath, 'rb_trace.jsonl');
  if (!existsSync(tracePath)) return result({ reason_code: 'trace_missing', reason: 'rb_trace.jsonl is absent.' });
  const traceRaw = readFileSync(tracePath);
  const afterRaw = Buffer.from(`${stringifyYaml(afterProfile).trimEnd()}\n`, 'utf8');
  const suffix = randomUUID();
  const event = restoreAuditEvent(bundlePath, handoff.handoff, receipt);
  const eventRaw = Buffer.from(JSON.stringify(event), 'utf8');

  try {
    atomicReplace(profile.profilePath, afterRaw, suffix);
    const appended = appendExactTraceLine({
      tracePath,
      lineBytes: eventRaw,
      expectedPrefixByteLength: traceRaw.length,
      expectedPrefixSha256: sha256(traceRaw),
      eventId: event.event_id,
    });
    if (!appended.ok) throw new Error(`${appended.reason_code}: ${appended.reason}`);
    return result({
      verdict: 'restored',
      reason_code: 'projection_restored',
      reason: 'The selected composition projection was restored and audited.',
      next_action: { kind: 'rerun_gate', command: rerunCommand(bundlePath) },
    });
  } catch (error) {
    const rollbackErrors = restoreOriginalState({
      profilePath: profile.profilePath,
      profileRaw: profile.raw,
      tracePath,
      traceRaw,
      suffix,
    });
    return result({
      reason_code: rollbackErrors.length > 0 ? 'restore_rollback_failed' : 'restore_commit_failed',
      reason: rollbackErrors.length > 0
        ? `${error.message || String(error)}; rollback failed: ${rollbackErrors.join('; ')}`
        : `${error.message || String(error)}; profile and trace were restored to their prior bytes.`,
    });
  }
}

export function migrateLegacyCompositionHandoff({
  bundlePath,
  inputPath,
  currentNode = 'phases/phase-readiness.md',
} = {}) {
  if (currentNode !== 'phases/phase-readiness.md') {
    return result({ operation: 'migrate-legacy', reason_code: 'current_node_invalid', reason: 'migrate-legacy is available only at phases/phase-readiness.md.' });
  }
  const handoff = checkPhaseHandoffPreflight(bundlePath, currentNode);
  if (!handoff.ok || handoff.handoff?.sourceGate !== 'hitl2-recorded') {
    return result({ operation: 'migrate-legacy', reason_code: 'selected_handoff_invalid', reason: handoff.reason || 'The selected Readiness predecessor is not a legal HITL2 handoff.' });
  }
  if (!handoff.handoff.sourceAttemptLineSha256) {
    return result({ operation: 'migrate-legacy', reason_code: 'selected_handoff_identity_missing', reason: 'The selected predecessor does not expose an exact trace identity.' });
  }

  const profile = readProfile(bundlePath);
  if (!profile.ok) return result({ operation: 'migrate-legacy', ...profile });
  const input = readMigrationInput(inputPath);
  if (!input.ok) return result({ operation: 'migrate-legacy', ...input });

  const tracePath = path.join(bundlePath, 'rb_trace.jsonl');
  if (!existsSync(tracePath)) return result({ operation: 'migrate-legacy', reason_code: 'trace_missing', reason: 'rb_trace.jsonl is absent.' });
  const traceRaw = readFileSync(tracePath);
  const traceEvents = handoff.traceEvents || [];
  const eligibility = evaluateLegacyCompositionMigration({
    profile: profile.profile,
    projection: input.input,
    predecessor: {
      gate: handoff.handoff.sourceGate,
      passed: handoff.handoff.event?.passed,
      currentNodeRef: handoff.handoff.sourceNode,
      next: handoff.handoff.targetNode,
      composition_handoff_receipt: handoff.handoff.event?.composition_handoff_receipt,
    },
    has_final_entry: hasFinalEntry(traceEvents),
    has_existing_migration: hasMigrationForHandoff(traceEvents, handoff.handoff),
  });
  if (!eligibility.ok) {
    return result({
      operation: 'migrate-legacy',
      reason_code: eligibility.reason_code || eligibility.kind || 'migration_ineligible',
      reason: 'Legacy migration requires one receipt-less, current pre-Final HITL2 proceed predecessor and a complete current-round projection input.',
    });
  }

  const afterRaw = Buffer.from(`${stringifyYaml(eligibility.profile).trimEnd()}\n`, 'utf8');
  const suffix = randomUUID();
  const event = migrationAuditEvent(bundlePath, handoff.handoff, eligibility.receipt);
  const eventRaw = Buffer.from(JSON.stringify(event), 'utf8');

  try {
    atomicReplace(profile.profilePath, afterRaw, suffix);
    const appended = appendExactTraceLine({
      tracePath,
      lineBytes: eventRaw,
      expectedPrefixByteLength: traceRaw.length,
      expectedPrefixSha256: sha256(traceRaw),
      eventId: event.event_id,
    });
    if (!appended.ok) throw new Error(`${appended.reason_code}: ${appended.reason}`);
    return result({
      operation: 'migrate-legacy',
      verdict: 'migrated',
      reason_code: 'legacy_migration_committed',
      reason: 'The explicit composition projection was committed as the new post-migration baseline and audited.',
      next_action: { kind: 'rerun_gate', command: rerunCommand(bundlePath) },
    });
  } catch (error) {
    const rollbackErrors = restoreOriginalState({
      profilePath: profile.profilePath,
      profileRaw: profile.raw,
      tracePath,
      traceRaw,
      suffix,
    });
    return result({
      operation: 'migrate-legacy',
      reason_code: rollbackErrors.length > 0 ? 'migration_rollback_failed' : 'migration_commit_failed',
      reason: rollbackErrors.length > 0
        ? `${error.message || String(error)}; rollback failed: ${rollbackErrors.join('; ')}`
        : `${error.message || String(error)}; profile and trace were restored to their prior bytes.`,
    });
  }
}
