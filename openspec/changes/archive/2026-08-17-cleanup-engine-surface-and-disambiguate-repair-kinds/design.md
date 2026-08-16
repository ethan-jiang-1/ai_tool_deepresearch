# Design: cleanup-engine-surface-and-disambiguate-repair-kinds

## Goals

让引擎代码重新符合「唯一真相源 + 无死重 + 可导航」教义，并消解 `repair_kind` 三套同名枚举的歧义：retire 死代码、收敛 enum/schema、常量化 CLI 路径、给 god modules 加导航、把 file-observability 面字段改名 `repair_directive`。除 file-observability 字段名的可观察重命名外，不改任何运行行为。

## Non-Goals

- 不改 gate/phase 面与 work-unit 面的 `repair_kind`（各自语义与枚举不变）。
- 不拆 god module 文件（只加导航注释；拆分 deferred）。
- 不改 CLI exit helper 语义（deferred）。

## Decisions

### D1 — retire 死代码（F-09）

- 删除 `engine/esm-dirname.mjs` + `tests/engine/esm-dirname.test.mjs`（生产零引用；engine 各处在手写 `fileURLToPath`，与其「Do NOT hand-roll」注释矛盾）。
- `queue-manager-core.mjs:226` `advice()`、`queue-manager-lifecycle.mjs:557` `makeItem`、`queue-manager-window.mjs:16` `rank()`、`queue-manager-ledger.mjs:8` `OutputDeclarationLedgerRecord`：移除导出（全仓无 import）。
- `work-unit-repair-vocabulary.mjs` 的 `WORK_UNIT_REPAIR_KINDS`/`REPAIR_KIND_CLI_VERB` 保留（测试锁定专用），头注释明确标注。
- 新增 `tests/engine/dead-export-regression.test.mjs`：静态断言上述符号不再出现于任何 import（esm-dirname 模块不存在；advice/makeItem/rank/OutputDeclarationLedgerRecord 不被引用）。

### D2 — enum 收敛（F-10）

`queue-manager-core.mjs:56-57` 本地 `QueueHealth`/`StopAuthorizationState` 删除，改 `import { QueueHealth, StopAuthorizationState } from '../schema/enums.mjs'`（canonical 单点）。`QueueStateSchema`（本地）与 `contracts/queue.mjs` `QueueSchema` 的差异在本地 schema 处加注释说明各自用途（本地是 queue-manager 的运行时健康投影，contracts 是 bundle 控制文件契约），不合一（合一超出本 change 风险面）。

### D3 — helper 去重（F-10）

`submitRerun` 在 `work-unit-submit-integrity.mjs:15` 与 `work-unit-attempt-disposition.mjs:15` 重复实现：保留一份（以 `attempt-disposition` 为 owner），另一处 import 之。

### D4 — CLI 路径常量化（F-11）

29 处硬编码 `DEEP_RESEARCH_HARNESS/cli/operate-work-unit.mjs` / `operate-queue.mjs` 收敛到 `work-unit-constants.mjs` 导出的 `CLI_OPERATE_WORK_UNIT` / `CLI_OPERATE_QUEUE` 常量（`logCliPath()` 已有实现可复用或对齐）。

### D5 — 导航契约（F-20/F-21，纯注释）

- god modules 加文件头契约注释（职责 + 公共 API 位置 + 分节目录）+ section banner：`work-unit-submit.mjs`、`work-unit-lifecycle.mjs`、`work-unit-supersession.mjs`、`consistency-validator.mjs`、`work-unit-validation.mjs`、helpers `canonical-topic-state.mjs`、`gate-helpers-core.mjs`、`wave-depth-contracts.mjs`、`gate-helpers-checks.mjs`、`artifact-persistence.mjs`、`wave-contract-evaluators.mjs`、`handoff-helpers.mjs`、`return-map.mjs`、`file-observability.mjs`。
- 四投影模块 + `work-unit-assignment-contract.mjs` 各加一句「输入→输出→谁消费」头注释。

### D6 — repair_directive 改名（F-22）

- `engine/helpers/file-observability.mjs` 发射字段 `repair_kind` → `repair_directive`（6 值不变）。
- 消费点 `cli/check-reentry.mjs` 同步读 `repair_directive`。
- `CONTEXT.md:59` file-observability 面枚举改为 `repair_directive`。
- `bundle/file-observability` spec ADDED FIO-008（已写）锁定字段名。
- 新增 `tests/integration/md/repair-directive-lock.test.mjs`：断言 emitter/consumer 无 file-observability `repair_kind` 字面量、含 `repair_directive`；CONTEXT 三套枚举区分句存在。

### D7 — CONTEXT 指针（F-03/F-23）

- `CONTEXT.md:58` work-unit 面权威指针补 `engine/work-unit-repair-vocabulary.mjs`（改「RUN.md 决策表 + 锁定测试」为「`work-unit-repair-vocabulary.mjs` 导出 + RUN.md 决策表 + 锁定测试」）。
- C2/C3/C5：CONTEXT 已有 compact 行（:60-64），无需新内容；验证指针 owner 仍准确（research-styles / post-final-recovery / content-delivery-phase-content specs 存在）。

## Requirement → 实现映射

| Delta requirement | 实现 surface |
|---|---|
| FIO-008 ADDED | `engine/helpers/file-observability.mjs` + `cli/check-reentry.mjs` 改名 + `tests/integration/md/repair-directive-lock.test.mjs` |

## 简化与语义反思

- 唯一新具名符号 `repair_directive`：读者有界问题「反馈属于哪套 repair 词汇」；区别 = file-observability 面 vs gate/phase、work-unit 面；停止点 = 字段名即归属，不引入新状态。
- Net simplification：删 6 死导出 + 1 死模块 + 1 重复 helper + 29 魔法字符串 + 1 同名歧义；新增仅注释与 3 只读 drift 测试。
- 责任边界：不改 Engine/CLI 行为或 authority；work-unit/gate 面 `repair_kind` 保持不变。
