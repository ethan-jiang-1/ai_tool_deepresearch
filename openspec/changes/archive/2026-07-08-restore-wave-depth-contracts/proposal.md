## Why

`_backlog/plans/formal-run-bugfix-change-split.md` 的第三个 change 要解决 `_backlog/bugs/BUG-054-wave1-sub-agent-shallow-no-new-discovery.md`、`_backlog/bugs/BUG-055-wave2-phase-agent-skips-synthesis-depth.md`、`_backlog/bugs/BUG-058-wave1-cache-trails-too-thin-per-topic.md` 暴露的同一类问题：runtime/queue/gate 可以继续往前走之后，Wave1/Wave2 仍可能只产出浅层重组，而不是完成 deep research 方法本身。

Change 1 已经稳定 runtime position 和 queue；Change 2 已经把 gate quality loop 简化并提供合法 degraded handoff。本 change 在这些前提上恢复 Wave1/Wave2 深度 contract：让 Markdown phase 指令、work-unit 输出、cache trail、gate/preflight 和 controlled E2E 一起要求 Agent 做真实 deepening、审收浅输出、补充不足证据，并在 Wave2 先完成 cross-topic scan/triage/gap analysis 后再写 synthesis。

## What Changes

- Wave1 `wave1_topic_deepening` SHALL 明确要求 topic-specific new evidence，而不是复述 Wave0：每个 topic 的 deepening 任务必须覆盖新 source、机制分析、trend/difficulty/limitation 分析，并按 profile 执行 counterexample / cross-verification 要求。
- Wave1 Phase Agent SHALL review submitted work-unit output before accepting the topic as done. Shallow output, too few genuinely new sources, missing mechanism/trend/limitation analysis, or unresolved profile-required checks SHALL route to repair/retry/supplementary `wave1_topic_deepening` tasks instead of force-advance.
- Wave1 claimed source URL coverage SHALL be cache-trail-backed: every accepted source URL declared in submitted structured `source_claims[]` / `accepted_source_urls[]` and used by `evidence-summary.md` or topic references must have a submitted, verified cache trail or an explicit degraded-capture record. Sparse cache trails are a failed contract, not a cosmetic warning.
- Wave1 supplementary loops SHALL use the Change 1 queue behavior: legal `wave1-deepen-{topic}-vN` style queue items with explicit `payload.topic_slug`, work-unit claim/submit, and submitted ledger coverage.
- Wave2 pure synthesis path SHALL be legal only after the Phase Agent completes a cross-topic scan matrix, confidence triage, gap analysis, and emergent-search decision showing no unresolved evidence gap that requires delegated search.
- Wave2 findings SHALL carry confidence/backing signals that are structurally checkable: independent backing counts or refs, status/decision consistency, unresolved gap markers, and targeted search receipt refs when search was required.
- Wave2 uncertain or under-backed findings SHALL enqueue `wave2_targeted_evidence` work units. Targeted delegated evidence remains provenance-gated through submitted work-unit rows and cache trails.
- Wave gates and inspect/preflight surfaces SHALL enforce deterministic depth-adjacent structure without becoming semantic judges: they may check presence, counts, source novelty relative to Wave0 URL sets, cache/source mapping, scan-matrix coverage, finding-index consistency, and delegated provenance; they SHALL NOT judge whether a synthesis is insightful or whether a source is intellectually "good enough".
- Controlled E2E and regression tests SHALL include negative shallow-output cases plus a happy-path run reaching HITL2 with non-shallow Wave1/Wave2 artifacts.
- Versioning: this modifies DPT_FRAMEWORK behavior and Agent-facing contracts; target framework version is `v0.8`.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `research-wave-phase-content`: Wave1/Wave2 phase docs add explicit deepening, review, supplementary-loop, scan/triage/gap-analysis, and pure-synthesis eligibility instructions.
- `wave1-intake`: Wave1 task/result/review contract requires new topic-specific evidence, depth dimensions, profile-aware counterexample/cross-verification behavior, and supplementary retry/refill when output is shallow.
- `wave2-synthesis`: Wave2 convergence contract requires scan matrix, confidence triage, gap analysis, emergent-search decisions, and targeted delegated search before synthesis when gaps remain.
- `research-wave-gate-implementation`: Wave1/Wave2 gate definitions and CLIs add deterministic checks for shallow-output blockers, cache/source mapping, scan/triage coverage, and pure-synthesis eligibility while preserving Gate KISS boundaries.
- `cache-raw-web-content`: cache trail coverage is tightened for Wave1 accepted source claims and explicit degraded capture records.
- `work-unit-provenance-gate`: delegated depth outputs keep submitted work-unit ledger/cache/hash authority, and diagnostics distinguish shallow/depth-contract failures from provenance drift.
- `research-wave-experiments`: controlled wave playbooks add shallow Wave1, missing cache trail, missing Wave2 scan/triage, targeted search, and non-shallow happy-path coverage.

## Impact

- Affected framework/repo areas during apply: `phase-wave1.md`, `phase-wave2.md`, Wave1/Wave2 work-unit task guidance, work-unit result/cache validation surfaces, Wave1/Wave2 gate definitions and gate CLI evaluators, Wave2 inspect/check helpers, cache coverage helpers, controlled experiment playbooks, fixture builders, regression tests, repo-root `CHANGELOG.md`, and `DPT_FRAMEWORK/RUN.md`.
- No new npm dependencies. Implementation remains Node.js >=20, pure ESM, using existing `zod`, `yaml`, and Node built-ins.
- Non-goals: this change does not reopen gate heuristic retirement from `simple-gate-quality-loop`, does not make JS judge semantic research quality, does not enable broad force flags, does not implement parallel claim throughput, does not solve built-in `deep-research` skill suppression, and does not perform real-environment E2E beyond controlled playbook coverage.
