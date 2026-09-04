# Proposal: spec-lean-restatement-tooling

## Why

spec-lean 主线（`_backlog/plans/spec-lean-pointerization-and-registry-hygiene.md` §8，2026-09-03 REVIEW 后 change 化）的后续 change（C2 DWU 一变四迁移、C3 十一块机械拆分、C2/C3 内的指针化）都需要两件重复使用的确定性能力：一是把"哪段散文疑似复述"从人肉通读变成工具候选定位 + 人审定的短闭环；二是把"按分组表拆块"从手搬文本变成脚本搬移 + 内容守恒断言。来源：主 plan §3 R0（工具先行，无行为面）与 CLS-084 复盘（`_backlog/_scratch/retro-slimming-plan-pacing-and-tooling.md`）的工具化策略。

## What Changes

- 新增**复述候选扫描器**（治理辅助工具，非 checker）：对给定 spec 按 §2.1 判定规则 1 的锚点词表（generated task / task.md / spawn / Generated guidance / Generated actor / Generated work-unit task 类过程性复述词汇）输出候选段落行号表（段落起点、命中词、所在 requirement 块）。**只出候选，不改写任何文件**；候选是否指针化由人按 §2.1 三条件逐条定稿。
- 新增**通用 spec delta 装配工具**：输入 = 主 spec + 分组 YAML（requirement 块 → 新标题分组映射），输出 = 变换后 spec 文本 + 内容多重集合守恒校验（拆分前后除新增标题行外逐行多重集合相等）。把 CLS-084 五份一次性装配脚本泛化为可复用工具；在 C3 的 11 块 ×27 子块拆分中首用。
- 不改变任何 accepted spec、任何 engine/CLI 行为、任何 registry 键值——本 change 无 spec delta（`skip_specs: true`）。

## Capabilities

### New Capabilities

（无）

### Modified Capabilities

（无）

## Capability Discovery

| Candidate path | Evidence read | Decision | Reason |
|---|---|---|---|
| `agent/delegated-work-units` | 扫描器校准对象（`calibration-dwu.md`，只读） | Excluded | 本 change 只新增读取 spec 的辅助工具，不修改任何 capability 的 requirement 或行为；DWU spec 仅作为只读校准输入 |
| `governance/spec-lean-tooling` | 假想候选，已核对 catalog 与 `req-registry.yaml` 前缀 | Excluded | 不引入新 capability：两件工具是非 checker 治理辅助（命名避开 `check-*`、不接入 check-all、不出 verdict），无 observable behavior 需要 contract 承载。故 `skip_specs: true`，delta-spec 不适用 |

**skip_specs 理由**：纯工具 change（spec-hygiene 辅助），无任何 spec 级行为变化；two tools 的 correctness 由 JS-led 测试与工具输出的人审消费约定约束，不需要 requirement 契约。符合 `.openspec.yaml` skip_specs 规则的"pure refactor, tooling"场景。

## Impact

- **新增文件**：`openspec/governance/scan-restatement-candidates.mjs`、`openspec/governance/assemble-spec-delta.mjs`（命名不含 `check-` 前缀 → 不被 `check-all.mjs` 自动接入，维持"工具不出 verdict"的边界）；对应测试在 `tests/governance/`（node:test + node:assert，纯 ESM，零新依赖）。
- **不触碰**：`openspec/specs/**`、`DEEP_RESEARCH_HARNESS/**`、`req-registry.yaml`、既有 checker。
- **消费者**：C2（DWU 迁移测绘与拆分装配）、C3（11 块拆分装配）、C2/C3 内指针化候选定位。验收锚点：扫描器对 DWU 的候选表与主 plan §1.5 实测锚点（36 处命中）交叉一致；装配工具在 C3 首用零返工。

## Source of Record / 最短闭环 / 净简化

- **Source of Record**：spec 文本本身（工具只读）；扫描器输出是 projection（候选表），永不是判定 authority；装配工具的守恒校验是对"拆分不改字"红线的确定性断言（Engine-owned verdict）。
- **最短合法闭环**：`spec 文本 → 工具候选/守恒断言 → 人审定稿（§2.1 三条件）→ delta`，无中间派生状态、无缓存、无第二 validator。
- **净简化**：把 5 份一次性装配脚本（CLS-084）泛化为 1 份工具，消除"每个拆分批重写脚本"的重复复杂度；扫描器替代人肉通读定位候选，判定权仍留在人——不新增任何 controller、状态或 fallback。

## Semantic-Precision Reflection（两个新工具）

- **读者与有界问题**：扫描器服务的读者是"准备指针化 change 的 Agent + 复核人"，问题 = "本 spec 中哪些段落疑似对 owner surface 的过程性复述，值得按 §2.1 逐条判定？"它不回答"是否应该指针化"（那是人审的语义判断，工具刻意不出 verdict）。
- **保留的区别**：候选表中保留"命中词类别 × 段落位置 × 所在 requirement 块"三要素，合并这三者中任意一个都会改变人审需要的证据范围；"normative SHALL 依赖的场景句"不在扫描器职责内（那是 §2.1 条件 3 的人审判定）。
- **停止点**：读者拿到候选表后即可逐条做 §2.1 判定，不需要重新通读全文或重建工具内部逻辑；表内明确标注"候选 ≠ 判定"。
- **装配工具**：读者是"执行拆分 change 的 Agent"，问题 = "按此分组映射搬移后，文本是否逐字守恒？"停止点 = 校验器给出 pass/fail 与首个不守恒根因（缺行/多行/被改行），无更多解释层。

## 责任边界

- **用户**：候选表逐条定稿（指针化与否的语义判断，§2.1 三条件）；分组 YAML 的主题分组终审。
- **Agent**：运行工具、把候选表与分组表作为 change 规划输入、执行机械搬移。
- **Engine（工具）**：候选定位的确定性输出、内容多重集合守恒的 pass/fail 断言（fail 时给最小根因）。工具不做任何语义裁决，不创造 permission。
