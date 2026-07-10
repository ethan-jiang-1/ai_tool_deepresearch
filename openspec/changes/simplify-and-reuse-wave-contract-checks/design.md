## Context

Wave0/Wave1/Wave2 当前各有一套正式 gate CLI 和一套独立 inspect CLI。两套实现读取相近的 artifact、ledger、reference 和 provenance surface，却分别维护规则与诊断，已经出现三类问题：同一事实判断漂移、前置结构缺失引发大量派生失败、纯 Markdown 表现差异被提升为 blocking。

本 change 涉及多个 Wave CLI、shared gate helper、phase Markdown 和 regression guard，因此需要先明确一个简单边界：生命周期 gate wrapper 继续负责 handoff、routing、attempt、trace 和 checkpoint；共享 evaluator 只读取 bundle truth 并返回确定性判断。质量控制路径保持为 `直接事实 -> 一个 checker -> 最小根因 -> 一个修复动作`。

## Goals / Non-Goals

**Goals:**

- 让每个 Wave 的 inspect 与正式 gate 复用同一份 artifact/provenance evaluator。
- 保留 authority、submitted provenance、required structured fields 和显式 profile floor 的 blocking 强度。
- 对无害 Markdown 表现差异使用宽容解析或 advisory。
- 用显式前置 guard 抑制不可行动的派生失败。
- 让 Phase Agent 在正式 gate 前获得自足、bundle-relative 的修复信息。

**Non-Goals:**

- 不建立通用 artifact controller、规则生成器或 schema-to-doc generator。
- 不把 research quality、novelty 价值或证据语义判断移入 JavaScript。
- 不允许 inspect 写 gate attempt、trace、checkpoint、status 或 handoff witness。
- 不借本 change 重写全部 gate framework 或统一所有非 Wave gate。

## Decisions

### 1. 每个 Wave 保留一个显式纯 evaluator

从三个 Wave gate CLI 中分别抽出纯 artifact/provenance evaluator。每个 evaluator 保留该 Wave 的显式规则分支，输入 bundle path 和少量明确选项，输出共享的检查结果；正式 gate wrapper 与 inspect CLI 都调用它。

正式 gate wrapper 继续独立执行 node binding、handoff preflight、routing、degraded handoff、attempt durability 和 completion-only trace checks。inspect CLI 只调用纯 evaluator，并投影 `{ check, inspect, advice }`。

选择三个显式 evaluator，而不是一个高度参数化的通用规则引擎，是为了让判断链短、Wave 差异可见、失败位置容易定位。替代方案是继续让 inspect 调用 gate CLI 的 dry-run flag；该方案仍会把生命周期副作用与 artifact 判断绑在一起，容易漏掉写入路径，因此不采用。

### 2. evaluator 内部使用小型 structured finding，不建立依赖图

共享 evaluator 内部以最小 finding record 表示结果：rule id、classification、bundle-relative surface、expected fact 和 nearest repair。CLI 最终仍生成现有 Agent-facing `inspect[]` / `advice[]`，避免引入新的权威文件或复杂输出协议。

前置依赖通过局部 guard clause 表达。例如 depth-review 无法解析时，立即返回该 parent failure，不再运行依赖其字段的 novelty、decision 和 cache-mapping 检查；finding object 缺字段时，不继续产生该字段驱动的 enum、eligibility、handoff 和 backing 症状。

不建立通用 dependency graph、自动 root-cause 推理器或递归 suppression engine。依赖关系只写在直接消费该 parent structure 的 checker 附近。

### 3. blocking 只保护直接 authority 与必要可解析结构

逐项复审 Wave gate definition 和 helper：

- structured YAML 字段、submitted ledger binding、canonical role/path、可解析 URL、明确 profile floor 和 consumer navigation authority 保持 blocking；
- 仅影响空白、列表符号、等价 heading 表现或维护偏好的规则改为宽容解析或 advisory；
- 如果某个 Markdown 结构是定位直接 authority 的唯一入口，则保留最小必要结构检查，不扩张到完整排版校验。

替代方案是增加更多 auto-normalize 来兼容所有表现形式；这会隐藏 producer drift 并增加写入逻辑，因此只在纯读取解析上做有限宽容，不自动改 bundle。

### 4. primary feedback 只展示独立可修复根因

Evaluator 先按 prerequisite 顺序执行，再对 primary output 去重。每个独立根因最多给一个最近修复动作，并必须包含 rule/finding id、bundle-relative artifact/ref/field 和 expected direct shape。

完整派生细节如仍有审计价值，可写入现有 durable diagnostic surface；它不回灌成 primary flat wall。不会新增第二套 post-mortem 数据库。

### 5. producer guidance 只说明 canonical shape 和 inspect 时机

Wave phase/shared Markdown 更新 canonical role、path、field 和 enum 漂移，并在 phase-owned artifact 物化后、completion evidence 和正式 gate 前调用对应 inspect。文档不复制 validator 实现；精确失败信息由同源 evaluator 输出。

## Risks / Trade-offs

- [Risk] 抽取 evaluator 时改变既有 gate pass/fail → 先用现有 gate regression fixture 锁定 authority/provenance 结果，再逐项调整明确属于 presentation-only 的规则。
- [Risk] inspect 与 gate 仍因 lifecycle-only checks 看起来不同 → 输出中明确区分 shared contract checks 与 gate-only lifecycle checks，并只要求共享 rule id 一致。
- [Risk] 过度短路隐藏多个独立问题 → 只抑制确实依赖失败 parent 的检查；无依赖的 root cause 继续并列报告。
- [Trade-off] 三个显式 evaluator 有少量重复 → 接受可见重复，避免通用规则框架把简单判断变成长链路。

## Migration Plan

1. 先用 tests 锁定当前三个 formal gate 的 authority/provenance 行为和副作用。
2. 按 Wave0、Wave1、Wave2 顺序抽取纯 evaluator，并让 formal gate 先切换到新 evaluator。
3. 将三个 inspect CLI 改为调用对应 evaluator，保留 exit code 0/1/2。
4. 调整 presentation-only rules、局部 prerequisite guard 和最小诊断投影。
5. 更新 phase/shared guidance、gate rule audit、CHANGELOG 和 `DPT_FRAMEWORK/RUN.md`，版本提升到 `v0.17`。

回滚时可逐 Wave 恢复原 gate/inspect 调用路径；不涉及 bundle schema migration或持久状态迁移。

## Open Questions

无。实现阶段只需按现有 rule audit 逐项确认哪些规则属于 direct authority、哪些仅为 presentation。
