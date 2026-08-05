// @impl ERS-001, ERS-002, ERS-003, EXO-007
import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { describe, it } from 'node:test';

import {
  ExperimentSelectionObservationSchema,
  executionSurfaceFingerprint,
  executionSurfaceHelperDigest,
  sha256Bytes,
} from '../../DEEP_RESEARCH_HARNESS/host_tools/lib/agent-experiment-contract.mjs';
import {
  buildExecutionSurfaces,
  planExperimentRun,
  projectExperimentCases,
} from '../../DEEP_RESEARCH_HARNESS/host_tools/lib/experiment-run-strategy.mjs';

function digest(value) {
  return sha256Bytes(Buffer.from(value));
}

function entry({
  caseId,
  experiment = 'alpha',
  proofSubject = 'deterministic_contract',
  verdictMode = 'last',
  regressionRecommendation = undefined,
  regressionRetrySafety = undefined,
}) {
  const cost = caseId.match(/^case-\d+-(light|standard|heavy)-/)?.[1];
  assert.ok(cost, `case id must include a filename cost: ${caseId}`);
  return {
    path: `exp_${experiment}/${caseId}.md`,
    fullPath: `/virtual/${experiment}/${caseId}.md`,
    cost,
    frontmatter: {
      case: caseId,
      experiment,
      verdict_mode: verdictMode,
      health_profile: cost === 'heavy' ? 'heavy' : 'light',
      proof_subject: proofSubject,
      subject_execution: proofSubject === 'agent_behavior' ? 'real_agent' : 'none',
      fixture: proofSubject === 'agent_behavior' ? 'none' : 'fixture_backed',
      runtime: 'real_disposable_bundle',
      external_calls: proofSubject === 'agent_behavior' ? 'real' : 'none',
      verdict_judge: 'deterministic',
      ...(regressionRecommendation === undefined ? {} : { regression_recommendation: regressionRecommendation }),
      ...(regressionRetrySafety === undefined ? {} : { regression_retry_safety: regressionRetrySafety }),
    },
  };
}

function surface(entryValue, { source = null, helper = 'helper-v1', instruction = 'instruction-v1' } = {}) {
  const inventory = [{ path: 'DEEP_RESEARCH_HARNESS/host_tools/lib/example.mjs', sha256: digest(helper) }];
  const value = {
    schema_version: 'agent-experiment-execution-surface/v1',
    manifest_entry: { path: entryValue.path, case: entryValue.frontmatter.case },
    source_playbook_sha256: source ?? digest(`source:${entryValue.frontmatter.case}`),
    instruction_sha256: digest(instruction),
    framework_helper_inventory: inventory,
    framework_helper_sha256: executionSurfaceHelperDigest(inventory),
    fingerprint: null,
  };
  value.fingerprint = executionSurfaceFingerprint(value);
  return value;
}

function retained({ entry: entryValue, generatedAt = '2026-08-01T00:00:00.000Z', durationMs = 100, costUsd = 0.1, nativeOutcome = 'PASS', lifecycleOutcome = null, health = 'CLEAN', executionSurface = null, source = null }) {
  return {
    batch_id: '00000000-0000-4000-8000-000000000001',
    generated_at: generatedAt,
    origin: 'report',
    case: entryValue.frontmatter.case,
    experiment: entryValue.frontmatter.experiment,
    path: entryValue.path,
    duration_ms: durationMs,
    cost_usd: costUsd,
    native_outcome: nativeOutcome,
    lifecycle_outcome: lifecycleOutcome,
    effective_outcome: lifecycleOutcome ?? nativeOutcome,
    health,
    source_playbook_sha256: source ?? executionSurface?.source_playbook_sha256 ?? digest(`source:${entryValue.frontmatter.case}`),
    execution_surface: executionSurface,
    selection_observation: null,
  };
}

function surfacesFor(entries, options = new Map()) {
  return new Map(entries.map((entryValue) => [entryValue.frontmatter.case, surface(entryValue, options.get(entryValue.frontmatter.case))]));
}

function writeFixtureFile(repoRoot, relativePath, contents) {
  const targetPath = join(repoRoot, relativePath);
  mkdirSync(dirname(targetPath), { recursive: true });
  writeFileSync(targetPath, contents);
  return targetPath;
}

describe('Experiment Run Strategy', () => {
  it('keeps v1 selection observations readable while constraining v2 regression intent', () => {
    const profileSelection = {
      mode: 'profile',
      exact_selector: null,
      profile: 'calibration',
      prediction_basis: 'observed_matching',
      predicted_duration_ms: 100,
      predicted_cost_usd: 0.1,
      reserved_cost_usd: 0.1,
      selection_reason: ['fixture'],
    };
    assert.equal(ExperimentSelectionObservationSchema.parse({
      schema_version: 'agent-experiment-selection-observation/v1',
      ...profileSelection,
    }).schema_version, 'agent-experiment-selection-observation/v1');
    assert.equal(ExperimentSelectionObservationSchema.parse({
      schema_version: 'agent-experiment-selection-observation/v2',
      ...profileSelection,
      regression_intent: null,
    }).schema_version, 'agent-experiment-selection-observation/v2');
    assert.ok(!ExperimentSelectionObservationSchema.safeParse({
      schema_version: 'agent-experiment-selection-observation/v2',
      ...profileSelection,
      profile: 'regression',
      regression_intent: null,
    }).success);
    assert.ok(!ExperimentSelectionObservationSchema.safeParse({
      schema_version: 'agent-experiment-selection-observation/v2',
      ...profileSelection,
      regression_intent: 'qualification',
    }).success);
  });

  it('keeps v1 observations useful while reporting unknown, matching, and stale current relations separately', () => {
    const current = entry({ caseId: 'case-1-light-history' });
    const currentSurface = surface(current);
    const v1 = retained({ entry: current, executionSurface: null, source: currentSurface.source_playbook_sha256 });
    const v1Observation = projectExperimentCases({
      entries: [current],
      retainedObservations: [v1],
      executionSurfaces: new Map([[current.frontmatter.case, currentSurface]]),
    })[0].observation;
    assert.equal(v1Observation.source_relation, 'matching');
    assert.equal(v1Observation.execution_surface_relation, 'unknown');
    assert.equal(v1Observation.observed_duration_ms, 100);

    const matching = retained({ entry: current, executionSurface: currentSurface });
    const matchingObservation = projectExperimentCases({
      entries: [current],
      retainedObservations: [matching],
      executionSurfaces: new Map([[current.frontmatter.case, currentSurface]]),
    })[0].observation;
    assert.equal(matchingObservation.source_relation, 'matching');
    assert.equal(matchingObservation.execution_surface_relation, 'matching');

    const changedSurface = surface(current, { source: digest('changed-source') });
    const staleObservation = projectExperimentCases({
      entries: [current],
      retainedObservations: [matching],
      executionSurfaces: new Map([[current.frontmatter.case, changedSurface]]),
    })[0].observation;
    assert.equal(staleObservation.source_relation, 'stale');
    assert.equal(staleObservation.execution_surface_relation, 'stale');
    assert.equal(staleObservation.observed_cost_usd, 0.1);
  });

  it('hashes participating runtime helpers without treating framework documentation as execution surface', () => {
    const repoRoot = mkdtempSync(join(tmpdir(), 'experiment-run-strategy-'));
    try {
      const instructionPath = writeFixtureFile(repoRoot, 'experiments_playbook/RUN_AGENT_AUTORUN_EXPS.md', '# Headless instruction\n');
      const sourcePath = writeFixtureFile(repoRoot, 'experiments_playbook/exp_alpha/case-1-light-surface.md', 'node DEEP_RESEARCH_HARNESS/host_tools/finalize-agent-experiment.mjs\n');
      writeFixtureFile(repoRoot, 'DEEP_RESEARCH_HARNESS/host_tools/run-agent-experiment.mjs', "import './lib/agent-experiment-supervisor.mjs';\n");
      writeFixtureFile(repoRoot, 'DEEP_RESEARCH_HARNESS/host_tools/lib/agent-experiment-supervisor.mjs', 'export const lifecycle = true;\n');
      writeFixtureFile(repoRoot, 'DEEP_RESEARCH_HARNESS/host_tools/finalize-agent-experiment.mjs', 'export const completion = true;\n');
      writeFixtureFile(repoRoot, 'DEEP_RESEARCH_HARNESS/cli/inspect-bundle.mjs', 'export const inspect = true;\n');
      writeFixtureFile(repoRoot, 'DEEP_RESEARCH_HARNESS/cli/validate-bundle.mjs', 'export const validate = true;\n');
      writeFixtureFile(repoRoot, 'experiments_env/shared/verify-bundle-health.mjs', 'export const health = true;\n');
      writeFixtureFile(repoRoot, 'DEEP_RESEARCH_HARNESS/RUN.md', '# v0.66\n');
      const selectedEntry = {
        path: 'exp_alpha/case-1-light-surface.md',
        fullPath: sourcePath,
        frontmatter: { case: 'case-1-light-surface' },
      };

      const baseline = buildExecutionSurfaces({ entries: [selectedEntry], repoRoot, instructionPath }).get(selectedEntry.frontmatter.case);
      writeFixtureFile(repoRoot, 'DEEP_RESEARCH_HARNESS/RUN.md', '# v0.67\n');
      const documentationOnly = buildExecutionSurfaces({ entries: [selectedEntry], repoRoot, instructionPath }).get(selectedEntry.frontmatter.case);
      assert.equal(documentationOnly.fingerprint, baseline.fingerprint);
      assert.ok(!baseline.framework_helper_inventory.some((helper) => helper.path === 'DEEP_RESEARCH_HARNESS/RUN.md'));

      writeFixtureFile(repoRoot, 'DEEP_RESEARCH_HARNESS/host_tools/finalize-agent-experiment.mjs', 'export const completion = false;\n');
      const helperChanged = buildExecutionSurfaces({ entries: [selectedEntry], repoRoot, instructionPath }).get(selectedEntry.frontmatter.case);
      assert.notEqual(helperChanged.fingerprint, baseline.fingerprint);
    } finally {
      rmSync(repoRoot, { recursive: true, force: true });
    }
  });

  it('uses a filename initial estimate only for bounded calibration and does not persist a classification', () => {
    const current = entry({ caseId: 'case-2-light-unobserved' });
    const entries = [current];
    const plan = planExperimentRun({
      entries,
      executionSurfaces: surfacesFor(entries),
      profileRequest: {
        profile: 'calibration',
        selector: null,
        max_predicted_duration_ms: 120_000,
        max_total_budget_usd: 1,
        max_case_budget_usd: 0.25,
        agent_behavior_fresh_after_ms: 604_800_000,
        now: '2026-08-02T00:00:00.000Z',
      },
    });
    assert.equal(plan.selection.selected.length, 1);
    const selection = plan.selection.selected[0].selection_observation;
    assert.equal(selection.prediction_basis, 'filename_initial_estimate');
    assert.equal(selection.predicted_duration_ms, 120_000);
    assert.equal(selection.reserved_cost_usd, 0.25);
    assert.equal(Object.hasOwn(plan.items[0].observation, 'tier'), false);
    assert.equal(Object.hasOwn(plan.items[0].observation, 'classification'), false);
  });

  it('rotates discovery groups from retained selection history instead of taking the fastest manifest prefix', () => {
    const alpha = entry({ caseId: 'case-3-light-alpha', experiment: 'alpha' });
    const beta = entry({ caseId: 'case-4-light-beta', experiment: 'beta' });
    const entries = [alpha, beta];
    const executionSurfaces = surfacesFor(entries);
    const history = [
      retained({ entry: alpha, generatedAt: '2026-08-01T00:00:00.000Z', executionSurface: executionSurfaces.get(alpha.frontmatter.case), durationMs: 100 }),
      retained({ entry: beta, generatedAt: '2026-07-01T00:00:00.000Z', executionSurface: executionSurfaces.get(beta.frontmatter.case), durationMs: 100 }),
    ];
    const plan = planExperimentRun({
      entries,
      executionSurfaces,
      retainedObservations: history,
      profileRequest: {
        profile: 'discovery',
        selector: null,
        max_predicted_duration_ms: 200,
        max_total_budget_usd: null,
        max_case_budget_usd: null,
        agent_behavior_fresh_after_ms: 604_800_000,
        now: '2026-08-02T00:00:00.000Z',
      },
    });
    assert.deepEqual(plan.selection.selected.map((item) => item.case), ['case-4-light-beta', 'case-3-light-alpha']);
  });

  it('keeps PASS plus ISSUES as a diagnostic trigger without rewriting native outcome', () => {
    const current = entry({ caseId: 'case-5-light-health' });
    const executionSurfaces = surfacesFor([current]);
    const plan = planExperimentRun({
      entries: [current],
      executionSurfaces,
      retainedObservations: [retained({ entry: current, executionSurface: executionSurfaces.get(current.frontmatter.case), health: 'ISSUES' })],
      profileRequest: {
        profile: 'diagnostic',
        selector: null,
        max_predicted_duration_ms: 100,
        max_total_budget_usd: null,
        max_case_budget_usd: null,
        agent_behavior_fresh_after_ms: 604_800_000,
        now: '2026-08-02T00:00:00.000Z',
      },
    });
    assert.equal(plan.items[0].observation.native_outcome, 'PASS');
    assert.equal(plan.items[0].observation.health, 'ISSUES');
    assert.ok(plan.selection.selected[0].selection_observation.selection_reason.includes('pass_with_health_issues'));
  });

  it('reports a due Agent-behavior case as unavailable when its conservative calibration estimate cannot fit', () => {
    const current = entry({ caseId: 'case-6-heavy-agent', proofSubject: 'agent_behavior' });
    const plan = planExperimentRun({
      entries: [current],
      executionSurfaces: surfacesFor([current]),
      profileRequest: {
        profile: 'calibration',
        selector: null,
        max_predicted_duration_ms: 600_000,
        max_total_budget_usd: null,
        max_case_budget_usd: null,
        agent_behavior_fresh_after_ms: 604_800_000,
        now: '2026-08-02T00:00:00.000Z',
      },
    });
    assert.equal(plan.selection.selected.length, 0);
    assert.equal(plan.selection.agent_behavior_coverage.status, 'unavailable');
    assert.deepEqual(plan.selection.agent_behavior_coverage.cases, ['case-6-heavy-agent']);
    assert.ok(plan.selection.agent_behavior_coverage.reasons.includes('predicted_duration_exceeds_bound'));
  });

  it('reports a due Agent-behavior case as included when discovery admits it', () => {
    const current = entry({ caseId: 'case-7-heavy-agent', proofSubject: 'agent_behavior' });
    const executionSurfaces = surfacesFor([current]);
    const plan = planExperimentRun({
      entries: [current],
      executionSurfaces,
      retainedObservations: [retained({
        entry: current,
        executionSurface: executionSurfaces.get(current.frontmatter.case),
        generatedAt: '2026-07-01T00:00:00.000Z',
        durationMs: 200,
      })],
      profileRequest: {
        profile: 'discovery',
        selector: null,
        max_predicted_duration_ms: 200,
        max_total_budget_usd: null,
        max_case_budget_usd: null,
        agent_behavior_fresh_after_ms: 60_000,
        now: '2026-08-02T00:00:00.000Z',
      },
    });
    assert.equal(plan.selection.selected.length, 1);
    assert.equal(plan.selection.agent_behavior_coverage.status, 'included');
    assert.deepEqual(plan.selection.agent_behavior_coverage.cases, ['case-7-heavy-agent']);
  });

  it('derives regression membership from one latest matching v2 result and keeps author fields neutral', () => {
    const eligible = entry({ caseId: 'case-8-light-eligible', experiment: 'alpha', verdictMode: 'all', regressionRetrySafety: 'reviewed' });
    const unreviewed = entry({ caseId: 'case-9-light-unreviewed', experiment: 'beta', verdictMode: 'all', regressionRecommendation: 'recommended' });
    const agent = entry({ caseId: 'case-10-light-agent', experiment: 'gamma', proofSubject: 'agent_behavior' });
    const slow = entry({ caseId: 'case-11-light-slow', experiment: 'delta', regressionRecommendation: 'recommended' });
    const reviewedWithoutEvidence = entry({ caseId: 'case-17-light-reviewed-no-evidence', experiment: 'epsilon', verdictMode: 'all', regressionRetrySafety: 'reviewed' });
    const entries = [eligible, unreviewed, agent, slow, reviewedWithoutEvidence];
    const executionSurfaces = surfacesFor(entries);
    const history = [
      retained({ entry: eligible, executionSurface: executionSurfaces.get(eligible.frontmatter.case), durationMs: 120_000, costUsd: 0.60 }),
      retained({ entry: unreviewed, executionSurface: executionSurfaces.get(unreviewed.frontmatter.case) }),
      retained({ entry: agent, executionSurface: executionSurfaces.get(agent.frontmatter.case) }),
      retained({ entry: slow, executionSurface: executionSurfaces.get(slow.frontmatter.case), durationMs: 120_001 }),
    ];
    const plan = planExperimentRun({
      entries,
      executionSurfaces,
      retainedObservations: history,
      profileRequest: {
        profile: 'regression',
        selector: null,
        max_predicted_duration_ms: 480_000,
        max_total_budget_usd: 3,
        max_case_budget_usd: 0.60,
        agent_behavior_fresh_after_ms: 604_800_000,
        now: '2026-08-02T00:00:00.000Z',
      },
    });
    assert.deepEqual(plan.selection.selected.map((item) => item.case), ['case-8-light-eligible']);
    assert.equal(plan.selection.regression.intent, 'normal');
    assert.equal(plan.selection.regression.envelope.max_effective_case_budget_usd, 0.60);
    const admissions = new Map(plan.selection.regression.admissions.map((item) => [item.case, item]));
    assert.equal(admissions.get('case-8-light-eligible').status, 'eligible');
    assert.equal(admissions.get('case-9-light-unreviewed').status, 'ineligible');
    assert.ok(admissions.get('case-9-light-unreviewed').reasons.includes('all_mode_retry_safety_unreviewed'));
    assert.equal(admissions.get('case-10-light-agent').status, 'ineligible');
    assert.ok(admissions.get('case-10-light-agent').reasons.includes('proof_subject_agent_behavior'));
    assert.equal(admissions.get('case-11-light-slow').status, 'ineligible');
    assert.ok(admissions.get('case-11-light-slow').reasons.includes('duration_exceeds_fast_slo'));
    assert.equal(admissions.get('case-17-light-reviewed-no-evidence').status, 'ineligible');
    assert.ok(admissions.get('case-17-light-reviewed-no-evidence').reasons.includes('no_retained_result'));
    assert.deepEqual(plan.selection.regression.group_gaps.map((item) => item.experiment), ['beta', 'gamma', 'delta', 'epsilon']);
  });

  it('keeps fast v1 history qualification-only and never stitches facts across retained records', () => {
    const qualifying = entry({ caseId: 'case-12-light-qualification', experiment: 'alpha' });
    const stitched = entry({ caseId: 'case-13-light-stitched', experiment: 'beta' });
    const entries = [qualifying, stitched];
    const executionSurfaces = surfacesFor(entries);
    const history = [
      retained({ entry: qualifying, executionSurface: null, durationMs: 90_000, costUsd: 0.4 }),
      retained({ entry: stitched, generatedAt: '2026-08-01T00:00:00.000Z', executionSurface: null, durationMs: 90_000, costUsd: null }),
      retained({ entry: stitched, generatedAt: '2026-07-01T00:00:00.000Z', executionSurface: null, durationMs: 300_000, costUsd: 0.4 }),
    ];
    const normal = planExperimentRun({
      entries,
      executionSurfaces,
      retainedObservations: history,
      profileRequest: {
        profile: 'regression',
        selector: null,
        max_predicted_duration_ms: 480_000,
        max_total_budget_usd: 3,
        max_case_budget_usd: 0.60,
        agent_behavior_fresh_after_ms: 604_800_000,
        now: '2026-08-02T00:00:00.000Z',
      },
    });
    assert.equal(normal.selection.selected.length, 0);
    const normalAdmissions = new Map(normal.selection.regression.admissions.map((item) => [item.case, item]));
    assert.equal(normalAdmissions.get('case-12-light-qualification').status, 'needs_qualification');
    assert.equal(normalAdmissions.get('case-13-light-stitched').status, 'ineligible');
    assert.ok(normalAdmissions.get('case-13-light-stitched').reasons.includes('cost_missing'));

    const qualification = planExperimentRun({
      entries,
      executionSurfaces,
      retainedObservations: history,
      profileRequest: {
        profile: 'regression',
        regression_intent: 'qualification',
        selector: null,
        max_predicted_duration_ms: 480_000,
        max_total_budget_usd: 3,
        max_case_budget_usd: 0.60,
        agent_behavior_fresh_after_ms: 604_800_000,
        now: '2026-08-02T00:00:00.000Z',
      },
    });
    assert.deepEqual(qualification.selection.selected.map((item) => item.case), ['case-12-light-qualification']);
    assert.equal(qualification.selection.selected[0].selection_observation.schema_version, 'agent-experiment-selection-observation/v2');
    assert.equal(qualification.selection.selected[0].selection_observation.regression_intent, 'qualification');
    assert.equal(qualification.selection.selected[0].selection_observation.prediction_basis, 'observed_source_matching_history');
  });

  it('requires explicit qualification after execution-surface drift while source drift stays ineligible', () => {
    const executionDrift = entry({ caseId: 'case-18-light-execution-drift', experiment: 'alpha' });
    const sourceDrift = entry({ caseId: 'case-19-light-source-drift', experiment: 'beta' });
    const entries = [executionDrift, sourceDrift];
    const executionSurfaces = new Map([
      [executionDrift.frontmatter.case, surface(executionDrift, { helper: 'current-helper' })],
      [sourceDrift.frontmatter.case, surface(sourceDrift, { helper: 'current-helper' })],
    ]);
    const history = [
      retained({
        entry: executionDrift,
        executionSurface: surface(executionDrift, { helper: 'previous-helper' }),
        durationMs: 90_000,
        costUsd: 0.4,
      }),
      retained({
        entry: sourceDrift,
        executionSurface: surface(sourceDrift, { source: digest('previous-source'), helper: 'current-helper' }),
        durationMs: 90_000,
        costUsd: 0.4,
      }),
    ];
    const request = {
      profile: 'regression',
      selector: null,
      max_predicted_duration_ms: 480_000,
      max_total_budget_usd: 3,
      max_case_budget_usd: 0.60,
      agent_behavior_fresh_after_ms: 604_800_000,
      now: '2026-08-02T00:00:00.000Z',
    };

    const normal = planExperimentRun({ entries, executionSurfaces, retainedObservations: history, profileRequest: request });
    const normalAdmissions = new Map(normal.selection.regression.admissions.map((item) => [item.case, item]));
    assert.equal(normal.selection.selected.length, 0);
    assert.equal(normalAdmissions.get(executionDrift.frontmatter.case).status, 'needs_qualification');
    assert.ok(normalAdmissions.get(executionDrift.frontmatter.case).reasons.includes('matching_source_history_requires_execution_surface_qualification'));
    assert.equal(normalAdmissions.get(sourceDrift.frontmatter.case).status, 'ineligible');
    assert.ok(normalAdmissions.get(sourceDrift.frontmatter.case).reasons.includes('source_relation_stale'));

    const qualification = planExperimentRun({
      entries,
      executionSurfaces,
      retainedObservations: history,
      profileRequest: { ...request, regression_intent: 'qualification' },
    });
    assert.deepEqual(qualification.selection.selected.map((item) => item.case), [executionDrift.frontmatter.case]);
    assert.equal(qualification.selection.selected[0].selection_observation.prediction_basis, 'observed_source_matching_history');
  });

  it('rotates regression groups, applies recommendation within its group, and rejects widened bounds', () => {
    const alphaNeutral = entry({ caseId: 'case-14-light-alpha-neutral', experiment: 'alpha' });
    const alphaRecommended = entry({ caseId: 'case-15-light-alpha-recommended', experiment: 'alpha', regressionRecommendation: 'recommended' });
    const beta = entry({ caseId: 'case-16-light-beta', experiment: 'beta' });
    const entries = [alphaNeutral, alphaRecommended, beta];
    const executionSurfaces = surfacesFor(entries);
    const history = [
      retained({ entry: alphaNeutral, generatedAt: '2026-08-01T00:00:00.000Z', executionSurface: executionSurfaces.get(alphaNeutral.frontmatter.case), durationMs: 100, costUsd: 0.1 }),
      retained({ entry: alphaRecommended, generatedAt: '2026-07-31T00:00:00.000Z', executionSurface: executionSurfaces.get(alphaRecommended.frontmatter.case), durationMs: 100, costUsd: 0.1 }),
      retained({ entry: beta, generatedAt: '2026-07-01T00:00:00.000Z', executionSurface: executionSurfaces.get(beta.frontmatter.case), durationMs: 100, costUsd: 0.1 }),
    ];
    const plan = planExperimentRun({
      entries,
      executionSurfaces,
      retainedObservations: history,
      profileRequest: {
        profile: 'regression',
        selector: null,
        max_predicted_duration_ms: 480_000,
        max_total_budget_usd: 3,
        max_case_budget_usd: 0.60,
        agent_behavior_fresh_after_ms: 604_800_000,
        now: '2026-08-02T00:00:00.000Z',
      },
    });
    assert.deepEqual(plan.selection.selected.map((item) => item.case), ['case-16-light-beta', 'case-15-light-alpha-recommended']);
    assert.equal(plan.selection.selected.filter((item) => item.experiment === 'alpha').length, 1);
    const tightened = planExperimentRun({
      entries,
      executionSurfaces,
      retainedObservations: history,
      profileRequest: {
        profile: 'regression',
        selector: null,
        max_predicted_duration_ms: 480_000,
        max_total_budget_usd: 0.50,
        max_case_budget_usd: null,
        agent_behavior_fresh_after_ms: 604_800_000,
        now: '2026-08-02T00:00:00.000Z',
      },
    });
    assert.equal(tightened.selection.regression.envelope.max_effective_case_budget_usd, 0.50);
    assert.equal(tightened.selection.selected.length, 2);
    assert.throws(() => planExperimentRun({
      entries,
      executionSurfaces,
      retainedObservations: history,
      profileRequest: {
        profile: 'regression',
        selector: null,
        max_predicted_duration_ms: 480_001,
        max_total_budget_usd: 3,
        max_case_budget_usd: 0.60,
        agent_behavior_fresh_after_ms: 604_800_000,
        now: '2026-08-02T00:00:00.000Z',
      },
    }), /fast SLO/);
  });
});
