## Why

仓库治理机器（`governance:check`、doc-lock 测试、finalizer）锁的是结构完整性（requirement ID、指针、路径、格式），锁不住语义一致性（词表口径、判据归属、文本重复）。`_backlog/plans/spec-semantic-drift-remediation.md`（2026-08-30 深挖）与本 change propose 期核实确认，`agent/delegated-work-units`（DEW）与 `agent/agentic-queue`（AGQ）两篇 accepted spec 存在三处真实缺口：

1. **req 索引失准**：DEW 头部 `> req:` 列 26 个 ID、正文有 29 个 requirement；AGQ 头列 27、正文 28。`openspec/governance/req-registry.yaml` 仅登记 DEW-001..026 / AGQ-001..027，即至少 3+1 个 requirement 完全没有 requirement ID（已核实候选：DEW 的 "Sub-agents SHALL NOT own workflow authority"、"Invalid submit SHALL remain non-terminal"、两个 dry-submit 诊断 requirement；AGQ 的 "Phase drain includes queue demand and in-flight attempts"——registry 对 "Phase drain" 零命中）。按 ID 定位必然错位。
2. **跨 spec 判据误读陷阱**：AGQ drain 判据用 `deadline_at`（与 `DEEP_RESEARCH_HARNESS/engine/queue-manager-lifecycle.mjs:524` 的 expired 过滤一致），DEW 的 timeout 资格用 effective idle lease（`lease_anchor_at + idle_timeout_ms`）。两个不同机制共用同一字段名，spec 无任何分工说明——深挖会话中审读者（含子代理）全部在此误判为"双口径冲突"。
3. **逐字重复 scenario**：DEW-009 requirement 内 "Claimed task contains one canonical absolute runtime root"（L817）与 "Claimed task contains absolute runtime paths"（L855）近乎逐字重复，且后者是前者的子集；两者均无测试锁定（`grep tests/` 零命中）。

## What Changes

- **DEW / AGQ 头部 `> req:` 索引补全**至与正文 requirement 一致；为无 ID requirement 登记 DEW-027..029（最终集合以 apply 期 `check-project-reqs` 定位为准）与 AGQ-028，并在 Apply 期同步 `req-registry.yaml`；为两篇 spec 每个 requirement 增加内联 `> req:` 行（先例：DEW L69 已有 DEW-003 内联行）。
- **AGQ drain requirement 加 scope note**：声明 drain 新鲜度分类（`deadline_at`）与 work-unit timeout 资格（effective idle lease，owner 为 DEW "Timeout terminalization SHALL be guarded by progress-aware preflight"）是两个不可互换的 deterministic fact。不改判据本身——改判据会使 spec 漂离 engine 现状。
- **DEW-009 消除重复 scenario 内容**：OpenSpec MODIFIED delta 为整块替换语义（validator 拒绝静默丢弃既有 scenario），故按仓库既定 house 模式保留标题 "Claimed task contains absolute runtime paths" 作为 delta-sync key，正文改写为合并声明（行为唯一归属 "Claimed task contains one canonical absolute runtime root"，本 scenario 不再陈述独立 requirement）。
- **不产出**：零代码、零运行时行为变化；不做 supersession / late-submit / claim 批量原子性三对的"去重"文本手术（propose 期已核实为按面切分的互补关系，非重复，见 design.md Decisions D2）。

## Capability Discovery

| Candidate path | Evidence read | Decision | Reason |
|---|---|---|---|
| `agent/delegated-work-units` | main spec 全文关键段（L17-29 requirement 骨架、L67-124、L622-775、L793-930、L2229-2363）+ `req-registry.yaml` DEW 条目 + `engine/work-unit-*.mjs` 模块清单 | Modify | A1（ID 登记/索引）与 A4（DEW-009 去重）落点 |
| `agent/agentic-queue` | main spec L160-238、L585-600、L727-739、L945-1065 + `engine/queue-manager-lifecycle.mjs:524` + registry AGQ 条目 | Modify | A1（AGQ-028 登记/索引）与 A3（drain scope note）落点 |
| `engine/cli-exit-code-conventions` | post-final CLI exit-code 裂缝（A2） | Excluded | 属后续 change `align-post-final-recovery-surfaces`（C2），本 change 不触碰 CLI |
| `verification/verification-routing` | 本 change 验证类不变（unit 文本/registry 锁） | Excluded | 无证明路由变化 |
| `workflow/workflow-node-contract` | WNC-001..011 索引完好（registry 与正文一致） | Excluded | 无需改动 |

## Capabilities

### New Capabilities

（无）

### Modified Capabilities

- `agent/delegated-work-units`: DEW-009 重复 scenario 正文改写为合并声明（标题保留为 delta-sync key）；头部 `> req:` 索引补全；3 个无 ID requirement 登记新 ID 并同步 registry；全部 requirement 加内联 `> req:` 行。
- `agent/agentic-queue`: "Phase drain includes queue demand and in-flight attempts"（登记为 AGQ-028）增加判据分工 scope note，scenario 文本不变；头部 `> req:` 索引补全；全部 requirement 加内联 `> req:` 行。

## Impact

- `openspec/specs/agent/delegated-work-units/spec.md`、`openspec/specs/agent/agentic-queue/spec.md`：文本修改（含头部与内联 req 行）。
- `openspec/governance/req-registry.yaml`：Apply 期新增 4 个 ID（DEW-027..029、AGQ-028），无 retired 变动。
- 锁定这两篇 spec 的 doc-lock 测试：list-doc-locks 盘点已完成（2026-08-30）——两篇 spec 仅被治理测试按文件名引用（`tests/integration/governance/check-project-specs-h1.test.mjs`、`tests/integration/governance/check-project.test.mjs`），无文本级锁；本 change 另新增文本锁测试（tasks 4.1）。
- 责任边界：Engine 代码、CLI、gate、queue/work-unit 运行时行为零改动；全部修改为 accepted spec 文本与 requirement 身份登记，裁决权仍在既有 executable contract。