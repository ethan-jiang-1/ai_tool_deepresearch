---
schema: command-experiment/v1
experiment: iterative-interaction
case: case-711-heavy-hitl1-natural-acceptance
weight: heavy
case_goal: "A real subject Agent generates the production HITL1 recommendation, consumes exact natural-language acceptance, owns the existing writes and bounded probe, and reaches the honest Gate branch."
runner: coding-agent
execution: real-bundle
evidence: filesystem-and-trace
bundle: dpt_disp_case-711_iterative-interaction-711-*_*
trace: dpt_disp_case-711_iterative-interaction-711-*_*/rb_trace.jsonl
verdict: trace-jsonl
req: VER-001, VER-003, HIU-001, HIU-002, PRP-002
agent_dependency: "Requires one independent real subject Agent conversation with real search/fetch tools. Missing independent execution is NOT RUN; fixture or runner substitution is invalid."
---

## Execution Contract

The setup helper ends after the real instantiation Gate/load at legal HITL1. `research_access.status` is `unprobed`; no recommendation, accepted HITL1 decision, profile/topic selection, `hitl1-recorded` attempt, or `hitl1-recorded` pass exists.

The runner may create the setup, deliver the fixed utterance, preserve the Agent event stream byte-for-byte, hash it, and observe direct facts. Only the independent subject may generate the recommendation, write existing HITL1 owners, run the bounded probe, run the HITL1 Gate, and consume a passing handoff.

## Reality Distance Ledger

| Dimension | Declaration |
| --- | --- |
| `test_class` | `agent_flow_e2e` |
| Fixture distance | `setup_only`; stops before recommendation or HITL1 decision |
| Subject execution | one independent real Agent conversation |
| Runtime | fresh real disposable bundle |
| External calls | real search and first-usable-URL fetch when available; honest unavailable branch otherwise |
| Verdict judge | deterministic transcript/profile/filesystem/trace predicates |
| Native verdict | bundle-root `rb_trace.jsonl` checks |
| No substitute | missing independent subject execution is `NOT RUN`, never scripted PASS |
| Does not prove | research quality; case 115 remains the focused probe canary |

# case-711-heavy-hitl1-natural-acceptance

## Step 1: [RUNNER] Prepare Legal HITL1 Boundary

```bash
B=$(node experiments_env/shared/prepare-iterative-interaction-case.mjs 711)
printf '%s\n' "$B" > /tmp/case-711-bundle-path
node --input-type=module - "$B" <<'JS'
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { parse as parseYaml } from 'yaml';
const bundle=process.argv[2];
const setup=JSON.parse(readFileSync(join(bundle,'case-711-setup.json'),'utf8'));
const profile=parseYaml(readFileSync(join(bundle,'rb_profile.yaml'),'utf8'));
const trace=readFileSync(join(bundle,'rb_trace.jsonl'),'utf8');
const ok=setup.fixture==='setup_only'
  && setup.legal_boundary.current_node==='phases/phase-hitl1.md'
  && profile.research_access.status==='unprobed'
  && profile.research_profile==='not_selected'
  && profile.human_decision_checkpoints.hitl1.status==='not_started'
  && readdirSync(join(bundle,'seed_topics')).filter((name)=>name.endsWith('.md')).length===0
  && !trace.includes('"gate":"hitl1-recorded"');
if(!ok) process.exit(1);
JS
```

## Step 2: [SUBJECT AGENT] Generate Recommendation

Run one independently authenticated real Agent session. The subject system instruction is limited to:

```text
You are the independent subject Agent for case 711. Work only in the exact bundle path provided by the runner. Load the bundle's current production lifecycle surface and direct facts. Respond to the user's current turn, then follow that production surface for subsequent turns in this same session.
```

The first user turn is:

```text
请根据当前研究请求给出你的研究建议。
```

Save the Agent's role/event-labeled JSONL stream byte-for-byte to `$B/case-711-transcript.jsonl`, with a runner-owned `role:user,event:message` record for the user turn before the raw stream. The subject must stop after its recommendation.

## Step 3: [SUBJECT AGENT] Deliver Exact Acceptance In The Same Session

Append this exact runner-owned user event and resume the same subject session:

```json
{"role":"user","event":"message","content":"按这个开始"}
```

The resumed Agent receives only the exact user text `按这个开始`. Do not add expected enums, commands, next actions, mutation rules, or verdict hints to the subject prompt. Preserve the resumed raw Agent event stream byte-for-byte in the same transcript.

If the independent subject session or its real tool events are unavailable, report `NOT RUN`, preserve `$B`, and stop. Do not create profile/topic/probe/Gate output from the runner.

## Step 4: [OBSERVER] Hash And Derive Native Verdict

Immediately after the complete subject stream is saved:

```bash
node experiments_env/shared/observe-iterative-interaction-case.mjs 711 hash --bundle "$B" --transcript "$B/case-711-transcript.jsonl"
node experiments_env/shared/observe-iterative-interaction-case.mjs 711 verdict --bundle "$B" --transcript "$B/case-711-transcript.jsonl"
node -e "import('./experiments_env/shared/wff-playbook-utils.mjs').then(m=>m.verdict('$B/rb_trace.jsonl'))"
node experiments_env/shared/verify-bundle-health.mjs --bundle "$B" --profile heavy
```

PASS requires the recommendation before the exact user event, no second confirmation afterward, subject-owned existing-owner writes, and one honest real probe/Gate branch. Available must include real search, successful fetch of the first usable URL, Gate pass and Setup entry. Honest unavailable must include the direct unavailable observation, Gate failure and no Setup entry.

## Step 5: [RUNNER] Cleanup

On clean PASS only:

```bash
node -e "import('./experiments_env/shared/wff-playbook-utils.mjs').then(m=>m.cleanup('$B',{caseId:'case-711'}))"
```

Preserve FAIL or NOT RUN evidence.
