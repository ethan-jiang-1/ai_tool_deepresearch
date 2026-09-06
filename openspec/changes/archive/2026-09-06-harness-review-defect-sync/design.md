# design — harness-review-defect-sync

## Context

2026-09-01..09-06 批次的评审（来源见 proposal Why）坐实了五组缺陷坐标，全部已第一手核实：

1. **retire-final-version**：`DEEP_RESEARCH_HARNESS/engine/helpers/artifact-persistence.mjs` 中 aux 目录碰撞检查（:1515-1519）位于主报告 `renameSync`（:1505）之后，可产生"已突变却返回 blocked"的结果；引擎守卫 `requestedBy !== 'user'`（:1468）在唯一 CLI 入口被硬编码绕过（`cli/operate-artifact-persistence.mjs:188` 写死 `requestedBy: 'user'`）；`RetireFinalVersionRequestSchema`（:195）从未被 parse。
2. **Progress 双解析器**：`gate-helpers-plan-progress.mjs:37,45`（writer，原始行匹配、无 fail-closed）与 `phase-status-audit.mjs:220-245`（auditor，先 trim、有 unparseable fail-closed）各自手写 block 解析，对非 Engine 写出的 header 归属判定不一致。
3. **spawn 时间戳裸捕获**：两处 header 模式均用 `\(spawned (.+)\)$`；auditor 侧 `:356-358`、`:299-308` 用词法字符串比较判定 witness 窗口，可被伪造早时间戳绕过。
4. **aux grammar 四份拷贝**：`final-delivery-backing.mjs:244,451,457` 与 `artifact-persistence.mjs:788`；`:457` 的 `(?:\.md|\/)` terminator 差异是有意的（:457 匹配 target 路径，可为 `final/final_v<N>.md` 主报告或目录内文件；:244/:451 匹配 backing relPath，必在目录内），但无共享常量、无解释注释。
5. **canon 层失同步**：`CONTEXT.md:92`（"追加版本"与 2026-09-06 spec 矛盾）、`CONTEXT.md:64/:97`（WorkerFallback 死指针）、`invariants-brief.md` 第 5 条（真相源指向已拆分前的 mother spec）、第 7 条（`resolution_owner` 幽灵字段）、`research-wave-gate-implementation/spec.md:60-61`（b1377f781 引入的重复烂句）、`CONTEXT.md:18`（ADR 0004/0005 未列）。

约束：`DEEP_RESEARCH_HARNESS/` 仅 Node.js >=20 纯 ESM，依赖仅 zod/yaml；CONTEXT.md 的反馈词汇表被 `openspec/governance/check-feedback-vocabulary-gate.mjs` + `tests/governance/feedback-vocabulary-gate.test.mjs` 机器锁定；多个 md 文档被 `tests/integration/md/` doc-lock 锁定。

## Goals / Non-Goals

**Goals**
- blocked verdict 与文件系统突变的关系恢复为"先检查后突变"；human-controlled 由机制承载。
- Progress block 归属判定单一实现；spawn 时间戳 fail-closed。
- aux grammar 单一真相源（行为不变）。
- 导向层与 accepted spec 重新一致；spec 烂句修复。
- 补齐两个导航/测试小缺口（reconcile 指针、断言收窄）。

**Non-Goals**
- 不改 admission grammar、版本分配、gate 语义、研究语义。
- 不新增 CLI 动词、不建 CI/hooks、不加检查器。
- 不改 `feedback-vocabulary-gate` 的三词汇分诊结构（`repair_kind` / `recovery_action` / `repair_directive` 集合本身不变）。

## Decisions

### D1. retire 修复 = pre-check 前移 + 显式确认参数（而非删除守卫）

- **选择**：CLI `retire-final-version` 新增必填 `--user-confirmation <verbatim>`；缺失/空 → `invocationError`（exit 2），与既有 `--version` 校验同型。引擎 `retireFinalVersion` 入参新增 `userConfirmation`，与 `requestedBy === 'user'` 联合校验，缺失抛既有 `ArtifactPersistenceConfigError`（exit 2 语义）；引擎入口用 `RetireFinalVersionRequestSchema.parse()` 校验请求（复活死 schema，与 `PublishFinalReportRequestSchema` 对齐）。pre-check（target collision、aux collision、aux safety）全部移到首个 `renameSync` 前。
- **备选**：删除守卫并把文档改为"仅约定"——被否：spec 与三处文档已承诺机制，删除是开倒车；用 host 外部确认流（prompt/UI）——被否：超出 CLI 面，且宿主能力不可假设。
- **Source of Record**：`artifact-persistence.mjs`（引擎语义）；CLI 只做参数面与 invocation error。

### D2. 共享 Progress block 解析模块

- **选择**：新增 `DEEP_RESEARCH_HARNESS/engine/helpers/plan-progress-blocks.mjs`，导出共享 `parseProgressBlocks(sectionContent)`：采用 auditor 现行语义为唯一实现——逐行 trim 后识别；canonical header 形态为 `### Rerun cycle <N> (spawned <ts>)` 且 `ts` 必须匹配 ISO-8601 Zulu 形态（`/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/`），trim 后形似 cycle header 但不满足 canonical 形态的行进入 `unparseable: true` 的 fail-closed block（保留 auditor 现有分支）；返回 per-block 携带 `unparseable` 标志的 blocks。writer（`gate-helpers-plan-progress.mjs`）用同一解析定位当前 block（最后一个 block）并翻转；auditor（`phase-status-audit.mjs`）删除本地副本改用共享实现，消费方式不变。witness 窗口比较改为 `Date.parse()` 后的数值比较——shape 合法但日期值非法（`Date.parse` → `NaN`）的时间戳使任何窗口比较不成立，自然 fail closed；两者均为 canonical Zulu 时与词法比较等价，但正确性不再依赖该前提。
- **备选**：让 writer 也接受缩进 header——被否：Engine 只写列首 header，writer 接受更多形态会扩大翻转面；保留两份但加 cross-test——被否：这正是本次要消除的双真相源。
- **行为影响**：缩进/伪造 header 在 writer 侧仍留在前一个 block 内（翻转继续落在 Engine 认定的当前 block），auditor 侧 fail-closed 不变；两端对"这一行属于哪个 block"从此同源。

### D3. aux grammar 单一真相源（纯去重）

- **选择**：在 `final-delivery-backing.mjs` 导出 `FINAL_AUXILIARY_DIRECTORY_GRAMMAR`（version-grammar 前缀源，`String.raw` 片段）与组合器（目录 terminator 版、target terminator 版），`artifact-persistence.mjs` 引用；:457 的 `(?:\.md|\/)` 差异以注释固化（有意差异，见 Context #4）。
- **备选**：各自保留 + 注释互指——被否：四份拷贝同步风险已在评审中坐实。
- spec（`research/final-delivery-backing`）文字版 grammar 不动：spec 是人类可读投影，代码常量是实现事实，两者当前一致。

### D4. canon-sync 逐条对齐 owner

- `CONTEXT.md:92`：改为"交付后在 Final 原地接受呈现反馈；呈现修订以 CAS 更新当前 latest 字节、版本号不变；证据扩张走新版本"，与 `content-delivery-phase-content/spec.md` 一致。
- `WorkerFallback` 两行（:64、:97）删除：全仓库（specs/框架代码）零命中的死词条；不新造替代词。
- `invariants-brief.md` 第 5 条真相源 → `openspec/specs/agent/work-unit-submission/spec.md`；第 7 条 `hints[].resolution_owner` → `repair_kind`（`GATE_REPAIR_KINDS`，`gate-definition.mjs`）。
- `research-wave-gate-implementation/spec.md:60-61`：去重 "The old target expression" 重复，恢复 "A legacy `NN-wave1-*`..." 句首。仅措辞，`wave.submitted-reference-convergence` 语义不变。
- `CONTEXT.md:18` ADR 行补 `0004-reuse-first-capability-catalog`、`0005-two-level-capability-paths`（按实际文件名）。
- 配对机械更新：`feedback-vocabulary-gate` 锁的是分诊表（本 change 不动该表，预期零改动；如断言词条数则同步）；CONTEXT.md 删行后 grep 全部 doc-lock 断言，命中即同 change 内更新。

### D5. 两个小补

- `continue-run-bundle.md` Reload 步骤 6 句尾追加：Progress 呈现漂移可用 `node DEEP_RESEARCH_HARNESS/cli/reconcile-plan-progress.mjs --bundle <bundle>` 重建（presentation-only，不创造 gate 语义）。
- `tests/engine/final-delivery-backing.test.mjs` 用例 4 拆为两个精确断言：backing 文件**存在**的非 aux final 路径 → `final_output_not_backing`；**不存在** → `backing_file_missing`。断言顺序依据 `evaluateFinalDeliveryBacking` 的检查顺序（文件存在性先于 prohibited 判定）。

## Risks / Trade-offs

- [retire CLI 参数面 BREAKING，既有脚本/文档调用形态失效] → COMMANDS.md、persist-artifact.md 同步更新并给出新调用模板；CLAUDE.md/AGENTS.md 无调用示例，不受影响。
- [共享解析器改变 writer 对畸形 header 的行为（从"当作普通行"变为同样的严格归属）] → D2 已限定 writer 仅识别列首 canonical header，普通行处理不变；e2e `plan-progress-rerun-cycles` 回归锁定 rerun-cycle 增长不变。
- [doc-lock 断言范围未知，可能多处失败] → apply 时先 `node scripts/list-doc-locks.mjs`（若可用）或 grep `tests/integration/md/`，命中清单即改，全部随本 change 交付。
- [PHS-010 措辞变严（malformed ts = tamper）对存量 bundle 的影响] → Engine 只写 canonical Zulu（`new Date().toISOString()`），合法 bundle 不受影响；存量畸形 bundle 的 audit 报告本来就是 tamper 语义的目标用户。

## Migration Plan

单 commit 落地（代码 + 测试 + 文档同步）。回滚 = revert 该 commit。无数据迁移；retire 新参数只影响显式调用者。

## Open Questions

（无——`--user-confirmation` 的形态、共享模块边界、terminator 语义均已在评审中第一手核实并在此定案。）
