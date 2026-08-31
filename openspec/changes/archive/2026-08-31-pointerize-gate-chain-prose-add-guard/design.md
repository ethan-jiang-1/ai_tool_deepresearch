## Context

- 真实时序（2026-08-31 复核）：`workflows/transitions.chain.json` 的 phase 链为 instantiation → hitl1 → setup → seed-topics → wave0 → wave1 → wave2 → hitl2 →（rerun 边经 rerun-ready 回 seed-topics）→ readiness；`workflows/manifest.json` 恰 10 个 gate key；`cli/gates/` 恰 10 个 `check-gate-*.mjs` wrapper。
- 漂移实例：`DEEP_RESEARCH_HARNESS/COMMANDS.md` L159 手写链把 `hitl1-recorded` 排到 `wave2-complete` 之后；引入于 commit `938806958`（change `2026-08-28-commands-md-coverage-and-copyable-contracts`）；现有 checker（`check-content-drift.mjs` / `check-guidance-pointer-targets.mjs`）均不校验 prose 枚举顺序。
- 既有纪律与机制：COMMANDS.md L75 已有「文档不另立手写对照表」原则；`check-all.mjs` 自动发现目录内全部 `check-*.mjs`（`CHANGE_REQUIRING` 表之外零注册）；finalizer 检查序列硬编码于 `finalize-change-archive.mjs`（requirement-traceability → … → content-drift → 4 个 drift-guard → …）。
- 先例：`2026-08-16-repair-work-unit-recovery-vocabulary-and-drift-guards` 以「独立 checker + finalizer 序列接入 + 单一 MODIFIED requirement（change-feedback-loop）」交付 4 个 drift-guard checker，不新增 requirement ID。

## Goals / Non-Goals

**Goals:**

- COMMANDS.md 不再含手写 gate 推进链；读者被 pointer 引到单一真相源与详细查询入口。
- 未来任何 Harness guidance prose 再手写 gate 链时，`npm run governance:check` 与归档 finalizer 都会红，并给出 file/line/序列的最近修复坐标。

**Non-Goals:**

- 不改 `workflows/manifest.json`、`workflows/transitions.chain.json`、gate 判定语义、CLI、枚举、退出码。
- 不校验 gate 链「拓扑正确性」（比直接报红更复杂且更易漏，见 Decisions D2）。
- 不把扫描面扩到 `openspec/specs/`、`openspec/guidance/` 或 `_backlog/`（C1 证据仅在 Harness 面；扩大属新 scope）。
- 不新增 requirement ID、capability、registry 条目或 reservation。

## Decisions

- **D1 删链改 pointer（plan 方案 B），不重写为全序对照表。** 方案 A（把 L159 改正为 10 gate 全序表）会重新生长出手写对照表，与 L75「文档不另立手写对照表」纪律冲突，且下一次结构演进（加 gate/边）会再次漂。pointer 句命名两个真相源文件 + `engine/ask-next.mjs` 的 `resolveNodeTransitionDetailed()` 查询入口；同行 `--current-node` 必带参数说明保持不变（它是引入该行的 coverage 动机，本身无漂移）。
- **D2 guard 判定规则 = 「非 pointer 的 gate 枚举链直接报红」，不做拓扑比对。** 报红更简单、更不易漏：拓扑比对需解析合法序并对 rerun 回环边（`phase-hitl2 rerun → phase-rerun → seed-topics`）处理歧义；而「单行 ≥2 个不同 gate enum + 箭头连接」这一形状在合法文档中只对应「手写链」一种意图（已核实现有 8 个目标段落与全 Harness md 无此形状；apply 时以真实树 green 断言固化）。plan 原文即选此规则（「比比对更简单、更不易漏」）。
- **D3 enum 派生源 = `workflows/manifest.json` gate keys，运行时读取。** checker 不手写枚举清单，避免 checker 自己成为第二真相；manifest 缺失或不可解析时 checker 显式 fail（fail-closed），不静默 pass。
- **D4 独立 checker 文件，不并入 `check-content-drift.mjs`。** content-drift 的职责是路径存在性/引用解析（其行为条款在 accepted `governance/requirement-traceability`）；gate-chain-prose 的职责是枚举顺序性形状。独立文件与 4 个 drift-guard 先例一致，且 `check-all.mjs` 自动发现使其注册成本为零。
- **D5 接入两个机器面。** `check-all`（自动发现，`npm run governance:check` 即覆盖）+ finalizer 序列 content-drift 之后（drift-guard 先例位置），`tests/integration/governance/change-feedback-loop-archive.test.mjs` 的 fixture 拷贝清单与 FINALIZER_CHECKS 期望同步。只接 check-all 的话，带病 COMMANDS.md 的 change 仍可干净归档，guard 失去归档期拦截力；接入 finalizer 后成为归档 hard gate（对应 accepted RET「Check script compliance as hard gate」的机器面注册路径）。

**Alternatives considered**：并入 content-drift（拒绝：单一职责模糊，RET-006 行为条款被迫膨胀）；扫描 openspec 全树（拒绝：本 finding 证据在 Harness 面，无证据驱动的扩面）；guard 校验链与 `transitions.chain.json` 拓扑一致（拒绝：复杂且 rerun 回环边歧义，报红规则以更小复杂度达成同一防再发目标）。

## Risks / Trade-offs

- [误伤合法的多 gate 枚举行] → 规则限定「单行 ≥2 个不同 gate enum + `→`/`->` 连接」形状；真实树 green 断言进单测；若未来出现合法需求，届时另走 OpenSpec 加显式 allowlist，本 change 不预留。
- [checker 自身手写 enum 造成第二真相] → enum 运行时从 manifest 派生；单测断言派生关系（改 fixture manifest 可改变判定）。
- [finalizer 序列变更破坏既有集成测试] → 同步更新 FINALIZER_CHECKS 期望与 fixture 拷贝清单（先例 F-13 同一路径）。
- [「六大」类计数句残留在其他行] → checker 只拦箭头链形状，不拦计数词；apply 时人工核查 L159 周边与全文档「X 大 gate」措辞一并清理（done condition 含 L159 终稿核查）。

## Migration Plan

纯 additive：新 checker 文件 + 一行 prose 替换 + finalizer 序列 +1 + 测试期望同步。回滚 = 删 checker、还原 L159、还原 finalizer 序列与测试期望。无数据迁移、无兼容期。

## Open Questions

无。

## Verification Evidence Boundary

- unit：`tests/governance/gate-chain-prose-guard.test.mjs` 的 red/green fixture 裁决、enum 派生断言、真实树 green 断言。
- integration：隔离 fixture 中 finalizer 完整走新检查序列（含 gate-chain-prose），FINALIZER_CHECKS 期望一致。
- 不声称任何 Agent 行为或端到端 bundle 证据（`deterministic_e2e` / `agent_flow_e2e` not_applicable）。
