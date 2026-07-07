---
schema: command-experiment/v1
experiment: engine-boundary
case: case-404-standard-queue-boundary
weight: light
case_goal: "验证 Queue 边界合约：non-delegated complete 保持可用；delegated queue demand 必须通过 work-unit submit；controller:'sub-agent' 被 schema 拒绝。"
runner: coding-agent
execution: real-bundle
evidence: filesystem-and-trace
bundle: dpt_disp_case-404_eb_queue_work_unit
trace: dpt_disp_case-404_eb_queue_work_unit/rb_trace.jsonl
verdict: trace-jsonl
---

## Execution Contract

Fixture-backed, no Agent actor, no external calls. This case tests queue and target schema boundaries only; it does not claim research quality.

The filename cost is `standard`, but frontmatter `weight` is `light` because the current runner-facing schema uses `light` for both light and standard JS/CLI cases.

## Reality Distance Ledger

| Dimension | Statement |
| --- | --- |
| Runtime context | Real disposable bundle from `experiments_env/shared/new-disposable-bundle.mjs` |
| Framework path | Real `operate-queue`, `operate-work-unit`, and `TargetSpecSchema` boundaries |
| Fixture input | Queue items and controlled work-unit demand only |
| Agent actor | None |
| External calls | None |
| Non-delegated authority | `operate-queue complete` |
| Delegated authority | `operate-work-unit submit` only |
| Verdict source | CLI JSON/exit results, trace JSONL `check` events, and runner report |
| Does not prove | Agent routing or research output quality |

# case-404-standard-queue-boundary

## Expected Runtime Path

1. Create a disposable bundle through shared setup.
2. Enqueue and claim a non-delegated queue item.
3. Complete the non-delegated item through `operate-queue complete`.
4. Enqueue a delegated queue demand and prove `operate-queue complete` rejects it before claim.
5. Claim that delegated demand as a work unit and prove `operate-queue complete` still rejects in-flight delegated success.
6. Check target schema boundaries for `controller: "sub-agent"` versus main-agent delegation to sub-agent.
7. Record each runtime fact as trace `check` events.
8. Print PASS/FAIL and clean up only on PASS.

## Step 1: [MAIN/SHELL] Create Runtime Context

Create a disposable bundle with the default queue state. No delegated work is completed in setup.

```bash
B=$(node experiments_env/shared/new-disposable-bundle.mjs eb_queue_work_unit --case case-404 --force)
node --input-type=module - "$B" <<'JS'
import { writeMinimalPlan, writeMinimalStatus } from './experiments_env/shared/work-unit-playbook-utils.mjs';
writeMinimalStatus(process.argv[2]);
writeMinimalPlan(process.argv[2]);
JS
echo "BUNDLE=$B"
```

Expected: the bundle path is printed.

## Step 2: [MAIN/SHELL] Exercise Queue Boundaries

Run these checkpoints one at a time and read the JSON/stdout after each. The controller may proceed only after each boundary returns the expected machine feedback.

```bash
node - "$B" <<'JS'
const fs = require('fs');
const path = require('path');
const bundle = process.argv[2];
const task = {
  queue_item_id: 'case404-nondelegated',
  title: 'Non-delegated queue boundary task',
  targets: { controller: 'main-agent' },
  action: 'Controlled non-delegated queue task.',
  producer_rule: 'case404_non_delegated',
  lineage: {},
  priority_class: 'P5_new_reference_intake',
  required_receipts: ['none'],
  done_condition: 'operate-queue complete succeeds',
  verification: { engine: [], agent: [] },
  writes_to: [],
  status_sync: [],
  completion_receipt: 'none',
  failure_route: 'queue repair work',
  payload: {}
};
fs.writeFileSync(path.join(bundle, 'case404-nondelegated.json'), `${JSON.stringify(task, null, 2)}\n`);
JS
node DPT_FRAMEWORK/cli/operate-queue.mjs enqueue "$B" --task "$B/case404-nondelegated.json" > "$B/case-404-nondelegated-enqueue.json"
node DPT_FRAMEWORK/cli/operate-queue.mjs claim "$B" --actor main-agent > "$B/case-404-nondelegated-claim.json"
node - "$B" <<'JS'
const fs = require('fs');
const path = require('path');
const bundle = process.argv[2];
fs.writeFileSync(path.join(bundle, 'case404-nondelegated-result.json'), `${JSON.stringify({
  queue_item_id: 'case404-nondelegated',
  receipt: 'none',
  summary: 'non-delegated completion through operate-queue'
}, null, 2)}\n`);
JS
node DPT_FRAMEWORK/cli/operate-queue.mjs complete "$B" --result "$B/case404-nondelegated-result.json" > "$B/case-404-nondelegated-complete.json"
```

Expected: non-delegated enqueue, claim, and complete all exit `0`.

```bash
node --input-type=module - "$B" <<'JS'
import { queueItemForWorkUnit } from './experiments_env/shared/work-unit-playbook-utils.mjs';
import { writeFileSync } from 'node:fs';
import path from 'node:path';
const bundle = process.argv[2];
const task = queueItemForWorkUnit({
  queue_item_id: 'wave0-source-topic-a',
  topic_slug: 'topic-a',
  title: 'Delegated queue boundary task'
});
writeFileSync(path.join(bundle, 'case404-delegated-active.json'), `${JSON.stringify(task, null, 2)}\n`);
JS
node DPT_FRAMEWORK/cli/operate-queue.mjs enqueue "$B" --task "$B/case404-delegated-active.json" > "$B/case-404-delegated-enqueue.json"
node - "$B" <<'JS'
const fs = require('fs');
const path = require('path');
const bundle = process.argv[2];
fs.writeFileSync(path.join(bundle, 'case404-delegated-active-result.json'), `${JSON.stringify({
  queue_item_id: 'wave0-source-topic-a',
  receipt: 'none',
  summary: 'this must not complete delegated work'
}, null, 2)}\n`);
JS
set +e
node DPT_FRAMEWORK/cli/operate-queue.mjs complete "$B" --result "$B/case404-delegated-active-result.json" > "$B/case-404-delegated-active-complete.json"
DELEGATED_ACTIVE_STATUS=$?
set -e
printf '%s\n' "$DELEGATED_ACTIVE_STATUS" > "$B/case-404-delegated-active-complete.status"

CLAIM_JSON=$(node DPT_FRAMEWORK/cli/operate-work-unit.mjs claim "$B" --phase wave0 --count 1)
printf '%s\n' "$CLAIM_JSON" > "$B/case-404-delegated-claim.json"
set +e
node DPT_FRAMEWORK/cli/operate-queue.mjs complete "$B" --result "$B/case404-delegated-active-result.json" > "$B/case-404-delegated-inflight-complete.json"
DELEGATED_INFLIGHT_STATUS=$?
set -e
printf '%s\n' "$DELEGATED_INFLIGHT_STATUS" > "$B/case-404-delegated-inflight-complete.status"
```

Expected: delegated queue completion exits `1` both before and after work-unit claim, and the JSON advice points the Agent to `operate-work-unit submit`.

```bash
node --input-type=module - "$B" <<'JS'
import { writeFileSync } from 'node:fs';
import path from 'node:path';
import { TargetSpecSchema } from './DPT_FRAMEWORK/schema/contracts/queue.mjs';

const bundle = process.argv[2];
const controllerSubAgent = TargetSpecSchema.safeParse({ controller: 'sub-agent' });
const delegatedTarget = TargetSpecSchema.safeParse({
  controller: 'main-agent',
  delegates: { to: 'sub-agent', role_key: 'dpt-source-intake' }
});
writeFileSync(path.join(bundle, 'case-404-target-schema.json'), `${JSON.stringify({
  controller_sub_agent_accepted: controllerSubAgent.success,
  main_agent_delegates_to_sub_agent_accepted: delegatedTarget.success
}, null, 2)}\n`);
console.log(JSON.stringify({
  controller_sub_agent_accepted: controllerSubAgent.success,
  main_agent_delegates_to_sub_agent_accepted: delegatedTarget.success
}, null, 2));
process.exit(!controllerSubAgent.success && delegatedTarget.success ? 0 : 1);
JS
```

Expected: `controller: "sub-agent"` is rejected while main-agent delegation to a sub-agent actor is accepted.

## Step 3: [MAIN/SHELL] Record Verdict Checks

Record trace `check` rows for non-delegated claim/complete, delegated active rejection, delegated in-flight claim/rejection, and schema boundary acceptance/rejection. Delegated queue-complete rejection is a passing boundary fact only when the CLI advice points back to `operate-work-unit submit`.

```bash
node --input-type=module - "$B" <<'JS'
import { readFileSync } from 'node:fs';
import {
  recordPlaybookCheck,
  writeTraceVerdict
} from './experiments_env/shared/work-unit-playbook-utils.mjs';

const bundle = process.argv[2];
const nonDelegatedClaim = JSON.parse(readFileSync(`${bundle}/case-404-nondelegated-claim.json`, 'utf8'));
const nonDelegatedComplete = JSON.parse(readFileSync(`${bundle}/case-404-nondelegated-complete.json`, 'utf8'));
const delegatedActiveStatus = Number(readFileSync(`${bundle}/case-404-delegated-active-complete.status`, 'utf8'));
const delegatedActive = JSON.parse(readFileSync(`${bundle}/case-404-delegated-active-complete.json`, 'utf8'));
const delegatedClaim = JSON.parse(readFileSync(`${bundle}/case-404-delegated-claim.json`, 'utf8'));
const delegatedInflightStatus = Number(readFileSync(`${bundle}/case-404-delegated-inflight-complete.status`, 'utf8'));
const delegatedInflight = JSON.parse(readFileSync(`${bundle}/case-404-delegated-inflight-complete.json`, 'utf8'));
const targetSchema = JSON.parse(readFileSync(`${bundle}/case-404-target-schema.json`, 'utf8'));

recordPlaybookCheck(bundle, {
  gate: 'non-delegated-claim',
  passed: nonDelegatedClaim.item?.queue_item_id === 'case404-nondelegated',
  detail: JSON.stringify(nonDelegatedClaim)
});
recordPlaybookCheck(bundle, {
  gate: 'non-delegated-complete',
  passed: nonDelegatedComplete.feedback?.passed === true,
  detail: JSON.stringify(nonDelegatedComplete)
});
recordPlaybookCheck(bundle, {
  gate: 'delegated-active-complete-rejects',
  passed: delegatedActiveStatus === 1 && JSON.stringify(delegatedActive).includes('operate-work-unit submit'),
  detail: JSON.stringify(delegatedActive)
});
recordPlaybookCheck(bundle, {
  gate: 'delegated-inflight-claim',
  passed: delegatedClaim.claimed_count === 1,
  detail: JSON.stringify(delegatedClaim.claimed_work_ids)
});
recordPlaybookCheck(bundle, {
  gate: 'delegated-inflight-complete-rejects',
  passed: delegatedInflightStatus === 1 && JSON.stringify(delegatedInflight).includes('operate-work-unit submit'),
  detail: JSON.stringify(delegatedInflight)
});
recordPlaybookCheck(bundle, {
  gate: 'controller-sub-agent-rejected',
  passed: targetSchema.controller_sub_agent_accepted === false && targetSchema.main_agent_delegates_to_sub_agent_accepted === true,
  detail: JSON.stringify(targetSchema)
});

const verdict = writeTraceVerdict(bundle, 'case-404');
console.log(JSON.stringify(verdict, null, 2));
process.exit(verdict.ok ? 0 : 1);
JS
```

Expected boundary coverage:

- Non-delegated queue claim + `operate-queue complete` still succeeds.
- Delegated active queue demand rejects `operate-queue complete`.
- Delegated in-flight work-unit demand rejects `operate-queue complete` with advice to use `operate-work-unit submit`.
- `TargetSpecSchema` rejects `controller: "sub-agent"` while accepting `controller: "main-agent"` with `delegates.to: "sub-agent"`.

## Step 4: [MAIN] Result Interpretation

PASS means the surviving queue path is still available for non-delegated work while delegated success is fenced to work-unit submit. FAIL means the Agent must not use queue completion as delegated authority until the CLI/schema boundary is repaired.

## Step 5: [MAIN/SHELL] Cleanup

PASS removes the disposable bundle. FAIL preserves it for diagnosis.

## Optional Automation Smoke

This smoke command runs the same checkpoints for automation, but it is not the normative MD-controller execution surface:

```bash
node experiments_env/shared/run-work-unit-playbook-case.mjs --case case-404 --cleanup-pass
```
