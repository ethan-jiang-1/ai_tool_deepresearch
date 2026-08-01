#!/usr/bin/env node
// @impl EXA-006

import { randomBytes } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { parseArgs } from 'node:util';
import { spawnSync } from 'node:child_process';
import { parse as parseYaml, stringify as stringifyYaml } from 'yaml';

const { values } = parseArgs({
  options: {
    case: { type: 'string' },
    'target-dir': { type: 'string' },
    context: { type: 'string' },
    role: { type: 'string', default: 'verdict' },
    'cleanup-pass': { type: 'boolean', default: false },
  },
  strict: true,
});
if (values.case !== 'case-317') throw new Error('only --case case-317 is supported');
const targetDir = resolve(values['target-dir'] || 'tests/.test-bundles');
mkdirSync(targetDir, { recursive: true });
const hex = randomBytes(4).toString('hex');
const bundle = join(targetDir, `dpt_disp_case-317_post-final-recovery_${hex}`);
const logicalName = 'post-final-recovery';
const stateCli = resolve('DPT_FRAMEWORK/host_tools/agent-experiment-state.mjs');

function run(args, expected = 0) {
  const result = spawnSync('node', args, { encoding: 'utf8', maxBuffer: 20 * 1024 * 1024 });
  if (result.status !== expected) throw new Error(`${args.join(' ')} exited ${result.status}: ${result.stderr || result.stdout}`);
  return result.stdout;
}
function runJson(args, expected = 0) { return JSON.parse(run(args, expected)); }

let passed = false;
try {
  mkdirSync(bundle);
  if (values.context) run([stateCli, 'register-bundle', '--context', resolve(values.context), '--role', values.role, '--path', bundle]);
  for (const directory of ['final', 'seed_topics', 'reference', 'artifacts', '_logs']) mkdirSync(join(bundle, directory));
  writeFileSync(join(bundle, 'rb_status.json'), `${JSON.stringify({ bundle: logicalName, current_mode: 'execution', state: 'in_progress', current_gate: 'readiness_passed', next_gate: 'none', current_node: 'phases/phase-final.md' }, null, 2)}\n`);
  writeFileSync(join(bundle, 'rb_profile.yaml'), [
    `plan_basename: ${logicalName}`, 'research_profile: quick_factual', 'root_must_answer_set: []', 'research_access:', '  status: unprobed',
    'human_decision_checkpoints:', '  hitl1:', '    status: recorded', '  hitl2:', '    status: recorded',
    '    answerability_class: ready_substantive', '    user_decision: proceed_to_readiness', '    final_report_view: profile_default',
    '    rerun_count: 0', '    rationale: Initial delivery approved', '',
  ].join('\n'));
  writeFileSync(join(bundle, 'rb_plan.md'), `---\nplan_basename: ${logicalName}\nderived_topic_count: 0\ntopic_registry_version: "2"\ntopic_registry:\n  []\n---\n# Plan\n`);
  writeFileSync(join(bundle, 'rb_queue.json'), JSON.stringify({ schema_version: 'queue.v2', queue_health: 'ready', stop_authorization_state: 'unauthorized_continue_required', active_window: [], refill_pool: [], delegated_in_flight: {}, terminal_history: [] }));
  writeFileSync(join(bundle, 'rb_trace.jsonl'), [
    { ts: '2026-01-01T00:00:00.000Z', event: 'gate_attempt', gate: 'readiness-passed', phase: 'readiness', passed: true, currentNodeRef: 'phases/phase-readiness.md', next: 'phases/phase-final.md' },
    { ts: '2026-01-01T00:00:01.000Z', event: 'load_complete', entry: 'phases/phase-final.md', handoff_source_gate: 'readiness-passed', handoff_source_node: 'phases/phase-readiness.md', handoff_target_node: 'phases/phase-final.md', handoff_source_attempt_index: 0 },
  ].map(JSON.stringify).join('\n') + '\n');
  writeFileSync(join(bundle, 'final', 'report.md'), '# Prior Final\n');
  writeFileSync(join(bundle, '_logs', 'run.log'), '');
  writeFileSync(join(bundle, 'BUNDLE_MAP.md'), '# Bundle Map\n');

  const inspection = runJson(['DPT_FRAMEWORK/cli/operate-post-final-recovery.mjs', 'inspect', '--bundle', bundle]);
  if (inspection.verdict !== 'eligible') throw new Error(`expected eligible, got ${inspection.verdict}`);
  const requestPath = join(bundle, '_diagnostics-request.json');
  const request = { schema_version: '1.0.0', action: 'post_final_rerun', reason: 'Add a controlled comparison', requested_scope: 'Materialize one canonical comparison topic', ...inspection.facts.request_bindings };
  writeFileSync(requestPath, `${JSON.stringify(request, null, 2)}\n`);
  const applied = runJson(['DPT_FRAMEWORK/cli/operate-post-final-recovery.mjs', 'apply', '--bundle', bundle, '--input', requestPath]);
  run(['DPT_FRAMEWORK/cli/enter-phase.mjs', '--bundle', bundle, '--node', 'phases/phase-rerun.md']);
  runJson(['DPT_FRAMEWORK/cli/advance-status.mjs', '--bundle', bundle, '--to', 'hitl2_recorded']);
  const reentry = runJson(['DPT_FRAMEWORK/cli/check-reentry.mjs', '--bundle', bundle, '--at', 'hitl2_recorded']);
  if (reentry.post_final_recovery?.stage !== 'synchronized_initial_profile') throw new Error('reentry did not expose synchronized initial C5 stage');

  const topicInput = join(bundle, '_topic-input.json');
  writeFileSync(topicInput, `${JSON.stringify({ context: 'rerun', actions: [{ action: 'add_topic', title: 'Controlled Comparison', slug_stem: 'controlled-comparison', must_answer: ['What changed?'], scope_role: 'comparison', depends_on_topic_uids: [], direction: { rerun_count: 1, action: 'add', new_search_dimensions: 'Controlled comparison topic for post-final recovery rerun', adjusted_depth: 'standard', search_guardrails: 'standard', rationale_excerpt: 'Post-final recovery adding comparison topic' } }] }, null, 2)}\n`);
  const topic = runJson(['DPT_FRAMEWORK/cli/operate-topic-state.mjs', 'apply', '--bundle', bundle, '--input', topicInput]);
  if (topic.verdict !== 'committed') throw new Error(`topic-state apply failed: ${topic.reason_code || topic.verdict}`);

  const profilePath = join(bundle, 'rb_profile.yaml');
  const profile = parseYaml(readFileSync(profilePath, 'utf8'));
  profile.human_decision_checkpoints.hitl2.rerun_count = 1;
  writeFileSync(profilePath, `${stringifyYaml(profile).trimEnd()}\n`);
  run(['DPT_FRAMEWORK/cli/apply-research-style.mjs', '--bundle', bundle, '--style', 'quick_factual']);
  const gate = runJson(['DPT_FRAMEWORK/cli/gates/check-gate-rerun-ready.mjs', '--bundle', bundle, '--current-node', 'phases/phase-rerun.md']);
  if (!gate.check?.passed || gate.check.next !== 'phases/phase-seed-topics.md') throw new Error('rerun-ready did not pass with expected next');
  run(['DPT_FRAMEWORK/cli/enter-phase.mjs', '--bundle', bundle, '--node', gate.check.next]);
  runJson(['DPT_FRAMEWORK/cli/advance-status.mjs', '--bundle', bundle, '--to', 'rerun_ready']);
  const repeat = runJson(['DPT_FRAMEWORK/cli/operate-post-final-recovery.mjs', 'apply', '--bundle', bundle, '--input', requestPath]);

  const trace = readFileSync(join(bundle, 'rb_trace.jsonl'), 'utf8').trim().split('\n').map(JSON.parse);
  const recoveryEvents = trace.filter((event) => event.event === 'post_final_reentry');
  const exceptionalLoads = trace.filter((event) => event.event === 'load_complete' && event.handoff_source_kind === 'post_final_reentry');
  const exceptionalTransitions = trace.filter((event) => event.event === 'phase_transition' && event.source_handoff_kind === 'post_final_reentry');
  const plan = readFileSync(join(bundle, 'rb_plan.md'), 'utf8');
  const forbidden = ['_cache/addendum', 'final/addendum'].filter((relative) => existsSync(join(bundle, relative)));
  const checks = {
    prior_final_lineage: trace[0]?.gate === 'readiness-passed' && trace[1]?.entry === 'phases/phase-final.md',
    one_recovery_event: recoveryEvents.length === 1,
    exact_exceptional_binding: exceptionalLoads.length === 1 && exceptionalTransitions.length === 1 && exceptionalTransitions[0].source_handoff_event_sha256 === exceptionalLoads[0].handoff_source_event_sha256,
    canonical_topic: /Controlled Comparison/.test(plan) && existsSync(join(bundle, 'seed_topics', '01_controlled-comparison.md')),
    normal_descendant: trace.some((event) => event.event === 'gate_attempt' && event.gate === 'rerun-ready' && event.passed === true) && trace.some((event) => event.event === 'load_complete' && event.entry === 'phases/phase-seed-topics.md'),
    repeat_stable: repeat.verdict === 'unchanged' && repeat.stage === 'descendant_pipeline',
    no_parallel_addendum: forbidden.length === 0,
    terminal_history_preserved: readFileSync(join(bundle, 'final', 'report.md'), 'utf8') === '# Prior Final\n',
  };
  passed = Object.values(checks).every(Boolean);
  const output = { case_id: values.case, verdict: passed ? 'PASS' : 'FAIL', bundle_path: bundle, applied_operation_id: applied.operation_id, recovery_event_index: trace.findIndex((event) => event.event === 'post_final_reentry'), canonical_topic_slug: '01_controlled-comparison', repeat_verdict: repeat.verdict, checks };
  writeFileSync(1, `${JSON.stringify(output, null, 2)}\n`);
  if (!passed) process.exitCode = 1;
} finally {
  if (passed && values['cleanup-pass']) rmSync(bundle, { recursive: true, force: true });
}
