---
schema: command-experiment/v1
experiment: autonomous-research-hardening
case: case-606-light-continuation-cues
weight: light
case_goal: "Verify decision-point continuation cues are visible in real CLI output without claiming they force Agent behavior."
runner: coding-agent
execution: real-bundle
evidence: filesystem-and-trace
bundle: dpt_disp_case-606_arh_continuation_cues
trace: dpt_disp_case-606_arh_continuation_cues/rb_trace.jsonl
verdict: trace-jsonl
req: SWE-001, SWE-006, CPT-001, CPT-003, DEW-003
---

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

## Step 1: Create Bundle And Capture Gate / Phase Cues

```bash
B=$(node experiments_env/shared/new-disposable-bundle.mjs arh_continuation_cues --case case-606 --force)

node DPT_FRAMEWORK/cli/gates/check-gate-instantiation-complete.mjs \
  --bundle "$B" \
  --current-node phases/phase-instantiation.md \
  > "$B/case-606-instantiation-gate.json"

node DPT_FRAMEWORK/cli/enter-phase.mjs \
  --bundle "$B" \
  --node phases/phase-hitl1.md \
  > "$B/case-606-enter-hitl1.md"

node DPT_FRAMEWORK/cli/advance-status.mjs \
  --bundle "$B" \
  --to instantiation_complete \
  > "$B/case-606-advance-instantiation.json"

cat > "$B/rb_profile.yaml" <<'YAML'
plan_basename: arh_continuation_cues
research_profile: quick_factual
root_must_answer_set:
  - "Do continuation cues appear at decision points?"
research_access:
  status: available
  probed_at: "2026-07-10T00:00:00.000Z"
  result_url: "https://example.com/continuation-cue"
  fetch_outcome: success
human_decision_checkpoints:
  hitl1:
    status: recorded
    recorded_at: "2026-07-10T00:00:00.000Z"
  hitl2:
    status: not_started
    answerability_class: not_assessed
    user_decision: not_started
    final_report_view: not_started
YAML

node DPT_FRAMEWORK/cli/log-event.mjs --bundle "$B" --event hitl1_recorded

node --input-type=module - "$B" <<'JS'
import { writeMinimalPlan } from './experiments_env/shared/work-unit-playbook-utils.mjs';

writeMinimalPlan(process.argv[2], {
  planBasename: 'arh_continuation_cues',
  topics: [{ id: 't1', slug: 'topic-a', title: 'Topic A' }]
});
JS

node DPT_FRAMEWORK/cli/advance-status.mjs \
  --bundle "$B" \
  --to hitl1_recorded \
  > "$B/case-606-advance-hitl1.json"

node DPT_FRAMEWORK/cli/gates/check-gate-hitl1-recorded.mjs \
  --bundle "$B" \
  --current-node phases/phase-hitl1.md \
  > "$B/case-606-hitl1-gate.json"

node DPT_FRAMEWORK/cli/advance-status.mjs \
  --bundle "$B" \
  --to setup_ready \
  > "$B/case-606-advance-setup-bootstrap.json"

node DPT_FRAMEWORK/cli/gates/check-gate-setup-ready.mjs \
  --bundle "$B" \
  --current-node phases/phase-setup.md \
  > "$B/case-606-setup-gate.json"

node DPT_FRAMEWORK/cli/enter-phase.mjs \
  --bundle "$B" \
  --node phases/phase-seed-topics.md \
  > "$B/case-606-enter-seed-topics.md"

node DPT_FRAMEWORK/cli/advance-status.mjs \
  --bundle "$B" \
  --to setup_ready \
  > "$B/case-606-advance-setup-covered.json"

echo "BUNDLE=$B"
```

## Step 2: Claim Work And Capture Claim Cue

```bash
node --input-type=module - "$B" <<'JS'
import {
  enqueueWorkUnitTask,
  queueItemForWorkUnit
} from './experiments_env/shared/work-unit-playbook-utils.mjs';

const bundle = process.argv[2];
enqueueWorkUnitTask(bundle, queueItemForWorkUnit({
  phase: 'wave0',
  queue_item_id: 'case-606-source-topic-a',
  topic_slug: 'topic-a'
}));
JS

node DPT_FRAMEWORK/cli/operate-work-unit.mjs claim "$B" --phase wave0 --count 1 \
  > "$B/case-606-claim.json"
```

## Step 3: Verdict Checks

```bash
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
    && instantiationGate.continuation?.interaction === 'prohibited'
    && instantiationGate.continuation?.next_action === 'consume_check_next'
    && instantiationGate.continuation?.node_ref === 'phases/phase-instantiation.md',
  detail: 'cue correctly output by real gate CLI; this is not an Agent-behavior guarantee'
});

recordCheck(tracePath, {
  gate: 'continuation-cue-stop-no-gate-pass-output',
  passed: setupGate.check?.passed === true
    && setupGate.continuation?.interaction === 'prohibited'
    && setupGate.continuation?.next_action === 'consume_check_next'
    && setupGate.continuation?.node_ref === 'phases/phase-setup.md',
  detail: 'cue correctly output by a real stop:no gate pass; this is not routing authority beyond check.next'
});

recordCheck(tracePath, {
  gate: 'continuation-cue-stop-no-enter-phase-output',
  passed: enterSeedTopics.trimEnd().endsWith('<!-- DPT_CONTINUATION_CUE_END -->')
    && enterSeedTopics.includes('interaction: prohibited')
    && enterSeedTopics.includes('next_action: execute_loaded_node')
    && enterSeedTopics.includes('node_ref: phases/phase-seed-topics.md'),
  detail: 'cue correctly output by real stop:no enter-phase stdout; load_complete remains the entry witness'
});

recordCheck(tracePath, {
  gate: 'continuation-cue-stop-no-advance-status-output',
  passed: advanceSetup.status === 'ok'
    && advanceSetup.continuation?.interaction === 'prohibited'
    && advanceSetup.continuation?.next_action === 'execute_loaded_node'
    && advanceSetup.continuation?.node_ref === 'phases/phase-seed-topics.md',
  detail: 'cue correctly output by real covered stop:no advance-status stdout; status/trace remain the authority'
});

recordCheck(tracePath, {
  gate: 'continuation-cue-claim-output',
  passed: claim.claimed_count === 1
    && claim.continuation?.interaction === 'prohibited'
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

node -e "import('./experiments_env/shared/wff-playbook-utils.mjs').then(m => m.verdict('$B/rb_trace.jsonl'))"
```

## Cleanup

```bash
node -e "import('./experiments_env/shared/wff-playbook-utils.mjs').then(m => m.cleanup('$B', {caseId:'case-606'}))"
```
