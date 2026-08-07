<!-- @impl ERS-001, ERS-002, ERS-003, EXA-001, EXA-002, EXA-003, EXA-004, EXA-005, EXA-006, EXA-007, EXA-008, EXA-009, EXO-007, PLR-001, PLR-003, PLR-004, VER-001, VER-006 -->

# experiments_playbook

`agent_flow_e2e` experiment surface. A real Headless or Interactive Playbook Agent executes each Markdown case against real disposable runtime state. Deterministic Supervisor or `node:test` fixtures can prove host mechanics, but cannot substitute for Playbook-Agent execution or Subject Agent behavior. Canonical routing semantics live in the accepted `verification-routing` spec.

## Canonical launch model

```text
Agent Autorun (normal)
operator/host -> Autorun Supervisor -> Agent CLI Launcher
-> Headless Playbook Agent -> rendered Markdown -> Engine checkpoints
-> native completion -> Supervisor health/audit/report/optional cleanup

Interactive (single-case diagnosis or real-human judgment)
operator -> Autorun Supervisor -> Agent CLI Launcher
-> Interactive Playbook Agent -> same rendered Markdown/Engine/native completion
-> Supervisor health/audit; run root preserved
```

- The Autorun Supervisor owns deterministic selection, run-root creation, Agent process lifecycle, completion validation, health, durable evidence/audit, reporting, and containment-safe cleanup.
- The Headless/Interactive Playbook Agent owns complete Markdown Agent Flow execution and feedback-driven repair.
- A Subject Agent/Sub-agent is an additional case-owned intelligent actor. Playbook-Agent participation alone is not Subject evidence.
- Engine/CLI owns schema, trace, receipts, checks, and native completion facts.
- The Agent CLI is the runtime launch transport. Agent Experiment Autorun is not an ordinary CLI test runner, and ordinary CI is only a possible host when it provides a real Agent CLI, model credentials, and required tools.

## Active surfaces

```text
experiments_playbook/
  PLAYBOOK_MANIFEST.md          # exact active path registration and execution order
  RUN_AGENT_AUTORUN_EXPS.md     # injected one-case Headless Playbook Agent contract
  RUN_INTERACTIVE_EXPS.md       # injected one-case manual debug/judgment contract
  exp_*/ and exph_*/            # case-<id>-<light|standard|heavy>-<role>.md
  exp_extrem_slow/              # quarantined case-<id>-extreme-slow-<role>.md; never runnable
```

The manifest owns only registered paths and order. Selected V2 frontmatter owns case/group, native verdict/check policy, stable bundle/verdict/health roles, health profile, and proof profile. Filename grammar owns execution cost. Native completion owns this run's actual role-to-path binding and outcome.

## Extreme-slow quarantine

`exp_extrem_slow/` holds cases that have shown an unacceptable observed runtime. It is not a fourth `light|standard|heavy` tier, is excluded from the active manifest corpus, and must never be selected by Autorun or Interactive replay.

To reactivate one, first refactor the playbook, move it to a normal runnable `exp_*/` or `exph_*/` location with a supported `light`, `standard`, or `heavy` filename cost, and explicitly register it in `PLAYBOOK_MANIFEST.md`. Otherwise remove it. Current quarantined cases are Case 224 and Case 225.

## Normal commands

Headless non-dry-run requires an explicit total USD budget:

```bash
node DEEP_RESEARCH_HARNESS/host_tools/run-agent-experiment.mjs --case case-41-light-minimal-path --max-total-budget-usd 1
node DEEP_RESEARCH_HARNESS/host_tools/run-agent-experiment.mjs --group agentic-queue --tier light --max-total-budget-usd 5 --max-case-budget-usd 1
node DEEP_RESEARCH_HARNESS/host_tools/run-agent-experiment.mjs --all --max-total-budget-usd 20 --cleanup-pass
node DEEP_RESEARCH_HARNESS/host_tools/run-agent-experiment.mjs --run-profile calibration --max-predicted-duration-ms 600000 --max-total-budget-usd 5 --max-case-budget-usd 1
```

Inspect selection without credentials, Agent launch, run roots, or mutation:

```bash
node DEEP_RESEARCH_HARNESS/host_tools/run-agent-experiment.mjs --tier light --dry-run
node DEEP_RESEARCH_HARNESS/host_tools/run-agent-experiment.mjs --group agentic-queue --tier standard --dry-run --json
node DEEP_RESEARCH_HARNESS/host_tools/run-agent-experiment.mjs --run-profile discovery --max-predicted-duration-ms 900000 --dry-run --json
node DEEP_RESEARCH_HARNESS/host_tools/run-agent-experiment.mjs --run-profile regression --max-predicted-duration-ms 480000 --dry-run --json
```

Interactive replay is exactly one case, user-present, and always preserved:

```bash
node DEEP_RESEARCH_HARNESS/host_tools/run-agent-experiment.mjs --interactive --case case-901-heavy-topic-rewrite-agent
```

The optional per-case cap cannot exceed the total budget. The Supervisor passes the current cap to the Agent CLI, accumulates only a valid final cost, and stops further launch if cost becomes unknown or the batch budget is exhausted. Cost never changes native PASS/FAIL/NOT_RUN.

Every Headless run must name an exact selector or an explicit run profile. `calibration`, `discovery`, and `diagnostic` are virtual bounded queries and require `--max-predicted-duration-ms`; `assurance` also requires an explicit legacy selector scope. Their data comes from current manifest/frontmatter and retained Supervisor reports, not a moved case tree or persistent classification. Filename `light|standard|heavy` remains a creation-time estimate and legacy filter, while `health_profile` remains a separate case health policy. A change's coverage scope stays in its declared `verification-plan.yaml`; paths and `@impl` markers do not select it automatically.

## Fast regression

`regression` is a virtual high-frequency deterministic regression profile, not a test class, permanent suite, filename tier, schedule, or Agent-behavior proof. Normal regression selects only current matching-v2 deterministic cases with one latest PASS, CLEAN result inside the fast SLO. It selects at most one case per `experiment` group and reports uncovered groups instead of filling the batch with another group or a slower case.

The maximum envelope is a `480000` ms selection forecast, `$3.00` total budget, `$0.60` effective per-case budget, `120000` ms explicit Agent timeout, and `60000` ms per-health-target timeout. Operators may tighten those bounds but cannot widen them. The forecast is not a batch deadline or scheduler.

Inspect normal membership without credentials or mutation:

```bash
node DEEP_RESEARCH_HARNESS/host_tools/run-agent-experiment.mjs \
  --run-profile regression --max-predicted-duration-ms 480000 --dry-run --json
```

Run the currently qualified fast members with an explicit bounded timeout:

```bash
node DEEP_RESEARCH_HARNESS/host_tools/run-agent-experiment.mjs \
  --run-profile regression --max-predicted-duration-ms 480000 \
  --max-total-budget-usd 3 --timeout 120000 --health-timeout 60000
```

When a fast source-matching historical observation lacks a matching v2 execution surface or carries a stale one, normal regression reports `needs_qualification` and does not launch it. Only the explicit qualification path may run that candidate under the same envelope:

```bash
node DEEP_RESEARCH_HARNESS/host_tools/run-agent-experiment.mjs \
  --run-profile regression --regression-qualification \
  --max-predicted-duration-ms 480000 --max-total-budget-usd 3 \
  --timeout 120000 --health-timeout 60000
```

`regression_recommendation: recommended` is optional author ordering advice only. Its absence is neutral; it cannot bypass result, health, SLO, or budget checks. A `verdict_mode: all` case also needs a reviewed `regression_retry_safety: reviewed` declaration before regression admission. Neither field changes native verdict semantics, and no existing case needs a move, rename, or permanent class. Slow, stale, Agent-behavior, FAIL, ERROR, ISSUES, or unqualified cases remain available through explicit calibration, diagnostic, or assurance work.

## Execution rules

- Execute the rendered playbook faithfully and serially; do not rewrite several cases into one script or skip non-bash Agent steps.
- Every verdict-affecting fact must be a strict playbook-owned `event: "check"` in bundle-root `rb_trace.jsonl`, with stable `gate` plus explicit boolean `passed` and `expected`.
- The playbook invokes the deterministic finalizer exactly once. The finalizer enforces V2 required checks and `all|last` semantics and publishes one native completion. The Supervisor never derives PASS from arbitrary partial checks or console prose.
- Every case gets one Supervisor-owned case run root under `.exp-bundles/runs/`; its direct-child `dpt_disp_*|dpt_rb_*` directories are bundle roots. Dynamic paths cross tool calls only through the explicit context-bound bundle registry.
- `.exp-bundles/` contains run-owned state, logs, evidence, audit, and reports. It never contains a copied, symlinked, or hardlinked `DEEP_RESEARCH_HARNESS/`, `experiments_env/`, or `tests/` tree. Framework/source remains at repo root.
- The Playbook Agent stops after native finalization. Health and cleanup are Supervisor work.

## Outcome, health, and cleanup

Native `PASS|FAIL|NOT_RUN`, lifecycle `HUMAN|ERROR|CANCELLED`, Agent process status, and health `CLEAN|ISSUES|ERROR|null` remain separate.

Only Headless effective PASS + every required health target CLEAN + explicit `--cleanup-pass` + successful outside-root evidence/audit may remove the complete case run root. PASS+ISSUES, FAIL, NOT_RUN, ERROR, CANCELLED, HUMAN, and all Interactive runs remain preserved. V1 has no prose-derived safe-cleanup exception.

Before deletion, durable prompt, sanitized structured Agent transcript/stderr, full completion/health/audit, exact trace-prefix bytes, and required Subject evidence bytes are retained outside the case root. Legacy thin result surfaces are not fallback authority.

## Human/AI judge pairs

Cases 901–949 are real-human Interactive evidence and Headless Autorun reports them as HUMAN rather than fabricating judgment. Their co-located +50 cases 950–999 use structured AI-judge provenance. An AI-judge result does not replace or delete its human pair, and the same actor cannot both produce and judge the semantic output.

## Filename cost estimates

- Light: initial bounded-cost estimate retained for compatibility filtering.
- Standard: initial multi-step cost estimate retained for compatibility filtering.
- Heavy: initial expensive/slow execution estimate retained for compatibility filtering.

These filename estimates are not a measured speed, proof, freshness, or health classification. Profile output keeps historical duration/cost, source/execution-surface relation, native outcome, and health as separate facts. Test class remains one of `unit`, `integration`, `deterministic_e2e`, or `agent_flow_e2e` under accepted `verification-routing`.
