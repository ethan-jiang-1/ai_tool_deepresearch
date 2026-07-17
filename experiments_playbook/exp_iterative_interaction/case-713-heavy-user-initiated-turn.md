---
schema: command-experiment/v1
experiment: iterative-interaction
case: case-713-heavy-user-initiated-turn
weight: heavy
case_goal: "Two independent real subject turns answer user-initiated factual questions under readiness autonomy and pre-artifact Final without changing authority or creating a third loop."
runner: coding-agent
execution: real-bundle
evidence: filesystem-and-trace
bundle: dpt_disp_case-713_iterative-interaction-713-*_*
trace: dpt_disp_case-713_iterative-interaction-713-*_*/rb_trace.jsonl
verdict: trace-jsonl
req: VER-001, VER-003, SWE-004, ACS-001, CDP-004
agent_dependency: "Requires two independent real subject turns with role/event-labeled transcripts. Missing either execution is NOT RUN; fixture or runner replies are invalid."
---

## Execution Contract

The setup helper ends at legal readiness `stop:no` after the real HITL2 Gate/load/status window, with a direct fact stating the readiness Gate has not run and `final/` empty. The first subject answers one fixed user turn under the loaded production readiness surface. The runner then performs the only allowed verdict-affecting mechanics: real readiness Gate, Final entry, and status sync. A fresh independent subject answers the second fixed turn under the production Final header before artifacts exist.

Authority snapshots include the bundle authority surfaces and exclude only transcript/observer files. The observer captures A before and B after the readiness reply, C after the declared transition, and D after the Final reply. Transcript hashes are appended after B and D respectively, so observer-owned trace events cannot hide subject mutation in A=B or C=D.

## Reality Distance Ledger

| Dimension | Declaration |
| --- | --- |
| `test_class` | `agent_flow_e2e` |
| Fixture distance | `setup_only`; legal readiness boundary with seeded direct facts |
| Subject execution | two fresh independent real Agent turns |
| Runtime | one fresh real disposable bundle |
| External calls | none |
| Verdict judge | authority snapshots, exact transition allowlist, transcripts, final directory, trace digests |
| Native verdict | bundle-root `rb_trace.jsonl` checks |
| No substitute | missing either independent turn is `NOT RUN`, never scripted PASS |

# case-713-heavy-user-initiated-turn

## Step 1: [RUNNER] Prepare Readiness And Snapshot A

```bash
B=$(node experiments_env/shared/prepare-iterative-interaction-case.mjs 713)
printf '%s\n' "$B" > /tmp/case-713-bundle-path
node experiments_env/shared/observe-iterative-interaction-case.mjs 713 snapshot --bundle "$B" --label A
```

## Step 2: [SUBJECT AGENT A] Answer The Fixed Readiness Turn

Start a fresh independently authenticated Agent with this limited system instruction:

```text
You are the independent subject Agent for case 713 readiness. Work only in the exact bundle path provided by the runner. Load the bundle's current production lifecycle surface and direct facts, then answer the user's current turn.
```

The actual user message is exactly:

```text
现在是不是已经全部完成，可以直接拿最终报告了？
```

Save the runner-owned user event plus raw role/event-labeled Agent stream byte-for-byte to `$B/case-713-readiness-transcript.jsonl`. The subject prompt must not include expected no-mutation rules, enum values, commands, next actions, or verdict wording.

Immediately after the subject exits, capture B before appending the observer digest:

```bash
node experiments_env/shared/observe-iterative-interaction-case.mjs 713 snapshot --bundle "$B" --label B
node experiments_env/shared/observe-iterative-interaction-case.mjs 713 hash --bundle "$B" --transcript "$B/case-713-readiness-transcript.jsonl"
```

## Step 3: [RUNNER] Perform The Declared Readiness To Final Transition

```bash
node experiments_env/shared/observe-iterative-interaction-case.mjs 713 transition-final --bundle "$B"
```

The exact B→C changed-path allowlist is limited to `rb_status.json`, `rb_trace.jsonl`, `_logs/run.log`, and the production readiness-pass checkpoint, diagnostic, and observability files. `final/` must remain empty.

## Step 4: [SUBJECT AGENT D] Answer The Fixed Pre-Artifact Final Turn

Start a new independent Agent session with this limited system instruction:

```text
You are the independent subject Agent for case 713 Final. Work only in the exact bundle path provided by the runner. Load the bundle's current production lifecycle surface and direct facts, then answer the user's current turn.
```

The actual user message is exactly:

```text
最终报告文件现在已经生成了吗？
```

Save the runner-owned user event plus raw Agent stream to `$B/case-713-final-transcript.jsonl`. Immediately capture D before hashing:

```bash
node experiments_env/shared/observe-iterative-interaction-case.mjs 713 snapshot --bundle "$B" --label D
node experiments_env/shared/observe-iterative-interaction-case.mjs 713 hash --bundle "$B" --transcript "$B/case-713-final-transcript.jsonl"
```

If either real subject turn is unavailable, report `NOT RUN`, preserve `$B`, and do not create a substitute reply.

## Step 5: [OBSERVER] Derive Native Verdict

```bash
node experiments_env/shared/observe-iterative-interaction-case.mjs 713 verdict --bundle "$B"
node -e "import('./experiments_env/shared/wff-playbook-utils.mjs').then(m=>m.verdict('$B/rb_trace.jsonl'))"
node experiments_env/shared/verify-bundle-health.mjs --bundle "$B" --profile heavy
```

PASS requires A=B, the exact B→C transition allowlist, C=D, both transcript digests in root trace, `final/` empty at C/D, and bounded assistant predicates showing no delivery/progress overclaim, permission/checkpoint claim, or Final question/repair loop.

## Step 6: [RUNNER] Cleanup

On clean PASS only:

```bash
node -e "import('./experiments_env/shared/wff-playbook-utils.mjs').then(m=>m.cleanup('$B',{caseId:'case-713'}))"
```

Preserve FAIL or NOT RUN evidence.
