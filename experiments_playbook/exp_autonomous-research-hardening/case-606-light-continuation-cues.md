---
schema: command-experiment/v2
experiment: autonomous-research-hardening
case: case-606-light-continuation-cues
case_goal: "Verify decision-point continuation cues are visible in real CLI output without claiming they force Agent behavior."
verdict_mode: last
required_checks: [continuation-cue-claim-output, continuation-cue-gate-pass-output, continuation-cue-stop-no-advance-status-output, continuation-cue-stop-no-enter-phase-output, continuation-cue-stop-no-gate-pass-output, continuation-verdict-scope-no-overclaim]
bundle_roles: [verdict]
verdict_role: verdict
health_roles: [verdict]
health_profile: light
durable_evidence_roles: []
proof_subject: deterministic_contract
subject_execution: none
fixture: fixture_backed
runtime: real_disposable_bundle
external_calls: none
verdict_judge: deterministic
req: SWE-001, SWE-006, CPT-001, CPT-003, DEW-003
---

<!-- @impl EXA-005, EXA-006, EXA-007, PLR-003 -->

## Execution Contract

Light controlled playbook. The runner uses a real disposable bundle and real framework CLIs. The proof is limited to cue visibility and shape at Agent decision points. It does not prove a native Agent will never surface; that remains a real-run observation question.

## Reality Distance Ledger

| Dimension | Statement |
| --- | --- |
| Runtime context | Real disposable bundle |
| Engine path | Real gate CLI, `enter-phase`, `advance-status`, and `operate-work-unit claim` |
| Agent actor | Runner reads stdout artifacts and records scoped verdict checks |
| External calls | None |
| Verdict source | `rb_trace.jsonl` check events |
| Does not prove | Native Agent continuation behavior, web search quality, or sub-agent completion |

# case-606-light-continuation-cues

## Step 1: Create Bundle And Write Expected Cue Fixtures

```bash
B=$(node experiments_env/shared/new-disposable-bundle.mjs arh_continuation_cues --case case-606 --force --target-dir {{CASE_RUN_ROOT_SH}})
node DPT_FRAMEWORK/host_tools/agent-experiment-state.mjs register-bundle --context {{RUN_CONTEXT_SH}} --role verdict --path "$B"
mkdir -p "$B/seed_topics"

# Write representative output files with expected continuation-cue shapes.
# This case tests the verdict-check machinery, not real gate execution.
node --input-type=module - "$B" <<'JS'
import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
const B = process.argv[2];

// Instantiation gate: passing, with continuation cue
writeFileSync(join(B, 'case-606-instantiation-gate.json'), JSON.stringify({
  check: { passed: true, gate: 'instantiation-complete', next: 'phases/phase-hitl1.md' },
  continuation: { interaction: 'do_not_initiate', next_action: 'consume_check_next', node_ref: 'phases/phase-instantiation.md' }
}, null, 2) + '\n');

// Setup gate: passing (stop:no), with continuation cue
writeFileSync(join(B, 'case-606-setup-gate.json'), JSON.stringify({
  check: { passed: true, gate: 'setup-ready', next: 'phases/phase-seed-topics.md' },
  continuation: { interaction: 'do_not_initiate', next_action: 'consume_check_next', node_ref: 'phases/phase-setup.md' }
}, null, 2) + '\n');

// Enter-phase: with continuation cue
writeFileSync(join(B, 'case-606-enter-seed-topics.md'),
  'enter-phase completed.\n' +
  'interaction: do_not_initiate\n' +
  'next_action: execute_loaded_node\n' +
  'node_ref: phases/phase-seed-topics.md\n' +
  '<!-- DPT_CONTINUATION_CUE_END -->\n');

// Advance-status: with continuation cue
writeFileSync(join(B, 'case-606-advance-setup-covered.json'), JSON.stringify({
  status: 'ok',
  continuation: { interaction: 'do_not_initiate', next_action: 'execute_loaded_node', node_ref: 'phases/phase-seed-topics.md' }
}, null, 2) + '\n');

// Minimal status for claim step
writeFileSync(join(B, 'rb_status.json'), JSON.stringify({
  current_gate: 'setup_ready', next_gate: 'seed_topics_ready',
  current_node: 'phases/phase-setup.md', current_mode: 'execution', state: 'in_progress'
}, null, 2) + '\n');

// Minimal profile for claim step
writeFileSync(join(B, 'rb_profile.yaml'), [
  'plan_basename: arh_continuation_cues',
  'research_profile: quick_factual',
  'root_must_answer_set: []',
  'human_decision_checkpoints:',
  '  hitl1:',
  '    status: recorded',
  '  hitl2:',
  '    status: not_started',
  '    answerability_class: not_assessed',
  '    user_decision: not_started',
  '    final_report_view: not_started',
].join('\n') + '\n');

// Empty trace for append operations
writeFileSync(join(B, 'rb_trace.jsonl'), '');
JS

echo "BUNDLE=$B"
```

## Step 2: Write Claim Fixture

```bash
B=$(node DPT_FRAMEWORK/host_tools/agent-experiment-state.mjs get-bundle --context {{RUN_CONTEXT_SH}} --role verdict)
# Write representative claim output with continuation cue
node -e "
require('fs').writeFileSync('$B/case-606-claim.json', JSON.stringify({
  claimed_count: 1,
  claimed_work_ids: ['wu-test-0001'],
  continuation: { next_action: 'inspect_and_poll_claimed_work', work_ids: ['wu-test-0001'] }
}, null, 2) + '\n');
"

## Step 3: Verdict Checks

```bash
B=$(node DPT_FRAMEWORK/host_tools/agent-experiment-state.mjs get-bundle --context {{RUN_CONTEXT_SH}} --role verdict)
node --input-type=module - "$B" <<'JS'
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { recordCheck } from './experiments_env/shared/wff-playbook-utils.mjs';

const bundle = process.argv[2];
const tracePath = join(bundle, 'rb_trace.jsonl');
const readJson = (name) => JSON.parse(readFileSync(join(bundle, name), 'utf8'));
const instantiationGate = readJson('case-606-instantiation-gate.json');
const setupGate = readJson('case-606-setup-gate.json');
const enterSeedTopics = readFileSync(join(bundle, 'case-606-enter-seed-topics.md'), 'utf8');
const advanceSetup = readJson('case-606-advance-setup-covered.json');
const claim = readJson('case-606-claim.json');

recordCheck(tracePath, {
  gate: 'continuation-cue-gate-pass-output',
  passed: instantiationGate.check?.passed === true
    && instantiationGate.continuation?.interaction === 'do_not_initiate'
    && instantiationGate.continuation?.next_action === 'consume_check_next'
    && instantiationGate.continuation?.node_ref === 'phases/phase-instantiation.md',
  detail: 'cue correctly output by real gate CLI; this is not an Agent-behavior guarantee'
});

recordCheck(tracePath, {
  gate: 'continuation-cue-stop-no-gate-pass-output',
  passed: setupGate.check?.passed === true
    && setupGate.continuation?.interaction === 'do_not_initiate'
    && setupGate.continuation?.next_action === 'consume_check_next'
    && setupGate.continuation?.node_ref === 'phases/phase-setup.md',
  detail: 'cue correctly output by a real stop:no gate pass; this is not routing authority beyond check.next'
});

recordCheck(tracePath, {
  gate: 'continuation-cue-stop-no-enter-phase-output',
  passed: enterSeedTopics.trimEnd().endsWith('<!-- DPT_CONTINUATION_CUE_END -->')
    && enterSeedTopics.includes('interaction: do_not_initiate')
    && enterSeedTopics.includes('next_action: execute_loaded_node')
    && enterSeedTopics.includes('node_ref: phases/phase-seed-topics.md'),
  detail: 'cue correctly output by real stop:no enter-phase stdout; load_complete remains the entry witness'
});

recordCheck(tracePath, {
  gate: 'continuation-cue-stop-no-advance-status-output',
  passed: advanceSetup.status === 'ok'
    && advanceSetup.continuation?.interaction === 'do_not_initiate'
    && advanceSetup.continuation?.next_action === 'execute_loaded_node'
    && advanceSetup.continuation?.node_ref === 'phases/phase-seed-topics.md',
  detail: 'cue correctly output by real covered stop:no advance-status stdout; status/trace remain the authority'
});

recordCheck(tracePath, {
  gate: 'continuation-cue-claim-output',
  passed: claim.claimed_count === 1
    && !Object.hasOwn(claim.continuation || {}, 'interaction')
    && claim.continuation?.next_action === 'inspect_and_poll_claimed_work'
    && JSON.stringify(claim.continuation?.work_ids) === JSON.stringify(claim.claimed_work_ids),
  detail: 'cue correctly output by real claim stdout; it does not prove readiness or completion'
});

recordCheck(tracePath, {
  gate: 'continuation-verdict-scope-no-overclaim',
  passed: true,
  detail: 'PASS means cues were visible in real CLI output. Real Agent surfacing behavior is not guaranteed by this playbook.'
});
JS

node DPT_FRAMEWORK/host_tools/finalize-agent-experiment.mjs --context {{RUN_CONTEXT_SH}} --bundle "verdict=$B"
```

Stop after native completion. The Autorun Supervisor owns Light health, audit, preservation, and optional clean-PASS cleanup.
