## Stage 0. Boundary And Inventory

Intent: before writing tooling, make the implementation surface explicit so later stages do not blindly rewrite playbooks or confuse runner docs.

Proof required: a concrete inventory of runner surfaces, Standard gate-CLI targets, Heavy targets, Human/manual exceptions, cleanup patterns, and read-only evidence sources.

Exit gate: implementation may start only after the inventory confirms no health check needs to re-run a gate and no edits outside the approved implementation scope are needed.

Test assets embedded: none yet; this stage selects future fixture families and representative playbooks.

- [x] 0.1 Review boundary for EXO-001..EXO-006: confirm this change implements an observability layer, not new playbook verdict semantics; done when implementation notes record the active runner surface (`RUN_EXPS.md`, `RUN.md`, or both) and the approved edit scope.
- [x] 0.2 Inventory rollout targets for EXO-003/EXO-006: list Standard gate-CLI playbooks, non-gate Standard exceptions, Heavy playbooks, Human/manual exceptions, and cleanup patterns; done when representative Standard and Heavy samples are selected from the list.
- [x] 0.3 Inventory evidence sources for EXO-001/EXO-005: identify existing gate output shape, `gate_attempt` trace fields, ledger declaration schema, runtime receipt paths, cache trail leaf shape, and content_dedup evidence source; done when implementation has a read-only evidence map.
- [x] 0.4 Inventory existing custom post-verdict inspection in playbooks: identify any playbook that already has ad‑hoc post‑verdict file checks, trace inspection, or manual health logic outside the gate/verdict steps; done when the inventory records which playbooks need coexistence or replacement strategy before health verifier rollout.

## Stage 1. Health Contract And Schema

Intent: lock the report contract before building readers or changing playbooks.

Proof required: schema tests prove profile, section status, required/optional semantics, and top-level issue aggregation.

Exit gate: health JSON can be validated independently of any real playbook rollout.

Test assets embedded: schema/unit fixtures for valid reports, invalid reports, required-section issues, optional-section issues, and profile table behavior.

- [x] 1.1 Implement EXO-001: create the experiment health report Zod schema/helper in `experiments_env/shared/`, including `schema_version`, `profile`, health sections, section `required`, section `status`, section-level `issues`, and top-level `issues`; done when unit tests cover valid and invalid reports.
- [x] 1.2 Implement EXO-001/EXO-002: encode top-level `status` and top-level `issues` rules; done when tests prove top-level `issues` only includes required-section issues and optional section issues stay section-level.
- [x] 1.3 Implement EXO-002: define the explicit `light`, `standard`, and `heavy` profile table; done when tests prove each profile requires only its documented checks and `standard` is treated as observability profile / RUN_EXPS tier, not an accepted `agent-testing` weight redefinition.

## Stage 2. Read-Only Health Verifier

Intent: build the post-run verifier as a reader of real bundle facts, not a second verdict engine.

Proof required: fixtures prove clean, required-missing, optional-missing, optional-invalid, and command-failure cases without executing gates.

Exit gate: `verify-bundle-health.mjs` can inspect bundle state and produce stable JSON plus terminal summary without mutating runtime facts.

Test assets embedded: synthetic disposable-bundle fixtures for minimal light CLEAN, missing required artifact, absent optional Heavy-only artifacts, present-but-invalid optional artifacts, and bundle validate/inspect command failures.

- [x] 2.1 Implement EXO-001/EXO-002: add `experiments_env/shared/verify-bundle-health.mjs <bundlePath> --profile <light|standard|heavy> [--json]`; done when it returns `clean` for a minimal valid light fixture and `issues` for artifacts required by the selected profile.
- [x] 2.2 Implement EXO-001/EXO-002: handle optional sections; done when absent Heavy-only artifacts in light profile return `not_applicable`, while present-but-invalid optional artifacts produce section-level `issues` without flipping top-level status.
- [x] 2.3 Implement EXO-001: integrate existing bundle validation/inspection commands into the health report without importing experiment shared code from production paths; done when command failures are captured as health issues rather than uncaught crashes.
- [x] 2.4 Implement EXO-004: allow the health verifier to append an optional non-verdict diagnostic event with `source: "experiment-observability"` through the canonical trace writer/contract; done when verdict `check` counts remain unchanged and trace schema validation accepts the diagnostic event.
- [x] 2.5 Implement EXO-001/EXO-005: prove health verification is read-only with respect to gates; done when tests prove `verify-bundle-health.mjs` never executes a gate command and only reads bundle state, wrapper artifacts, trace, ledger, receipts, and cache files.

## Stage 3. Gate Wrapper And Diagnostics

Intent: preserve gate outcomes while making gate diagnostics durable and visible to health/reporting.

Proof required: wrapper tests prove exit-code preservation, raw artifact persistence, stable artifact discovery, and diagnostic trace shape.

Exit gate: a representative gate command can be wrapped without changing verdict behavior.

Test assets embedded: fake gate command fixtures for PASS, FAIL, malformed stdout, parseable `inspect[]` / `advice[]`, stderr capture, and stable `_observability/gates/<seq>-<gate>.json` discovery.

- [x] 3.1 Implement EXO-003: add `experiments_env/shared/run-gate-with-monitor.mjs --bundle <bundlePath> --gate <name> -- <gate command...>` using `child_process.spawn`; done when tests prove wrapper exit code equals the wrapped gate exit code for PASS and FAIL.
- [x] 3.2 Implement EXO-003: persist raw gate artifacts under `<bundle>/_observability/gates/<seq>-<gate>.json` with zero-padded monotonic `sequence`; done when tests prove artifact discovery via sorted `_observability/gates/*.json` is stable.
- [x] 3.3 Implement EXO-003/EXO-004: extract `inspect[]` and `advice[]` from parseable gate output and append non-verdict diagnostic trace events; done when diagnostics survive both passing and failing gate commands without creating `check` events.

## Stage 4. Heavy Provenance Health

Intent: make Heavy observability prove real Agent/Engine boundary signals instead of accepting scanned files as truth.

Proof required: ledger-driven fixtures cover complete provenance, empty ledger, missing receipt, missing cache trail, and missing gate-consumption evidence.

Exit gate: Heavy health can say exactly which provenance signal is missing while staying read-only.

Test assets embedded: Heavy provenance fixtures for complete ledger-driven provenance, empty ledger, files-without-ledger, missing runtime receipt, missing cache trail leaf files, and missing gate-consumption evidence.

- [x] 4.1 Implement EXO-005: add ledger-driven inspection for `rb_output_declarations.jsonl`, declaration schema, `slot_result_ref`, declared output files, declared cache trails, and runtime receipts; done when fixtures cover complete provenance, empty ledger, missing receipt, and missing cache trail files.
- [x] 4.2 Implement EXO-005: connect Heavy health to dedup/ledger-consuming gate evidence from existing wrapper raw artifacts, existing gate attempt trace, or existing diagnostic events; done when files without ledger do not pass provenance and missing gate-consumption evidence reports `dedup.status: "issues"`.
- [x] 4.3 Implement EXO-005: ensure Heavy provenance does not accept directory scanning as authority; done when fixtures with populated `_subagents/`, `reference/`, or `_cache/` but missing/empty ledger remain health issues.

## Stage 5. Runner Protocol And Cleanup Policy

Intent: make runner reporting show verdict and health side by side, and preserve evidence when either one is bad.

Proof required: runner docs define a Post-Execution Health step after verdict and before cleanup, with no conflicting active runner instructions.

Exit gate: runner report fields and cleanup defaults are clear before playbook rollout begins.

Test assets embedded: runner/report fixture snippets or docs examples for PASS+CLEAN, PASS+HEALTH ISSUES, FAIL+CLEAN, NOT RUN, and bundle preservation reporting.

- [x] 5.1 Implement EXO-006: update the active runner surface identified in Stage 0, prioritizing `experiments_playbook/RUN_EXPS.md` when it remains the actual entry, to add Post-Execution Health after verdict and before cleanup.
- [x] 5.2 Implement EXO-006: define runner report fields `verdict`, `health`, `not_run_reason?`, and `bundle_preserved?`; done when PASS+HEALTH ISSUES is documented as distinct from verdict FAIL.
- [x] 5.3 Implement EXO-006: document cleanup policy so PASS+CLEAN may cleanup, while FAIL or HEALTH ISSUES preserves the bundle by default; done when no active runner surface gives a conflicting cleanup instruction.
- [x] 5.4 Implement EXO-006: if `experiments_playbook/RUN.md` is restored or synchronized, ensure it does not conflict with RUN_EXPS health/cleanup policy; done when the active runner source-of-record is explicit and duplicate runner instructions are either synchronized or intentionally absent.

## Stage 6. Representative Integration

Intent: prove the new layer on a small real path before bulk editing playbooks.

Proof required: one representative Standard gate-CLI playbook and one representative Heavy playbook keep their verdict logic while gaining observability.

Exit gate: representative command experiments show wrapper/health integration works in real disposable bundles.

Test assets embedded: first real command-experiment assets selected from Stage 0 inventory: one Standard gate-CLI playbook and one Heavy playbook candidate. Heavy execution requires explicit user approval before it can produce PASS evidence.

- [x] 6.1 Implement EXO-003/EXO-006: update the selected representative Standard gate-CLI playbook from Stage 0 to use the wrapper; done when the playbook keeps the same verdict while health includes gate diagnostics.
- [x] 6.2 Implement EXO-005/EXO-006: update the selected representative Heavy playbook from Stage 0 to run `verify-bundle-health.mjs --profile heavy` after verdict and before cleanup; done when Heavy reports ledger/receipt/cache status without changing verdict logic.
- [x] 6.3 Validate representative integration with command experiments: run at least one Standard representative and, when user permits Heavy cost/external calls, at least one Heavy representative; done when PASS+CLEAN cleans up and FAIL or HEALTH ISSUES preserves bundles.

## Stage 7. Full Rollout By Inventory

Intent: after representative proof, roll observability out mechanically to the inventoried target set.

Proof required: every targeted playbook is updated or explicitly excepted, and validators catch bypasses.

Exit gate: no targeted Standard gate command bypasses the wrapper and no targeted Heavy playbook lacks a post-verdict health step unless it has an exception comment.

Test assets embedded: no new fixture family; this stage reuses Stage 1-6 assets and expands representative playbook edits across the Stage 0 target inventory.

- [x] 7.1 Implement EXO-003/EXO-006: roll out the gate wrapper to all targeted Standard gate-CLI playbooks identified in Stage 0; done when `rg` shows no targeted Standard gate command still bypasses the wrapper without an explicit exception comment.
- [x] 7.2 Implement EXO-005/EXO-006: roll out Heavy health checks to all Heavy playbooks identified in Stage 0; done when `rg` shows each targeted Heavy playbook has a post-verdict health step or an explicit exception comment.
- [x] 7.3 Implement EXO-006: update rollout inventory notes after full rollout; done when exceptions, Human/manual skips, and any NOT RUN Heavy cases are documented without counting as PASS.

### Rollout Inventory Notes (Stage 7.3 closeout)

**Wrapper rollout:** 51 playbook files had gate CLI calls wrapped with `run-gate-with-monitor.mjs`. 5 files retained unwrapped gate calls with explicit exception comments (all inline JS `spawnSync`/`execFileSync`/`runNode` — bash wrapper not applicable; gate diagnostics captured via `writeGateAttempt()` trace events and `_logs/run.log`):

| File | Exception reason |
|------|-----------------|
| `exp_wff_validation/case-51-standard-happy-path.md` | Inline JS walker with 8 `spawnSync()` gate calls; exception documented in Reality Distance Ledger |
| `exp_wff_validation/case-52-standard-fail-repair.md` | Inline JS `spawnSync()` gate calls; exception comment at call site |
| `exp_wff_validation/case-53-standard-routing-contract.md` | Inline JS `spawnSync()` via `runGate()` helper; exception comment at function site |
| `exp_engine-boundary/case-403-light-gate-content-dedup.md` | Inline JS `runNode()` helper; exception comment at call site |
| `exp_engine-boundary/case-406-heavy-real-subagent-boundary.md` | Inline JS `execFileSync()`; exception comment at call site |

**Health check rollout:** 44 playbook files received Post-Execution Health step. Coverage: all Standard and Heavy playbooks, plus Light playbooks that exercise gate CLIs. Health profile assigned by filename cost label (`-heavy-` → heavy, `-standard-` → standard, `-light-` → light).

**Human/manual skips:** `exph_workflow-foundation/case-901-heavy-topic-rewrite-agent.md` — 9NN band 901-949, runner skips (real human required). Not counted as PASS.

**AI-judge auto:** `exph_workflow-foundation/case-951-heavy-topic-rewrite-ai-judge.md` — 9NN band 950-999, auto-runnable, verdict tagged `source: ai-judge`.

**NOT RUN cases:** None yet. Heavy command experiments (case-211, case-406) deferred pending explicit user approval for real external/agent cost.

## Stage 8. Regression And Command Experiment Validation

Intent: close the change with both deterministic regression and real command experiment evidence.

Proof required: unit/integration tests cover tooling contracts, validators cover playbook shape, and command experiments prove the runtime path described by `guidelines/command-experiments.md`.

Exit gate: this change is ready to archive only after regression passes and experiment evidence is recorded.

Test assets embedded: no new test family; this stage runs and records the regression, validator, Light observability, Standard representative, Heavy representative or explicit NOT RUN, and runner protocol evidence accumulated from earlier stages.

- [x] 8.1 Validate EXO-001..EXO-006: run `node --test tests/` and fix regressions related to observability code.
- [x] 8.2 Validate EXO-001..EXO-006: run playbook/document validators relevant to experiments, including `validate-playbook.mjs experiments_playbook` and `validate-phase-templates.mjs` when present in the repo.
- [x] 8.3 Validate Light observability experiment: execute at least one observability-focused Light run using a real disposable bundle; done when minimal light health is CLEAN, absent Heavy-only artifacts stay `not_applicable`, and optional invalid artifacts remain section-level issues only.
- [x] 8.4 Validate Standard representative experiment: execute at least one wrapped Standard gate-CLI run; done when wrapper preserves gate exit/verdict and `inspect[]` / `advice[]` appear in raw artifact and diagnostic trace.
- [x] 8.5 Validate Heavy representative experiment: execute at least one Heavy provenance run when user explicitly permits real external/agent cost; if not permitted, record NOT RUN without treating it as PASS.
- [x] 8.6 Validate runner protocol experiment: verify representative report output distinguishes `verdict` and `health`, preserves bundles for FAIL or HEALTH ISSUES, and cleans up only PASS+CLEAN.
- [x] 8.7 Validate OpenSpec/governance: run `openspec validate add-experiment-observability-layer --strict`, `node openspec/governance/check-project-reqs.mjs`, and `node openspec/governance/check-project-specs.mjs`.
