# Proposal: dwu-capability-identity-split

## Why

`agent/delegated-work-units`（2448 行，全库第一）承载四个互不重叠的任务问题（标识/briefing、完成记录、无副作用预测、纠正），吸积已超出单一 capability 的发现经济。用户 2026-09-01 拍板按 capability 级拆分（推翻 CLS-084 的 requirement 级结论）；设计定稿见 `_backlog/plans/spec-lean-capability-split-dwu.md`，REVIEW 2026-09-03 通过（四决策点 ✅，判定书 §1）。本 change = 主线 C2（主 plan §8）。

## What Changes

- **一变四 capability 身份迁移**：
  - 母体 `agent/delegated-work-units` 瘦身为 assignment & briefing（16 块，其中 2 块补注册 DEW-032/033 恢复 1:1 内联惯例）；
  - 新设 `agent/work-unit-submission`（WSU，8 块：submit 完成权威 / canonicalization / durable postconditions / ledger coverage / hash drift）；
  - 新设 `agent/work-unit-preflight`（WUP，6 块：dry-submit 预检 / provenance 严格投影 / timeout preflight / 诊断）；
  - 新设 `agent/work-unit-correction`（WUC，9 块：终态 fail-closed / late-submit / timeout 终态化 / supersession / transaction recovery）。
- **身份迁移**：23 个迁移 requirement 换发新 ID（r1a-mapping.md 分配表）；17 个旧 DEW ID 在 req-registry 标 `[DEPRECATED]` + 后继指针（永不复用、只增不删）；DEW-032/033 于 apply 时直接追加注册（BUG-252/253 先例，不经 reservation）。
- **engine `@impl` 同 change 换新 ID**：模块文件零移动（ADR 0005）；旧 ID 迁移期仍注册 → `check-code-impl-ids` 不断。
- **catalog**：README.md 新增 3 行（Purpose/Keywords/Boundaries）+ DWU 行 Purpose 改写为 assignment & briefing + 四能力 Related 交叉链接 + 邻居行重织。
- **原子性红线**：3 新 spec + 母体瘦身 + registry + catalog 同一 change 落地，禁止半迁移态。
- R1c 迁移后指针化并入本 change 尾段任务（G2 已拍板）。

## Capabilities

### New Capabilities

- `agent/work-unit-submission`: Production delegated completion authority — submit transaction, canonicalization, submitted ledger coverage, and post-submit drift detection.
- `agent/work-unit-preflight`: Side-effect-free preflight prediction for delegated work — dry-submit mirroring submit semantics, strict provenance projection, timeout preflight recommendation.
- `agent/work-unit-correction`: Correction of failed or drifted delegated work — fail-closed terminalization, audited late-submit, supersession lineage, transaction journal recovery.

### Modified Capabilities

- `agent/delegated-work-units`: 瘦身为 assignment & briefing（23 个迁移 requirement 移出：REMOVED；2 个保留块补注册内联 ID：MODIFIED）；Purpose 语义收窄在 catalog 行改写，spec 内职责由保留块承载。

## Impact

- **files**：`openspec/specs/agent/{work-unit-submission,work-unit-preflight,work-unit-correction}/spec.md`（新建 canonical）、`openspec/specs/agent/delegated-work-units/spec.md`（瘦身）、`openspec/specs/README.md`（catalog）、`openspec/governance/req-registry.yaml`（3 前缀 + 25 新 ID + 17 deprecated 标记）、engine/schema `@impl` 注释（21 个 DEW ID 中迁移命中的文件）、RUN.md 委派表路径、tests（doc-lock 双文件重写 + 一锁退休，S4）。
- **引用网**：65 处/12 文件（T1.3 实测，较 plan 时点 53 增长）——逐条定新家（r1a-mapping.md）。
- **不触碰**：engine 模块文件位置、已归档 change 历史文本、其他 capability 的 spec 正文。
- 首例声明：全库治理史上无 capability 级拆分先例（CLS-083 extract 是 engine 模块级）；proposal 显式声明 DWU catalog Purpose 被修订（submit transaction 职责迁出）。

## Capability Discovery

| Candidate path | Evidence read | Decision | Reason |
|---|---|---|---|
| `agent/work-unit-submission` | DWU spec 8 块实文 + r1a-mapping.md + engine 模块缝（work-unit-submit\*/-validation/-submitted-ledger） | New | "完成如何被权威记录"是与母体互不重叠的任务问题；无既有 contract 拥有该 observable behavior（catalog + req-registry 核对无 WSU 冲突） |
| `agent/work-unit-preflight` | DWU spec 6 块实文 + 模块缝（work-unit-timeout-preflight/-candidate-projection/dry-submit 逻辑） | New | "提交前如何无副作用预测"独立任务问题；WUP 前缀无冲突 |
| `agent/work-unit-correction` | DWU spec 9 块实文 + 模块缝（work-unit-lifecycle/-supersession/-submit-late-retry/-transaction\*） | New | "失败与漂移如何被纠正"独立任务问题；WUC 前缀无冲突 |
| `agent/delegated-work-units` | 母体 16 块实文 + catalog Purpose 行 + registry DEW 行 | Modify | Purpose 语义收窄为 assignment & briefing（submit transaction 职责迁出）；catalog 行与 spec 保留块同步修订 |

## Source of Record / 责任边界 / 化简影响

- **Source of Record**：四个 main spec 各自承载其 capability 的行为权威；req-registry 是 ID 唯一账本；catalog 只做导航。
- **最短闭环**：块 → 新家（r1a-mapping 判定）→ delta → apply 原子落地 → registry/catalog 同 change 同步；无中间派生状态。
- **净简化**：单一 2448 行 capability 变为四个单一聚焦 capability（16+8+6+9 块），跨生命周期问题由母体 capability map 导航段与 catalog 交叉链接承接；无新增 check/controller。
- **责任边界**：用户已拍板拆分层级与四分法（G2/G3 已决）；Agent 执行机械迁移与 `@impl`/doc-lock 对齐；Engine checker（check-code-impl-ids / check-project-reqs / finalizer）出确定性 verdict。
