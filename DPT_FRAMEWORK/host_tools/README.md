<!-- @impl ERS-001, ERS-002, ERS-003, EXA-001, EXA-002, EXA-003, EXA-004, EXA-008, EXA-009, EXO-007, LDC-001, LDC-002, LDC-005, LDC-008, LDC-009, PLR-004 -->

# Host Tools

Host-side Agent runtime launch and Agent Experiment Autorun surfaces. These tools are not the Deep Research Engine and do not replace the intelligent Playbook Agent or a case-owned Subject Agent.

Deterministic `node:test`, CI, or test-owned Claude executable fixtures prove only Autorun Supervisor mechanics such as selection, argv/env isolation, timeout, completion validation, audit, and cleanup. Real `agent_flow_e2e` proof additionally requires the actual Agent CLI runtime, model credentials, required tools, and native runtime evidence from the executed Markdown case. Every batch report carries this same non-verdict `proof_boundary`; a fixture-generated report must not be relabeled as real Playbook-Agent or Subject-Agent evidence.

## Agent CLI Launcher: `claude-deepseek.mjs`

The generic launcher loads provider routing from the ignored repo-root `.env`, builds an isolated Claude child environment, and transparently forwards caller arguments, stdio, exit status, and signal. It does not add permission bypass or a spending policy.

```bash
node DPT_FRAMEWORK/host_tools/claude-deepseek.mjs --check
node DPT_FRAMEWORK/host_tools/claude-deepseek.mjs -p "hello"
node DPT_FRAMEWORK/host_tools/claude-deepseek.mjs --verbose
```

Required `.env` values:

```dotenv
DEEPSEEK_API_KEY=...
DEEPSEEK_ANTHROPIC_BASE_URL=https://api.deepseek.com/anthropic
DEEPSEEK_MODEL=deepseek-v4-pro
```

`.env` is provider configuration for the child Agent runtime. It is not experiment state. Agent Experiment paths and cross-tool-call bundle roles use explicit context files/arguments; caller/inherited env cannot override selected provider routing.

## Selected HITL1 Research-Access Adapter

`research-access-adapter.md` is the one Agent-readable contract for the selected
Claude CLI / `deepseek_anthropic_compatible` HITL1 research-access host. It describes
the generic non-bypass launcher invocation and the Agent-owned `WebSearch` -> returned
URL -> same-URL `WebFetch` boundary. The launcher only starts the runtime; it neither
performs the probe nor turns configuration, `--check`, or a fixture into access proof.
The existing profile observation and HITL1 Gate remain the runtime authorities.

## Autorun Supervisor: `run-agent-experiment.mjs`

This is the normal Agent Experiment Autorun entry. The Supervisor selects exact manifest paths, creates isolated case run roots, launches one real Headless Playbook Agent per case through the shared Agent CLI contract, validates native completion, runs declared health, writes durable audit/evidence/report records, and optionally removes clean PASS roots. It never executes Markdown steps or derives native PASS/FAIL from arbitrary trace checks.

Headless execution requires an explicit total USD limit:

```bash
# Exact case
node DPT_FRAMEWORK/host_tools/run-agent-experiment.mjs \
  --case case-41-light-minimal-path \
  --max-total-budget-usd 1

# Exact group and optional cost tier
node DPT_FRAMEWORK/host_tools/run-agent-experiment.mjs \
  --group agentic-queue --tier light \
  --max-total-budget-usd 5 --max-case-budget-usd 1

# All autorun-compatible cases; real-human cases remain manual
node DPT_FRAMEWORK/host_tools/run-agent-experiment.mjs \
  --all --max-total-budget-usd 20

# Cleanup only effective PASS + required health CLEAN after durable audit/export
node DPT_FRAMEWORK/host_tools/run-agent-experiment.mjs \
  --tier light --max-total-budget-usd 5 --cleanup-pass

# Bounded virtual calibration; this does not rename or move cases
node DPT_FRAMEWORK/host_tools/run-agent-experiment.mjs \
  --run-profile calibration --max-predicted-duration-ms 600000 \
  --max-total-budget-usd 5 --max-case-budget-usd 1

# Fast virtual regression inspection
node DPT_FRAMEWORK/host_tools/run-agent-experiment.mjs \
  --run-profile regression --max-predicted-duration-ms 480000 --dry-run --json
```

Every Headless invocation supplies either an exact selector or a run profile. `--case` is exact and exclusive. `--group` may combine with one filename `--tier`; `--all` is exclusive. `calibration`, `discovery`, and `diagnostic` profiles require `--max-predicted-duration-ms` and cannot combine with exact selectors. `assurance` requires both that bound and an explicit selector scope; change impact remains declared in the change's `verification-plan.yaml`, not inferred from paths or implementation tags.

`regression` is a virtual high-frequency deterministic profile. It is neither a permanent suite nor a filename cost class, and it selects at most one current qualifying deterministic case from each `experiment` group. Its fixed maximum envelope is `480000` ms predicted duration, `$3.00` total budget, `$0.60` effective per-case budget, `120000` ms Agent timeout, and `60000` ms per-health-target timeout. A caller may tighten but never widen those values; the eight-minute value is a selection forecast, not a scheduler deadline.

Normal regression requires a current matching-v2 PASS+CLEAN result and, for non-dry execution, an explicit `--timeout` at or below `120000`. It reports a group gap rather than starting an unqualified, slow, stale, Agent-behavior, FAIL, ERROR, or ISSUES case. A source-matching historical fast result without a matching v2 execution surface is `needs_qualification`; only `--run-profile regression --regression-qualification` may launch it under the same bounds.

`regression_recommendation: recommended` is optional author ordering advice. It is neutral when absent and cannot grant membership, outcome, health, cost, budget, or coverage authority. A `verdict_mode: all` playbook additionally needs `regression_retry_safety: reviewed` before admission. These fields do not change the native verdict, and measurements never require moving, renaming, or permanently reclassifying a playbook.

Filename `light|standard|heavy` is a creation-time cost estimate and legacy compatibility filter, not a current speed, coverage, or proof label. `health_profile` remains an independent V2 health policy. The Supervisor recomputes profile observations from current manifest/frontmatter plus retained reports; no case move, rename, or persistent reclassification is required when measurements change. The optional case cap cannot exceed the total. The Supervisor passes the current cap to Claude, accumulates one valid final `total_cost_usd` per started Headless case, and stops further launch on missing/malformed cost or exhausted budget. Cost does not affect native verdict.

Dry-run validates exact manifest/V2 selection without loading credentials, creating `.exp-bundles/`, or launching an Agent:

```bash
node DPT_FRAMEWORK/host_tools/run-agent-experiment.mjs --tier light --dry-run
node DPT_FRAMEWORK/host_tools/run-agent-experiment.mjs --group agentic-queue --tier standard --dry-run --json
node DPT_FRAMEWORK/host_tools/run-agent-experiment.mjs --run-profile discovery --max-predicted-duration-ms 900000 --dry-run --json
node DPT_FRAMEWORK/host_tools/run-agent-experiment.mjs --run-profile regression --max-predicted-duration-ms 480000 --dry-run --json
```

Interactive diagnosis/replay is exactly one case, uses normal user-present TTY permission handling, and always preserves its run root:

```bash
node DPT_FRAMEWORK/host_tools/run-agent-experiment.mjs \
  --interactive --case case-901-heavy-topic-rewrite-agent
```

Interactive omits Headless `-p`, stream output, no-session, bypass, budget, and cleanup flags. The complete bounded initial payload is passed as Claude's documented positional prompt argument. It uses the same host-created context, native completion validation, health, and audit contract.

## Runtime and evidence layout

```text
.exp-bundles/
  runs/<batch-id>/<ordinal>-<case>-<uuid>/
    agent-experiment-run.json
    rendered-playbook.md
    agent-experiment-completion.json
    _playbook_state/bundles.json
    _diagnostics/
    dpt_disp_* and optional declared dpt_rb_* bundle roots
  _logs/<batch-id>/...
  _evidence/<batch-id>/...
  _audit/agent-experiment-runs.jsonl
  _reports/<batch-id>.json
```

`.exp-bundles/` never contains a copied, symlinked, or hardlinked `DPT_FRAMEWORK/`, `experiments_env/`, or `tests/` tree. The Playbook Agent cwd remains the validated repository command root so repo-relative source commands use the one original framework; only mutable run data enters the case run root. This containment is mutation/cleanup authority, not an OS sandbox for hostile playbooks.

Before any clean PASS deletion, the Supervisor retains exact prompt, sanitized structured Agent output/stderr, full completion/health/audit, trace-prefix bytes, and required Subject evidence outside the case root. PASS+ISSUES, FAIL, NOT_RUN, ERROR, CANCELLED, HUMAN, and Interactive roots are preserved.
