// @impl ERS-001, EXA-004, EXA-005, EXA-006, EXO-007, PLR-001, PLR-003
// Pure Agent Experiment Autorun manifest, V2 and migration-ledger contracts.

import { createHash, randomUUID } from 'node:crypto';
import { existsSync, lstatSync, readFileSync, readdirSync, realpathSync } from 'node:fs';
import { basename, dirname, isAbsolute, join, relative, resolve, sep } from 'node:path';
import { parse as parseYaml } from 'yaml';
import { z } from 'zod';
import { PlaybookFrontmatterSchema, PlaybookPolicySchema, PLAYBOOK_BUNDLE_ROLE_RE, PLAYBOOK_CHECK_ID_RE, PLAYBOOK_EVIDENCE_ROLE_RE } from '../../schema/contracts/playbook.mjs';
import { parseMdFrontmatter } from '../../engine/helpers/gate-helpers.mjs';

export const MANIFEST_START = '<!-- agent-experiment-manifest:v1 -->';
export const MANIFEST_END = '<!-- /agent-experiment-manifest -->';
export const MANIFEST_RELATIVE_PATH = 'experiments_playbook/PLAYBOOK_MANIFEST.md';
// @impl EXA-010
export const EXTREME_SLOW_PLAYBOOK_DIRECTORY = 'exp_extrem_slow';
export const RUN_CONTEXT_FILENAME = 'agent-experiment-run.json';
export const COMPLETION_FILENAME = 'agent-experiment-completion.json';
export const BUNDLE_REGISTRY_RELATIVE = '_playbook_state/bundles.json';

const sha256Pattern = /^[a-f0-9]{64}$/;
const absolutePath = z.string().min(1).refine((value) => isAbsolute(value), 'must be an absolute path');
const sha256 = z.string().regex(sha256Pattern);

export const AgentExperimentPolicySchema = PlaybookPolicySchema;

const caseIdentity = z.string().regex(/^case-\d+-(?:light|standard|heavy)-[a-z0-9-]+$/);
const finiteNonnegative = z.number().finite().nonnegative();
const relativeExecutionSurfacePath = z.string().regex(/^(?:DEEP_RESEARCH_HARNESS|experiments_env\/shared)\/[A-Za-z0-9._/-]+$/)
  .refine((value) => !value.includes('//') && !value.split('/').includes('.') && !value.split('/').includes('..'), 'must be a safe relative helper path');
const manifestEntryPath = z.string().regex(/^exp(?:h)?_[a-z0-9_-]+\/case-\d+-(?:light|standard|heavy)-[a-z0-9-]+\.md$/);

export const ExperimentExactSelectorSchema = z.object({
  case: caseIdentity.nullable(),
  group: z.string().trim().min(1).nullable(),
  tier: z.enum(['light', 'standard', 'heavy']).nullable(),
  all: z.boolean(),
}).strict().superRefine((value, ctx) => {
  if (value.case !== null && (value.group !== null || value.tier !== null || value.all)) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['case'], message: 'exact case is exclusive with group, tier, and all' });
  }
  if (value.all && (value.group !== null || value.tier !== null)) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['all'], message: 'all is exclusive with group and tier' });
  }
  if (value.case === null && value.group === null && value.tier === null && !value.all) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'selector must name case, group, tier, or all' });
  }
});

export const AgentExperimentExecutionSurfaceSchema = z.object({
  schema_version: z.literal('agent-experiment-execution-surface/v1'),
  manifest_entry: z.object({
    path: manifestEntryPath,
    case: caseIdentity,
  }).strict(),
  source_playbook_sha256: sha256,
  instruction_sha256: sha256,
  framework_helper_inventory: z.array(z.object({
    path: relativeExecutionSurfacePath,
    sha256,
  }).strict()),
  framework_helper_sha256: sha256,
  fingerprint: sha256,
}).strict().superRefine((value, ctx) => {
  const paths = value.framework_helper_inventory.map((item) => item.path);
  if (new Set(paths).size !== paths.length) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['framework_helper_inventory'], message: 'helper paths must be unique' });
  }
  if (JSON.stringify(paths) !== JSON.stringify([...paths].sort())) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['framework_helper_inventory'], message: 'helper paths must be sorted' });
  }
  if (executionSurfaceHelperDigest(value.framework_helper_inventory) !== value.framework_helper_sha256) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['framework_helper_sha256'], message: 'does not match the canonical helper inventory' });
  }
  if (executionSurfaceFingerprint(value) !== value.fingerprint) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['fingerprint'], message: 'does not match the canonical execution surface' });
  }
});

export function executionSurfaceHelperDigest(inventory) {
  const canonicalInventory = inventory.map((item) => ({ path: item.path, sha256: item.sha256 }));
  return sha256Bytes(Buffer.from(JSON.stringify(canonicalInventory)));
}

export function executionSurfaceFingerprint(surface) {
  return sha256Bytes(Buffer.from(JSON.stringify({
    schema_version: surface.schema_version,
    manifest_entry: surface.manifest_entry,
    source_playbook_sha256: surface.source_playbook_sha256,
    instruction_sha256: surface.instruction_sha256,
    framework_helper_sha256: surface.framework_helper_sha256,
  })));
}

const SelectionObservationV1ProfileSchema = z.enum(['calibration', 'discovery', 'diagnostic', 'assurance']);
const SelectionObservationV2ProfileSchema = z.enum(['calibration', 'discovery', 'diagnostic', 'assurance', 'regression']);
const SelectionObservationV1PredictionBasisSchema = z.enum(['explicit_selector', 'observed_matching', 'observed_stale', 'filename_initial_estimate', 'unavailable']);
const SelectionObservationV2PredictionBasisSchema = z.enum(['explicit_selector', 'observed_matching', 'observed_stale', 'observed_source_matching_history', 'filename_initial_estimate', 'unavailable']);

function selectionObservationShape({ schemaVersion, profile, predictionBasis }) {
  return {
    schema_version: z.literal(schemaVersion),
    mode: z.enum(['exact', 'profile']),
    exact_selector: ExperimentExactSelectorSchema.nullable(),
    profile: profile.nullable(),
    prediction_basis: predictionBasis,
    predicted_duration_ms: z.number().int().nonnegative().nullable(),
    predicted_cost_usd: finiteNonnegative.nullable(),
    reserved_cost_usd: finiteNonnegative.nullable(),
    selection_reason: z.array(z.string().trim().min(1)).min(1),
  };
}

function refineSelectionObservation(value, ctx) {
  if (value.mode === 'exact' && (value.exact_selector === null || value.profile !== null)) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'exact selection must carry one exact selector and no profile' });
  }
  if (value.mode === 'profile' && value.profile === null) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['profile'], message: 'profile selection requires a profile name' });
  }
  if (value.mode === 'profile' && value.profile !== 'assurance' && value.exact_selector !== null) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['exact_selector'], message: 'only assurance may carry an exact selector scope' });
  }
  if (value.mode === 'profile' && value.profile === 'assurance' && value.exact_selector === null) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['exact_selector'], message: 'assurance requires an explicit selector scope' });
  }
  if (value.prediction_basis === 'explicit_selector' && (value.predicted_duration_ms !== null || value.predicted_cost_usd !== null || value.reserved_cost_usd !== null)) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['prediction_basis'], message: 'explicit selection does not claim a prediction' });
  }
  if (value.prediction_basis === 'unavailable' && value.predicted_duration_ms !== null) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['predicted_duration_ms'], message: 'unavailable prediction cannot carry a duration' });
  }
}

export const ExperimentSelectionObservationV1Schema = z.object(selectionObservationShape({
  schemaVersion: 'agent-experiment-selection-observation/v1',
  profile: SelectionObservationV1ProfileSchema,
  predictionBasis: SelectionObservationV1PredictionBasisSchema,
})).strict().superRefine(refineSelectionObservation);

export const ExperimentSelectionObservationV2Schema = z.object({
  ...selectionObservationShape({
    schemaVersion: 'agent-experiment-selection-observation/v2',
    profile: SelectionObservationV2ProfileSchema,
    predictionBasis: SelectionObservationV2PredictionBasisSchema,
  }),
  regression_intent: z.enum(['normal', 'qualification']).nullable(),
}).strict().superRefine((value, ctx) => {
  refineSelectionObservation(value, ctx);
  const isRegression = value.mode === 'profile' && value.profile === 'regression';
  if (isRegression && value.regression_intent === null) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['regression_intent'], message: 'regression profile requires regression intent' });
  }
  if (!isRegression && value.regression_intent !== null) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['regression_intent'], message: 'regression intent requires regression profile' });
  }
});

export const ExperimentSelectionObservationSchema = z.union([
  ExperimentSelectionObservationV1Schema,
  ExperimentSelectionObservationV2Schema,
]);

const OutcomeSchema = z.enum(['PASS', 'FAIL', 'NOT_RUN']).nullable();
const LifecycleOutcomeSchema = z.enum(['ERROR', 'CANCELLED']).nullable();
const EffectiveOutcomeSchema = z.enum(['PASS', 'FAIL', 'NOT_RUN', 'HUMAN', 'ERROR', 'CANCELLED']);
const HealthSchema = z.enum(['CLEAN', 'ISSUES', 'ERROR']).nullable();
const LogReferenceSchema = z.object({ path: absolutePath, bytes: z.number().int().nonnegative(), sha256 }).strict();
const ReportResultV1Schema = z.object({
  case: caseIdentity,
  experiment: z.string().trim().min(1),
  playbook_path: manifestEntryPath,
  native_outcome: OutcomeSchema,
  lifecycle_outcome: LifecycleOutcomeSchema,
  effective_outcome: EffectiveOutcomeSchema,
  health: HealthSchema,
  duration_ms: z.number().int().nonnegative(),
  cost_usd: finiteNonnegative.nullable(),
  completion: z.object({
    source_playbook_sha256: sha256,
    outcome: z.enum(['PASS', 'FAIL', 'NOT_RUN']),
  }).passthrough().nullable(),
}).passthrough();

const ReportResultV2Schema = z.object({
  case: caseIdentity,
  experiment: z.string().trim().min(1),
  playbook_path: manifestEntryPath,
  native_outcome: OutcomeSchema,
  lifecycle_outcome: LifecycleOutcomeSchema,
  effective_outcome: EffectiveOutcomeSchema,
  agent_process: z.string().trim().min(1),
  health: HealthSchema,
  health_reports: z.array(z.unknown()),
  reason: z.string().nullable(),
  duration_ms: z.number().int().nonnegative(),
  cost_usd: finiteNonnegative.nullable(),
  accumulated_cost_usd: finiteNonnegative,
  run_root: absolutePath.nullable(),
  run_root_available: z.boolean(),
  cleanup_requested: z.boolean(),
  cleanup_eligible: z.boolean(),
  cleanup_status: z.enum(['not_attempted', 'removed', 'failed']),
  completion: z.lazy(() => AgentExperimentCompletionSchema).nullable(),
  logs: z.object({
    prompt: LogReferenceSchema.nullable(),
    stdout: LogReferenceSchema.nullable(),
    stderr: LogReferenceSchema.nullable(),
  }).strict(),
  evidence: z.unknown().nullable(),
  execution_surface: AgentExperimentExecutionSurfaceSchema,
  selection_observation: ExperimentSelectionObservationSchema,
}).strict();

const SummarySchema = z.object({
  total: z.number().int().nonnegative(),
  PASS: z.number().int().nonnegative(),
  FAIL: z.number().int().nonnegative(),
  NOT_RUN: z.number().int().nonnegative(),
  HUMAN: z.number().int().nonnegative(),
  ERROR: z.number().int().nonnegative(),
  CANCELLED: z.number().int().nonnegative(),
}).strict();
const ProofBoundarySchema = z.object({
  deterministic_fixture_proves: z.string().trim().min(1),
  agent_flow_proof_requires: z.array(z.string().trim().min(1)),
}).strict();

export const AgentExperimentBatchReportV1Schema = z.object({
  schema_version: z.literal('agent-experiment-batch-report/v1'),
  batch_id: z.string().uuid(),
  generated_at: z.string().datetime(),
  results: z.array(ReportResultV1Schema),
}).passthrough();

export const AgentExperimentBatchReportV2Schema = z.object({
  schema_version: z.literal('agent-experiment-batch-report/v2'),
  batch_id: z.string().uuid(),
  generated_at: z.string().datetime(),
  runner: z.literal('run-agent-experiment.mjs'),
  execution_mode: z.enum(['headless_agent', 'interactive_agent']),
  proof_boundary: ProofBoundarySchema,
  cleanup_requested: z.boolean(),
  max_total_budget_usd: finiteNonnegative.nullable(),
  max_case_budget_usd: finiteNonnegative.nullable(),
  accumulated_cost_usd: finiteNonnegative,
  summary: SummarySchema,
  results: z.array(ReportResultV2Schema),
  report_path: absolutePath,
}).strict();

export const AgentExperimentBatchReportSchema = z.discriminatedUnion('schema_version', [
  AgentExperimentBatchReportV1Schema,
  AgentExperimentBatchReportV2Schema,
]);

const AuditRunContextSchema = z.object({
  path: absolutePath,
  sha256,
  run_id: z.string().uuid(),
  root_identity: z.object({ dev: z.string().regex(/^\d+$/), ino: z.string().regex(/^\d+$/) }).strict(),
  source_playbook_sha256: sha256,
  rendered_playbook_sha256: sha256,
  instruction_sha256: sha256,
  manifest_sha256: sha256,
}).strict();

const AuditCaseResultV2Schema = z.object({
  schema_version: z.literal('agent-experiment-audit-event/v2'),
  event: z.literal('case_result'),
  ts: z.string().datetime(),
  batch_id: z.string().uuid(),
  ordinal: z.number().int().positive(),
  case: caseIdentity,
  experiment: z.string().trim().min(1),
  playbook_path: manifestEntryPath,
  cost_class: z.enum(['light', 'standard', 'heavy']),
  execution_mode: z.enum(['headless_agent', 'interactive_agent']),
  started_at: z.string().datetime(),
  duration_ms: z.number().int().nonnegative(),
  run_context: AuditRunContextSchema.nullable(),
  native_outcome: OutcomeSchema,
  lifecycle_outcome: LifecycleOutcomeSchema,
  effective_outcome: EffectiveOutcomeSchema,
  agent_process: z.string().trim().min(1),
  health: HealthSchema,
  health_reports: z.array(z.unknown()),
  reason: z.string().nullable(),
  cost_usd: finiteNonnegative.nullable(),
  accumulated_cost_usd: finiteNonnegative,
  run_root: absolutePath.nullable(),
  run_root_available: z.boolean(),
  cleanup_requested: z.boolean(),
  cleanup_eligible: z.boolean(),
  cleanup_status: z.enum(['not_attempted', 'removed', 'failed']),
  completion: z.lazy(() => AgentExperimentCompletionSchema).nullable(),
  logs: z.object({
    prompt: LogReferenceSchema.nullable(),
    stdout: LogReferenceSchema.nullable(),
    stderr: LogReferenceSchema.nullable(),
  }).strict(),
  evidence: z.unknown().nullable(),
  execution_surface: AgentExperimentExecutionSurfaceSchema,
  selection_observation: ExperimentSelectionObservationSchema,
}).strict();

const AuditCleanupResultV2Schema = z.object({
  schema_version: z.literal('agent-experiment-audit-event/v2'),
  event: z.literal('cleanup_result'),
  ts: z.string().datetime(),
  batch_id: z.string().uuid(),
  ordinal: z.number().int().positive(),
  case: caseIdentity,
  case_result_sha256: sha256,
  cleanup_status: z.enum(['removed', 'failed']),
  removed_path: absolutePath,
  lifecycle_outcome_override: z.enum(['ERROR']).nullable(),
  reason: z.string().nullable().optional(),
  execution_surface: AgentExperimentExecutionSurfaceSchema,
  selection_observation: ExperimentSelectionObservationSchema,
}).strict();

export const AgentExperimentAuditEventV1Schema = z.object({
  schema_version: z.literal('agent-experiment-audit-event/v1'),
  event: z.string().trim().min(1),
}).passthrough();
export const AgentExperimentAuditEventV2Schema = z.discriminatedUnion('event', [
  AuditCaseResultV2Schema,
  AuditCleanupResultV2Schema,
]);
export const AgentExperimentAuditEventSchema = z.union([
  AgentExperimentAuditEventV1Schema,
  AgentExperimentAuditEventV2Schema,
]);

export const AgentExperimentRunContextSchema = z.object({
  schema_version: z.literal('agent-experiment-run/v1'),
  run_id: z.string().uuid(),
  mode: z.enum(['headless_agent', 'interactive_agent']),
  created_at: z.string().datetime(),
  manifest_path: absolutePath,
  manifest_sha256: sha256,
  instruction_path: absolutePath,
  instruction_sha256: sha256,
  source_playbook_path: absolutePath,
  source_playbook_sha256: sha256,
  rendered_playbook_path: absolutePath,
  rendered_playbook_sha256: sha256,
  case: z.string().regex(/^case-\d+-(?:light|standard|heavy)-[a-z0-9-]+$/),
  experiment: z.string().trim().min(1),
  cost: z.enum(['light', 'standard', 'heavy']),
  policy: AgentExperimentPolicySchema,
  repo_command_root: absolutePath,
  framework_root: absolutePath,
  case_run_root: absolutePath,
  case_root_identity: z.object({ dev: z.string().regex(/^\d+$/), ino: z.string().regex(/^\d+$/) }).strict(),
  completion_path: absolutePath,
}).strict().superRefine((value, ctx) => {
  const caseCost = value.case.match(/^case-\d+-(light|standard|heavy)-/)?.[1];
  if (caseCost !== value.cost) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['cost'], message: 'must match case identity cost' });
  }
  if (value.completion_path !== join(value.case_run_root, COMPLETION_FILENAME)) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['completion_path'], message: 'must be the fixed case-root completion sibling' });
  }
});

export const AgentExperimentBundleRegistrySchema = z.object({
  schema_version: z.literal('agent-experiment-bundles/v1'),
  run_id: z.string().uuid(),
  bundles: z.array(z.object({
    role: z.string().regex(PLAYBOOK_BUNDLE_ROLE_RE),
    path: absolutePath,
  }).strict()),
}).strict().superRefine((value, ctx) => {
  const roles = new Set();
  const paths = new Set();
  for (const [index, bundle] of value.bundles.entries()) {
    if (roles.has(bundle.role)) ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['bundles', index, 'role'], message: 'duplicate role' });
    if (paths.has(bundle.path)) ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['bundles', index, 'path'], message: 'duplicate path' });
    roles.add(bundle.role);
    paths.add(bundle.path);
  }
});

const CompletionTraceSchema = z.object({
  role: z.string().regex(PLAYBOOK_BUNDLE_ROLE_RE),
  path: absolutePath,
  trace_prefix_bytes: z.number().int().nonnegative(),
  trace_prefix_sha256: sha256,
  trace_parse_status: z.enum(['valid', 'invalid', 'missing']),
  trace_event_count: z.number().int().nonnegative().nullable(),
  health: z.object({ required: z.boolean(), profile: z.enum(['light', 'standard', 'heavy']).nullable() }).strict(),
}).strict();

const CompletionEvidenceSchema = z.object({
  role: z.string().regex(PLAYBOOK_EVIDENCE_ROLE_RE),
  path: absolutePath,
  bytes: z.number().int().nonnegative(),
  sha256,
}).strict();

export const AgentExperimentCompletionSchema = z.object({
  schema_version: z.literal('agent-experiment-completion/v1'),
  run_id: z.string().uuid(),
  case: z.string().regex(/^case-\d+-(?:light|standard|heavy)-[a-z0-9-]+$/),
  run_context_sha256: sha256,
  manifest_sha256: sha256,
  instruction_sha256: sha256,
  source_playbook_sha256: sha256,
  rendered_playbook_sha256: sha256,
  outcome: z.enum(['PASS', 'FAIL', 'NOT_RUN']),
  not_run_reason: z.string().trim().min(1).nullable(),
  verdict_mode: z.enum(['all', 'last']),
  checks_total: z.number().int().nonnegative(),
  checks_considered: z.number().int().nonnegative(),
  considered_checks: z.array(z.object({
    gate: z.string().regex(PLAYBOOK_CHECK_ID_RE),
    passed: z.boolean(),
    expected: z.boolean(),
    verdict_judge: z.enum(['deterministic', 'real_human', 'ai_judge']).optional(),
  }).strict()),
  verdict_role: z.string().regex(PLAYBOOK_BUNDLE_ROLE_RE).nullable(),
  bundles: z.array(CompletionTraceSchema),
  durable_evidence: z.array(CompletionEvidenceSchema),
  proof: z.object({
    subject: z.enum(['deterministic_contract', 'agent_behavior']),
    execution: z.enum(['none', 'real_agent', 'real_subagent']),
    fixture: z.enum(['none', 'setup_only', 'fixture_backed']),
    runtime: z.literal('real_disposable_bundle'),
    external: z.enum(['none', 'real']),
    judge: z.enum(['deterministic', 'real_human', 'ai_judge']),
  }).strict(),
  completed_at: z.string().datetime(),
}).strict().superRefine((value, ctx) => {
  const bundleRoles = new Set();
  const bundlePaths = new Set();
  const requiredHealthProfiles = new Set();
  for (const [index, bundle] of value.bundles.entries()) {
    if (bundleRoles.has(bundle.role)) ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['bundles', index, 'role'], message: 'duplicate role' });
    if (bundlePaths.has(bundle.path)) ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['bundles', index, 'path'], message: 'duplicate path' });
    bundleRoles.add(bundle.role);
    bundlePaths.add(bundle.path);

    if (bundle.health.required !== (bundle.health.profile !== null)) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['bundles', index, 'health'], message: 'required health must have a profile and auxiliary health must not' });
    }
    if (bundle.health.profile !== null) requiredHealthProfiles.add(bundle.health.profile);
    if (bundle.health.required && bundle.trace_parse_status !== 'valid') {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['bundles', index, 'trace_parse_status'], message: 'required health trace must be valid' });
    }
    if (bundle.trace_parse_status === 'valid' && bundle.trace_event_count === null) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['bundles', index, 'trace_event_count'], message: 'valid trace requires an event count' });
    }
    if (bundle.trace_parse_status !== 'valid' && bundle.trace_event_count !== null) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['bundles', index, 'trace_event_count'], message: 'invalid or missing trace cannot have an event count' });
    }
    if (bundle.trace_parse_status === 'missing' && (bundle.trace_prefix_bytes !== 0 || bundle.trace_prefix_sha256 !== sha256Bytes(Buffer.alloc(0)))) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['bundles', index], message: 'missing trace must bind the empty byte prefix' });
    }
  }
  if (requiredHealthProfiles.size > 1) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['bundles'], message: 'all required health targets must use one case profile' });
  }

  const evidenceRoles = new Set();
  for (const [index, evidence] of value.durable_evidence.entries()) {
    if (evidenceRoles.has(evidence.role)) ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['durable_evidence', index, 'role'], message: 'duplicate role' });
    evidenceRoles.add(evidence.role);
  }

  if (value.checks_considered !== value.considered_checks.length) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['checks_considered'], message: 'must equal considered_checks length' });
  }
  if (value.checks_total < value.checks_considered) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['checks_total'], message: 'must be at least checks_considered' });
  }
  if (value.verdict_mode === 'all' && value.checks_total !== value.checks_considered) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['checks_total'], message: 'all mode must consider every accepted verdict check' });
  }

  if (value.outcome === 'NOT_RUN') {
    if (value.not_run_reason === null) ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['not_run_reason'], message: 'NOT_RUN requires a reason' });
    if (value.verdict_role !== null) ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['verdict_role'], message: 'NOT_RUN has no verdict role' });
    if (value.checks_total !== 0 || value.checks_considered !== 0 || value.considered_checks.length !== 0) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['considered_checks'], message: 'NOT_RUN cannot manufacture verdict checks' });
    }
  } else {
    if (value.not_run_reason !== null) ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['not_run_reason'], message: 'PASS/FAIL cannot carry a NOT_RUN reason' });
    if (value.verdict_role === null) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['verdict_role'], message: 'PASS/FAIL requires a verdict role' });
    } else {
      const verdictBundle = value.bundles.find((bundle) => bundle.role === value.verdict_role);
      if (!verdictBundle) ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['verdict_role'], message: 'must name a declared bundle' });
      else if (!verdictBundle.health.required || verdictBundle.trace_parse_status !== 'valid') {
        ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['verdict_role'], message: 'verdict bundle must be a valid required-health target' });
      }
    }
    if (value.considered_checks.length === 0) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['considered_checks'], message: 'PASS/FAIL requires considered checks' });
    }
    const rowsMatch = value.considered_checks.every((check) => check.passed === check.expected);
    if ((value.outcome === 'PASS') !== rowsMatch) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['outcome'], message: 'must equal the considered-check projection' });
    }
  }

  if (value.proof.subject === 'deterministic_contract') {
    if (value.proof.execution !== 'none' || value.proof.external !== 'none' || value.proof.judge !== 'deterministic' || value.proof.fixture === 'setup_only') {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['proof'], message: 'invalid deterministic proof profile' });
    }
    if (value.durable_evidence.length !== 0) ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['durable_evidence'], message: 'deterministic contract cannot declare Subject evidence' });
    for (const [index, check] of value.considered_checks.entries()) {
      if (check.verdict_judge !== undefined) ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['considered_checks', index, 'verdict_judge'], message: 'deterministic checks do not carry Agent judge provenance' });
    }
  } else {
    if (!['real_agent', 'real_subagent'].includes(value.proof.execution) || !['none', 'setup_only'].includes(value.proof.fixture)) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['proof'], message: 'invalid Agent-behavior proof profile' });
    }
    if (value.outcome !== 'NOT_RUN' && value.durable_evidence.length === 0) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['durable_evidence'], message: 'completed Agent behavior requires durable Subject evidence' });
    }
  }
  if (value.proof.judge !== 'deterministic' && value.outcome !== 'NOT_RUN'
    && !value.considered_checks.some((check) => check.verdict_judge === value.proof.judge)) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['considered_checks'], message: 'structured judge provenance is missing' });
  }
});

function fail(message) {
  throw new Error(message);
}

function occurrences(text, needle) {
  let count = 0;
  let offset = 0;
  while ((offset = text.indexOf(needle, offset)) !== -1) {
    count += 1;
    offset += needle.length;
  }
  return count;
}

function assertSafeManifestPath(value) {
  if (!value || isAbsolute(value) || value.includes('\\')) fail(`unsafe manifest path: ${value}`);
  const segments = value.split('/');
  if (segments.some((part) => part === '' || part === '.' || part === '..')) fail(`unsafe manifest path: ${value}`);
  if (segments[0] === EXTREME_SLOW_PLAYBOOK_DIRECTORY) {
    fail(`quarantined extreme-slow playbook cannot be registered: ${value}`);
  }
  if (!/^exp(?:h)?_[a-z0-9_-]+\/case-\d+-(?:light|standard|heavy)-[a-z0-9-]+\.md$/.test(value)) {
    fail(`invalid manifest playbook path: ${value}`);
  }
}

export function parsePlaybookManifest(text) {
  if (occurrences(text, MANIFEST_START) !== 1 || occurrences(text, MANIFEST_END) !== 1) {
    fail('manifest markers must each occur exactly once');
  }
  const start = text.indexOf(MANIFEST_START);
  const end = text.indexOf(MANIFEST_END);
  if (end <= start) fail('manifest end marker must follow start marker');

  const outside = `${text.slice(0, start)}\n${text.slice(end + MANIFEST_END.length)}`;
  if (/`?exp(?:h)?_[^\s`|]+\/case-\d+-(?:light|standard|heavy)-[^\s`|]+\.md`?/.test(outside)) {
    fail('runnable playbook projection exists outside the machine section');
  }

  const lines = text.slice(start + MANIFEST_START.length, end).trim().split(/\r?\n/);
  if (lines.length < 3 || lines[0].trim() !== '| Path |' || !/^\|\s*:?-{3,}:?\s*\|$/.test(lines[1].trim())) {
    fail('manifest machine section must be a one-column Path table');
  }
  const paths = [];
  for (const line of lines.slice(2)) {
    const match = line.trim().match(/^\|\s*`([^`]+)`\s*\|$/);
    if (!match) fail(`invalid manifest row: ${line}`);
    assertSafeManifestPath(match[1]);
    paths.push(match[1]);
  }
  if (paths.length === 0) fail('manifest must contain at least one path');
  if (new Set(paths).size !== paths.length) fail('manifest contains duplicate paths');
  return paths;
}

export function formatPlaybookManifest(paths, preamble = '# Playbook Manifest\n\nActive path registration and order for Agent Experiment Autorun.') {
  if (!Array.isArray(paths) || paths.length === 0) fail('manifest paths must be a non-empty array');
  for (const value of paths) assertSafeManifestPath(value);
  if (new Set(paths).size !== paths.length) fail('manifest contains duplicate paths');
  return `${preamble.trim()}\n\n${MANIFEST_START}\n| Path |\n|---|\n${paths.map((value) => `| \`${value}\` |`).join('\n')}\n${MANIFEST_END}\n`;
}

function walkRunnable(dir, root, sink) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      if (!entry.name.startsWith('.') && !entry.name.startsWith('_')) walkRunnable(full, root, sink);
    } else if (entry.isFile() && /^case-\d+-(?:light|standard|heavy)-[a-z0-9-]+\.md$/.test(entry.name)) {
      sink.push(relative(root, full).split(sep).join('/'));
    }
  }
}

export function collectRunnablePlaybooks(playbookRoot) {
  const results = [];
  for (const entry of readdirSync(playbookRoot, { withFileTypes: true })) {
    if (!entry.isDirectory() || !/^exp(?:h)?_/.test(entry.name)) continue;
    if (entry.name === EXTREME_SLOW_PLAYBOOK_DIRECTORY) continue;
    walkRunnable(join(playbookRoot, entry.name), playbookRoot, results);
  }
  return results.sort();
}

export function derivePlaybookCost(pathValue) {
  const match = basename(pathValue).match(/^case-\d+-(light|standard|heavy)-/);
  if (!match) fail(`filename has no valid cost: ${pathValue}`);
  return match[1];
}

function assertRegularContainedPath(rootReal, fullPath, label) {
  const stat = lstatSync(fullPath);
  if (!stat.isFile() || stat.isSymbolicLink()) fail(`${label} is not a non-symlink regular file: ${fullPath}`);
  const actual = realpathSync(fullPath);
  if (actual !== rootReal && !actual.startsWith(`${rootReal}${sep}`)) fail(`${label} escapes playbook root: ${fullPath}`);
}

export function readAndValidateManifest({ repoRoot, manifestPath = join(repoRoot, MANIFEST_RELATIVE_PATH), requireExactCorpus = true }) {
  const playbookRoot = join(repoRoot, 'experiments_playbook');
  const playbookRootReal = realpathSync(playbookRoot);
  assertRegularContainedPath(playbookRootReal, manifestPath, 'manifest');
  const paths = parsePlaybookManifest(readFileSync(manifestPath, 'utf8'));
  const entries = [];
  const cases = new Set();

  for (const pathValue of paths) {
    const fullPath = join(playbookRoot, pathValue);
    assertRegularContainedPath(playbookRootReal, fullPath, 'playbook');
    const frontmatter = PlaybookFrontmatterSchema.parse(parseMdFrontmatter(readFileSync(fullPath, 'utf8')));
    const stem = basename(pathValue, '.md');
    if (frontmatter.case !== stem) fail(`frontmatter case does not equal filename stem: ${pathValue}`);
    if (cases.has(frontmatter.case)) fail(`duplicate case identity: ${frontmatter.case}`);
    cases.add(frontmatter.case);
    const cost = derivePlaybookCost(pathValue);
    const numeric = Number(frontmatter.case.match(/^case-(\d+)/)?.[1]);
    if (numeric >= 901 && numeric <= 949 && frontmatter.verdict_judge !== 'real_human') {
      fail(`${frontmatter.case} must use real_human judge`);
    }
    if (numeric >= 950 && numeric <= 999 && frontmatter.verdict_judge !== 'ai_judge') {
      fail(`${frontmatter.case} must use ai_judge`);
    }
    entries.push({ path: pathValue, fullPath, cost, frontmatter });
  }

  if (requireExactCorpus) {
    const discovered = collectRunnablePlaybooks(playbookRoot);
    const registered = new Set(paths);
    const unregistered = discovered.filter((value) => !registered.has(value));
    const stale = paths.filter((value) => !discovered.includes(value));
    if (unregistered.length || stale.length) {
      fail(`manifest corpus drift: unregistered=${unregistered.join(',')} stale=${stale.join(',')}`);
    }
  }

  const byNumber = new Map(entries.map((entry) => [Number(entry.frontmatter.case.match(/^case-(\d+)/)?.[1]), entry]));
  for (const entry of entries) {
    const numeric = Number(entry.frontmatter.case.match(/^case-(\d+)/)?.[1]);
    if (numeric < 901 || numeric > 999) continue;
    const pairNumber = numeric <= 949 ? numeric + 50 : numeric - 50;
    const pair = byNumber.get(pairNumber);
    if (!pair || dirname(pair.path) !== dirname(entry.path)) fail(`${entry.frontmatter.case} is missing its co-located +50 judge pair`);
    for (const key of ['proof_subject', 'subject_execution', 'fixture', 'runtime', 'external_calls']) {
      if (pair.frontmatter[key] !== entry.frontmatter[key]) fail(`${entry.frontmatter.case} judge pair profile mismatch: ${key}`);
    }
  }
  return { manifestPath, playbookRoot, paths, entries };
}

function countBy(values, key) {
  const result = Object.create(null);
  for (const value of values) result[value[key]] = (result[value[key]] ?? 0) + 1;
  return result;
}

export function normalizeLedgerBundlePlan(row, defaults) {
  const plan = row.bundle_plan;
  if (plan?.roles) {
    return { roles: plan.roles, verdictRole: plan.verdict_role, healthRoles: plan.health_roles };
  }
  if (plan?.bundles === 1 && plan?.verdict === 'dpt_disp' && plan?.health_targets === 1 && Array.isArray(plan?.aux) && plan.aux.length === 0) {
    const source = defaults.single_bundle_roles;
    return { roles: source.roles, verdictRole: source.verdict_role, healthRoles: source.health_roles };
  }
  fail(`unsupported bundle plan for ${row.case}`);
}

export function validateCaseCompatibilityLedger(ledger) {
  if (ledger?.schema_version !== 'agent-experiment-case-ledger/v1') fail('invalid ledger schema_version');
  if (ledger?.target_active_count !== 97 || !Array.isArray(ledger?.cases) || ledger.cases.length !== 97) fail('ledger target count must be 97');
  const cases = new Set();
  const paths = new Set();
  const numericIds = [];
  let checkCount = 0;
  let agentBehaviorCount = 0;
  const agentRoleMinima = new Map();
  for (const id of [115, 232, 318, 711, 712, 713]) agentRoleMinima.set(id, ['subject_prompt', 'subject_transcript', 'subject_result']);
  for (const id of [901, 951]) agentRoleMinima.set(id, ['subject_prompt', 'subject_transcript', 'subject_result', 'judge_record']);
  for (const id of [163, 211, 221, 223, 234, 406, 604, 605]) agentRoleMinima.set(id, ['subject_task', 'subject_result', 'subject_receipt', 'subject_output']);

  for (const row of ledger.cases) {
    if (cases.has(row.case) || paths.has(row.path)) fail(`duplicate ledger case/path: ${row.case}`);
    cases.add(row.case);
    paths.add(row.path);
    const id = Number(row.case.match(/^case-(\d+)-/)?.[1]);
    if (!Number.isInteger(id)) fail(`invalid ledger case identity: ${row.case}`);
    numericIds.push(id);
    if (!Array.isArray(row.required_checks) || row.required_checks.length === 0 || new Set(row.required_checks).size !== row.required_checks.length) fail(`invalid required checks: ${row.case}`);
    if (row.required_checks.some((value) => !PLAYBOOK_CHECK_ID_RE.test(value))) fail(`invalid required check grammar: ${row.case}`);
    checkCount += row.required_checks.length;
    const plan = normalizeLedgerBundlePlan(row, ledger.defaults);
    if (new Set(plan.roles).size !== plan.roles.length || plan.roles.some((role) => !PLAYBOOK_BUNDLE_ROLE_RE.test(role))) fail(`invalid bundle roles: ${row.case}`);
    if (!plan.roles.includes(plan.verdictRole) || !plan.healthRoles.includes(plan.verdictRole) || plan.healthRoles.some((role) => !plan.roles.includes(role))) fail(`invalid verdict/health roles: ${row.case}`);
    if (!Array.isArray(row.durable_evidence_roles) || new Set(row.durable_evidence_roles).size !== row.durable_evidence_roles.length || row.durable_evidence_roles.some((role) => !PLAYBOOK_EVIDENCE_ROLE_RE.test(role))) fail(`invalid evidence roles: ${row.case}`);
    if (row.proof?.subject === 'agent_behavior') {
      agentBehaviorCount += 1;
      if (row.durable_evidence_roles.length === 0 || !['real_agent', 'real_subagent'].includes(row.proof.execution)) fail(`invalid Agent-behavior row: ${row.case}`);
      const expectedRoles = agentRoleMinima.get(id);
      if (!expectedRoles || JSON.stringify(row.durable_evidence_roles) !== JSON.stringify(expectedRoles)) fail(`Agent-behavior evidence roles drifted: ${row.case}`);
      if (id === 901 ? row.not_run !== null : row.not_run !== 'actor-unavailable') fail(`Agent-behavior NOT_RUN policy drifted: ${row.case}`);
    } else {
      if (row.durable_evidence_roles.length !== 0) fail(`deterministic row has evidence roles: ${row.case}`);
      if (row.proof?.execution !== 'none' || row.proof?.external !== 'none' || row.proof?.judge !== 'deterministic') fail(`deterministic proof profile drifted: ${row.case}`);
    }
    if (!Array.isArray(row.migration) || !['upgrade-v2', 'render-runtime-paths', 'add-native-finalizer'].every((flag) => row.migration.includes(flag))) fail(`base migration flags missing: ${row.case}`);
    if (row.current?.cleanup && !row.migration.includes('remove-local-cleanup')) fail(`cleanup migration flag missing: ${row.case}`);
    if (row.current?.health && !row.migration.includes('remove-local-health')) fail(`health migration flag missing: ${row.case}`);
    if (row.current?.tmp && !row.migration.includes('move-cross-block-state')) fail(`state migration flag missing: ${row.case}`);
    if (row.current?.optional_smoke && !row.migration.includes('remove-optional-smoke-authority')) fail(`optional-smoke migration flag missing: ${row.case}`);
  }

  if (numericIds.includes(316) || !numericIds.includes(901)) fail('ledger must retire 316 and restore 901');
  if (checkCount !== 502 || agentBehaviorCount !== 16) fail('ledger check/Agent-behavior counts drifted');
  const expectedCounts = {
    cost: { light: 39, standard: 37, heavy: 21 },
    health_profile: { light: 43, standard: 26, heavy: 28 },
    family: { wff_shared: 39, fixture_shared: 23, custom: 31, prose_actor: 2, actor_pair: 2 },
  };
  for (const [key, expected] of Object.entries(expectedCounts)) {
    const actual = countBy(ledger.cases, key);
    if (Object.keys(expected).some((value) => actual[value] !== expected[value]) || Object.keys(actual).some((value) => !(value in expected))) {
      fail(`ledger ${key} counts drifted`);
    }
  }
  const batched = Object.values(ledger.task_batches ?? {}).flat();
  if (batched.length !== 97 || new Set(batched).size !== 97 || numericIds.some((id) => !batched.includes(id))) fail('ledger task batch union drifted');
  return { cases: 97, requiredChecks: checkCount, agentBehaviorCases: agentBehaviorCount };
}

export function readCaseCompatibilityLedger(pathValue) {
  return parseYaml(readFileSync(pathValue, 'utf8'));
}

export function sha256Bytes(bytes) {
  return createHash('sha256').update(bytes).digest('hex');
}

export function posixShellQuote(value) {
  return `'${String(value).replaceAll("'", `'"'"'`)}'`;
}

const RUNTIME_TOKEN_VALUES = new Set(['RUN_CONTEXT_SH', 'CASE_RUN_ROOT_SH', 'PLAYBOOK_STATE_DIR_SH']);
const TOKEN_RE = /\{\{([^{}\r\n]+)\}\}/g;

function isShellWordBoundary(char) {
  return char === '' || /[ \t;|&()<>]/.test(char);
}

function quotedAt(line, offset) {
  let single = false;
  let double = false;
  let backtick = false;
  let escaped = false;
  for (let index = 0; index < offset; index += 1) {
    const char = line[index];
    if (escaped) { escaped = false; continue; }
    if (char === '\\' && !single) { escaped = true; continue; }
    if (char === "'" && !double && !backtick) single = !single;
    else if (char === '"' && !single && !backtick) double = !double;
    else if (char === '`' && !single && !double) backtick = !backtick;
  }
  return single || double || backtick;
}

export function renderRuntimeTokens(source, values) {
  for (const key of RUNTIME_TOKEN_VALUES) {
    if (!isAbsolute(values[key] ?? '')) fail(`runtime token ${key} must bind an absolute path`);
  }
  const lines = source.replace(/\r\n?/g, '\n').split('\n');
  let fence = null;
  let heredoc = null;
  const counts = Object.fromEntries([...RUNTIME_TOKEN_VALUES].map((key) => [key, 0]));
  const output = [];

  for (const line of lines) {
    const fenceMatch = line.match(/^\s*(`{3,}|~{3,})\s*([A-Za-z0-9_-]*)\s*$/);
    if (!fence && fenceMatch) {
      fence = { marker: fenceMatch[1][0], length: fenceMatch[1].length, language: fenceMatch[2] };
      output.push(line);
      continue;
    }
    if (fence && fenceMatch && fenceMatch[1][0] === fence.marker && fenceMatch[1].length >= fence.length && fenceMatch[2] === '') {
      fence = null;
      heredoc = null;
      output.push(line);
      continue;
    }

    const matches = [...line.matchAll(TOKEN_RE)];
    for (const match of matches) {
      const name = match[1];
      if (!RUNTIME_TOKEN_VALUES.has(name)) fail(`unknown runtime token: ${name}`);
      if (!fence || !['bash', 'sh'].includes(fence.language) || heredoc !== null) fail(`runtime token ${name} is outside executable bash/sh source`);
      const before = match.index === 0 ? '' : line[match.index - 1];
      const afterIndex = match.index + match[0].length;
      const after = afterIndex === line.length ? '' : line[afterIndex];
      if (!isShellWordBoundary(before) || !isShellWordBoundary(after) || quotedAt(line, match.index)) {
        fail(`runtime token ${name} must be an unquoted standalone shell word`);
      }
      counts[name] += 1;
    }

    let rendered = line;
    for (const match of matches) rendered = rendered.replace(match[0], posixShellQuote(values[match[1]]));
    output.push(rendered);

    if (fence && ['bash', 'sh'].includes(fence.language)) {
      if (heredoc !== null && line.trim() === heredoc) heredoc = null;
      else if (heredoc === null) {
        const heredocMatch = line.match(/<<-?\s*(?:'([^']+)'|"([^"]+)"|([A-Za-z_][A-Za-z0-9_]*))/);
        if (heredocMatch) heredoc = heredocMatch[1] ?? heredocMatch[2] ?? heredocMatch[3];
      }
    }
  }

  if (counts.RUN_CONTEXT_SH === 0 || counts.CASE_RUN_ROOT_SH === 0) fail('source playbook must bind context and case-run-root tokens');
  const rendered = output.join('\n');
  if (TOKEN_RE.test(rendered)) fail('rendered playbook contains unresolved runtime tokens');
  return { rendered, counts };
}

function parseJsonl(bytes) {
  if (bytes.length === 0 || bytes[bytes.length - 1] !== 0x0a) fail('trace must be non-empty and newline-terminated');
  const lines = bytes.toString('utf8').split('\n');
  lines.pop();
  return lines.map((line, index) => {
    try { return JSON.parse(line); } catch { fail(`trace line ${index + 1} is invalid JSON`); }
  });
}

export function evaluateVerdictTrace(bytes, policy) {
  const events = parseJsonl(bytes);
  const accepted = [];
  for (const [index, event] of events.entries()) {
    if (event?.event !== 'check' || event?.source !== 'playbook') continue;
    if (!PLAYBOOK_CHECK_ID_RE.test(event.gate ?? '') || typeof event.passed !== 'boolean' || typeof event.expected !== 'boolean') {
      fail(`playbook verdict check at trace event ${index + 1} is malformed`);
    }
    if (event.verdict_judge !== undefined && !['deterministic', 'real_human', 'ai_judge'].includes(event.verdict_judge)) {
      fail(`playbook verdict check at trace event ${index + 1} has invalid judge provenance`);
    }
    if (policy.verdict_judge === 'deterministic' && event.verdict_judge !== undefined) {
      fail(`deterministic verdict check at trace event ${index + 1} must not carry judge provenance`);
    }
    const row = { gate: event.gate, passed: event.passed, expected: event.expected };
    if (event.verdict_judge !== undefined) row.verdict_judge = event.verdict_judge;
    accepted.push({ ...row, index });
  }
  if (accepted.length === 0) fail('verdict trace has no accepted playbook checks');

  let considered;
  if (policy.verdict_mode === 'last') {
    const lastIndex = new Map();
    for (const row of accepted) lastIndex.set(row.gate, row.index);
    considered = accepted.filter((row) => lastIndex.get(row.gate) === row.index);
  } else considered = accepted;

  const consideredGates = new Set(considered.map((row) => row.gate));
  const missing = policy.required_checks.filter((gate) => !consideredGates.has(gate));
  if (missing.length) fail(`required verdict checks missing: ${missing.join(', ')}`);
  if (policy.verdict_judge !== 'deterministic') {
    const judgePresent = considered.some((row) => policy.required_checks.includes(row.gate) && row.verdict_judge === policy.verdict_judge);
    if (!judgePresent) fail(`required structured ${policy.verdict_judge} judge provenance missing`);
  }
  const cleanRows = considered.map(({ index: _index, ...row }) => row);
  return {
    outcome: cleanRows.every((row) => row.passed === row.expected) ? 'PASS' : 'FAIL',
    checksTotal: accepted.length,
    consideredChecks: cleanRows,
    eventCount: events.length,
  };
}

export function traceBinding(pathValue, { requireValid = false } = {}) {
  if (!existsSync(pathValue)) {
    if (requireValid) fail(`required trace missing: ${pathValue}`);
    return { trace_prefix_bytes: 0, trace_prefix_sha256: sha256Bytes(Buffer.alloc(0)), trace_parse_status: 'missing', trace_event_count: null, bytes: Buffer.alloc(0) };
  }
  const stat = lstatSync(pathValue);
  if (!stat.isFile() || stat.isSymbolicLink()) fail(`trace is not a non-symlink regular file: ${pathValue}`);
  const bytes = readFileSync(pathValue);
  try {
    const events = parseJsonl(bytes);
    return { trace_prefix_bytes: bytes.length, trace_prefix_sha256: sha256Bytes(bytes), trace_parse_status: 'valid', trace_event_count: events.length, bytes };
  } catch (error) {
    if (requireValid) throw error;
    return { trace_prefix_bytes: bytes.length, trace_prefix_sha256: sha256Bytes(bytes), trace_parse_status: 'invalid', trace_event_count: null, bytes };
  }
}

export function caseRootIdentity(pathValue) {
  const stat = lstatSync(pathValue, { bigint: true });
  if (!stat.isDirectory() || stat.isSymbolicLink()) fail(`case run root is not a non-symlink directory: ${pathValue}`);
  return { dev: stat.dev.toString(), ino: stat.ino.toString() };
}

export function loadRunContext(contextPath) {
  const absolute = resolve(contextPath);
  if (basename(absolute) !== RUN_CONTEXT_FILENAME) fail(`context filename must be ${RUN_CONTEXT_FILENAME}`);
  const stat = lstatSync(absolute);
  if (!stat.isFile() || stat.isSymbolicLink()) fail('context must be a non-symlink regular file');
  const bytes = readFileSync(absolute);
  const context = AgentExperimentRunContextSchema.parse(JSON.parse(bytes));
  const caseRoot = realpathSync(dirname(absolute));
  if (context.case_run_root !== caseRoot || context.completion_path !== join(caseRoot, COMPLETION_FILENAME)) fail('mutable context root/target fields do not match fixed coordinates');
  if (JSON.stringify(caseRootIdentity(caseRoot)) !== JSON.stringify(context.case_root_identity)) fail('case root identity changed');
  const repoRoot = realpathSync(context.repo_command_root);
  const expectedFrameworkRoot = realpathSync(join(repoRoot, 'DEEP_RESEARCH_HARNESS'));
  if (realpathSync(context.framework_root) !== expectedFrameworkRoot) fail('framework_root is not repo-root DEEP_RESEARCH_HARNESS');
  return {
    context,
    contextBytes: bytes,
    contextSha256: sha256Bytes(bytes),
    contextPath: absolute,
    caseRoot,
    registryPath: join(caseRoot, BUNDLE_REGISTRY_RELATIVE),
    completionPath: join(caseRoot, COMPLETION_FILENAME),
  };
}

export function createRunId() {
  return randomUUID();
}
