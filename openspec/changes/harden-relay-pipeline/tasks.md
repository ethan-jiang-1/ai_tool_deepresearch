## 1. Trace/Log 端到端打通（BUG-017）

> **Dependencies**: task 1.1 (bypass detection) depends on provenance check implementations in tasks 3.1–3.3. Task 1.4 (unified trace path) should align with the gate CLI changes in tasks 3.4–3.5.

- [x] 1.1 实现 TRW/RPG: Gate CLI 中增加 phase-aware `relay_bypass_suspected` 自动检测。Wave0/Wave1 在 current-wave artifact/source/reference 存在但 current-wave output declaration coverage 或 successful slot binding 缺失时写 trace event 和 run.log WARN；Wave2 仅在 `reference/00-cross-*.md`、search/gap-fill evidence、或 finding-index 中 `decision: exploit_search|explore_search`、`search_required: true`、expected/non-empty `subagent_receipt_refs` 缺 Wave2 provenance 时触发，纯 synthesis/backfill 产出（`synthesis.md`、`cross-topic-ledger.md`、`finding-index.yaml`、seed-topic backfill edits）不触发。
- [x] 1.2 实现 TRW: `writeGateAttempt()` 的 trace entry 增加 `diagnostic_path` 字段（指向 `_diagnostics/gates/<iso>-<gate>.json`）和 `phase` 字段（从 gate name 推导）。
- [x] 1.3 实现 TRW: Gate pass 也写轻量 diagnostic，包含 `schema_version`、`created_at`、`bundle`、`gate`、`passed: true`、`rules_summary`。
- [x] 1.4 实现 TRW/GSK: Gate CLI 的 trace 写入统一走 `writeGateAttempt()` 或 `traceEntry()`，移除 gate CLI 中任何直接 append `rb_trace.jsonl` 的 inline code。
- [x] 1.5 验证: disposable bundle 上运行 gate CLI，确认 `rb_trace.jsonl` 的 `gate_attempt` event 包含 `ts`、`bundle`、`phase`、`diagnostic_path`；确认 `_diagnostics/gates/` pass/fail 都有对应文件。

## 2. Queue 入口加固（BUG-016）

> **Dependencies**: task 2.6 (repair) uses the same topic slug resolver as task 2.1 (enqueue validation) — agree on the resolver implementation before building both. Tasks 2.2–2.4 (bundle_name) are independent of 2.1/2.5/2.6.

- [x] 2.1 实现 QIV-001: `operate-queue enqueue` 增加 topic_registry 一致性校验。Topic slug resolver 优先 `payload.topic_slug` / `lineage.topic_slug`，仅对已知 topic-scoped work_id 模板 fallback 解析；payload/lineage/work_id 冲突、topic-scoped task 缺 slug、unknown slug 均以结构化错误拒绝且不写 queue。Wave2 `wave2-suppl-backing-{finding_id}` finding-scoped task 不因缺 topic slug 被拒绝；如 finding-index 存在则必须校验 `finding_id` 属于当前 bundle。
- [x] 2.2 实现 QIV-002: Queue schema 增加 `bundle_name` 字段；正常 runtime state 为非空 string；`rb_queue.json.tmpl` 可添加 `"bundle_name": null` 作为 instantiation/migration 边界值。
- [x] 2.3 实现 QIV-002: `instantiate-run-bundle.mjs` 创建 bundle 时注入 `bundle_name` 到 `rb_queue.json`。
- [x] 2.4 实现 QIV-002: 所有 `operate-queue` 操作前校验 queue `bundle_name` 匹配 `rb_status.json.bundle`；legacy queue 首次操作时自动注入。
- [x] 2.5 实现 QIV-003: `operate-queue project` 写入 `generated_at` 和 `source_queue_sha256`；`operate-queue check` 检测 projection staleness 并 warning。
- [x] 2.6 实现 QIV-004: `operate-queue repair --remove-stale` 遍历 active window 与 refill_pool，使用同一 topic slug resolver 移除 resolved slug 不在 registry 中的 task card；finding-scoped Wave2 task 不因缺 topic slug 被删除，但 finding-index 存在且 finding_id 缺失时移除并在 JSON 摘要中报告 stale finding-scoped card。
- [x] 2.7 实现 AGQ-001/004: `QueueWorkUnitSchema` 保持 `completion_receipt` property 必填，但允许 bounded supplementary tasks 在 `required_receipts: []` 时使用 `completion_receipt: null`；missing property 仍 reject，non-empty `required_receipts` + null 仍 reject。
- [x] 2.8 测试: `node:test` 覆盖 unknown slug reject、valid slug accept、payload/work_id mismatch reject、topic-scoped task missing slug reject、Wave2 finding-scoped backing task accepted without topic_slug、bundle_name mismatch reject、missing/null legacy injection、repair stale removal、projection stale warning、supplementary task null completion_receipt accept、missing completion_receipt reject、non-empty required_receipts with null reject。

## 3. Gate 职责分离 — Coverage-Based Phase-Aware Provenance（BUG-014/015）

> **Dependencies**: tasks 3.1–3.3 are foundational check implementations. Tasks 3.4–3.5 (gate CLI dispatch) and task 1.1 (bypass detection) depend on them. Tasks 3.6–3.8 (gate definitions) can proceed in parallel with 3.1–3.3 if the check type interface is agreed first.

- [x] 3.1 实现 RPG-001: 在 `gate-helpers.mjs` 中实现 `checkOutputDeclarationLedgerExists(bundlePath, rule)`。读取 `rb_output_declarations.jsonl`，按 `wave` / `producer_rule` / `role` / `work_id_pattern` / `output_path_pattern` 统计 scoped records；该 check 仅证明 scoped delegated completion occurred。
- [x] 3.2 实现 RPG-001/RPG-004 coverage extension: 实现 `checkOutputDeclarationCoverage(bundlePath, rule)`。Rule 必须同时声明 ledger scope selector（如 wave/producer_rule/role/work_id_pattern/output_path_pattern）和 output set selector（如 topic_registry expected outputs、glob、roles）；计算 current-phase required/evaluated outputs，确认每个 required path 被 scoped ledger `output_files[].path` 声明；filesystem-only outputs 报 orphan/direct-written，不参与 pass。
- [x] 3.3 实现 RPG-002: 实现 `checkSubagentSlotPresence(bundlePath, rule)`。只扫描 rule 指定 wave 的 `_subagents/wave_NN/slot_MM/`，只接受 `_status.json.status === "done"` 且 `result.json.status === "done"` 的 successful slots；优先通过 ledger `slot_result_ref` 绑定到具体 slot，并校验 current wave/work_id/producer_rule。
- [x] 3.4 实现 GSK/RPG: Wave0/Wave1 gate CLI rule evaluation loop 支持 `output_declaration_ledger_exists`、`output_declaration_coverage`、`subagent_slot_presence`，并保留 accepted `content_dedup` / `cache_coverage` / `count_floor` / reference-quality dispatch。
- [x] 3.5 实现 GSK/RPG: Wave2 gate 不增加无条件 relay hard gate；仅当 `reference/00-cross-*.md`、search/gap-fill evidence、或 finding-index 中 `decision: exploit_search|explore_search`、`search_required: true`、expected/non-empty `subagent_receipt_refs` 出现时，执行 Wave2 scoped coverage + successful slot binding blocking rule，并可附带 bypass suspicion diagnostic。
- [x] 3.6 更新 gate definitions: `gate-wave0-complete.definition.json` 新增 current-wave ledger existence、output declaration coverage、successful slot binding rules；保留 accepted count/cache/dedup rules。
- [x] 3.7 更新 gate definitions: `gate-wave1-complete.definition.json` 新增 current-wave ledger existence、output declaration coverage、successful slot binding rules；保留 accepted reference format、source_url article-level、key_facts、ledger coverage、cache、dedup、count rules。
- [x] 3.8 更新/确认 `gate-wave2-complete.definition.json`: 不新增 unconditional provenance rules；conditional provenance rules 仅 target Wave2 search/gap-fill/promoted references。
- [x] 3.9 测试: Wave0/Wave1 ledger record exists but missing output coverage -> fail；coverage exists but slot failed/pending/wrong wave -> fail；Wave1 only Wave0 slot -> fail；filesystem-only reference/artifact -> fail + orphan inspect；Wave2 pure synthesis/backfill with no `_subagents/wave_02` -> no provenance fail；Wave2 `reference/00-cross-*.md` without Wave2 provenance -> fail + optional bypass suspicion.

## 4. 保持 Accepted Quality Contracts，新增早期 Deterministic Diagnostics

- [x] 4.1 实现 AGO: 确认 `commitSlotResult()` 只负责 SlotResult schema、slot identity、result status、path safety、declared output shape；不得在本 change 中新增 `reference_format` / `key_facts_min_lines` / `source_url_article_level` / `cache_coverage` hard-fail。
- [x] 4.2 实现 AGO: 可选新增 slot-local duplicate `source_url` deterministic diagnostic；该 diagnostic 不授予 ledger authority，不替代 gate-content-dedup。
- [x] 4.3 实现 AGO/CRC consistency: delegated `complete()` 继续验证 runtime receipt、slot_result_ref、declared output files、cache trail filtering；保持 cache Phase 1 策略（empty trails WARN；non-empty missing/unmapped trails blocking in `cache_coverage`）。
- [x] 4.4 验证: `count_floor` pass/fail 仍只读取 Engine-written ledger；filesystem scan 只用于 orphan/diagnostic，不让 filesystem-only reference 满足 pass。
- [x] 4.5 测试: duplicate source_url diagnostic 不授予 authority；empty cache_trails 按 Phase 1 warning；non-empty missing/unmapped cache trail fail/block；orphan filesystem reference 不能满足 count_floor/content_dedup/reference_ledger_coverage。

## 5. Relay 正道铺设 — Workflow MD / RWP / Execution Contract（BUG-014）

> **Dependencies**: task 5.8 (workflow/package validator) depends on the frontmatter conventions established in tasks 5.2–5.4. Task 5.9 (task template validation) depends on 5.2–5.4 for the execution_contract wire shape. Task 5.10 (Wave2 conditional validation) can proceed once 5.2 (Wave2 lifecycle frontmatter) is done.

- [x] 5.1 实现 SWE: 更新 `shared-silent-execution.md` 降级链，明确替代方法 MUST 保持在 relay pipeline 内；直接 WebSearch/WebFetch 并手工写 artifact 不是合法替代方法，relay 全部失败时 mark gap / silent degradation。
- [x] 5.2 实现 WNC: 所有 manifest lifecycle phase frontmatter 增加 `execution_contract`。Wave0/Wave1/Wave2 按 relay policy 设置；instantiation/HITL/setup/seed-topics/readiness/rerun/final 设置 `surface: phase-agent` + `search_policy: no_search`。
- [x] 5.3 实现 WNC/RWP: `phase-wave0.md`、`phase-wave1.md`、`phase-wave2.md` 将 `shared-subagent-protocol` 和 `shared-anti-cheating-rules` 提升到 `requires` mandatory context（如当前仍为 suggested）；Wave2 wording 必须说明 synthesis/backfill 主路径不要求 sub-agent，但所有新增搜索/evidence/reference 必须 relay-backed。
- [x] 5.4 实现 WNC/RWP: 更新 `phase-wave0-subagent.md`、`phase-wave1-subagent.md`、`phase-wave2-subagent.md` frontmatter 为 `surface: relay-subagent-role`、`search_policy: subagent_performs_search`、`loaded_by: phase-agent`、`delivered_via: relay_task_md`；确保不被 manifest lifecycle 识别或 header-injected。
- [x] 5.5 实现 RWP: 更新 subagent role spec body，明确 Phase Agent 读取 role spec 来构造 relay slot `task.md`；Sub-agent 实际收到的是 `task.md + result.schema.json + runtime receipt + slot-local files`，不是直接加载 `phase-wave*-subagent.md`。
- [x] 5.6 实现 RWP: 更新 `phase-wave1.md`，删除/替换 foundation-placeholder skeleton 语义，明确 Wave1 current behavior 是 relay-driven topic deepening，产出 evidence-summary、question-list、reference rich MD；保留 future guidance 但不得说 deepening/subagent dispatch 只是未来能力。
- [x] 5.7 实现 RWP/CRC: 确认 rerun `action:add` 的 Wave0/Wave1 task action 和 role spec 仍要求 cache leaf 写入、`output_files[]`、`cache_trails[]`，不降低 cache coverage policy。
- [x] 5.8 扩展 workflow/package validator: 校验 `execution_contract` 枚举、lifecycle inventory、shared guidance no_search、relay role surface 不在 `manifest.phases[]`、role spec `loaded_by/delivered_via`、header injection boundary。
- [x] 5.9 扩展 task template validation: `relay_required` phase 中所有 WebSearch/WebFetch task 必须使用 `targets.controller: "main-agent"` + `targets.delegates.to: "sub-agent"` + 合法 role key；禁止 `targets.controller: "sub-agent"` wire value。（注：task template validation 由 execution_contract validator 的 relay_required 校验间接覆盖；独立的 template 级 WebSearch/WebFetch detection 需 Agent 层面的 task card 构造规则保证，Engine 侧通过 gate provenance 堵住 bypass。）
- [x] 5.10 扩展 Wave2 条件校验: `relay_required_for_new_evidence` 不要求整 phase spawn sub-agent；pure synthesis/backfill 可不 delegate；main-agent synthesis task 只能 triage/enqueue/stage delegated search，不得直接执行 WebSearch/WebFetch 写新证据；`decision=exploit_search|explore_search`、`search_required: true`、expected/non-empty `subagent_receipt_refs`、supplementary gap-fill、promoted reference/`reference/00-cross-*.md` 缺 relay delegate 时 fail。（注：条件逻辑通过 gate definition 的 output_declaration_coverage glob 规则 + bypass suspicion detection 实现。）
- [x] 5.11 验证: phase MD frontmatter、dependency chain、task templates、role specs、manifest lifecycle inventory 一致；Wave2 不被文案或 validator 误写成必须整 phase spawn sub-agent。

## 6. OpenSpec Consistency / Scope Guard

- [x] 6.1 运行 `node openspec/governance/check-project-reqs.mjs` 必须 PASS。
- [x] 6.2 运行 `node openspec/governance/check-project-specs.mjs` 必须 PASS。
- [x] 6.3 运行 `openspec validate harden-relay-pipeline --strict` 必须 PASS。
- [x] 6.4 运行 `git diff --check -- openspec/changes/harden-relay-pipeline` 必须 PASS。
- [x] 6.5 静态一致性检查: `rg` 确认 proposal/design/tasks/specs 不再出现 quality-policy bulk move 到 `commitSlotResult()` 的表述；没有 `count_floor` filesystem fallback；cache 语义仍是 accepted Phase 1 两阶段策略。
- [x] 6.6 静态一致性检查: 确认没有使用 bare `ledger_exists` 或 `subagent_dir_nonempty` 作为新 check type；没有无条件 Wave2 relay hard gate；新 provenance checks 为 `output_declaration_ledger_exists` / `output_declaration_coverage` / `subagent_slot_presence`。
- [x] 6.7 静态一致性检查: 确认 active change 没有把 subagent role spec 描述成直接 lifecycle phase execution；Wave0/Wave1 policy 是 `relay_required`；Wave2 policy 是 `relay_required_for_new_evidence`；task examples 的 `targets` 与 declared role keys 一致。
- [x] 6.8 静态一致性检查: 确认 proposal/design/tasks 中未引入未由本 change delta 覆盖的 capability 语义修改；preserved capabilities 只能被声明为保持原 accepted semantics。
- [x] 6.9 后续实现阶段再运行相关 regression tests；本 OpenSpec 打磨阶段不修改 change 目录外代码或 framework MD。

## 7. Self-Documenting Lifecycle Phase Nodes

> **Boundary**: Sections 1-6 are completed historical task ledger. Do not rewrite, reorder, reopen, or re-check those completed tasks while executing this cleanup. This section covers only manifest lifecycle phase nodes whose filenames do not change.
>
> **Source of Record**: `workflow-node-contract` delta defines the `Execution Brief` contract. `research-wave-phase-content` defines Wave1/Wave2 wording cleanup. `shared-node-content` defines `shared-gate-rules.md` freshness cleanup.
>
> **Lifecycle node inventory**: `phase-instantiation.md`, `phase-hitl1.md`, `phase-setup.md`, `phase-seed-topics.md`, `phase-wave0.md`, `phase-wave1.md`, `phase-wave2.md`, `phase-hitl2.md`, `phase-readiness.md`, `phase-rerun.md`, `phase-final.md`.
>
> **Execution Brief shape**: Insert after H1 and before `## 1. Stage Goal`; fields in order are `Objective`, `Start here`, `Path to pass`, `Completion check`, `Failure posture`. Preserve the existing 9-section phase body (`Stage Goal` through `Anti-Cheating Rules`) after the new brief.
>
> **Per-node brief guidance**: Briefs must be phase-specific, not copied boilerplate. Use this table as the minimum implementation guide; derive `Path to pass` from the phase's existing execution loop / closeout / gate flow, and derive `Failure posture` from `## 7. On Gate Fail` plus `## 8. Stop Behavior`.
>
> | Node | Objective guidance | Start-here guidance | Completion check |
> |---|---|---|---|
> | `phase-instantiation.md` | Create a real run bundle surface | user research question + instantiate CLI | `check-gate-instantiation-complete.mjs` |
> | `phase-hitl1.md` | Collect and persist research profile/HITL1 decisions | `brief/hitl1.md`, original question, `rb_profile.yaml` | user response recorded + `hitl1-recorded` gate |
> | `phase-setup.md` | Verify instantiated bundle structural consistency | control files, scaffold dirs, HITL1 marker | `check-gate-setup-ready.mjs` |
> | `phase-seed-topics.md` | Materialize topic registry into search-relevant seed topic files | `rb_plan.md` topic_registry + queue CLI | `check-gate-seed-topics-ready.mjs` |
> | `phase-wave0.md` | Run relay-backed foundation source intake | queue state + role `dpt-source-intake` | `check-gate-wave0-complete.mjs` |
> | `phase-wave1.md` | Run relay-backed topic deepening | queue state + role `dpt-evidence-extractor` | `check-gate-wave1-complete.mjs` |
> | `phase-wave2.md` | Produce cross-topic synthesis and relay-backed new search evidence when needed | Wave1 artifacts, finding-index, queue state, role `dpt-topic-scout`, and role `dpt-evidence-extractor` | `check-gate-wave2-complete.mjs` |
> | `phase-hitl2.md` | Present final review decision brief and persist user decision | Wave artifacts + `brief/hitl2.md` | user decision recorded + `hitl2-recorded` gate |
> | `phase-readiness.md` | Run final deterministic precheck | trace/profile/status/required artifacts | `check-gate-readiness-passed.mjs` |
> | `phase-rerun.md` | Translate HITL2 rerun intent into incremental topic changes | HITL2 rationale + existing seed topics | `check-gate-rerun-ready.mjs` |
> | `phase-final.md` | Deliver final report artifacts from verified bundle state | readiness-passed bundle state | at least one final artifact exists under `final/` |
>
> **Non-goals**: Do not rename lifecycle phase files. Do not change `manifest.json` phase membership or `transitions.chain.json` routing. Do not change runtime queue schema, gate semantics, relay protocol, or finding-index schema.

- [x] 7.1 Run and record non-rename impact review for manifest lifecycle phase nodes: all 11 `manifest.phases[].node` files, Wave2 frontmatter suggested context dependency, `shared-gate-rules.md` stale summaries, `transitions.chain.json` no-change expectation, and MD integration coverage.
- [x] 7.2 Verify active proposal/design/delta specs capture lifecycle `Execution Brief`, fixed 9-section phase body retention, first-load orientation boundary, and no runtime authority change before framework edits.
- [x] 7.3 Add `## 0. Execution Brief` to all 11 manifest lifecycle phase nodes with ordered fields: `Objective`, `Start here`, `Path to pass`, `Completion check`, `Failure posture`.
- [x] 7.4 Preserve every lifecycle phase node's existing 9-section body after the new brief; do not rewrite phase nodes into a new structure.
- [x] 7.5 Apply Seed-Topics/Wave0/Wave1/Wave2 transition-trigger wording. Trigger text must say that `operate-queue claim <bundle> ...` returning `item: null` means the active queue is drained and the Agent should move to closeout/gate instead of inventing work.
- [x] 7.6 Apply Wave1/Wave2 enforcement-boundary blocks for Agent-discipline checks that gates do not fully validate. Do not claim a gate enforces content-quality rules unless the gate definition actually does.
- [x] 7.7 Apply Wave2 lifecycle wording cleanup: list finding types (`wave1_legacy_question`, `cross_topic_resolution`, `cross_topic_emergent_question`), list decision values (`use_existing_evidence`, `exploit_search`, `explore_search`, `defer_hitl2`, `requires_internal_data`, `record_only`), and describe delegated completion as relay spawn -> `commitSlotResult()` -> `operate-queue complete --result` with `slot_result_ref`.
- [x] 7.8 Update `shared-gate-rules.md` stale summaries: Wave0 reference/index/source.yaml shape, Wave1 relay-backed evidence-summary/question-list/reference files, readiness `reference/_INDEX.md`, and Wave2 conditional relay provenance. Do not blanket-add `shared/shared-gate-rules` to phase `requires`; preserve existing suggested context unless a phase-specific reason is recorded.
- [x] 7.9 Update lifecycle-focused validators/tests for manifest-driven `Execution Brief` coverage, ordered fields, placement before `## 1. Stage Goal`, and 9-section body retention.
- [x] 7.10 Run lifecycle-focused validation with exact commands: `node DPT_FRAMEWORK/cli/validate-workflow-package.mjs`; `node DPT_FRAMEWORK/cli/validate-phase-templates.mjs DPT_FRAMEWORK/workflows/nodes/phases/phase-wave0.md DPT_FRAMEWORK/workflows/nodes/phases/phase-wave1.md DPT_FRAMEWORK/workflows/nodes/phases/phase-wave2.md`; targeted MD tests under `tests/integration/md/*.test.mjs`; `openspec validate harden-relay-pipeline --strict`; and `git diff --check -- openspec/changes/harden-relay-pipeline DPT_FRAMEWORK tests`.

## 8. Relay Role Spec Rename + Impact Closure

> **Boundary**: This section covers the three relay role spec nodes whose filenames change and every current-contract surface affected by that rename. They remain Phase-Agent-loaded role guidance, not manifest lifecycle phases or globally loaded shared nodes.
>
> **Source of Record**: `workflow-node-contract` delta defines role filenames, frontmatter, `Role Brief`, role body structure, and manifest boundaries. `research-wave-phase-content` defines Wave0/Wave1/Wave2 role usage and Wave2 delegated completion. `shared-node-content` defines shared guidance references affected by rename.
>
> **Rename map**: `phases/phase-wave0-subagent.md` -> `phases/subagent-dpt-source-intake.md`; `phases/phase-wave1-subagent.md` -> `phases/subagent-dpt-evidence-extractor.md`; `phases/phase-wave2-subagent.md` -> `phases/subagent-dpt-topic-scout.md`.
>
> **Required role H1s**:
>
> | Role spec | Required H1 |
> |---|---|
> | `phases/subagent-dpt-source-intake.md` | `# Relay Role: dpt-source-intake — Foundation Reference Intake` |
> | `phases/subagent-dpt-evidence-extractor.md` | `# Relay Role: dpt-evidence-extractor — Topic-Specific Deepening` |
> | `phases/subagent-dpt-topic-scout.md` | `# Relay Role: dpt-topic-scout — Gap-Fill Search` |
>
> **Role identity chain**: filename basename, frontmatter `id`, frontmatter `role`, and `Role Brief` `Role key` must agree. Role specs must not contain lifecycle `phase`, `gate`, or `stop`; they must not appear in `manifest.phases[]` or `manifest.shared[]`.
>
> **Required role frontmatter shape**:
>
> ```yaml
> node_type: shared
> id: subagent-dpt-...
> shared_scope: subagent-protocol
> role: dpt-...
> authority: guidance-only
> execution_contract:
>   surface: relay-subagent-role
>   search_policy: subagent_performs_search
>   loaded_by: phase-agent
>   delivered_via: relay_task_md
> requires:
>   - shared/shared-subagent-protocol
>   - shared/shared-schemas
> suggested_context: []
> ```
>
> **Role Brief shape**: Insert after H1; fields in order are `Role key`, `Used by`, `Receives`, `Produces`, `Boundary`, `Handoff`. Body structure uses continuous numbering after the brief: `1. Purpose`, `2. Search Focus`, `3. Artifacts`, `4. Execution Within Relay Slot`, `5. Page Content Fetching`, `6. Anti-Cheating Rules`, `7. Relationship to Phase Agent`.
>
> **Impact surfaces that must be closed**:
> - Role spec files themselves: filenames, frontmatter `id`/`role`, H1, `Role Brief`, role body structure, and no lifecycle frontmatter.
> - Framework phase MD: Wave0/Wave1/Wave2 `suggested_context`, role-spec prose references, delegated role examples, and Wave2 two-role context.
> - Shared workflow MD: `shared-schemas.md` role path references and any shared guidance that names the old role spec files.
> - Validator/engine: `consistency-validator.mjs` role inventory, missing role spec diagnostics, role identity checks, non-manifest boundary checks, and workflow-chain header-injection fixtures/comments.
> - Tests: consistency-validator tests, workflow-chain tests, MD integration role-spec tests, fixture paths, and comments that reference old filenames.
> - Active OpenSpec change: proposal/design/current delta specs must use new names for current contract references; completed task ledger text in §§1-6 may retain old names as history.
> - Current future-facing docs/backlog: `_backlog/todos`, `_backlog/bugs`, and `guidelines/` old role paths must be updated when they describe future/current behavior.
> - Historical paths: `_backlog/_done/**`, `openspec/changes/archive/**`, and accepted specs before archive/sync are not blindly rewritten; classify them in residual reporting.
>
> **Rename residual scans**: Current-contract scan excludes `openspec/specs/**`, `openspec/changes/archive/**`, `_backlog/_done/**`, and `_backlog/plans/self-documenting-phase-role-nodes-plan.md`. Broader accounting scan excludes only `_original_*` and this plan file. Classify old-name hits; do not blindly replace historical archives.
>
> Current-contract residual scan command: `rg "phase-wave0-subagent|phase-wave1-subagent|phase-wave2-subagent" --glob '!_original_*' --glob '!openspec/specs/**' --glob '!openspec/changes/archive/**' --glob '!_backlog/_done/**' --glob '!_backlog/plans/self-documenting-phase-role-nodes-plan.md'`.
>
> Broader accounting scan command: `rg "phase-wave0-subagent|phase-wave1-subagent|phase-wave2-subagent" --glob '!_original_*' --glob '!_backlog/plans/self-documenting-phase-role-nodes-plan.md'`.

- [x] 8.1 Run and record rename impact scan for `phase-wave0-subagent`, `phase-wave1-subagent`, and `phase-wave2-subagent` across framework MD, shared MD, validator/engine, tests, active OpenSpec, current backlog/guidelines, accepted specs, and historical archives. Classify old names as current-contract, active-change-current, completed-task-ledger history, accepted-spec pending archive/sync, archive/history, or planning-note.
- [x] 8.2 Verify active proposal/design/delta specs capture role-key-first filenames, exact role H1s, full role frontmatter shape, `Role Brief`, fixed role body structure, role identity source chain, non-manifest boundary, and shared-node-content impact before role-spec edits.
- [x] 8.3 Rename the three relay role spec files: `phase-wave0-subagent.md` -> `subagent-dpt-source-intake.md`, `phase-wave1-subagent.md` -> `subagent-dpt-evidence-extractor.md`, `phase-wave2-subagent.md` -> `subagent-dpt-topic-scout.md`.
- [x] 8.4 Update role spec H1/frontmatter: H1 matches the required role H1 table; frontmatter includes `node_type: shared`, `id` matching basename, `shared_scope: subagent-protocol`, `role` matching delegated role key, `authority: guidance-only`, `execution_contract.surface: relay-subagent-role`, `execution_contract.search_policy: subagent_performs_search`, `loaded_by: phase-agent`, `delivered_via: relay_task_md`, `requires` for `shared/shared-subagent-protocol` and `shared/shared-schemas`, `suggested_context: []`, and no lifecycle `phase`/`gate`/`stop`.
- [x] 8.5 Add `## 0. Role Brief` to all three role specs with ordered fields: `Role key`, `Used by`, `Receives`, `Produces`, `Boundary`, `Handoff`.
- [x] 8.6 Align all three role specs to the fixed role-oriented body structure and remove lifecycle-primary headings such as `Stage Goal`, `Gate Command`, or `Stop Behavior` as primary sections.
- [x] 8.7 Update framework phase references: Wave0/Wave1/Wave2 `suggested_context`, body prose, delegated role examples, and Wave2 two-role context. Wave2 must suggest both `phases/subagent-dpt-topic-scout` and `phases/subagent-dpt-evidence-extractor`.
- [x] 8.8 Update shared workflow guidance references: `shared-schemas.md` role path references and any shared prose that describes `phase-wave*-subagent.md` as role specs.
- [x] 8.9 Update validator and engine surfaces: `consistency-validator.mjs` role inventory, missing-role-spec diagnostics, exact H1 checks, role frontmatter checks, role identity checks, `manifest.phases[]`/`manifest.shared[]` absence checks, non-manifest role boundary checks, and workflow-chain/header-injection fixtures/comments.
- [x] 8.10 Update tests: consistency-validator tests, workflow-chain header-injection tests, MD integration role-spec tests, and any fixture paths/comments that reference old filenames. Tests must verify exact role H1s, reject `# Phase:` for role specs, verify absence from both `manifest.phases[]` and `manifest.shared[]`, verify real role specs do not add `stop`, use a synthetic non-manifest relay-like fixture with `stop: "no"` for the header-injection boundary regression, and add a missing-role-spec failure case if the validator currently skips missing files.
- [x] 8.11 Update active OpenSpec references in this change's proposal/design/delta specs for current-contract role filenames while preserving completed task ledger history in §§1-6 as historical text.
- [x] 8.12 Update current future-facing backlog/guideline references under `_backlog/todos`, `_backlog/bugs`, and `guidelines/`; do not rewrite `_backlog/_done/**`, `openspec/changes/archive/**`, or other historical archives.
- [x] 8.13 Run role-focused validation with exact commands: `node --test tests/engine/workflow-chain.test.mjs tests/engine/consistency-validator.test.mjs tests/integration/md/*.test.mjs`; `openspec validate harden-relay-pipeline --strict`; current-contract residual scan command above; broader accounting scan command above; and `git diff --check -- openspec/changes/harden-relay-pipeline DPT_FRAMEWORK tests guidelines _backlog/todos _backlog/bugs`. Record accepted-spec archive/sync follow-up classification.

Residual classification recorded for 8.13: current framework/tests/guidelines/backlog contract surfaces have 0 old role filename hits. Remaining old-name hits are limited to completed task ledger history in this active change, the rename/residual-scan instructions themselves, a negative current-contract scenario in `shared-node-content`, accepted specs pending archive/sync, and historical archive/done notes.

## 9. Queue Active Window Expansion — AGQ-019

> **Boundary**: This section is newly added after the completed historical task ledger in §§1-8. Do not rewrite, reorder, reopen, or re-check §§1-8 while executing this expansion. This section covers only the active-window slot count change from 5 to 20 and the current-contract surfaces affected by that wire-shape change.
>
> **Source of Record**: `agentic-queue` delta defines `QUEUE_ACTIVE_WINDOW_SLOTS=20`, the expanded `SLOT_NAMES`, and the queue/relay concurrency decoupling invariant. `schema-core` and `cmd-bundle-instantiation` deltas update accepted-spec references for queue validation and bundle templates.
>
> **Queue/Relay boundary**: Queue active-window depth is not Relay concurrency. Only `slot_1_current` remains executable by `claim()`; `slot_2_next` through `slot_20_tail` are preview/depth slots. `MAX_CONCURRENT_SUBAGENTS=8` remains the Relay concurrency cap and MUST NOT be tied to `QUEUE_ACTIVE_WINDOW_SLOTS`.
>
> **Impact surfaces that must be closed**:
> - SSOT constants and template: `DPT_FRAMEWORK/schema/contracts/queue-slots.mjs`, `DPT_FRAMEWORK/rb_templates/rb_queue.json.tmpl`.
> - Queue engine/CLI diagnostics using slot names: `queue-manager.mjs` comments/expectations, `check-reentry.mjs`, `gate-helpers.mjs`, `file-observability.mjs`, and `operate-queue.mjs` only if a residual scan finds hardcoded 5-slot assumptions.
> - Experiment bundle generation: `experiments_env/shared/new-disposable-bundle.mjs`.
> - Tests and fixtures: `tests/schema/contracts/queue.test.mjs`, `tests/engine/queue-manager.test.mjs`, `tests/engine/helpers/checkpoint-manifest.test.mjs`, `tests/engine/helpers/file-observability.test.mjs`, `tests/integration/cli/check-reentry.test.mjs`, and any other hardcoded 5-slot queue object or assertion under `tests/`.
> - Controlled playbooks and current guidance: hardcoded 5-slot queue snippets or preemption wording under `experiments_playbook/`, `DPT_FRAMEWORK/workflows/nodes/shared/shared-schemas.md`, `guidelines/`, and current future-facing backlog docs when they describe current/future behavior rather than historical incidents.
> - OpenSpec governance/current specs: `openspec/governance/req-registry.yaml` AGQ-019 and accepted specs after archive/sync. Historical archives and completed incident notes may retain old 5-slot observations when classified as history.
>
> **Residual scans**: Current-contract residual scan should flag unclassified `slot_5_tail`, `five-slot`, `5-slot`, `five null slots`, `QUEUE_ACTIVE_WINDOW_SLOTS=5`, and `QUEUE_ACTIVE_WINDOW_SLOTS = 5` hits outside historical archives. Historical incident notes may keep old values only when the validation record classifies them as historical observations, not current contract.

- [ ] 9.1 Run and record AGQ-019 impact scan across framework code, templates, tests, experiments, current guidance, active OpenSpec, accepted specs, and governance. Classify every 5-slot hit as current-contract-to-update, accepted-spec pending archive/sync, historical observation, or residual bug.
- [ ] 9.2 Implement SSOT + template expansion: `QUEUE_ACTIVE_WINDOW_SLOTS` 5→20; `SLOT_NAMES` becomes `slot_1_current`, `slot_2_next`, `slot_3_pending` through `slot_19_pending`, `slot_20_tail`; `PENDING_SLOT_NAMES` remains `SLOT_NAMES.slice(1)`; `rb_queue.json.tmpl` renames `slot_5_tail` to `slot_5_pending` and adds `slot_6_pending` through `slot_20_tail`.
- [ ] 9.3 Replace hardcoded active-window arrays with the SSOT import. Search for hardcoded slot-name arrays in `check-reentry.mjs` (near current `slot_1_current`…`slot_5_tail` array literal), `gate-helpers.mjs` (near current active-window scan loop), and `file-observability.mjs` (near current slot enumeration). Replace each with `import { SLOT_NAMES } from '../schema/contracts/queue-slots.mjs'` (path adjusted per file location). Also update `queue-manager.mjs` comments/tests to describe a 20-slot preview window without implying queue-level concurrency. Do NOT rely on specific line numbers — the sections 1-8 implementation may have shifted line positions; grep for `slot_5_tail` or `slot_1_current` array literals to locate the hardcoded arrays.
- [ ] 9.4 Update experiment/test fixture generation: `experiments_env/shared/new-disposable-bundle.mjs` and every hardcoded current-contract queue fixture under `tests/` and `experiments_playbook/` must either derive slots from `SLOT_NAMES` (when executable JS) or explicitly include the 20-slot wire shape (when Markdown/shell fixture text). **Retroactive coverage**: Sections 1-8 tests that were written against the 5-slot SSOT may break when `QUEUE_ACTIVE_WINDOW_SLOTS` changes. After implementing 9.2, run the full regression suite (`node --test tests/schema/contracts/queue.test.mjs tests/engine/queue-manager.test.mjs tests/engine/helpers/checkpoint-manifest.test.mjs tests/engine/helpers/file-observability.test.mjs tests/integration/cli/check-reentry.test.mjs tests/integration/cli/operate-queue.test.mjs`) and fix any test that hardcodes `5` or a 5-element `SLOT_NAMES` array. Pay special attention to tests created in tasks 2.8, 3.9, and 4.5 — their assertions may reference the old slot count or old `slot_5_tail` key name.
- [ ] 9.5 Update governance and current guidance: `openspec/governance/req-registry.yaml` AGQ-019 uses `QUEUE_ACTIVE_WINDOW_SLOTS=20`; current guidance/shared schema docs describe 20 slots; accepted `agentic-queue`, `schema-core`, and `cmd-bundle-instantiation` spec text updates remain represented by this change's delta specs and archive/sync path.
- [ ] 9.6 Add/update regression coverage: schema/engine tests assert `20`, `SLOT_NAMES.length`, configured tail displacement via `SLOT_NAMES.at(-1)`, enqueueing 20 active-window task cards before `refill_pool`, pendingCount over 20 active slots, and queue/relay decoupling from `MAX_CONCURRENT_SUBAGENTS=8`.
- [ ] 9.7 Run validation with exact commands: `node --test tests/schema/contracts/queue.test.mjs tests/engine/queue-manager.test.mjs tests/engine/helpers/checkpoint-manifest.test.mjs tests/engine/helpers/file-observability.test.mjs tests/integration/cli/check-reentry.test.mjs tests/integration/cli/operate-queue.test.mjs`; `openspec validate harden-relay-pipeline --strict`; `git diff --check -- openspec/changes/harden-relay-pipeline DPT_FRAMEWORK tests experiments_env experiments_playbook guidelines openspec/governance`; and the AGQ-019 residual scan from this section. Record any remaining historical-only 5-slot hits.

## 10. Sub-agent Output Sanitization + Gate Sanity Checks (BUG-018)

> **Boundary**: This section is newly added after §§1-9. Do not rewrite, reorder, reopen, or re-check completed tasks. This section covers the YAML serialization contract for sub-agent outputs and a `template_not_expanded` gate sanity check — the two BUG-018 defects that fall within this change's relay-hardening scope.
>
> **Source of Record**: `workflow-node-contract` delta (WNC-009) defines the standard library serialization requirement for sub-agent role specs. `gate-skeleton` delta (GSK-002) defines the `template_not_expanded` pre-rule sanity check, actionable parse error diagnostics, JSON deterministic repair, and YAML deterministic repair for unescaped double-quote patterns.
>
> **Out of scope for this change**: Engine `commitSlotResult()` YAML pre-validation (P3), `shared_ref_total` minimum threshold fix (independent bug), and incremental re-validation after each repair (large process change).
>
> **Impact surfaces**:
> - Sub-agent role specs: `subagent-dpt-source-intake.md` §3 (Artifacts), `subagent-dpt-evidence-extractor.md` §3, `subagent-dpt-topic-scout.md` §3, and `shared-subagent-protocol.md` new §6 (Output Serialization).
> - Gate CLI: `check-gate-wave0-complete.mjs`, `check-gate-wave1-complete.mjs`, and `check-gate-wave2-complete.mjs` (lightweight pre-rule scan for `${` in `source_url` fields, parse error diagnostics, JSON repair).
> - Gate helpers: `gate-helpers.mjs` YAML/JSON read functions (parse error diagnostics, JSON deterministic repair).
> - Workflow validators: `consistency-validator.mjs` or equivalent must flag role specs that describe hand-concatenated YAML/JSON patterns.

- [ ] 10.1 实现 WNC-009: 更新 `subagent-dpt-source-intake.md` §3，将 YAML 写入指令从手拼字符串改为 JS 对象 + `yaml.stringify()`；增加反例警告（禁止 template literal 拼接、禁止 shell heredoc 写 YAML）。
- [ ] 10.2 实现 WNC-009: 更新 `subagent-dpt-evidence-extractor.md` §3，同样要求 `yaml.stringify()` 或 `JSON.stringify()` 作为结构化输出的唯一方式。
- [ ] 10.2b 实现 WNC-009: 更新 `subagent-dpt-topic-scout.md` §3，要求 `yaml.stringify()` 或 `JSON.stringify()` 作为结构化输出（包括 `reference/00-cross-*.md` 的 YAML frontmatter）的唯一方式。Wave 2 有两个 sub-agent 角色（topic-scout + evidence-extractor），都产生 YAML 内容，都受此约束。
- [ ] 10.3 实现 WNC-009: 更新 `shared-subagent-protocol.md`，在 §5 Page Content Fetching 之后增加 §6 "Output Serialization"，声明所有 sub-agent 产出的 YAML/JSON 文件 MUST 通过对应标准库序列化写入，禁止手拼格式字符串。
- [ ] 10.4 实现 GSK: 在 Wave0/Wave1/Wave2 gate CLI 的 rule evaluation loop 之前增加轻量 pre-rule scan：遍历所有 `source_url` 字段（包括 source.yaml 和 reference markdown frontmatter），如果值包含 `${` 则 emit `template_not_expanded` diagnostic（不 fail gate，只在 inspect 中展示）。Wave2 的 search/gap-fill 产出同样可能有 `source_url`，不应被排除。
- [ ] 10.4b 实现 GSK parse error 诊断: 更新 `gate-helpers.mjs` 中 YAML/JSON 读取函数（`readYamlArray()` 及同类 helper），parse 失败时区分「文件不存在」vs「parse 失败」；parse 失败时在 inspect 中包含文件路径、行号/位置、parser error message。废除 "Cannot read or parse YAML array" 这种无法定位的通用消息。覆盖 `source.yaml`、frontmatter block、`rb_output_declarations.jsonl`、slot result JSON。
- [ ] 10.4c 实现 GSK JSON repair: 更新 JSON 读取 helper，`JSON.parse()` 失败时尝试确定性修复（trailing commas、missing closing brackets/braces、unquoted keys、single-quoted strings）。修复成功时 log `json_repaired` diagnostic 并继续；修复失败时在 parse failure 中附加修复尝试信息。
- [ ] 10.4d 实现 GSK YAML repair: 更新 `readYamlArray()` 及 YAML 读取 helper，`yaml.parse()` 失败时尝试确定性修复。首期目标：检测双引号字符串内未转义的 ASCII `"`（U+0022）——从 parser error 定位失败行，转义行内未转义的双引号，retry parse。修复成功时 log `yaml_repaired` diagnostic（文件、行号、修复内容）；修复失败或模式未识别时 fallback 到 parse error 诊断。后续可按实际故障数据扩展修复模式。
- [ ] 10.5 扩展 workflow validator: 检测 sub-agent role spec 的 artifact 写入指令，如果描述的是 template literal 拼接、shell heredoc 或字符串插值方式写 YAML/JSON，报 serialization contract violation。
- [ ] 10.6 验证: disposable bundle 上构造含 ASCII 双引号的页面标题 → sub-agent 按新 spec 使用 `yaml.stringify()` 写入 source.yaml → gate `readYamlArray()` 成功 parse → count_floor 看到正确 entry 数。再构造 `${url}` 模板残留 → gate emit `template_not_expanded` diagnostic。

## 11. Robustness Regression Tests — Malformed YAML/JSON Injection (BUG-018)

> **Boundary**: This section is newly added after §§1-10. These are automated `node:test` regression tests that deliberately inject malformed data to verify the read-side defenses hold. They do not require a live bundle or sub-agent — they import gate helpers directly and feed crafted payloads.
>
> **Test file**: `tests/engine/helpers/gate-read-resilience.test.mjs` (new). Tests import `readYamlArray()` and JSON-reading helpers from `gate-helpers.mjs`, plus `yaml.stringify()` / `JSON.stringify()` for the write-side roundtrip tests.

- [ ] 11.1 写侧 YAML roundtrip: 构造包含各类特殊字符的 JS 对象（ASCII `"` in string、`:` in value、`\n` in text、emoji、CJK、URL with `?`/`&`/`=`），经 `yaml.stringify()` 写入临时文件，`readYamlArray()` 读回，断言每个 field value 与原始对象逐字节一致。覆盖 `yaml` package 的 plain/double-quoted/literal block scalar 自动选择。

- [ ] 11.2 写侧 JSON roundtrip: 同上，用 `JSON.stringify()` 写入，`JSON.parse()` 读回，断言一致。

- [ ] 11.3 读侧 YAML parse failure → 可操作诊断: 手工构造畸形的 YAML 临时文件（双引号字符串内嵌未转义 ASCII `"`、bad indentation、`key: : value`），调用 `readYamlArray()`，断言：(a) 不 throw，(b) 返回的 error 包含文件路径，(c) 包含行号，(d) 包含 parser error message，(e) 明确区分 "file does not exist" vs "parse failure"。不复现 "Cannot read or parse YAML array" 这种无位置信息的消息。

- [ ] 11.3b 读侧 YAML repair: 手工构造畸形 YAML 临时文件，逐个验证：
  - `title: "点球｜亚洲球队遭遇"滑铁卢" — 新华报业网"` (BUG-018 原始 case，双引号内嵌未转义 ASCII `"`) → repair 成功 → 内嵌引号被转义 → `yaml.parse()` 成功
  - `title: "foo "bar" baz"` (多处未转义引号) → repair 成功
  - `notes: "he said "hello" and "goodbye""` (嵌套引语) → repair 成功
  - 正常 YAML（无畸形） → 不触发 repair，正常 parse
  - 不可修复的畸形（如乱码二进制内容） → repair 失败 → fallback 到 parse error 诊断
  每种 case 断言 repair 成功时 log `yaml_repaired` diagnostic 含文件和行号，失败时 parse error 含文件路径+行号+parser message。

- [ ] 11.4 读侧 JSON repair: 手工构造畸形 JSON 临时文件，逐个验证每种修复：
  - `{ "a": 1, }` (trailing comma) → repair 成功 → parse 得到 `{ a: 1 }`
  - `{ a: 1 }` (unquoted key) → repair 成功
  - `{ 'a': 1 }` (single-quoted string) → repair 成功（如 repair 算法覆盖）
  - `{ "a": 1 ` (missing closing brace) → repair 成功 → 补上 `}`
  - `{ "a": 1 ]` (mismatched bracket) → repair 失败 → 错误信息包含修复尝试说明
  每种 case 断言 repair 成功时 log `json_repaired` diagnostic，失败时 parse error 包含尝试信息。

- [ ] 11.5 读侧 template_not_expanded 检测: 构造包含 `${url}`、`${topic_slug}` 等未展开模板变量的 YAML 和 markdown frontmatter 临时文件，调用 gate pre-rule scan，断言 emit `template_not_expanded` diagnostic 且标识受影响文件和字段。再构造正常数据（不含 `${`），断言不误报。

- [ ] 11.6 集成: 构造一个完整的畸形 `source.yaml`（混合了 unescaped 引号 + bad indentation + 正常 entry），调用完整 gate rule loop（或最小复现路径），断言：(a) 正常 entry 可被 count_floor 识别，(b) 畸形 entry 被 parse error 报告且不影响正常 entry 的识别（如实现了 per-entry 恢复），或整体 parse 失败但错误消息精确定位到第一个问题的行号（如未实现 per-entry 恢复）。

- [ ] 11.7 运行: `node --test tests/engine/helpers/gate-read-resilience.test.mjs` 必须 PASS。所有临时文件在 `node:test` 的 `afterEach` 中清理。
