# Design: harness-entry-doc-consistency

## Context

本 change 是文档措辞修复：让 `DEEP_RESEARCH_HARNESS/` 的 Agent-facing 文档与 accepted spec 及目录现实对齐（动机见 proposal.md - Why）。关键约束：

- `DEEP_RESEARCH_HARNESS/` 在 apply 前只读；本 change 的所有 target 编辑都在 apply 阶段按 tasks 执行。
- collision 行为已被 `openspec/specs/research/pre-research-phase-content/spec.md:270` 锁定（hex6 派生、静默记录、不询问）；CLI `instantiate-run-bundle.mjs:113-114` 已存在即报错且永不覆盖。README 的「必须报错停止」「collision suffix 非当前行为」是过期的冲突句。
- WNC-010（`workflow-node-contract/spec.md:275-292`）已声明 instantiation/HITL1 bootstrap status shape 是兼容例外、SHALL NOT 被 phase wording update 静默重写。
- RUE-002（`run-entry/spec.md:34-55`）锁定 RUN.md §0 的指令块内容；RUE-005 的 trigger 语义（human drag/paste/provide）不变。
- 配对文件 `DEEP_RESEARCH_HARNESS/AGENTS.md`/`CLAUDE.md` 必须除头部外逐字节一致，已有 `tests/integration/md/agent-behavior-file-pair-sync-guard.test.mjs` 锁定。

## Goals / Non-Goals

**Goals:**

- 五处文档与 accepted contract 对齐（F-02/F-04/F-05/F-07/F-10），并让对齐结果被确定性回归锁定。
- 删除冲突句与过期清单，而不是新增更长的说明。

**Non-Goals:**

- 不改 Engine、CLI、gates、schema、workflow 定义或任何运行时行为。
- 不新增 checkpoint/state/概念；不引入新的 permission 或 authority。
- 不修 F-01/F-03/F-06/F-08/F-09/F-11（属 C2/C3）；不把 RUN.md 决策表（F-03）纳入本 change。

## Decisions

### D1: F-05 carve-out 的措辞位置与条件（RUE-002）

在 RUN.md §0 的「读到本文件即已选定」段落之后新增一句，条件为**双否定**（无研究意图 **且** 用户未把 RUN.md 作为 entry 提供），避免削弱「已选定则 proceed」的既有规则。目标措辞：

> 若 Agent 是以代码探索、文档阅读等非研究意图自行读到本文件，用户没有研究意图、也没有把本文件作为 entry 提供，则本次阅读不构成 entry 选择，不授权开始 Section 2 的研究 flow。

harness README「触发规则」节同步一句：

> Agent 主动的代码探索/上下文阅读（用户无研究意图、且未把本文件或 RUN.md 作为 entry 提供）不触发本 Harness、不选择 run。

备选（仅改 README、不动 RUN.md）被否决：RUN.md §0 的「读到即选定」是过度声明的主现场，只改 README 会留下两份互相冲突的入口语义。备选（改 RUE-005 的 trigger requirement）被否决：human trigger 语义本无问题，carve-out 属于 §0 指令块的语义范围（RUE-002）。

### D2: F-02 collision 的 canonical 故事（对齐 spec，无 spec delta）

统一为三步故事：CLI 报错退出（永不覆盖，`instantiate-run-bundle.mjs` 事实）→ Agent 派生 `-<hex6>` 后缀 collision-safe 名称重试 → 经 trace/log 记录 `silent_degradation`，不询问用户。README 目标措辞：

> 如果目标目录已存在，CLI 报错退出且绝不覆盖；Agent 按 pre-research-phase-content 契约派生带 `-<hex6>` 后缀的 collision-safe 名称重试，经 trace/log 记录，不询问用户。

备选（改 spec）被否决：spec 已与 phase 文档一致，漂移在 README 一侧。备选（README 保持「报错停止」）被否决：与 phase 文档和 spec 双冲突。

### D3: F-04 bootstrap 例外的显式标注（对齐 WNC-010，无行为变更）

phase-instantiation §6 与 phase-hitl1 §6 各加一条标注（不补 enter-phase、不改流程）：

> 兼容例外（WNC-010）：instantiation/HITL1 为 bootstrap status shape 例外，本 phase 不执行 `enter-phase`/`advance-status` handoff；自 setup 起的后续 phase 按其 §6 常规 handoff 执行。

start-research「每个 phase node 是完整 instruction sheet」句尾补「（instantiation/HITL1 为 WNC-010 声明的 bootstrap 兼容例外，已在其 §6 标注）」。备选（给两个 phase 补 enter-phase）被否决：WNC-010 明确 SHALL NOT 静默重写。

### D4: F-07 surface 清单改「核心名 + 目录指针」（防再漂移）

README「当前可执行 surface」不再枚举全部 24 个工具，改为：

> `cli/`：当前 Harness-level CLI，核心工具包括 `instantiate-run-bundle.mjs`、`validate-bundle.mjs`、`inspect-bundle.mjs`、`operate-queue.mjs`、`operate-work-unit.mjs`、`enter-phase.mjs`、`advance-status.mjs`、`check-reentry.mjs`、`audit-phase-status.mjs`、`log-event.mjs`；完整清单以 `cli/` 目录为准。
> `cli/gates/`：当前每个 gate 一个外部 CLI wrapper（`check-gate-*.mjs`，当前 10 个）。

同时把「Workflow Foundation / runtime surface」节现有的 `cli/gates/` 行（README:90）移入「当前可执行 surface」节——该节的 foundation 框架已不符合 cli/gates 的当前状态；foundation 节保留 `engine/gates/` 的 target 表述。

备选（枚举全部 24 个）被否决：静态枚举正是本次漂移的根因；目录指针 + C3 的目录一致性 checker 才可长期防漂移。`engine/gates/` 保留 target 表述（目录确实不存在）。

### D5: F-10 入口 bullet 消歧（保持 pointer-only 纪律）

harness AGENTS.md bullet 2 的「停止；没有 explicit candidate 才读 RUN.md」拆成显式两句，目标措辞：

> 显式 candidate 缺少任一文件即报告 `unsupported_current_entry_contract` 并停止。这是 preflight 失败，不等于「没有 explicit candidate」——禁止因此 fallback 读 `RUN.md`、新建或另选 bundle。只有用户从一开始就没有提供任何 existing candidate 时，才读 `RUN.md`。

CLAUDE.md 同步。该措辞不重述选择流程（满足 RUE-006 pointer 纪律：「A pointer SHALL NOT weaken, reorder, or paraphrase the canonical rule's outcomes」——本句只澄清负分支，不重述分支本身）。

### D6: 验证方式（verification-routing integration）

新增 `tests/integration/md/harness-entry-doc-consistency.test.mjs`，用 `node:test` + `node:assert` 做静态子串断言：锁定 D1-D5 各目标措辞的最小 canonical 短语存在，并断言过期句（「必须报错停止」「collision suffix 是 workflow-foundation target」「包括 `instantiate-run-bundle.mjs`、`validate-bundle.mjs`、`inspect-bundle.mjs`、`operate-queue.mjs`」的旧四工具封闭清单表述）已移除。不断言整段文本，避免后续合法微调让测试过脆。该测试属 integration（跨文件确定性事实、真实仓库文件、无网络/Agent），与既有 pair-sync guard 同层。

## Risks / Trade-offs

- [carve-out 被误读为「用户已提供 entry 也可以不执行」] → 条件写死双否定；「已选定则 proceed、不再问」原句保留不动；集成测试锁定「不构成 entry 选择」句紧邻「已选定」语境。
- [精确子串测试过脆，阻碍后续合法文档修改] → 只断言最小 canonical 短语与过期句移除，不断言整段；C3 的通用 checker 接管长期防漂移，本测试只锁本 change 的语义。
- [RUE-002 delta 与 RUE-005「Reading RUN.md means selected」场景并存产生歧义] → RUE-005 的 "as run entry" 限定词保持原样；delta 只改 RUE-002 块，并新增 scenario 明确双否定条件。
- [harness AGENTS/CLAUDE 措辞改动破坏 RUE-006 pointer 纪律] → 新措辞只澄清负分支、不重述选择流程；apply 时跑 check-project-specs 与既有 taxonomy checker 验证。
