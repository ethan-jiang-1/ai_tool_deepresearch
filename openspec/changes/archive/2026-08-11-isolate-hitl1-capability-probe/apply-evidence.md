# Apply Evidence

## REA-002 / REA-003 Real Canary

Status: `NOT_RUN` for the available-path claim.

The selected launcher preflight passed: the Claude executable, selected
DeepSeek configuration, and requested model were present. The supervised exact
case dry-run also selected `case-115-heavy-hitl1-research-access-probe` under
the generic non-bypass contract. These are setup facts only; they do not prove
an isolated agent performed search or fetch.

One supervised native invocation was issued with a `USD 5` total and per-case
limit:

```bash
node DEEP_RESEARCH_HARNESS/host_tools/run-agent-experiment.mjs \
  --case case-115-heavy-hitl1-research-access-probe \
  --max-total-budget-usd 5 --max-case-budget-usd 5 --json
```

The terminal session completed without returning its structured batch report or
any declared `subject_prompt`, `subject_transcript`, or `subject_result`
coordinate to this apply session. The current Subject runner and observer do
not make that absence a success, so no fixture, profile write, Gate attempt, or
manually authored observation was substituted.

The authorized Autorun Supervisor audit subsequently recovered a retained
case-115 report at the following exact coordinate:

```text
.exp-bundles/_reports/defe9b21-bad9-4a79-8f5c-9825f612473e.json
```

Its matching case record preserves this run root:

```text
.exp-bundles/runs/defe9b21-bad9-4a79-8f5c-9825f612473e/001-case-115-heavy-hitl1-research-access-probe-9b6a32da-0626-4766-b11b-25e9d5dc90de
```

The Supervisor-recorded native and effective outcome is `NOT_RUN`. Its native
completion reason is `case-115 requires exactly one public WebSearch tool_use`;
it declares no durable Subject evidence, as required for this boundary. The
report's source-playbook SHA-256 is
`3323ac6dc103d653613a64b6253e3b7c3c5a5b6ec6ca70561f2e4575fb6a546e`, which
matches the current case-115 playbook. The report also records the current
Subject runner and observer SHA-256 values. This is a real authenticated
runtime `NOT_RUN`, not evidence of an available probe path or a Phase profile
write/Gate execution.

Deterministic evidence is separate: the focused runner, observer, and Markdown
contract tests pass, but do not establish provider availability or real Agent
behavior.
