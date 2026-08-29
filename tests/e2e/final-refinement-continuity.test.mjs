// @impl ARP-004, CPT-003, RRD-007, RRD-008, CDP-003, CDP-004, CDP-005, CDP-006, POF-001, WNC-005
// This deterministic E2E uses simulated Agent staging only. Production CLIs own
// the observed lifecycle and persistence facts; it makes no report-quality or satisfaction claim.

import assert from 'node:assert/strict';
import { after, before, describe, it } from 'node:test';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

import { inspectPostFinalRecovery } from '../../DEEP_RESEARCH_HARNESS/engine/helpers/post-final-recovery.mjs';
import {
  advanceStatus,
  cleanupRoot,
  createTempRoot,
  enterPhase,
  parseJsonOutput,
  readStatus,
  readTrace,
  REPO_ROOT,
  restoreBundle,
  runGate,
  runNode,
  snapshotBundle,
} from './helpers/deterministic-chain-harness.mjs';
import { buildHitl2Baseline, passAndEnter, stageHitl2 } from './helpers/research-chain-fixture.mjs';

const PUBLISH = join(REPO_ROOT, 'DEEP_RESEARCH_HARNESS/cli/operate-artifact-persistence.mjs');
const POST_FINAL = join(REPO_ROOT, 'DEEP_RESEARCH_HARNESS/cli/operate-post-final-recovery.mjs');
const REENTRY = join(REPO_ROOT, 'DEEP_RESEARCH_HARNESS/cli/check-reentry.mjs');

let root;
let baseline;
let snapshot;

// Shared immutable HITL2 baseline: built once per test run via production
// predecessors, byte-snapshotted, restored to its original path per test.
function restoredBundle() {
  restoreBundle(snapshot, baseline);
  return baseline;
}

function simulatedFinalReport(backing, title) {
  return [
    `# ${title}`,
    '',
    'Simulated Agent action for deterministic lifecycle coverage only.',
    '',
    '## Evidence Map',
    '',
    '| Finding ID | Declared Key Finding | Submitted Backing |',
    '| --- | --- | --- |',
    `| F-001 | The fixture retains one submitted backing reference. | ${backing} |`,
    '',
  ].join('\n');
}

function stageReport(bundle, label, title) {
  const directory = join(bundle, '_tmp', 'simulated-final-staging');
  mkdirSync(directory, { recursive: true });
  const source = join(directory, `${label}.md`);
  writeFileSync(source, simulatedFinalReport('[submitted source](../artifacts/wave0/topic-a/source.yaml)', title));
  return source;
}

function publish(bundle, source, feature = null) {
  const args = [PUBLISH, 'publish-final-report', '--bundle', bundle, '--source', source];
  if (feature) args.push('--feature', feature);
  const output = parseJsonOutput(runNode(args));
  assert.equal(output.verdict, 'committed', JSON.stringify(output));
  assert.equal(output.check.passed, true, JSON.stringify(output));
  return output;
}

function reachEmptyFinal(bundle) {
  runNode([join(REPO_ROOT, 'DEEP_RESEARCH_HARNESS/cli/apply-research-style.mjs'), '--bundle', bundle, '--style', 'quick_factual']);
  stageHitl2(bundle, 'proceed_to_readiness', 0);
  passAndEnter(bundle, 'hitl2-recorded', 'phases/phase-hitl2.md', 'hitl2_recorded');
  const readiness = runGate(bundle, 'readiness-passed', 'phases/phase-readiness.md');
  assert.equal(readiness.output.check.passed, true, JSON.stringify(readiness.output.inspect));
  return readiness;
}

function enterAndSynchronizeFinal(bundle, readiness) {
  enterPhase(bundle, readiness.output.check.next);
  assert.equal(readStatus(bundle).current_node, 'phases/phase-final.md');
  advanceStatus(bundle, 'readiness_passed');
  assert.equal(readStatus(bundle).current_node, 'phases/phase-final.md');
}

function currentFinalOwner(bundle) {
  const output = parseJsonOutput(runNode([REENTRY, '--bundle', bundle, '--at', 'readiness_passed']));
  const rootFinding = output.recovery.root_findings.find((finding) => finding.source_ref === 'post-final-recovery');
  assert.ok(rootFinding, JSON.stringify(output.recovery));
  assert.equal(rootFinding.recommended_action.kind, 'current_owner');
  assert.equal(rootFinding.recommended_action.target_ref, 'phases/phase-final.md');
  return output;
}

before(() => {
  root = createTempRoot();
  baseline = buildHitl2Baseline(root, 'final-shared');
  snapshot = snapshotBundle(baseline, root);
});
after(() => cleanupRoot(root));

describe('Final refinement continuity through production CLIs', { timeout: 120000 }, () => {
  it('rejects a premature primary-looking file before Final entry without entry mutation', () => {
    const bundle = restoredBundle();
    const readiness = reachEmptyFinal(bundle);
    mkdirSync(join(bundle, 'final'), { recursive: true });
    writeFileSync(join(bundle, 'final', 'final.md'), '# Premature simulated report\n');
    const beforeStatus = readFileSync(join(bundle, 'rb_status.json'), 'utf8');
    const beforeTrace = readFileSync(join(bundle, 'rb_trace.jsonl'), 'utf8');

    const rejected = enterPhase(bundle, readiness.output.check.next, { expectedStatus: 1 });
    assert.match(rejected.stdout, /requires an empty primary inventory/i);
    assert.equal(readFileSync(join(bundle, 'rb_status.json'), 'utf8'), beforeStatus);
    assert.equal(readFileSync(join(bundle, 'rb_trace.jsonl'), 'utf8'), beforeTrace);
  });

  it('delivers the base, refines in place, and accepts ReopenResearchPass only after an explicit expansion request', () => {
    const bundle = restoredBundle();
    const readiness = reachEmptyFinal(bundle);
    enterAndSynchronizeFinal(bundle, readiness);

    const base = publish(bundle, stageReport(bundle, 'base', 'Base Final'));
    assert.equal(base.target, 'final/final.md');
    const baseBytes = readFileSync(join(bundle, base.target));

    const v1 = publish(bundle, stageReport(bundle, 'v1', 'Presentation Revision'));
    assert.equal(v1.target, 'final/final_v1.md');
    const v1Bytes = readFileSync(join(bundle, v1.target));
    assert.deepEqual(readFileSync(join(bundle, base.target)), baseBytes);

    const v2 = publish(bundle, stageReport(bundle, 'v2', 'Technical Presentation Revision'), 'technical_deep_dive');
    assert.equal(v2.target, 'final/final_technical_deep_dive_v2.md');
    assert.deepEqual(readFileSync(join(bundle, base.target)), baseBytes);
    assert.deepEqual(readFileSync(join(bundle, v1.target)), v1Bytes);
    for (const target of [base.target, v1.target, v2.target]) assert.equal(existsSync(join(bundle, target)), true);

    const status = readStatus(bundle);
    assert.equal(status.current_node, 'phases/phase-final.md');
    assert.equal(status.current_gate, 'readiness_passed');
    assert.equal(status.next_gate, 'none');
    const trace = readTrace(bundle);
    assert.equal(trace.some((event) => event.event === 'gate_attempt' && /final/i.test(String(event.gate))), false);
    assert.equal(trace.some((event) => event.event === 'phase_transition' && event.to === 'final'), false);
    assert.equal(Object.hasOwn(status, 'satisfaction'), false);

    const beforeReopen = currentFinalOwner(bundle);
    assert.equal(beforeReopen.post_final_recovery.verdict, 'eligible');
    const inspection = inspectPostFinalRecovery({ bundlePath: bundle });
    assert.equal(inspection.verdict, 'eligible');
    const requestPath = join(root, 'final-continuity-evidence-expansion.json');
    writeFileSync(requestPath, `${JSON.stringify({
      schema_version: '1.0.0',
      action: 'post_final_rerun',
      reason: 'A later user request asks for a newly retained source and changed conclusion.',
      requested_scope: 'Expand evidence with one additional source and compare its conclusion.',
      ...inspection.facts.request_bindings,
    }, null, 2)}\n`);
    const applied = parseJsonOutput(runNode([POST_FINAL, 'apply', '--bundle', bundle, '--input', requestPath]));
    assert.equal(applied.verdict, 'committed');
    assert.equal(applied.stage, 'pre_entry');
    assert.equal(readStatus(bundle).current_node, 'phases/phase-final.md');
    assert.deepEqual(readFileSync(join(bundle, base.target)), baseBytes);
    assert.deepEqual(readFileSync(join(bundle, v1.target)), v1Bytes);
  });
});
