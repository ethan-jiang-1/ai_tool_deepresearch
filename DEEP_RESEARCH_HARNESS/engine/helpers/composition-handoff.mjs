// @impl CDG-001, CDG-002, CDG-003, CDG-004
// Pure composition handoff normalization, receipt, consistency, and migration facts.
import { createHash } from 'node:crypto';
import { z } from 'zod';
import { CompositionHandoffSchema, ProfileSchema } from '../../schema/contracts/profile.mjs';

export const COMPOSITION_HANDOFF_RECEIPT_SCHEMA_VERSION = 'composition-handoff-receipt/v1';

const DELIVERY_VIEWS = new Set([
  'profile_default',
  'executive_brief',
  'evidence_map',
  'claim_judgment',
  'technical_deep_dive',
  'custom',
]);
const SHA256_HEX = /^[a-f0-9]{64}$/;

export const CompositionHandoffReceiptSchema = z.object({
  schema_version: z.literal(COMPOSITION_HANDOFF_RECEIPT_SCHEMA_VERSION),
  final_report_view: z.enum([
    'profile_default',
    'executive_brief',
    'evidence_map',
    'claim_judgment',
    'technical_deep_dive',
    'custom',
  ]),
  custom_slug: z.string().min(1).nullable(),
  composition_handoff: CompositionHandoffSchema,
  projection_sha256: z.string().regex(SHA256_HEX),
  profile_context_sha256: z.string().regex(SHA256_HEX),
}).strict().superRefine((receipt, context) => {
  if (receipt.final_report_view === 'custom' && receipt.custom_slug === null) {
    context.addIssue({ code: z.ZodIssueCode.custom, path: ['custom_slug'], message: 'Custom composition receipt requires custom_slug.' });
  }
  if (receipt.final_report_view !== 'custom' && receipt.custom_slug !== null) {
    context.addIssue({ code: z.ZodIssueCode.custom, path: ['custom_slug'], message: 'Non-custom composition receipt must set custom_slug to null.' });
  }
  if (receipt.final_report_view === 'custom' && !receipt.composition_handoff.view_instructions) {
    context.addIssue({ code: z.ZodIssueCode.custom, path: ['composition_handoff', 'view_instructions'], message: 'Custom composition receipt requires view_instructions.' });
  }
});

export const CompositionHandoffMigrationInputSchema = z.object({
  final_report_view: z.enum([
    'profile_default',
    'executive_brief',
    'evidence_map',
    'claim_judgment',
    'technical_deep_dive',
    'custom',
  ]),
  custom_slug: z.string().min(1).nullable(),
  composition_handoff: CompositionHandoffSchema,
}).strict().superRefine((input, context) => {
  if (input.final_report_view === 'custom' && input.custom_slug === null) {
    context.addIssue({ code: z.ZodIssueCode.custom, path: ['custom_slug'], message: 'Custom migration input requires custom_slug.' });
  }
  if (input.final_report_view !== 'custom' && input.custom_slug !== null) {
    context.addIssue({ code: z.ZodIssueCode.custom, path: ['custom_slug'], message: 'Non-custom migration input must set custom_slug to null.' });
  }
  if (input.final_report_view === 'custom' && !input.composition_handoff.view_instructions) {
    context.addIssue({ code: z.ZodIssueCode.custom, path: ['composition_handoff', 'view_instructions'], message: 'Custom migration input requires view_instructions.' });
  }
});

function hash(value) {
  return createHash('sha256').update(value).digest('hex');
}

function parsedProfile(profile) {
  const parsed = ProfileSchema.safeParse(profile);
  if (!parsed.success) {
    return {
      ok: false,
      kind: 'invalid_profile',
      reason_code: 'profile_schema_invalid',
      issues: parsed.error.issues.map((issue) => ({ path: issue.path, message: issue.message })),
    };
  }
  return { ok: true, profile: parsed.data };
}

function normalizedSlug(value) {
  return typeof value === 'string' ? value.trim() : null;
}

function normalizedProjection(profile) {
  const hitl2 = profile.human_decision_checkpoints.hitl2;
  const finalReportView = hitl2.final_report_view;
  if (!DELIVERY_VIEWS.has(finalReportView)) {
    return { ok: false, kind: 'invalid_projection', reason_code: 'final_report_view_not_delivery', path: ['human_decision_checkpoints', 'hitl2', 'final_report_view'] };
  }
  if (!hitl2.composition_handoff) {
    return { ok: false, kind: 'invalid_projection', reason_code: 'composition_handoff_missing', path: ['human_decision_checkpoints', 'hitl2', 'composition_handoff'] };
  }
  const handoff = hitl2.composition_handoff;
  const rerunCount = hitl2.rerun_count ?? 0;
  if (handoff.for_rerun_count !== rerunCount) {
    return { ok: false, kind: 'invalid_projection', reason_code: 'composition_handoff_rerun_mismatch', path: ['human_decision_checkpoints', 'hitl2', 'composition_handoff', 'for_rerun_count'] };
  }

  const customSlug = finalReportView === 'custom' ? normalizedSlug(hitl2.custom_slug) : null;
  if (finalReportView === 'custom' && !customSlug) {
    return { ok: false, kind: 'invalid_projection', reason_code: 'custom_slug_missing', path: ['human_decision_checkpoints', 'hitl2', 'custom_slug'] };
  }
  if (finalReportView === 'custom' && !handoff.view_instructions) {
    return { ok: false, kind: 'invalid_projection', reason_code: 'custom_view_instructions_missing', path: ['human_decision_checkpoints', 'hitl2', 'composition_handoff', 'view_instructions'] };
  }

  return {
    ok: true,
    projection: {
      final_report_view: finalReportView,
      custom_slug: customSlug,
      composition_handoff: handoff,
    },
  };
}

function profileContext(profile) {
  const context = structuredClone(profile);
  delete context.human_decision_checkpoints.hitl2.final_report_view;
  delete context.human_decision_checkpoints.hitl2.custom_slug;
  delete context.human_decision_checkpoints.hitl2.composition_handoff;
  return context;
}

function replaceCompositionProjection(profile, projection) {
  const next = structuredClone(profile);
  const hitl2 = next.human_decision_checkpoints.hitl2;
  hitl2.final_report_view = projection.final_report_view;
  if (projection.custom_slug === null) delete hitl2.custom_slug;
  else hitl2.custom_slug = projection.custom_slug;
  hitl2.composition_handoff = projection.composition_handoff;
  return ProfileSchema.parse(next);
}

export function canonicalJson(value) {
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(',')}]`;
  if (value && typeof value === 'object') {
    return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${canonicalJson(value[key])}`).join(',')}}`;
  }
  return JSON.stringify(value);
}

export function projectionSha256(projection) {
  return hash(canonicalJson(projection));
}


export function evaluateCompositionProceed(profile) {
  const parsed = parsedProfile(profile);
  if (!parsed.ok) return parsed;
  const projection = normalizedProjection(parsed.profile);
  if (!projection.ok) return projection;
  const contextSha = hash(canonicalJson(profileContext(parsed.profile)));
  const receipt = {
    schema_version: COMPOSITION_HANDOFF_RECEIPT_SCHEMA_VERSION,
    ...projection.projection,
    projection_sha256: projectionSha256(projection.projection),
    profile_context_sha256: contextSha,
  };
  return { ok: true, kind: 'proceed_ready', profile: parsed.profile, projection: projection.projection, receipt };
}

export function validateCompositionHandoffReceipt(receipt) {
  const parsed = CompositionHandoffReceiptSchema.safeParse(receipt);
  if (!parsed.success) {
    return {
      ok: false,
      kind: 'invalid_witness',
      reason_code: 'composition_receipt_schema_invalid',
      issues: parsed.error.issues.map((issue) => ({ path: issue.path, message: issue.message })),
    };
  }
  const projection = {
    final_report_view: parsed.data.final_report_view,
    custom_slug: parsed.data.custom_slug,
    composition_handoff: parsed.data.composition_handoff,
  };
  if (projectionSha256(projection) !== parsed.data.projection_sha256) {
    return { ok: false, kind: 'invalid_witness', reason_code: 'composition_receipt_projection_fingerprint_invalid' };
  }
  return { ok: true, receipt: parsed.data, projection };
}

export function validateCompositionHandoffMigrationInput(input) {
  const parsed = CompositionHandoffMigrationInputSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      kind: 'invalid_migration_input',
      reason_code: 'composition_migration_input_schema_invalid',
      issues: parsed.error.issues.map((issue) => ({ path: issue.path, message: issue.message })),
    };
  }
  return { ok: true, projection: parsed.data };
}

export function evaluateCompositionHandoffConsistency(profile, receipt) {
  const witness = validateCompositionHandoffReceipt(receipt);
  if (!witness.ok) return witness;

  const parsed = parsedProfile(profile);
  if (!parsed.ok) return parsed;
  const currentContextSha = hash(canonicalJson(profileContext(parsed.profile)));
  if (currentContextSha !== witness.receipt.profile_context_sha256) {
    return {
      ok: false,
      kind: 'profile_context_drift',
      reason_code: 'profile_context_drift',
      expected_profile_context_sha256: witness.receipt.profile_context_sha256,
      observed_profile_context_sha256: currentContextSha,
    };
  }

  const current = normalizedProjection(parsed.profile);
  if (!current.ok) {
    return { ok: false, kind: 'composition_projection_drift', reason_code: current.reason_code, path: current.path };
  }
  const currentProjectionSha = projectionSha256(current.projection);
  if (currentProjectionSha !== witness.receipt.projection_sha256) {
    return {
      ok: false,
      kind: 'composition_projection_drift',
      reason_code: 'composition_projection_drift',
      expected_projection_sha256: witness.receipt.projection_sha256,
      observed_projection_sha256: currentProjectionSha,
    };
  }
  return { ok: true, kind: 'match', projection: current.projection, receipt: witness.receipt };
}

function migrationMatchesPredecessor(event, predecessor) {
  return event?.event === 'composition_handoff_migration'
    && event.source_gate === predecessor.sourceGate
    && event.source_attempt_index === predecessor.index
    && event.source_attempt_ts === predecessor.sourceAttemptTs
    && event.source_attempt_sha256 === predecessor.sourceAttemptLineSha256;
}

/**
 * Selects the sole receipt witness associated with an already-selected
 * HITL2-to-Readiness handoff. The normal receipt remains authoritative when
 * present; migration is only a compatibility witness for a receipt-less
 * predecessor.
 */
export function selectCompositionHandoffWitness({ predecessor, trace_events = [] } = {}) {
  if (!predecessor?.event || predecessor.sourceGate !== 'hitl2-recorded'
    || predecessor.sourceNode !== 'phases/phase-hitl2.md'
    || predecessor.targetNode !== 'phases/phase-readiness.md') {
    return { ok: false, kind: 'invalid_witness', reason_code: 'selected_handoff_ineligible' };
  }
  if (predecessor.event.composition_handoff_receipt !== undefined) {
    return {
      ok: true,
      kind: 'normal_receipt',
      receipt: predecessor.event.composition_handoff_receipt,
    };
  }

  const migrations = trace_events.filter((item) => migrationMatchesPredecessor(item.event, predecessor));
  if (migrations.length === 0) {
    return { ok: false, kind: 'invalid_witness', reason_code: 'legacy_migration_witness_missing' };
  }
  if (migrations.length !== 1) {
    return { ok: false, kind: 'invalid_witness', reason_code: 'legacy_migration_witness_conflict' };
  }
  const migration = migrations[0].event;
  if (migration.historical_context_equality !== 'unproven') {
    return { ok: false, kind: 'invalid_witness', reason_code: 'legacy_migration_context_claim_invalid' };
  }
  return {
    ok: true,
    kind: 'legacy_migration_receipt',
    receipt: migration.composition_handoff_receipt,
    migration: {
      index: migrations[0].index,
      source_attempt_index: migration.source_attempt_index,
      source_attempt_sha256: migration.source_attempt_sha256,
    },
  };
}

export function evaluateLegacyCompositionMigration({
  profile,
  projection,
  predecessor,
  has_final_entry = false,
  has_existing_migration = false,
} = {}) {
  if (!predecessor || predecessor.gate !== 'hitl2-recorded' || predecessor.passed !== true || predecessor.currentNodeRef !== 'phases/phase-hitl2.md' || predecessor.next !== 'phases/phase-readiness.md') {
    return { ok: false, kind: 'ineligible_migration', reason_code: 'legacy_predecessor_ineligible' };
  }
  if (predecessor.composition_handoff_receipt) {
    return { ok: false, kind: 'ineligible_migration', reason_code: 'normal_v1_receipt_present' };
  }
  if (has_final_entry) return { ok: false, kind: 'ineligible_migration', reason_code: 'final_entry_present' };
  if (has_existing_migration) return { ok: false, kind: 'ineligible_migration', reason_code: 'migration_already_present' };

  const parsed = parsedProfile(profile);
  if (!parsed.ok) return parsed;
  if (parsed.profile.human_decision_checkpoints.hitl2.user_decision !== 'proceed_to_readiness') {
    return { ok: false, kind: 'ineligible_migration', reason_code: 'current_decision_not_proceed' };
  }

  const input = validateCompositionHandoffMigrationInput(projection);
  if (!input.ok) return input;

  let candidateProfile;
  try {
    candidateProfile = replaceCompositionProjection(parsed.profile, input.projection);
  } catch (error) {
    return { ok: false, kind: 'ineligible_migration', reason_code: 'migration_result_profile_invalid', reason: error.message || String(error) };
  }
  const proceed = evaluateCompositionProceed(candidateProfile);
  if (!proceed.ok) {
    return { ok: false, kind: 'ineligible_migration', reason_code: proceed.reason_code, path: proceed.path || null, issues: proceed.issues || null };
  }
  return {
    ok: true,
    kind: 'eligible_migration',
    profile: candidateProfile,
    projection: proceed.projection,
    receipt: proceed.receipt,
  };
}
