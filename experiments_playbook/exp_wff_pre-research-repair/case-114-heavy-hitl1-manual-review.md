---
schema: command-experiment/v2
experiment: wff-pre-research-repair
case: case-114-heavy-hitl1-manual-review
case_goal: "枚举三种 research_profile 与三个负面边界，证明 Headless auto branch 不等待人类且 HITL1 gate 对完整/非法 payload 作出正确裁决。"
verdict_mode: all
required_checks: [six-auto-vectors, auto-branch-no-human-wait, hitl1-recorded]
bundle_roles: [verdict]
verdict_role: verdict
health_roles: [verdict]
health_profile: heavy
durable_evidence_roles: []
proof_subject: deterministic_contract
subject_execution: none
fixture: fixture_backed
runtime: real_disposable_bundle
external_calls: none
verdict_judge: deterministic
---

<!-- @impl EXA-005, EXA-006, EXA-007, PLR-003 -->

# Case 114 - HITL1 Auto-Branch Review Matrix

## Execution Contract

The Headless Playbook Agent executes the explicit auto branch and does not wait for a human. This deterministic case proves the gate matrix only; synthetic `research_access` values do not prove live search/fetch, Subject Agent behavior, or real-human judgment. Interactive replay may expose the same payload boundary to a human, but that is not this case's proof claim.

| Vector | Profile/payload boundary | Expected gate result |
| --- | --- | --- |
| A | complete `quick_factual` | pass |
| B | complete `exploratory_map` | pass |
| C | complete `claim_verification` | pass |
| D | `research_profile: not_selected` | fail |
| E | empty `root_must_answer_set` | fail |
| F | `hitl1.status: not_started` | fail |

## Step 1 - Create and register the contained bundle

```bash
B=$(node experiments_env/shared/new-disposable-bundle.mjs wff_manual --case case-114 --force --target-dir {{CASE_RUN_ROOT_SH}})
node DPT_FRAMEWORK/host_tools/agent-experiment-state.mjs register-bundle --context {{RUN_CONTEXT_SH}} --role verdict --path "$B"
```

## Step 2 - Execute all six visible auto vectors

```bash
B=$(node DPT_FRAMEWORK/host_tools/agent-experiment-state.mjs get-bundle --context {{RUN_CONTEXT_SH}} --role verdict)
STATE=$(printf '%s' {{PLAYBOOK_STATE_DIR_SH}})
node --input-type=module - "$B" "$STATE" <<'JS'
import { appendFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { stringify as stringifyYaml } from 'yaml';

const [bundle, state] = process.argv.slice(2);
const gateCli = 'DPT_FRAMEWORK/cli/gates/check-gate-hitl1-recorded.mjs';
const vectors = [
  { id: 'A', profile: 'quick_factual', questions: ['What are the key differences in AI regulation?', 'Which approach has the strongest enforcement?'], hitl1: 'recorded', expected: true },
  { id: 'B', profile: 'exploratory_map', questions: ['What is the global AI governance landscape?', 'Which jurisdictions plan legislation?', 'How do philosophies affect innovation?'], hitl1: 'recorded', expected: true },
  { id: 'C', profile: 'claim_verification', questions: ['Is the EU AI Act innovation claim supported?'], hitl1: 'recorded', expected: true },
  { id: 'D', profile: 'not_selected', questions: ['Some question'], hitl1: 'recorded', expected: false },
  { id: 'E', profile: 'quick_factual', questions: [], hitl1: 'recorded', expected: false },
  { id: 'F', profile: 'quick_factual', questions: ['Some question'], hitl1: 'not_started', expected: false },
];

const profileFor = (row) => ({
  plan_basename: 'wff_manual',
  research_profile: row.profile,
  root_must_answer_set: row.questions,
  research_access: {
    status: 'available', probed_at: '2026-07-10T00:00:00.000Z',
    result_url: 'https://example.com/deterministic-hitl1-fixture', fetch_outcome: 'success',
  },
  human_decision_checkpoints: {
    hitl1: { status: row.hitl1, ...(row.hitl1 === 'recorded' ? { recorded_at: '2026-06-21T15:00:00.000Z' } : {}) },
    hitl2: { status: 'not_started', answerability_class: 'not_assessed', user_decision: 'not_started', final_report_view: 'not_started' },
  },
});

const results = [];
for (const row of vectors) {
  writeFileSync(join(bundle, 'rb_profile.yaml'), stringifyYaml(profileFor(row)));
  const run = spawnSync(process.execPath, [gateCli, '--bundle', bundle, '--current-node', 'phases/phase-hitl1.md'], { encoding: 'utf8' });
  const json = JSON.parse(run.stdout);
  const passed = json.check?.passed === true;
  results.push({ id: row.id, expected: row.expected, passed, exit_code: run.status });
  writeFileSync(join(state, `case114-vector-${row.id}.json`), `${JSON.stringify(json, null, 2)}\n`);
}

// Leave the bundle on a valid deterministic profile for post-completion health.
writeFileSync(join(bundle, 'rb_profile.yaml'), stringifyYaml(profileFor(vectors[0])));
writeFileSync(join(state, 'case114-matrix.json'), `${JSON.stringify(results, null, 2)}\n`);
const matrixCorrect = results.every((row) => row.passed === row.expected && row.exit_code === (row.expected ? 0 : 1));
const validRecorded = results.slice(0, 3).every((row) => row.passed === true);
const checks = [
  ['six-auto-vectors', results.length === 6 && matrixCorrect],
  ['auto-branch-no-human-wait', results.map((row) => row.id).join('') === 'ABCDEF'],
  ['hitl1-recorded', validRecorded],
];
for (const [gate, passed] of checks) appendFileSync(join(bundle, 'rb_trace.jsonl'), `${JSON.stringify({
  ts: new Date().toISOString(), event: 'check', source: 'playbook', gate, passed, expected: true,
})}\n`);
if (checks.some(([, passed]) => !passed)) process.exit(1);
JS
```

## Step 3 - Native completion

```bash
B=$(node DPT_FRAMEWORK/host_tools/agent-experiment-state.mjs get-bundle --context {{RUN_CONTEXT_SH}} --role verdict)
node DPT_FRAMEWORK/host_tools/finalize-agent-experiment.mjs --context {{RUN_CONTEXT_SH}} --bundle "verdict=$B"
```

Stop after native completion. The Autorun Supervisor owns Heavy health, durable audit, preservation, and optional clean-PASS cleanup of the complete case run root.
