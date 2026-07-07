## Why

`_backlog/plans/formal-run-bugfix-change-split.md` 的第二个 change 要解决 `_backlog/bugs/BUG-047`、`BUG-048`、`BUG-049`、`BUG-050`、`BUG-051`、`BUG-053` 暴露的同一层问题：gate 本应帮助 Markdown Controller 维持质量，但当前 gate 在重复失败、false positive、provenance drift 和 advice 噪音下会变成死锁和破坏源。

Change 1 `stabilize-runtime-position-and-queue` 先修 runtime truth；本 change 在它之后给 gate quality loop 一个简单、合法、可追踪的降级出口，并把高假阳性、猜测式 gate 信号从质量回路里移除，而不是再包一层 diagnostic/advice。

## What Changes

- 增加合法 degraded gate handoff：当非 bootstrap `stop: no` wave gate 重复失败，且结构性前置条件、work-unit provenance、status/handoff preflight 已满足，只剩降级允许的质量阈值/profile-mismatch 类规则失败时，gate 可以返回 trace-visible degraded pass，包含 `passed: true`、`degraded: true`、`degraded_reason`、`degraded_rules` 和正常 `next`。
- `enter-phase` / `advance-status` / gate preflight SHALL treat trace-durable degraded pass as a legal handoff witness, while preserving that it is not a clean quality pass and not target-phase work completion evidence.
- `content_dedup` SHALL be retired as a historical patch. Wave0/Wave1 gates SHALL remove its definition entries, CLI dispatch path, helper wiring, and positive tests instead of preserving a diagnostic-only variant.
- The useful deterministic concerns that `content_dedup` used to mask SHALL live in their proper homes: declaration-ledger coverage, work-unit provenance/hash checks, cache trail coverage/content checks, and source/reference schema diagnostics. Duplicate URL, homepage/shallow URL, Jaccard overlap, and self-reference heuristics SHALL NOT decide phase advancement and SHALL NOT remain as current gate advice.
- Gate inspect/advice SHALL distinguish blocking root causes from downstream symptoms, keep advice short, and avoid long flat lists that hide the repair target.
- Gate quality-control rules SHALL follow KISS: blocking checks must be deterministic, low false-positive, independently explainable, and repairable through accepted Engine/Agent paths. Brittle heuristics SHALL be removed or moved to Agent-facing research guidance, not patched again inside the gate loop.
- Manual ledger or provenance drift diagnostics SHALL instruct Engine-mediated repair, retry, rollback, or valid work-unit submit paths. They SHALL NOT advise hand-editing `rb_output_declarations.jsonl`, `rb_status.json`, or hash-bound work-unit surfaces.
- `stop: no` fatigue guidance SHALL route Agents through silent repair, strategy change, degraded handoff, or silent hold; it SHALL NOT permit user-facing surfacing, waiting for unrelated background workflows, skipping required phases, or writing final artifacts before the legal Final path.
- Regression coverage SHALL keep the archived premature-final/status-drift protection active under degraded-flow scenarios.
- Versioning: this modifies DPT_FRAMEWORK behavior and Agent-facing contracts; target framework version is `v0.7`.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `gate-skeleton`: degraded pass contract, degradation eligibility boundaries, and root-cause-first gate feedback behavior.
- `cli-phase-transition`: degraded pass trace events are consumable by `enter-phase` and source-gate `advance-status` only when route-bound and trace-durable.
- `silent-wave-execution`: `stop: no` fatigue behavior uses silent degraded continuation without surfacing or skipping required phases.
- `research-wave-gate-implementation`: Wave0/Wave1 gates remove `content_dedup` entirely from active gate definitions and CLI evaluation; degraded-flow scenarios keep premature-final/status-drift protections covered.
- `gate-content-dedup`: retire this historical patch capability. Apply removes the active helper/rule/tests/docs and marks `GAC-*` requirement IDs deprecated while preserving registry history.
- `evidence-extraction`: reference countability removes homepage/shallow URL, duplicate URL, Jaccard, self-reference, and retired `content_dedup` heuristics; countability stays grounded in ledger, parseable metadata, accepted status, Core Content Capture, and Key Facts structure.
- `rerun-topic-integration`: rerun Wave1 gate quality rules remove `source_url_article_level` and retired `content_dedup` requirements; source URL checks only validate presence/parseability while cache/ledger/provenance own authority.
- `experiment-ref-integrity`: retire current `case-403` content_dedup proof and remove content_dedup expectations from current runner/health surfaces.
- `agent-testing`: evidence-extraction canary metrics stop treating homepage/shallow URL heuristics as quality proof and report source recoverability instead.
- `work-unit-provenance-gate`: provenance drift diagnostics isolate root causes, preserve valid submitted-row context where possible, and forbid manual ledger/hash repair advice.
- `check-inspect-feedback`: feedback ordering distinguishes root causes from symptoms and returns concise actionable repair targets.
- `version-management`: apply updates repo-root `CHANGELOG.md` and `DPT_FRAMEWORK/RUN.md` banner to the proposal-declared `v0.7`.

## Impact

- Affected framework/repo areas during apply: gate helper result building, gate attempt trace writing, handoff validation helpers, `enter-phase.mjs`, `advance-status.mjs`, Wave0/Wave1 gate definitions and CLIs, removal of `content_dedup` helper/rule surfaces, reference countability helpers, rerun topic gate guidance, experiment runner/health surfaces, current JSON/YAML/schema/fixture/runner metadata that mentions retired heuristics, work-unit provenance diagnostics, shared silent execution Markdown, command docs, repo-root `CHANGELOG.md`, and `DPT_FRAMEWORK/RUN.md`.
- Affected regression tests: gate skeleton/helper tests, phase transition tests, wave0/wave1 gate integration tests, removal or inversion of `content_dedup` tests, ref-count tests, rerun topic gate tests, experiment runner/health tests, work-unit provenance tests, command-surface/silent-execution static guidance tests, audit/reentry tests for premature final/status drift, and version-management tests.
- No new npm dependencies. Implementation remains Node.js >=20, pure ESM, using existing `zod`, `yaml`, and Node built-ins.
- Non-goals: this change does not restore Wave1/Wave2 depth contracts (`restore-wave-depth-contracts`), does not enable parallel claim (`harden-run-entry-and-agent-discipline`), does not solve built-in `deep-research` skill suppression, and does not add broad force flags that bypass structural/provenance failures.
