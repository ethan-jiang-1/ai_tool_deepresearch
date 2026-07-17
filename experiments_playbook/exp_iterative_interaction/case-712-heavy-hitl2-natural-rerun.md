---
schema: command-experiment/v1
experiment: iterative-interaction
case: case-712-heavy-hitl2-natural-rerun
weight: heavy
case_goal: "A real subject Agent generates the production HITL2 review and one recommendation, maps one natural-language follow-up into the existing rerun path, and consumes the real Gate handoff."
runner: coding-agent
execution: real-bundle
evidence: filesystem-and-trace
bundle: dpt_disp_case-712_iterative-interaction-712-*_*
trace: dpt_disp_case-712_iterative-interaction-712-*_*/rb_trace.jsonl
verdict: trace-jsonl
req: VER-001, VER-003, HIU-003, CDP-001
agent_dependency: "Requires one independent real subject Agent conversation. Missing independent execution is NOT RUN; fixture or runner substitution is invalid."
---

## Execution Contract

The setup-only predecessor uses real production Gates, route-bound loads, status synchronization, work-unit submit, and a fixture-disclosed research baseline. It ends at legal HITL2 before `decision-brief.md`, recommendation, decision, `hitl2-recorded` attempt, or handoff exists.

Only the subject may generate the review/recommendation, receive the fixed natural-language request, write the existing HITL2 decision/rationale owner, run the real Gate, and consume its handoff. The runner saves/hashes the transcript and derives checks only from transcript/profile/trace facts.

## Reality Distance Ledger

| Dimension | Declaration |
| --- | --- |
| `test_class` | `agent_flow_e2e` |
| Fixture distance | `setup_only`; production predecessor chain stops before HITL2 brief/recommendation/decision |
| Subject execution | one independent real Agent conversation |
| Runtime | fresh real disposable bundle |
| External calls | none |
| Verdict judge | deterministic transcript/profile/Gate/handoff predicates |
| Native verdict | bundle-root `rb_trace.jsonl` checks |
| No substitute | missing independent execution is `NOT RUN`, never fixture PASS |

# case-712-heavy-hitl2-natural-rerun

## Step 1: [RUNNER] Prepare Legal HITL2 Boundary

```bash
B=$(node experiments_env/shared/prepare-iterative-interaction-case.mjs 712)
printf '%s\n' "$B" > /tmp/case-712-bundle-path
node --input-type=module - "$B" <<'JS'
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { parse as parseYaml } from 'yaml';
const bundle=process.argv[2];
const setup=JSON.parse(readFileSync(join(bundle,'case-712-setup.json'),'utf8'));
const profile=parseYaml(readFileSync(join(bundle,'rb_profile.yaml'),'utf8'));
const trace=readFileSync(join(bundle,'rb_trace.jsonl'),'utf8');
const ok=setup.legal_boundary.current_node==='phases/phase-hitl2.md'
  && profile.human_decision_checkpoints.hitl2.status==='not_started'
  && !existsSync(join(bundle,'artifacts/hitl2/decision-brief.md'))
  && !trace.includes('"gate":"hitl2-recorded"');
if(!ok) process.exit(1);
JS
```

## Step 2: [SUBJECT AGENT] Generate Review And Recommendation

Use one independently authenticated subject session with this limited system instruction:

```text
You are the independent subject Agent for case 712. Work only in the exact bundle path provided by the runner. Load the bundle's current production lifecycle surface and direct facts. Respond to the user's current turn, then follow that production surface for subsequent turns in this same session.
```

The first user turn is:

```text
请审阅当前研究并告诉我下一步最值得做什么。
```

Save the role/event-labeled Agent stream byte-for-byte to `$B/case-712-transcript.jsonl`, preceded by a runner-owned user event. Stop after the review and one recommendation.

## Step 3: [SUBJECT AGENT] Deliver The Only Decision Turn

Append this exact runner-owned event and resume the same subject session:

```json
{"role":"user","event":"message","content":"资本约束这部分还不够，再补一下"}
```

The resumed Agent receives only that exact text. Do not add expected enums, commands, no-confirmation rules, next actions, or verdict hints. No second user response is allowed. Preserve raw Agent events byte-for-byte.

If the independent session is unavailable, report `NOT RUN`, preserve `$B`, and do not let the runner write decision/rationale/Gate/handoff facts.

## Step 4: [OBSERVER] Hash And Derive Native Verdict

```bash
node experiments_env/shared/observe-iterative-interaction-case.mjs 712 hash --bundle "$B" --transcript "$B/case-712-transcript.jsonl"
node experiments_env/shared/observe-iterative-interaction-case.mjs 712 verdict --bundle "$B" --transcript "$B/case-712-transcript.jsonl"
node -e "import('./experiments_env/shared/wff-playbook-utils.mjs').then(m=>m.verdict('$B/rb_trace.jsonl'))"
node experiments_env/shared/verify-bundle-health.mjs --bundle "$B" --profile heavy
```

PASS requires one review plus one available recommendation before the fixed user event, the existing rerun decision/rationale written by the subject, a real `hitl2-recorded` pass and route-bound rerun load, no second user response, no blanket confirmation, and no canonical enum in user-facing assistant blocks.

## Step 5: [RUNNER] Cleanup

On clean PASS only:

```bash
node -e "import('./experiments_env/shared/wff-playbook-utils.mjs').then(m=>m.cleanup('$B',{caseId:'case-712'}))"
```

Preserve FAIL or NOT RUN evidence.
