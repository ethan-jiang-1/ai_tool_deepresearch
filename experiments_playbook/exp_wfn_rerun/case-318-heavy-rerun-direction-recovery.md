---
schema: command-experiment/v1
experiment: wfn-rerun
case: case-318-heavy-rerun-direction-recovery
weight: heavy
case_goal: "Prove a real subject Agent writes a current rerun direction, recognizes the direction/profile crash window, and completes recovery through the real rerun gate."
runner: coding-agent
execution: real-bundle
evidence: filesystem-and-trace
bundle: dpt_disp_case-318_rerun-direction-recovery-*_*
trace: dpt_disp_case-318_rerun-direction-recovery-*_*/rb_trace.jsonl
verdict: trace-jsonl
req: VER-001, VER-003, VER-004, RTI-007
agent_dependency: "Requires a real subject Agent distinct from the coding-Agent runner. Fixture or inline-script direction/recovery output is invalid and must be reported NOT RUN."
---

## Execution Contract

This is an `agent_flow_e2e` canary. The coding Agent runs the Markdown playbook and deterministic checks; a distinct real subject Agent performs the two verdict-affecting rerun actions. The subject Agent uses no search or external calls.

The setup-only fixture ends at a legal `phases/phase-rerun.md` entry with `current_gate: hitl2_recorded`, `next_gate: rerun_ready`, `rerun_count: 0`, a non-empty accepted HITL2 rationale, one existing seed topic, and no `## 本轮重跑方向` section. The setup helper reaches that boundary through production instantiation, predecessor gates, work-unit submit, handoffs, and status synchronization. It relocates the freshly instantiated bundle from `dpt_rb_<stem>` to `dpt_disp_<stem>` before the first gate or work-unit binding so the active runtime is disposable without rewriting later absolute authority.

Inline JavaScript and shell may stage setup-only research inputs, invoke production CLIs, capture hashes, and record trace checks from observed facts. They MUST NOT write or repair the rerun direction, increment the profile for the subject, create a subject-Agent-attributed recovery fact, append a passing gate attempt, write accepted work-unit state or declaration rows, or edit status/trace authority to manufacture PASS.

## Reality Distance Ledger

| Dimension | Declaration |
| --- | --- |
| `test_class` | `agent_flow_e2e` |
| Fixture distance | `setup_only`; ends before any rerun direction exists |
| Subject execution | `real_agent`; distinct from coding-Agent runner |
| Runtime | `real_disposable_bundle`; fresh `dpt_disp_*` active bundle |
| External calls | `none`; phase-rerun has `search_policy: no_search` |
| Verdict judge | deterministic trace/filesystem checks over subject and Engine output |
| Native verdict | bundle-root `rb_trace.jsonl` check events |
| Proves | Real Agent direction production and crash-window recovery behavior |
| Does not prove | Search quality, downstream Wave execution, real-human judgment, or live-production behavior |

# case-318-heavy-rerun-direction-recovery

## Step 1: [RUNNER/SHELL] Establish Legal Setup Boundary

```bash
B=$(node experiments_env/shared/prepare-rerun-direction-canary.mjs)
printf '%s\n' "$B" > /tmp/case-318-bundle-path
node - "$B" <<'JS'
const fs = require('fs');
const path = require('path');
const yaml = require('yaml');
const bundle = process.argv[2];
const setup = JSON.parse(fs.readFileSync(path.join(bundle, 'case-318-setup.json'), 'utf8'));
const profile = yaml.parse(fs.readFileSync(path.join(bundle, 'rb_profile.yaml'), 'utf8'));
const seed = fs.readFileSync(path.join(bundle, 'seed_topics/topic-a.md'), 'utf8');
const status = JSON.parse(fs.readFileSync(path.join(bundle, 'rb_status.json'), 'utf8'));
const ok = setup.fixture === 'setup_only'
  && setup.subject_execution === 'real_agent'
  && setup.runtime === 'real_disposable_bundle'
  && setup.external_calls === 'none'
  && status.current_node === 'phases/phase-rerun.md'
  && status.current_gate === 'hitl2_recorded'
  && status.next_gate === 'rerun_ready'
  && profile.human_decision_checkpoints.hitl2.rerun_count === 0
  && !/^## 本轮重跑方向$/m.test(seed);
console.log(JSON.stringify({ ok, setup }, null, 2));
process.exit(ok ? 0 : 1);
JS
```

Expected: the fixture proves only the legal pre-interruption boundary. No subject-Agent behavior has occurred yet.

## Step 2: [RUNNER->SUBJECT AGENT] Produce Direction Then Stop At Crash Window

Run a real subject Agent in the repository with this instruction, substituting the exact `$B` path:

```text
You are the subject Agent for case-318, distinct from the coding-Agent playbook runner.
Work only in <BUNDLE>. Read DPT_FRAMEWORK/workflows/nodes/phases/phase-rerun.md and its required shared guidance.
Execute the rerun phase only through Stage 3 step 1: read the accepted HITL2 rationale and current rerun_count, compute target_rerun_count, compare it with the existing seed topic, and write or replace that topic's single `## 本轮重跑方向` section.
The direction must bind to the computed target and express the requested cost and failure-mode supplement without changing topic identity.
Then deliberately stop to model an interruption before profile increment. Do not change rb_profile.yaml rerun_count. Do not run rerun-ready, enter-phase, advance-status, or edit Engine-owned status/trace/work-unit/declaration authority. Do not search or call external services.
```

The coding Agent MUST save the real Agent execution transcript under the bundle, for example `case-318-subject-direction.jsonl`. If no independent subject-Agent execution surface is available, record `NOT RUN`, preserve the bundle, and do not create substitute direction output.

## Step 3: [RUNNER/SHELL] Observe The Crash Window Without Repairing It

```bash
node --input-type=module - "$B" <<'JS'
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { parse as parseYaml } from 'yaml';

const bundle = process.argv[2];
const seedPath = join(bundle, 'seed_topics/topic-a.md');
const seed = readFileSync(seedPath, 'utf8');
const profile = parseYaml(readFileSync(join(bundle, 'rb_profile.yaml'), 'utf8'));
const section = seed.match(/##\s*本轮重跑方向[\s\S]*?(?=\n##\s+|$)/)?.[0] || '';
const directionCount = Number(section.match(/rerun_count\*{0,2}\s*:\s*(\d+)/i)?.[1]);
const observation = {
  direction_sha256: createHash('sha256').update(section).digest('hex'),
  direction_count: directionCount,
  profile_count: profile.human_decision_checkpoints.hitl2.rerun_count,
  action_is_supplement: /action\*{0,2}\s*:\s*supplement\b/i.test(section),
  requested_dimensions_present: /cost/i.test(section) && /failure[- ]?mode/i.test(section),
};
writeFileSync(join(bundle, 'case-318-crash-window.json'), `${JSON.stringify(observation, null, 2)}\n`);
console.log(JSON.stringify(observation, null, 2));
process.exit(observation.direction_count === 1
  && observation.profile_count === 0
  && observation.action_is_supplement
  && observation.requested_dimensions_present ? 0 : 1);
JS
```

Expected: real subject output has created `direction.rerun_count=1` while the profile remains `0`. The observer does not repair either surface.

## Step 4: [RUNNER->SUBJECT AGENT] Resume And Recover

Run a fresh real subject-Agent turn against the same bundle:

```text
Resume case-318 as the real subject Agent in <BUNDLE>. Read phase-rerun.md and the current bundle facts.
Treat the existing direction/profile mismatch as the documented crash window. Do not rewrite the already current target direction.
Complete the phase through its sanctioned path: increment the profile to the existing target, run the real rerun-ready gate through `node experiments_env/shared/run-gate-with-monitor.mjs --bundle <BUNDLE> --gate rerun-ready -- node DPT_FRAMEWORK/cli/gates/check-gate-rerun-ready.mjs --bundle <BUNDLE> --current-node phases/phase-rerun.md`, consume only its check.next with enter-phase, synchronize status with advance-status --to rerun_ready, and emit the phase's rerun_ready event if required by the instructions.
Read and follow structured gate feedback if the same checkpoint fails. Do not hand-edit status, trace, gate attempts, work-unit authority, or declaration authority. Do not search or call external services.
```

Save this independent execution transcript as `case-318-subject-recovery.jsonl`. Missing real execution is `NOT RUN`, not PASS.

## Step 5: [RUNNER/SHELL] Record Trace Verdict From Native Facts

```bash
node --input-type=module - "$B" <<'JS'
import { createHash } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { parse as parseYaml } from 'yaml';
import { recordCheck } from './experiments_env/shared/wff-playbook-utils.mjs';

const bundle = process.argv[2];
const tracePath = join(bundle, 'rb_trace.jsonl');
const crash = JSON.parse(readFileSync(join(bundle, 'case-318-crash-window.json'), 'utf8'));
const seed = readFileSync(join(bundle, 'seed_topics/topic-a.md'), 'utf8');
const section = seed.match(/##\s*本轮重跑方向[\s\S]*?(?=\n##\s+|$)/)?.[0] || '';
const profile = parseYaml(readFileSync(join(bundle, 'rb_profile.yaml'), 'utf8'));
const status = JSON.parse(readFileSync(join(bundle, 'rb_status.json'), 'utf8'));
const trace = readFileSync(tracePath, 'utf8').split('\n').filter(Boolean).map((line) => JSON.parse(line));
const directionHash = createHash('sha256').update(section).digest('hex');
const directionRuns = existsSync(join(bundle, 'case-318-subject-direction.jsonl'));
const recoveryRuns = existsSync(join(bundle, 'case-318-subject-recovery.jsonl'));

recordCheck(tracePath, {
  gate: 'case-318-real-subject-executions',
  passed: directionRuns && recoveryRuns,
  detail: `direction_transcript=${directionRuns} recovery_transcript=${recoveryRuns}`,
});
recordCheck(tracePath, {
  gate: 'case-318-current-direction-produced',
  passed: crash.direction_count === 1 && crash.profile_count === 0 && crash.action_is_supplement && crash.requested_dimensions_present,
  detail: JSON.stringify(crash),
});
recordCheck(tracePath, {
  gate: 'case-318-direction-preserved-during-recovery',
  passed: directionHash === crash.direction_sha256,
  detail: `${crash.direction_sha256} -> ${directionHash}`,
});
recordCheck(tracePath, {
  gate: 'case-318-profile-recovered-to-direction',
  passed: profile.human_decision_checkpoints.hitl2.rerun_count === crash.direction_count,
  detail: `profile=${profile.human_decision_checkpoints.hitl2.rerun_count} direction=${crash.direction_count}`,
});
recordCheck(tracePath, {
  gate: 'case-318-real-rerun-gate-pass',
  passed: trace.some((event) => event.event === 'gate_attempt' && event.gate === 'rerun-ready' && event.passed === true),
  detail: 'production gate_attempt required',
});
recordCheck(tracePath, {
  gate: 'case-318-witnessed-seed-topics-handoff',
  passed: trace.some((event) => event.event === 'load_complete' && event.entry === 'phases/phase-seed-topics.md' && event.handoff_source_gate === 'rerun-ready')
    && status.current_node === 'phases/phase-seed-topics.md'
    && status.current_gate === 'rerun_ready',
  detail: `${status.current_node} ${status.current_gate}`,
});
JS
node -e "import('./experiments_env/shared/wff-playbook-utils.mjs').then(m=>m.verdict('$B/rb_trace.jsonl'))"
node experiments_env/shared/verify-bundle-health.mjs --bundle "$B" --profile heavy
```

PASS requires all six trace checks plus clean heavy health. Gate PASS alone cannot substitute for the two subject-Agent facts.

## Step 6: [RUNNER] Interpret And Clean Up

PASS proves that a real subject Agent produced the current direction, left a controlled direction/profile crash window, recognized it on resume, preserved the direction bytes, and completed the real rerun gate/handoff. It does not prove downstream research behavior or live-production execution.

On clean PASS only:

```bash
node -e "import('./experiments_env/shared/wff-playbook-utils.mjs').then(m=>m.cleanup('$B',{caseId:'case-318'}))"
```

On FAIL, NOT RUN, or health issue, preserve `$B` for diagnosis.
