// @impl ERS-001, ERS-002, ERS-003, EXO-007
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  executionSurfaceFingerprint,
  executionSurfaceHelperDigest,
  sha256Bytes,
} from '../../DPT_FRAMEWORK/host_tools/lib/agent-experiment-contract.mjs';
import {
  planExperimentRun,
  projectExperimentCases,
} from '../../DPT_FRAMEWORK/host_tools/lib/experiment-run-strategy.mjs';

function digest(value) {
  return sha256Bytes(Buffer.from(value));
}

function entry({ caseId, experiment = 'alpha', proofSubject = 'deterministic_contract' }) {
  const cost = caseId.match(/^case-\d+-(light|standard|heavy)-/)?.[1];
  assert.ok(cost, `case id must include a filename cost: ${caseId}`);
  return {
    path: `exp_${experiment}/${caseId}.md`,
    fullPath: `/virtual/${experiment}/${caseId}.md`,
    cost,
    frontmatter: {
      case: caseId,
      experiment,
      health_profile: cost === 'heavy' ? 'heavy' : 'light',
      proof_subject: proofSubject,
      subject_execution: proofSubject === 'agent_behavior' ? 'real_agent' : 'none',
      fixture: proofSubject === 'agent_behavior' ? 'none' : 'fixture_backed',
      runtime: 'real_disposable_bundle',
      external_calls: proofSubject === 'agent_behavior' ? 'real' : 'none',
      verdict_judge: 'deterministic',
    },
  };
}

function surface(entryValue, { source = null, helper = 'helper-v1', instruction = 'instruction-v1' } = {}) {
  const inventory = [{ path: 'DPT_FRAMEWORK/host_tools/lib/example.mjs', sha256: digest(helper) }];
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

describe('Experiment Run Strategy', () => {
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
});
