## 0. Read Before Implementing

These tasks are not a generic CLI hardening pass. They implement the BUG-020 lesson:

- **MD / Phase Agent drives Agent Flow.** Phase Markdown remains the controller surface. The Phase Agent reads Markdown, invokes CLI checkpoints, reads their feedback, and continues.
- **CLI / Engine is checkpoint and loader receipt only.** `enter-phase` is not a lifecycle walker and does not execute next-phase work. It renders the next Markdown control surface and writes route-bound loader trace.
- **`stop: no` stays as the compatibility field.** The behavior name for non-terminal lifecycle phases is **autonomous continuation**: do not surface, do not wait, do not self-declare completion, continue through gate and `check.next` handoff.
- **Handoff truth is an ordered trace pair.** The accepted witness is latest passed deterministic `gate_attempt(next=<target>)` plus later `load_complete(entry=<target>)`. Stale historical matches must not certify current state.
- **Route-bound witness metadata is required.** The `load_complete` written by `enter-phase` must name the source gate/source node/target node that authorized it; ordering alone is not enough for auditability.
- **Superseded passes do not authorize handoff.** If a newer attempt for the same source gate/source node fails or points elsewhere, an older pass cannot be used for `enter-phase` or `advance-status`.
- **`advance-status --to` means source gate sync.** After wave0 passes, use `--to wave0_complete`, never `--to wave1_complete` until the wave1 gate itself passes.
- **Do not invent a new routing authority.** `check.next` remains the route. Do not add `dangling_transition`, `handoff_pending`, JS walkers, chat wrappers, schema rename, or new dependencies.

## 1. Transition Entry CLI

- [ ] 1.1 实现 CPT-003: 新增 `DPT_FRAMEWORK/cli/enter-phase.mjs`，支持 `--bundle <path>`、`--node <fileRef>`，调用 `assessNode()` 并绑定 bundle `rb_trace.jsonl`。
- [ ] 1.2 实现 CPT-003: `enter-phase` 按 dependency closure plan 顺序渲染 Agent-readable Markdown 到 stdout，包含 `assessNode()` 注入的 autonomous/terminal header，供 Phase Agent 读入 conversation context 后继续执行。
- [ ] 1.3 实现 CPT-003: `enter-phase` 不修改 `rb_status.json`、不运行 gate、不选择 routing、不驱动 lifecycle loop、不执行 Markdown 指令；缺少 `--bundle`、`--node`、bundle 或 node 不存在时以 JSON/可诊断错误退出，且失败不写 `load_complete`。
- [ ] 1.4 实现 CPT-003: `enter-phase --node <fileRef>` 通过 shared handoff helper 验证 `<fileRef>` 匹配 trace 中 latest passed deterministic `gate_attempt.next`（non-null），且该 attempt 命名 predecessor gate/currentNodeRef；不为未由当前最新合法 gate routing 产出的任意 node 写 `load_complete`。
- [ ] 1.5 实现 CPT-003: `enter-phase` 拒绝 stale historical `gate_attempt.next` match（当 later passed deterministic gate attempt 指向其他 node 时），并给出可诊断错误。
- [ ] 1.6 实现 CPT-003: `enter-phase` 成功 stdout 为纯 Agent-readable Markdown，带稳定 file-boundary marker；失败 stdout 为 JSON error，不混合 Markdown 和 JSON。
- [ ] 1.7 实现 CPT-003: `enter-phase` 写出的 `load_complete` 增加 route-bound metadata（`handoff_source_gate`、`handoff_source_node`、`handoff_target_node`、`handoff_source_attempt_index`、`handoff_source_attempt_ts`），供 preflight/status/E2E 审计；timestamp 仅作诊断上下文，index 才是主要 trace reference。
- [ ] 1.8 实现 CPT-003: `enter-phase` 拒绝 superseded pass：同一 source gate/source node 在旧 pass 后出现更新 failed attempt 或不同 `next` pass 时，旧 pass 不再授权 handoff。

## 2. Status And Handoff Preconditions

- [ ] 2.1 实现 CPT-003/CPT-004/GSK-007 共用的 handoff trace helper：读取 `rb_trace.jsonl`、`manifest.json`、`transitions.chain.json`，推导 latest valid deterministic handoff、source gate/source node/actual target node、authorizing `gate_attempt` 的 zero-based JSONL event index、post-pass route-bound target `load_complete`，并拒绝 stale/superseded attempts，供 `enter-phase`、`advance-status`、gate preflight 复用。
- [ ] 2.2 实现 CPT-004: 为 `advance-status.mjs` 增加 trace reader，明确 `--to` 是 latest just-passed source gate enum；写 status 前验证 latest passed deterministic `gate_attempt` with non-null `next` 属于该 source gate。
- [ ] 2.3 实现 CPT-004: `advance-status` 基于 shared helper 从 source gate 推导 source node，并使用 actual `gate_attempt.next` 作为 target node；验证 target 是 `transitions.chain.json` 中合法 deterministic outgoing edge，不得用 `passed || rerun` 猜默认 target。
- [ ] 2.4 实现 CPT-004: `advance-status` 对缺少 target node post-pass `load_complete` 的非初始 lifecycle handoff fail closed，输出 `status:"error"`、`reason`、`advice[]`，且不写 `rb_status.json` 或 `phase_transition`。
- [ ] 2.5 实现 CPT-004: `advance-status` 覆盖旧式 next-gate enum misuse（例如 wave0 pass 后 `--to wave1_complete`），失败 advice 指向正确 source-gate sync command。
- [ ] 2.6 实现 GSK-007: 在 gate helper 中新增 shared lifecycle handoff preflight，基于 shared helper 推导 legal predecessor edge，并验证 latest passed deterministic gate attempt 的 `next` 与当前 node post-pass `load_complete` 成对。
- [ ] 2.7 实现 GSK-007: 将 shared handoff preflight 接入所有适用 lifecycle gate CLI；instantiation 入口例外，多 incoming deterministic edge 只接受 trace 中最新合法 pair，HITL/rerun branch 不得由 helper 自行选择 route。
- [ ] 2.8 实现 GSK-007: preflight failure 作为普通 gate failure 返回 inspect/advice，不改变 router、transition table 或 gate-specific content rules。
- [ ] 2.9 实现 CPT-004/GSK-007: 增加 source-gate status-window derivation；covered gate 在自身 pass 前验证 `next_gate == <this gate enum>`、`current_gate == <legal predecessor source gate enum>`，而不是要求 `current_gate` 已等于自身 gate enum。
- [ ] 2.10 实现 CPT-004/GSK-007: 更新或替换 setup onward covered gate definitions / gate CLI status checks，覆盖 setup→seed-topics、seed-topics→wave0、wave0→wave1、wave1→wave2、wave2→HITL2、HITL2→readiness、HITL2→rerun、readiness→final、rerun→seed-topics；instantiation/HITL1 bootstrap status shape 作为显式兼容例外列入 validator allowlist。
- [ ] 2.11 实现 CPT-004/GSK-007: 对 HITL2 branch 使用实际 trace target；proceed→readiness 与 rerun→rerun 必须是两个可验证 deterministic handoff，不得由 helper 读取 profile 后自行选路。
- [ ] 2.12 实现 GSK-007: 修改 HITL2 gate/routing outcome emission，使 recorded `user_decision: proceed_to_readiness` 真实 emit `passed -> phases/phase-readiness.md`，recorded `user_decision: rerun` 真实 emit `rerun -> phases/phase-rerun.md`；`request_view_revision`、`repair`、`stop_blocked` 不得被默认洗成 readiness handoff。
- [ ] 2.13 实现 GSK-007: 增加 gate definition/status validator，拒绝 covered gate 保留旧式 own-gate `current_gate` pre-pass expectation；例外必须显式 allowlist。

## 3. Gate Diagnostics And Friction Reduction

- [ ] 3.1 实现 GSK-008: 从 trace/diagnostic artifacts 计算 Engine-derived `attempt_count`，保留 `--attempt` 作为兼容 hint 但不作为 authoritative count。
- [ ] 3.2 实现 GSK-008: 计算 cross-attempt delta diagnostics：`newly_passing`、`still_failing`、`regressed`、`attempt_trend`。
- [ ] 3.3 实现 GSK-008: 高 attempt gate pass 时输出 autonomous continuation advice，要求消费 `check.next` through `enter-phase`，并说明 final report 在 `phase-final` 交付。
- [ ] 3.4 实现 GSK-008: 为 Wave0 schema/parse 上游失败添加 cascade-mask diagnostics；masked diagnostics 仅用于解释，不改变 pass/fail truth。

## 4. Workflow Control Surface

- [ ] 4.1 实现 WNC-010: 更新 deterministic lifecycle phase 的 On Gate Pass 文案，要求读取 `check.next` 后先运行 `enter-phase --bundle <path> --node <check.next>`。
- [ ] 4.2 实现 WNC-010: On Gate Pass 文案随后运行 `advance-status --bundle <path> --to <this phase's gate enum>`，明确它同步 just-passed source gate（例如 wave0 使用 `wave0_complete`，不是 `wave1_complete`）；按 manifest gate key 转 snake_case 系统性更新所有 deterministic lifecycle handoff，不让执行者临场推导。
- [ ] 4.3 实现 WNC-010: 移除或改写把 `advance-status` 表述为“进入/加载下一 phase”的 wording；保留其 status synchronization 角色，并明确下一 phase 执行主体仍是 Phase Agent 读取渲染 Markdown 后的 agentic loop。
- [ ] 4.4 实现 SWE-003: 在 `shared-silent-execution.md` 增加 “Autonomous Continuation / Why Continue” section，明确 `stop: no` 是兼容字段、非终端行为名是 autonomous continuation，final delivery 在 Final，提前 chat synthesis 不合法且更不有用。
- [ ] 4.5 实现 WNC-010: 在 phase §6 中写明 covered handoff 的具体 source-gate commands：setup→seed-topics 使用 `setup_ready`，seed-topics→wave0 使用 `seed_topics_ready`，wave0→wave1 使用 `wave0_complete`，wave1→wave2 使用 `wave1_complete`，wave2→HITL2 使用 `wave2_complete`，HITL2 proceed→readiness 使用 `hitl2_recorded`，HITL2 rerun→rerun 使用 `hitl2_recorded`，readiness→final 使用 `readiness_passed`，rerun→seed-topics 使用 `rerun_ready`。
- [ ] 4.6 实现 WNC-010: HITL2 On Gate Pass 文案必须区分 proceed/rerun 两个 deterministic branch，均消费 selected `check.next` through `enter-phase`，不得让 `advance-status` 替代 target selection。
- [ ] 4.7 实现 WNC-003: 在 `workflow-node-contract` delta 中修正 Phase manifest structure，从 legacy 9-phase 描述更新为当前 11-phase lifecycle（instantiation、hitl1、setup、seed-topics、wave0、wave1、wave2、hitl2、readiness、rerun、final），并保留 transition table owns runtime next-node lookup 的边界。

## 5. Regression Tests

- [ ] 5.1 验证 shared handoff helper: 添加单元测试覆盖 latest valid deterministic handoff 推导、source gate/source node/actual target node 解析、post-pass route-bound `load_complete` 检测、多 incoming/outgoing edge、stale historical route rejection、superseded pass rejection。
- [ ] 5.2 验证 CPT-003: 添加 `enter-phase` CLI 测试，断言 route-bound `load_complete` metadata 写入 trace、header 渲染到 stdout、成功 stdout 为 Markdown、失败 stdout 为 JSON、`rb_status.json` 未修改，并覆盖未由 latest valid deterministic `gate_attempt.next` 产出的 node、stale historical route match、superseded pass 被拒绝。
- [ ] 5.3 验证 CPT-004: 添加 `advance-status` 测试，覆盖 `--to` 不是 latest source gate、gate `next` mismatch、缺少 target `load_complete`、旧式 next-gate enum misuse、superseded source pass、multi-edge actual target、witness 完整后成功。
- [ ] 5.4 验证 GSK-007: 添加 gate preflight 测试，覆盖 Wave1/Wave2 缺 current predecessor pass、latest pass `next` mismatch、缺 current post-pass `load_complete`、stale `load_complete`、superseded predecessor pass、HITL2 proceed/rerun selected target、witness 完整后继续正常 rules。
- [ ] 5.5 验证 GSK-007: 添加 wiring/status validator regression，断言所有适用 lifecycle gate CLI 调用 shared handoff preflight helper，且 covered gate definition/status checks 不再保留 own-gate `current_gate` pre-pass expectation。
- [ ] 5.6 验证 GSK-008: 添加 attempt delta / pass-side fatigue / cascade-mask 单元或集成测试。
- [ ] 5.7 验证 CPT-004/GSK-007: 添加 status-window derivation 测试，覆盖 setup→seed-topics、seed-topics→wave0、wave0→wave1、wave1→wave2、wave2→HITL2、HITL2→readiness、HITL2→rerun、readiness→final、rerun→seed-topics；断言 downstream gate 不再要求自身 gate enum 提前出现在 `current_gate`。
- [ ] 5.8 验证 GSK-007: 添加 HITL2 gate routing outcome 测试，断言 recorded `proceed_to_readiness` 输出 `check.next: phases/phase-readiness.md`，recorded `rerun` 输出 `check.next: phases/phase-rerun.md`，且 non-deterministic decisions 不会默认输出 readiness handoff。

## 6. Controlled E2E

- [ ] 6.1 实现 AGT-010: 添加 standard disposable-bundle E2E playbook，构造 BUG-020 handoff seam，不 mock gate/status/trace behavior。
- [ ] 6.2 实现 AGT-010: E2E 驱动 Wave0 gate 多次真实 attempt 后通过，并覆盖 cascade-mask diagnostics 与 attempt delta diagnostics。
- [ ] 6.3 实现 AGT-010: E2E 断言未见证 handoff 的 status/gate touch fail closed，并给出 `enter-phase` remedy。
- [ ] 6.4 实现 AGT-010: E2E 断言旧式 `advance-status --to <next phase gate>` laundering path fail closed，advice 指向 source-gate sync。
- [ ] 6.5 实现 AGT-010: E2E 断言运行 `enter-phase --node <check.next>` 后产生绑定当前 source gate attempt 的 route-bound `load_complete` metadata，随后 source-gate `advance-status` 和后续 gate 操作不再因 handoff witness 缺失失败。
- [ ] 6.6 实现 AGT-010: E2E 断言 stale historical `gate_attempt.next` match 在 later passed deterministic gate attempt 指向其他 node 后，不能授权新的 `enter-phase` witness；同一 source gate/source node 的 newer failed attempt 也会使旧 pass 失效。
- [ ] 6.7 实现 AGT-010: 如添加 heavy canary，则支持 `NOT RUN` 并明确不得作为 real Agent proof；standard E2E 仍为必跑机制证明，也不得声称已证明 chat-channel 行为。
- [ ] 6.8 实现 AGT-010: 扩展 standard E2E 至至少覆盖 wave1→wave2、wave2→HITL2、HITL2→readiness、HITL2→rerun、readiness→final，以及 rerun→seed-topics 多 predecessor case；所有 verdict 仍基于 trace/CLI exit/bundle files，不以 console prose 作证。
- [ ] 6.9 实现 AGT-010: HITL2→rerun E2E 必须通过真实 HITL2 gate CLI 产生 `gate_attempt.next: phases/phase-rerun.md`；不得通过手写 trace 或 fixture event 伪造 rerun branch。

## 7. Version And Documentation

- [ ] 7.1 更新 version-management: 将 `DPT_FRAMEWORK/CHANGELOG.md` 增加 v0.4 条目，简要说明 phase handoff witnessing、`enter-phase`、gate/status preflight。
- [ ] 7.2 更新 version-management: 将 `DPT_FRAMEWORK/RUN.md` 版本横幅同步到 v0.4，并确保入口说明不再暗示直接手读 phase node 是完整 handoff。
- [ ] 7.3 更新命令索引或运行说明中与 `enter-phase` 相关的 Agent-facing command guidance。

## 8. Final Checks

- [ ] 8.1 运行相关 `node --test` regression suites，记录命令和结果。
- [ ] 8.2 运行 AGT-010 standard E2E playbook，记录 PASS/FAIL；若失败，不得 archive。
- [ ] 8.3 运行 `node openspec/governance/check-project-reqs.mjs`，必须 PASS。
- [ ] 8.4 运行 `node openspec/governance/check-project-specs.mjs`，必须 PASS。
- [ ] 8.5 更新 tasks 勾选状态，仅勾选真实完成且验证过的任务。

## 9. Apply-Time Self-Review Checklist

Before marking this change ready for archive, verify these cross-cutting points explicitly:

- [ ] Every implemented handoff check uses the shared helper or proves equivalent logic; no ad hoc parser/check is allowed to drift from the shared latest-handoff semantics.
- [ ] Every failure path that rejects missing/mismatched handoff evidence exits non-zero and does not mutate `rb_status.json`, append `phase_transition`, or write a misleading `load_complete`.
- [ ] Every successful `enter-phase` witness includes route-bound source/target metadata; no plain unordered `load_complete(entry=...)` alone is treated as sufficient for new coverage.
- [ ] Every route-bound `load_complete` witness includes `handoff_source_attempt_index`, and status/preflight helpers verify that index points to the same authorizing `gate_attempt`; timestamp-only matching is not accepted as primary evidence.
- [ ] Superseded source passes are rejected consistently by `enter-phase`, `advance-status`, and gate preflight.
- [ ] Every Agent-facing instruction preserves the same control order: gate output -> `check.next` -> `enter-phase` loader receipt -> source-gate `advance-status` -> continue from captured Markdown.
- [ ] Every covered downstream gate uses the source-gate status window (`current_gate` = legal predecessor source gate, `next_gate` = current gate) and no covered gate still requires its own gate enum as `current_gate` before it has passed.
- [ ] HITL2 proceed and HITL2 rerun both use the selected deterministic trace target; helper code never chooses the HITL2 branch from profile state or hardcoded default outcome preference.
- [ ] HITL2 gate output itself emits the selected deterministic route for proceed/rerun; tests and E2E do not satisfy HITL2 rerun by hand-writing `gate_attempt` trace events.
- [ ] Instantiation/HITL1 bootstrap status exceptions are explicitly documented and allowlisted; no other lifecycle gate is omitted from handoff/status-window enforcement silently.
- [ ] Gate/preflight/status advice names the concrete remedy command with the bundle path and target node/source gate, instead of generic prose.
- [ ] Autonomous continuation language appears where the Agent will read it, while `stop: no` remains only the compatibility field and not the primary behavior explanation.
- [ ] Standard E2E proves the mechanism with real framework CLIs and disposable bundle state; optional heavy canary, if not run, is recorded as `NOT RUN` and not claimed as Agent-behavior proof.
