// @impl ERS-001, ERS-002, ERS-003, EXO-007
// Read-only experiment observation and bounded selection helpers. This module never writes state or launches Agents.

import { lstatSync, existsSync, readFileSync, readdirSync, realpathSync } from 'node:fs';
import { join, relative, sep } from 'node:path';

import { z } from 'zod';

import {
  AgentExperimentAuditEventSchema,
  AgentExperimentBatchReportSchema,
  AgentExperimentExecutionSurfaceSchema,
  ExperimentExactSelectorSchema,
  ExperimentSelectionObservationSchema,
  executionSurfaceFingerprint,
  executionSurfaceHelperDigest,
  sha256Bytes,
} from './agent-experiment-contract.mjs';

export const INITIAL_DURATION_MS_BY_FILENAME_COST = Object.freeze({
  light: 120_000,
  standard: 600_000,
  heavy: 1_200_000,
});
export const DEFAULT_AGENT_BEHAVIOR_FRESH_AFTER_MS = 7 * 24 * 60 * 60 * 1000;

const CASE_ID_RE = /^case-\d+-(?:light|standard|heavy)-[a-z0-9-]+$/;
const PROFILE_NAMES = ['calibration', 'discovery', 'diagnostic', 'assurance'];
const relativePlaybookPath = z.string().regex(/^exp(?:h)?_[a-z0-9_-]+\/case-\d+-(?:light|standard|heavy)-[a-z0-9-]+\.md$/);
const finitePositive = z.number().finite().positive();
const timestamp = z.string().datetime();
const outcome = z.enum(['PASS', 'FAIL', 'NOT_RUN']).nullable();
const lifecycleOutcome = z.enum(['ERROR', 'CANCELLED']).nullable();
const health = z.enum(['CLEAN', 'ISSUES', 'ERROR']).nullable();

export const ExperimentRunStrategyRequestSchema = z.object({
  profile: z.enum(PROFILE_NAMES),
  selector: ExperimentExactSelectorSchema.nullable(),
  max_predicted_duration_ms: z.number().int().positive(),
  max_total_budget_usd: finitePositive.nullable(),
  max_case_budget_usd: finitePositive.nullable(),
  agent_behavior_fresh_after_ms: z.number().int().positive().default(DEFAULT_AGENT_BEHAVIOR_FRESH_AFTER_MS),
  now: timestamp,
}).strict().superRefine((value, ctx) => {
  if (value.profile === 'assurance' && value.selector === null) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['selector'], message: 'assurance requires an explicit selector scope' });
  }
  if (value.profile !== 'assurance' && value.selector !== null) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['selector'], message: 'only assurance may combine a profile with an exact selector' });
  }
  if (value.max_case_budget_usd !== null && value.max_total_budget_usd === null) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['max_case_budget_usd'], message: 'per-case budget requires a total budget' });
  }
  if (value.max_case_budget_usd !== null && value.max_total_budget_usd !== null && value.max_case_budget_usd > value.max_total_budget_usd) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['max_case_budget_usd'], message: 'per-case budget cannot exceed total budget' });
  }
});

export const ExperimentCaseObservationSchema = z.object({
  manifest_index: z.number().int().nonnegative(),
  case: z.string().regex(CASE_ID_RE),
  experiment: z.string().trim().min(1),
  path: relativePlaybookPath,
  filename_cost: z.enum(['light', 'standard', 'heavy']),
  health_profile: z.enum(['light', 'standard', 'heavy']),
  proof_profile: z.object({
    subject: z.enum(['deterministic_contract', 'agent_behavior']),
    execution: z.enum(['none', 'real_agent', 'real_subagent']),
    fixture: z.enum(['none', 'setup_only', 'fixture_backed']),
    runtime: z.literal('real_disposable_bundle'),
    external_calls: z.enum(['none', 'real']),
    verdict_judge: z.enum(['deterministic', 'real_human', 'ai_judge']),
  }).strict(),
  latest_observation_at: timestamp.nullable(),
  observed_duration_ms: z.number().int().nonnegative().nullable(),
  observed_cost_usd: z.number().finite().nonnegative().nullable(),
  native_outcome: outcome,
  lifecycle_outcome: lifecycleOutcome,
  effective_outcome: z.enum(['PASS', 'FAIL', 'NOT_RUN', 'HUMAN', 'ERROR', 'CANCELLED']).nullable(),
  health,
  source_relation: z.enum(['matching', 'stale', 'unknown']),
  execution_surface_relation: z.enum(['matching', 'stale', 'unknown']),
  execution_surface: AgentExperimentExecutionSurfaceSchema,
  diagnostic_reasons: z.array(z.string().trim().min(1)),
}).strict();

const SelectionCandidateSchema = z.object({
  case: z.string().regex(CASE_ID_RE),
  experiment: z.string().trim().min(1),
  path: relativePlaybookPath,
  filename_cost: z.enum(['light', 'standard', 'heavy']),
  health_profile: z.enum(['light', 'standard', 'heavy']),
  proof_subject: z.enum(['deterministic_contract', 'agent_behavior']),
  source_relation: z.enum(['matching', 'stale', 'unknown']),
  execution_surface_relation: z.enum(['matching', 'stale', 'unknown']),
  selection_observation: ExperimentSelectionObservationSchema,
}).strict();

const OmittedCandidateSchema = z.object({
  case: z.string().regex(CASE_ID_RE),
  experiment: z.string().trim().min(1),
  path: relativePlaybookPath,
  reason: z.string().trim().min(1),
  prediction_basis: z.enum(['observed_matching', 'observed_stale', 'filename_initial_estimate', 'unavailable']),
  predicted_duration_ms: z.number().int().nonnegative().nullable(),
  predicted_cost_usd: z.number().finite().nonnegative().nullable(),
}).strict();

const AgentBehaviorCoverageSchema = z.object({
  status: z.enum(['included', 'due', 'unavailable']),
  fresh_after_ms: z.number().int().positive(),
  cases: z.array(z.string().regex(CASE_ID_RE)),
  reasons: z.array(z.string().trim().min(1)).min(1),
}).strict();

export const ExperimentRunSelectionSchema = z.object({
  mode: z.enum(['exact', 'profile']),
  profile: z.enum(PROFILE_NAMES).nullable(),
  selected: z.array(SelectionCandidateSchema),
  omitted: z.array(OmittedCandidateSchema),
  agent_behavior_coverage: AgentBehaviorCoverageSchema.nullable(),
  retained_observation_diagnostics: z.array(z.string().trim().min(1)),
}).strict();

function fail(message) {
  throw new Error(message);
}

function compareTimestampDesc(left, right) {
  return Date.parse(right.generated_at) - Date.parse(left.generated_at);
}

function isoNow(now) {
  if (typeof now === 'string') return now;
  return new Date(now).toISOString();
}

function isRegularFile(pathValue, label) {
  const stat = lstatSync(pathValue);
  if (!stat.isFile() || stat.isSymbolicLink()) fail(`${label} must be a non-symlink regular file: ${pathValue}`);
}

function executionSurfacePath(prefix, root, filePath) {
  const fileRelative = relative(root, filePath).split(sep).join('/');
  if (!fileRelative || fileRelative.startsWith('../') || fileRelative.includes('/../')) fail(`helper path escapes its source root: ${filePath}`);
  return `${prefix}/${fileRelative}`;
}

function collectHelperFiles(prefix, logicalRoot) {
  if (!existsSync(logicalRoot)) fail(`execution-surface helper root is missing: ${logicalRoot}`);
  const logicalStat = lstatSync(logicalRoot);
  if (!logicalStat.isDirectory() && !logicalStat.isSymbolicLink()) fail(`execution-surface helper root is not a directory: ${logicalRoot}`);
  const root = realpathSync(logicalRoot);
  const rootStat = lstatSync(root);
  if (!rootStat.isDirectory() || rootStat.isSymbolicLink()) fail(`execution-surface helper root is unsafe: ${logicalRoot}`);

  const inventory = [];
  const walk = (pathValue) => {
    const stat = lstatSync(pathValue);
    if (stat.isSymbolicLink()) fail(`execution-surface helper path is a symlink: ${pathValue}`);
    if (stat.isDirectory()) {
      for (const entry of readdirSync(pathValue).sort()) walk(join(pathValue, entry));
      return;
    }
    if (!stat.isFile()) fail(`execution-surface helper path is not a regular file: ${pathValue}`);
    inventory.push({
      path: executionSurfacePath(prefix, root, pathValue),
      sha256: sha256Bytes(readFileSync(pathValue)),
    });
  };
  walk(root);
  return inventory;
}

/** Returns a reusable read-only helper/instruction identity snapshot. */
export function buildExecutionSurfaceSnapshot({ repoRoot, instructionPath }) {
  isRegularFile(instructionPath, 'instruction');
  const inventory = [
    ...collectHelperFiles('DPT_FRAMEWORK', join(repoRoot, 'DPT_FRAMEWORK')),
    ...collectHelperFiles('experiments_env/shared', join(repoRoot, 'experiments_env/shared')),
  ].sort((left, right) => (left.path < right.path ? -1 : left.path > right.path ? 1 : 0));
  return Object.freeze({
    instruction_sha256: sha256Bytes(readFileSync(instructionPath)),
    framework_helper_inventory: Object.freeze(inventory),
    framework_helper_sha256: executionSurfaceHelperDigest(inventory),
  });
}

/** Creates a strict v1 identity for one currently registered playbook. */
export function buildExecutionSurface(entry, snapshot) {
  isRegularFile(entry.fullPath, 'source playbook');
  const surface = {
    schema_version: 'agent-experiment-execution-surface/v1',
    manifest_entry: { path: entry.path, case: entry.frontmatter.case },
    source_playbook_sha256: sha256Bytes(readFileSync(entry.fullPath)),
    instruction_sha256: snapshot.instruction_sha256,
    framework_helper_inventory: snapshot.framework_helper_inventory,
    framework_helper_sha256: snapshot.framework_helper_sha256,
    fingerprint: null,
  };
  surface.fingerprint = executionSurfaceFingerprint(surface);
  return AgentExperimentExecutionSurfaceSchema.parse(surface);
}

export function buildExecutionSurfaces({ entries, repoRoot, instructionPath }) {
  const snapshot = buildExecutionSurfaceSnapshot({ repoRoot, instructionPath });
  return new Map(entries.map((entry) => [entry.frontmatter.case, buildExecutionSurface(entry, snapshot)]));
}

function nullableOutcome(value) {
  return ['PASS', 'FAIL', 'NOT_RUN'].includes(value) ? value : null;
}

function nullableLifecycle(value) {
  return ['ERROR', 'CANCELLED'].includes(value) ? value : null;
}

function nullableEffectiveOutcome(value) {
  return ['PASS', 'FAIL', 'NOT_RUN', 'HUMAN', 'ERROR', 'CANCELLED'].includes(value) ? value : null;
}

function nullableHealth(value) {
  return ['CLEAN', 'ISSUES', 'ERROR'].includes(value) ? value : null;
}

function nullableDuration(value) {
  return Number.isInteger(value) && value >= 0 ? value : null;
}

function nullableCost(value) {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0 ? value : null;
}

function normalizeRetainedResult({ batchId, generatedAt, result, executionSurface = null, origin }) {
  const sourcePlaybookSha256 = executionSurface?.source_playbook_sha256
    ?? result.completion?.source_playbook_sha256
    ?? result.run_context?.source_playbook_sha256
    ?? null;
  return {
    batch_id: batchId,
    generated_at: generatedAt,
    origin,
    case: result.case,
    experiment: result.experiment,
    path: result.playbook_path,
    duration_ms: nullableDuration(result.duration_ms),
    cost_usd: nullableCost(result.cost_usd),
    native_outcome: nullableOutcome(result.native_outcome),
    lifecycle_outcome: nullableLifecycle(result.lifecycle_outcome),
    effective_outcome: nullableEffectiveOutcome(result.effective_outcome),
    health: nullableHealth(result.health),
    source_playbook_sha256: sourcePlaybookSha256,
    execution_surface: executionSurface,
    selection_observation: result.selection_observation ?? null,
  };
}

function auditResultLooksUsable(event) {
  return event.event === 'case_result'
    && typeof event.case === 'string'
    && CASE_ID_RE.test(event.case)
    && typeof event.experiment === 'string'
    && typeof event.playbook_path === 'string'
    && typeof event.ts === 'string';
}

/** Reads retained reports/audit facts without converting malformed history into a launch failure. */
export function readRetainedExperimentObservations({ expBundlesRoot }) {
  const reportsRoot = join(expBundlesRoot, '_reports');
  const auditPath = join(expBundlesRoot, '_audit', 'agent-experiment-runs.jsonl');
  const diagnostics = [];
  const observations = [];
  const reportKeys = new Set();

  if (existsSync(reportsRoot)) {
    for (const name of readdirSync(reportsRoot).sort()) {
      if (!name.endsWith('.json')) continue;
      const pathValue = join(reportsRoot, name);
      try {
        isRegularFile(pathValue, 'retained report');
        const parsed = AgentExperimentBatchReportSchema.safeParse(JSON.parse(readFileSync(pathValue, 'utf8')));
        if (!parsed.success) {
          diagnostics.push(`retained_report_invalid:${name}`);
          continue;
        }
        const report = parsed.data;
        for (const result of report.results) {
          const executionSurface = report.schema_version === 'agent-experiment-batch-report/v2'
            ? result.execution_surface
            : null;
          observations.push(normalizeRetainedResult({
            batchId: report.batch_id,
            generatedAt: report.generated_at,
            result,
            executionSurface,
            origin: 'report',
          }));
          reportKeys.add(`${report.batch_id}:${result.case}`);
        }
      } catch (error) {
        diagnostics.push(`retained_report_unreadable:${name}:${error.message}`);
      }
    }
  }

  if (existsSync(auditPath)) {
    try {
      isRegularFile(auditPath, 'retained audit');
      const lines = readFileSync(auditPath, 'utf8').split(/\r?\n/).filter(Boolean);
      for (const [index, line] of lines.entries()) {
        try {
          const parsed = AgentExperimentAuditEventSchema.safeParse(JSON.parse(line));
          if (!parsed.success || !auditResultLooksUsable(parsed.data)) {
            diagnostics.push(`retained_audit_invalid:${index + 1}`);
            continue;
          }
          const event = parsed.data;
          if (reportKeys.has(`${event.batch_id}:${event.case}`)) continue;
          observations.push(normalizeRetainedResult({
            batchId: event.batch_id,
            generatedAt: event.ts,
            result: event,
            executionSurface: event.schema_version === 'agent-experiment-audit-event/v2' ? event.execution_surface : null,
            origin: 'audit',
          }));
        } catch (error) {
          diagnostics.push(`retained_audit_unreadable:${index + 1}:${error.message}`);
        }
      }
    } catch (error) {
      diagnostics.push(`retained_audit_unreadable:${error.message}`);
    }
  }

  return {
    observations: observations.sort(compareTimestampDesc),
    diagnostics,
  };
}

function relationForSource(current, retained) {
  if (!retained?.source_playbook_sha256) return 'unknown';
  return retained.source_playbook_sha256 === current.source_playbook_sha256 ? 'matching' : 'stale';
}

function relationForExecutionSurface(current, retained) {
  if (!retained?.execution_surface?.fingerprint) return 'unknown';
  return retained.execution_surface.fingerprint === current.fingerprint ? 'matching' : 'stale';
}

function proofProfile(entry) {
  return {
    subject: entry.frontmatter.proof_subject,
    execution: entry.frontmatter.subject_execution,
    fixture: entry.frontmatter.fixture,
    runtime: entry.frontmatter.runtime,
    external_calls: entry.frontmatter.external_calls,
    verdict_judge: entry.frontmatter.verdict_judge,
  };
}

function historyByCase(observations) {
  const result = new Map();
  for (const observation of observations) {
    const history = result.get(observation.case) ?? [];
    history.push(observation);
    result.set(observation.case, history);
  }
  for (const history of result.values()) history.sort(compareTimestampDesc);
  return result;
}

/** Projects current registration and retained facts into virtual, non-persistent observations. */
export function projectExperimentCases({ entries, retainedObservations = [], executionSurfaces }) {
  const byCase = historyByCase(retainedObservations);
  return entries.map((entry, manifestIndex) => {
    const executionSurface = executionSurfaces.get(entry.frontmatter.case);
    if (!executionSurface) fail(`execution surface is missing for ${entry.frontmatter.case}`);
    const history = byCase.get(entry.frontmatter.case) ?? [];
    const latest = history[0] ?? null;
    const latestDuration = history.find((item) => item.duration_ms !== null)?.duration_ms ?? null;
    const latestCost = history.find((item) => item.cost_usd !== null)?.cost_usd ?? null;
    const diagnosticReasons = [];
    const sourceRelation = relationForSource(executionSurface, latest);
    const executionRelation = relationForExecutionSurface(executionSurface, latest);
    if (!latest) diagnosticReasons.push('no_retained_observation');
    if (sourceRelation === 'unknown') diagnosticReasons.push('source_relation_unknown');
    if (sourceRelation === 'stale') diagnosticReasons.push('source_relation_stale');
    if (executionRelation === 'unknown') diagnosticReasons.push('execution_surface_unknown');
    if (executionRelation === 'stale') diagnosticReasons.push('execution_surface_stale');
    if (latestDuration === null) diagnosticReasons.push('duration_unknown');
    if (latestCost === null) diagnosticReasons.push('cost_unknown');
    if (latest?.native_outcome === 'FAIL') diagnosticReasons.push('native_fail');
    if (latest?.native_outcome === 'NOT_RUN') diagnosticReasons.push('native_not_run');
    if (latest?.lifecycle_outcome === 'ERROR') diagnosticReasons.push('lifecycle_error');
    if (latest?.lifecycle_outcome === 'CANCELLED') diagnosticReasons.push('lifecycle_cancelled');
    if (latest?.native_outcome === 'PASS' && latest?.health === 'ISSUES') diagnosticReasons.push('pass_with_health_issues');
    const observation = ExperimentCaseObservationSchema.parse({
      manifest_index: manifestIndex,
      case: entry.frontmatter.case,
      experiment: entry.frontmatter.experiment,
      path: entry.path,
      filename_cost: entry.cost,
      health_profile: entry.frontmatter.health_profile,
      proof_profile: proofProfile(entry),
      latest_observation_at: latest?.generated_at ?? null,
      observed_duration_ms: latestDuration,
      observed_cost_usd: latestCost,
      native_outcome: latest?.native_outcome ?? null,
      lifecycle_outcome: latest?.lifecycle_outcome ?? null,
      effective_outcome: latest?.effective_outcome ?? null,
      health: latest?.health ?? null,
      source_relation: sourceRelation,
      execution_surface_relation: executionRelation,
      execution_surface: executionSurface,
      diagnostic_reasons: diagnosticReasons,
    });
    return { entry, observation, history };
  });
}

function currentHistoricalPrediction(item, { allowInitialEstimate }) {
  const historical = item.history.find((record) => record.duration_ms !== null) ?? null;
  if (historical) {
    const sourceRelation = relationForSource(item.observation.execution_surface, historical);
    const executionRelation = relationForExecutionSurface(item.observation.execution_surface, historical);
    const basis = sourceRelation === 'matching' && executionRelation === 'matching'
      ? 'observed_matching'
      : 'observed_stale';
    const costRecord = historical.cost_usd !== null
      ? historical
      : item.history.find((record) => record.cost_usd !== null) ?? null;
    return {
      basis,
      duration_ms: historical.duration_ms,
      cost_usd: costRecord?.cost_usd ?? null,
      reasons: basis === 'observed_matching' ? ['observed_duration_matching_surface'] : ['observed_duration_stale_or_unknown_surface'],
    };
  }
  if (allowInitialEstimate) {
    return {
      basis: 'filename_initial_estimate',
      duration_ms: INITIAL_DURATION_MS_BY_FILENAME_COST[item.observation.filename_cost],
      cost_usd: null,
      reasons: ['filename_initial_duration_estimate'],
    };
  }
  return { basis: 'unavailable', duration_ms: null, cost_usd: null, reasons: ['duration_prediction_unavailable'] };
}

function headlessEligible(item) {
  const id = Number(item.observation.case.match(/^case-(\d+)-/)?.[1]);
  return !(id >= 901 && id <= 949);
}

function isCalibrationCandidate(item) {
  const observation = item.observation;
  return observation.source_relation !== 'matching'
    || observation.execution_surface_relation !== 'matching'
    || observation.observed_duration_ms === null
    || observation.observed_cost_usd === null
    || observation.native_outcome === null;
}

function isDiscoveryClean(item) {
  const observation = item.observation;
  return observation.native_outcome === 'PASS'
    && observation.lifecycle_outcome === null
    && observation.health === 'CLEAN';
}

function diagnosticReasons(item) {
  const observation = item.observation;
  const reasons = [];
  if (observation.native_outcome === 'FAIL') reasons.push('native_fail');
  if (observation.native_outcome === 'NOT_RUN') reasons.push('native_not_run');
  if (observation.lifecycle_outcome === 'ERROR') reasons.push('lifecycle_error');
  if (observation.lifecycle_outcome === 'CANCELLED') reasons.push('lifecycle_cancelled');
  if (observation.native_outcome === 'PASS' && observation.health === 'ISSUES') reasons.push('pass_with_health_issues');
  return reasons;
}

function matchingExactScope(items, selector) {
  let selected = items.filter((item) => {
    if (selector.case !== null) return item.observation.case === selector.case;
    if (selector.all) return true;
    if (selector.group !== null && item.observation.experiment !== selector.group) return false;
    if (selector.tier !== null && item.observation.filename_cost !== selector.tier) return false;
    return selector.group !== null || selector.tier !== null;
  });
  if (selector.case === null) selected = selected.filter(headlessEligible);
  if (selected.length === 0) fail('selection is empty or the exact group/tier is unknown');
  return selected;
}

function groupLastSelectedAt(items) {
  const result = new Map();
  for (const item of items) {
    const latest = item.history[0]?.generated_at;
    if (!latest) continue;
    const previous = result.get(item.observation.experiment);
    if (!previous || Date.parse(latest) > Date.parse(previous)) result.set(item.observation.experiment, latest);
  }
  return result;
}

function rotateByGroup(items, recency) {
  const groups = new Map();
  for (const item of items) {
    const group = groups.get(item.observation.experiment) ?? [];
    group.push(item);
    groups.set(item.observation.experiment, group);
  }
  const orderedGroups = [...groups.keys()].sort((left, right) => {
    const leftMs = recency.has(left) ? Date.parse(recency.get(left)) : 0;
    const rightMs = recency.has(right) ? Date.parse(recency.get(right)) : 0;
    return leftMs - rightMs || left.localeCompare(right);
  });
  for (const group of groups.values()) group.sort((left, right) => left.observation.manifest_index - right.observation.manifest_index);
  const result = [];
  while (orderedGroups.some((group) => groups.get(group).length > 0)) {
    for (const group of orderedGroups) {
      const item = groups.get(group).shift();
      if (item) result.push(item);
    }
  }
  return result;
}

function omittedView(item, reason, prediction) {
  return {
    case: item.observation.case,
    experiment: item.observation.experiment,
    path: item.observation.path,
    reason,
    prediction_basis: prediction.basis,
    predicted_duration_ms: prediction.duration_ms,
    predicted_cost_usd: prediction.cost_usd,
  };
}

function selectedView(item, selectionObservation) {
  return {
    case: item.observation.case,
    experiment: item.observation.experiment,
    path: item.observation.path,
    filename_cost: item.observation.filename_cost,
    health_profile: item.observation.health_profile,
    proof_subject: item.observation.proof_profile.subject,
    source_relation: item.observation.source_relation,
    execution_surface_relation: item.observation.execution_surface_relation,
    selection_observation: selectionObservation,
  };
}

function isFreshAgentBehavior(item, nowMs, freshAfterMs) {
  const observedAt = item.observation.latest_observation_at;
  if (item.observation.proof_profile.subject !== 'agent_behavior' || !observedAt) return false;
  return item.observation.native_outcome === 'PASS'
    && item.observation.lifecycle_outcome === null
    && item.observation.health === 'CLEAN'
    && item.observation.execution_surface_relation === 'matching'
    && nowMs - Date.parse(observedAt) <= freshAfterMs;
}

function coverageForAgentBehavior({ profile, allItems, selectedItems, omitted, request }) {
  if (!['calibration', 'discovery'].includes(profile)) return null;
  const nowMs = Date.parse(request.now);
  const agentItems = allItems.filter((item) => headlessEligible(item) && item.observation.proof_profile.subject === 'agent_behavior');
  if (agentItems.length === 0) {
    return { status: 'unavailable', fresh_after_ms: request.agent_behavior_fresh_after_ms, cases: [], reasons: ['no_headless_agent_behavior_case'] };
  }
  const due = agentItems.filter((item) => !isFreshAgentBehavior(item, nowMs, request.agent_behavior_fresh_after_ms));
  if (due.length === 0) {
    return {
      status: 'included',
      fresh_after_ms: request.agent_behavior_fresh_after_ms,
      cases: agentItems.map((item) => item.observation.case),
      reasons: ['matching_agent_behavior_observation_is_fresh'],
    };
  }
  const dueCases = new Set(due.map((item) => item.observation.case));
  const included = selectedItems.filter((item) => dueCases.has(item.observation.case));
  if (included.length > 0) {
    return {
      status: 'included',
      fresh_after_ms: request.agent_behavior_fresh_after_ms,
      cases: included.map((item) => item.observation.case),
      reasons: ['due_agent_behavior_case_selected'],
    };
  }
  const dueOmissions = omitted.filter((item) => dueCases.has(item.case));
  const unavailable = dueOmissions.length > 0
    && dueOmissions.every((item) => ['duration_prediction_unavailable', 'predicted_duration_exceeds_bound', 'predicted_cost_exceeds_case_budget', 'predicted_cost_exceeds_total_budget'].includes(item.reason));
  return {
    status: unavailable ? 'unavailable' : 'due',
    fresh_after_ms: request.agent_behavior_fresh_after_ms,
    cases: due.map((item) => item.observation.case),
    reasons: unavailable
      ? [...new Set(dueOmissions.map((item) => item.reason))]
      : ['agent_behavior_observation_is_due'],
  };
}

/** Selects a bounded profile from caller-supplied facts; it performs no filesystem writes or runtime launch. */
export function selectExperimentRunProfile({ items, request, retainedObservationDiagnostics = [] }) {
  const parsedRequest = ExperimentRunStrategyRequestSchema.parse(request);
  let candidates;
  const candidateReasons = new Map();
  if (parsedRequest.profile === 'calibration') {
    candidates = items.filter((item) => headlessEligible(item) && isCalibrationCandidate(item));
    for (const item of candidates) candidateReasons.set(item, ['profile_calibration', ...item.observation.diagnostic_reasons.filter((reason) => reason.endsWith('_unknown') || reason.endsWith('_stale') || reason === 'cost_unknown' || reason === 'duration_unknown')]);
    candidates = rotateByGroup(candidates, groupLastSelectedAt(items));
  } else if (parsedRequest.profile === 'discovery') {
    const dueAgentItems = items.filter((item) => headlessEligible(item)
      && item.observation.proof_profile.subject === 'agent_behavior'
      && !isFreshAgentBehavior(item, Date.parse(parsedRequest.now), parsedRequest.agent_behavior_fresh_after_ms));
    const cleanItems = items.filter((item) => headlessEligible(item) && isDiscoveryClean(item));
    candidates = [...new Set([...dueAgentItems, ...cleanItems])];
    for (const item of candidates) {
      candidateReasons.set(item, [
        'profile_discovery',
        ...(dueAgentItems.includes(item) ? ['agent_behavior_due'] : ['discovery_clean_sample']),
      ]);
    }
    const rotated = rotateByGroup(candidates, groupLastSelectedAt(items));
    const firstDueAgent = rotated.find((item) => dueAgentItems.includes(item));
    candidates = firstDueAgent ? [firstDueAgent, ...rotated.filter((item) => item !== firstDueAgent)] : rotated;
  } else if (parsedRequest.profile === 'diagnostic') {
    candidates = items.filter((item) => headlessEligible(item) && diagnosticReasons(item).length > 0)
      .sort((left, right) => left.observation.manifest_index - right.observation.manifest_index);
    for (const item of candidates) candidateReasons.set(item, ['profile_diagnostic', ...diagnosticReasons(item)]);
  } else {
    const scoped = matchingExactScope(items, parsedRequest.selector);
    candidates = scoped.filter(headlessEligible);
    if (candidates.length === 0) fail('assurance scope contains no Headless-eligible case');
    for (const item of candidates) candidateReasons.set(item, ['profile_assurance', 'explicit_assurance_scope']);
  }

  const selected = [];
  const selectedViews = [];
  const omitted = [];
  let reservedDurationMs = 0;
  let reservedCostUsd = 0;
  for (const item of candidates) {
    const prediction = currentHistoricalPrediction(item, { allowInitialEstimate: parsedRequest.profile === 'calibration' });
    if (prediction.duration_ms === null) {
      omitted.push(omittedView(item, 'duration_prediction_unavailable', prediction));
      continue;
    }
    if (reservedDurationMs + prediction.duration_ms > parsedRequest.max_predicted_duration_ms) {
      omitted.push(omittedView(item, 'predicted_duration_exceeds_bound', prediction));
      continue;
    }
    let reservation = null;
    if (parsedRequest.max_total_budget_usd !== null) {
      const remainingTotal = parsedRequest.max_total_budget_usd - reservedCostUsd;
      const caseLimit = parsedRequest.max_case_budget_usd ?? remainingTotal;
      reservation = prediction.cost_usd ?? caseLimit;
      if (prediction.cost_usd !== null && prediction.cost_usd > caseLimit) {
        omitted.push(omittedView(item, 'predicted_cost_exceeds_case_budget', prediction));
        continue;
      }
      if (reservation > remainingTotal) {
        omitted.push(omittedView(item, 'predicted_cost_exceeds_total_budget', prediction));
        continue;
      }
    }
    const selectionObservation = ExperimentSelectionObservationSchema.parse({
      schema_version: 'agent-experiment-selection-observation/v1',
      mode: 'profile',
      exact_selector: parsedRequest.profile === 'assurance' ? parsedRequest.selector : null,
      profile: parsedRequest.profile,
      prediction_basis: prediction.basis,
      predicted_duration_ms: prediction.duration_ms,
      predicted_cost_usd: prediction.cost_usd,
      reserved_cost_usd: reservation,
      selection_reason: [...candidateReasons.get(item), ...prediction.reasons, 'within_explicit_bounds'],
    });
    selected.push({ ...item, selection_observation: selectionObservation });
    selectedViews.push(selectedView(item, selectionObservation));
    reservedDurationMs += prediction.duration_ms;
    if (reservation !== null) reservedCostUsd += reservation;
  }
  const selection = ExperimentRunSelectionSchema.parse({
    mode: 'profile',
    profile: parsedRequest.profile,
    selected: selectedViews,
    omitted,
    agent_behavior_coverage: coverageForAgentBehavior({
      profile: parsedRequest.profile,
      allItems: items,
      selectedItems: selected,
      omitted,
      request: parsedRequest,
    }),
    retained_observation_diagnostics: retainedObservationDiagnostics,
  });
  return { selected, selection };
}

/** Produces direct-selector metadata without attaching a virtual profile or prediction claim. */
export function selectExactExperimentCases({ items, selector, retainedObservationDiagnostics = [] }) {
  const parsedSelector = ExperimentExactSelectorSchema.parse(selector);
  const scoped = matchingExactScope(items, parsedSelector);
  const selected = scoped.map((item) => {
    const selectionObservation = ExperimentSelectionObservationSchema.parse({
      schema_version: 'agent-experiment-selection-observation/v1',
      mode: 'exact',
      exact_selector: parsedSelector,
      profile: null,
      prediction_basis: 'explicit_selector',
      predicted_duration_ms: null,
      predicted_cost_usd: null,
      reserved_cost_usd: null,
      selection_reason: ['explicit_legacy_selector'],
    });
    return { ...item, selection_observation: selectionObservation };
  });
  const selection = ExperimentRunSelectionSchema.parse({
    mode: 'exact',
    profile: null,
    selected: selected.map((item) => selectedView(item, item.selection_observation)),
    omitted: [],
    agent_behavior_coverage: null,
    retained_observation_diagnostics: retainedObservationDiagnostics,
  });
  return { selected, selection };
}

/** Convenience composition for the Supervisor and deterministic unit tests. */
export function planExperimentRun({ entries, executionSurfaces, retainedObservations = [], retainedObservationDiagnostics = [], profileRequest = null, selector = null }) {
  const items = projectExperimentCases({ entries, retainedObservations, executionSurfaces });
  if (profileRequest !== null) {
    return { items, ...selectExperimentRunProfile({ items, request: profileRequest, retainedObservationDiagnostics }) };
  }
  return { items, ...selectExactExperimentCases({ items, selector, retainedObservationDiagnostics }) };
}
