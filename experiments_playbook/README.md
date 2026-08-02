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
```

The manifest owns only registered paths and order. Selected V2 frontmatter owns case/group, native verdict/check policy, stable bundle/verdict/health roles, health profile, and proof profile. Filename grammar owns execution cost. Native completion owns this run's actual role-to-path binding and outcome.

## Normal commands

Headless non-dry-run requires an explicit total USD budget:

```bash
node DPT_FRAMEWORK/host_tools/run-agent-experiment.mjs --case case-41-light-minimal-path --max-total-budget-usd 1
node DPT_FRAMEWORK/host_tools/run-agent-experiment.mjs --group agentic-queue --tier light --max-total-budget-usd 5 --max-case-budget-usd 1
node DPT_FRAMEWORK/host_tools/run-agent-experiment.mjs --all --max-total-budget-usd 20 --cleanup-pass
node DPT_FRAMEWORK/host_tools/run-agent-experiment.mjs --run-profile calibration --max-predicted-duration-ms 600000 --max-total-budget-usd 5 --max-case-budget-usd 1
```

Inspect selection without credentials, Agent launch, run roots, or mutation:

```bash
node DPT_FRAMEWORK/host_tools/run-agent-experiment.mjs --tier light --dry-run
node DPT_FRAMEWORK/host_tools/run-agent-experiment.mjs --group agentic-queue --tier standard --dry-run --json
node DPT_FRAMEWORK/host_tools/run-agent-experiment.mjs --run-profile discovery --max-predicted-duration-ms 900000 --dry-run --json
```

Interactive replay is exactly one case, user-present, and always preserved:

```bash
node DPT_FRAMEWORK/host_tools/run-agent-experiment.mjs --interactive --case case-901-heavy-topic-rewrite-agent
```

The optional per-case cap cannot exceed the total budget. The Supervisor passes the current cap to the Agent CLI, accumulates only a valid final cost, and stops further launch if cost becomes unknown or the batch budget is exhausted. Cost never changes native PASS/FAIL/NOT_RUN.

Every Headless run must name an exact selector or an explicit run profile. `calibration`, `discovery`, and `diagnostic` are virtual bounded queries and require `--max-predicted-duration-ms`; `assurance` also requires an explicit legacy selector scope. Their data comes from current manifest/frontmatter and retained Supervisor reports, not a moved case tree or persistent classification. Filename `light|standard|heavy` remains a creation-time estimate and legacy filter, while `health_profile` remains a separate case health policy. A change's coverage scope stays in its declared `verification-plan.yaml`; paths and `@impl` markers do not select it automatically.

## Execution rules

- Execute the rendered playbook faithfully and serially; do not rewrite several cases into one script or skip non-bash Agent steps.
- Every verdict-affecting fact must be a strict playbook-owned `event: "check"` in bundle-root `rb_trace.jsonl`, with stable `gate` plus explicit boolean `passed` and `expected`.
- The playbook invokes the deterministic finalizer exactly once. The finalizer enforces V2 required checks and `all|last` semantics and publishes one native completion. The Supervisor never derives PASS from arbitrary partial checks or console prose.
- Every case gets one Supervisor-owned case run root under `.exp-bundles/runs/`; its direct-child `dpt_disp_*|dpt_rb_*` directories are bundle roots. Dynamic paths cross tool calls only through the explicit context-bound bundle registry.
- `.exp-bundles/` contains run-owned state, logs, evidence, audit, and reports. It never contains a copied, symlinked, or hardlinked `DPT_FRAMEWORK/`, `experiments_env/`, or `tests/` tree. Framework/source remains at repo root.
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
