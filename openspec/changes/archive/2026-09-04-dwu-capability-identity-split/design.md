# Design: dwu-capability-identity-split

## Context

动机与范围见 proposal.md；完整设计定稿见 `_backlog/plans/spec-lean-capability-split-dwu.md`（§1–§8，2026-09-03 REVIEW 通过）。R1a 测绘已在本 change 内完成（`r1a-mapping.md`：39 块新家判定 + ID 分配 + 引用网 + @impl + doc-lock 清单）。本节只记录实施层面的决策。

## Goals / Non-Goals

**Goals:**
- 原子落地一变四：同一 change 内完成 3 新 spec + 母体瘦身 + registry + catalog + @impl + doc-lock，无半迁移态。
- 迁移块逐字节守恒（唯一允许净增：新内联 `> req:` 行与标题位置变化）；内容不重写、不润色。
- 旧 DEW ID 全部保留（17 个标 `[DEPRECATED]` + 后继指针），engine 模块文件零移动。
- 恢复母体 1:1 内联惯例（DEW-032/033 补注册），新三 capability 各带完整内联 1:1。

**Non-Goals:**
- 不改任何迁移块语义内容（只搬 + 换 ID 行）。
- 不引入新行为或 checker；不做 capability 级复议扩大。
- 母体瘦身后的指针化（R1c）在本 change 内但限定 §2.1 判定通过的候选（任务尾段）。

## Decisions

### D1. 新家边界 = r1a-mapping.md（39 块判定结果）
以"任务问题归属"为准绳、`@impl` 模块缝为显式证据（REVIEW 2026-09-03 确立的判据）。跨缝模块（lifecycle/actor/core 等被多个能力 requirement 共享）不移动文件——仅 `@impl` 注释的 ID 标签换新（S3 消解）。

### D2. ID 策略 = 选项 B（迁移换发新 ID）
WSU-001..008 / WUP-001..006 / WUC-001..009（requirement-reservation.yaml，pending 状态）；母体 DEW-032/033 不走 reservation（live 前缀追加，BUG-252/253 先例），apply 时直接注册。
- 旧 DEW 行：描述尾部追加 `[DEPRECATED]` + 后继指针（"migrated to WSU-00X (agent/work-unit-submission)"），ID 永不复用。
- registry prefixes：+3 行（WSU/WUP/WUC → 新 capability path）。

### D3. 文本迁移 = 逐字节块搬移 + 守恒断言
从母体 spec 按 r1a-mapping 提取 23 块（含场景），在目标 delta/canonical spec 中按新 ID 内联行落地；apply 后对迁移块跑内容多重集合守恒（C1 装配工具同款 `multisetConservation`），断言"除内联行替换与标题换行外零改动"。

### D4. catalog Purpose 改写（G3 ③ 已通过）
DWU 新 Purpose 草案："Production delegated-work assignment surface: work-unit identity, envelope binding, claim profile, task projection, and actor policy."（以实文连字符写法为准）。3 新行 Purpose/Keywords/Boundaries + 四能力 Related 互相交叉链接 + 邻居行（9 行外部引用）逐条重织。

### D5. doc-lock 双文件重写 + 一锁退休（S4）
- `tests/engine/delegated-queue-spec-text-locks.test.mjs`：heading/inline 计数断言按四新家分文件重写（母体 16 块/16 内联含 032/033；新家各按其块数）；timeout-note 测试改读新家文件（work-unit-preflight 或 correction——以 timeout-note 指向的块新家为准）。
- `tests/engine/dwu-slim-structure-locks.test.mjs`：标题断言失效 → 退休，注释指向各新家结构锁。
- `tests/engine/residual-spec-drift-text-locks.test.mjs`：CDP pair 等与本 change 无关的锁不动；若含 DWU pair 引用则按新家重定向。

### D6. 引用网重织（S1，65 处/12 文件）
`capability:agent/delegated-work-units` 形态引用逐条按语义定新家；验收断言：主 specs + catalog 内对旧 capability 路径的语义引用重织完成（保留 capability map 导航指针的除外）。

## Semantic-Precision Reflection

- **读者与有界问题**：四个 capability 各自服务一类消费者——派发方（母体：标识/briefing）、完成方（submission：权威记录）、提交前检查方（preflight：无副作用预测）、修复方（correction：失败纠正）。每类读者对"work unit 如何完成"的跨生命周期问题由母体 capability map 导航段承接（导航指针，非行为）。
- **保留的区别**：submit transaction / preflight / correction 在 split 后仍是互不重叠的任务问题，不合并成"work-unit lifecycle"（engine 的 lifecycle 模块横跨 P/C 两块语义，spec 层保持分开）。
- **停止点**：读者按 catalog Keywords/Boundaries 能定位唯一主能力；不必回到 2448 行单 spec 重建归属。

## Risks / Trade-offs

- [半迁移态] → 原子红线：单 change 全量落地 + apply 序固定（spec → registry → catalog → @impl → doc-lock）。
- [doc-lock 大面积红] → 每步 `list-doc-locks` 先行 + 锁与文本同 change 更新（tests/README 规则）；失配即定性。
- [checker 对首例操作未知反应（S6）] → `governance:check` 于 apply 中段跑首轮诊断，逐个反应按首跑定性，不猜。
- [迁移块逐字节失败] → 守恒断言 fail-closed + 搬运脚本兜底，禁手工重打。
- [发现粒度 trade-off（S2）] → 母体 capability map + catalog 精写 + Related 交叉链接消解。

## Migration Plan

apply 序：①4 spec 文件落地（3 新 canonical + 母体瘦身）→ ②registry（+25 新 ID、+3 前缀、17 `[DEPRECATED]`+后继指针、DEW-032/033 追加）→ ③catalog + RUN.md 引用重织 → ④engine/schema `@impl` 换新 ID → ⑤doc-lock 重写/退休 → ⑥R1c 指针化（迁移全绿后）→ ⑦全量验证 + before/after 度量。回滚：单 change 逆序还原（git revert 级）。

## Open Questions

（无——G1/G2/G3 与 §6 四决策点均已拍板/复核通过。）
