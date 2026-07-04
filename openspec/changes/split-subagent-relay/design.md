## Context

### 当前状态

`subagent-relay.mjs`（1683 行）是 Subagent Relay Engine 的唯一实现，职责已在文件头注释中划清：

```
stage → spawn → ingest → commit → collect/merge → fork/repair
```

内部天然分为 5 段（按当前行号）：

| 段 | 行号（约） | 行数 | 职责 |
|----|-----------|------|------|
| A | 76–125 | ~50 | trace/logger 单例（`ensureTrace`, `logEvent`, `traceEntry`） |
| B | 127–274 | ~140 | Zod schemas（public + internal） |
| C | 269–372 | ~82 | fork 分类、`dispatchMap`、`getDispatchMap` |
| D | 376–869 | ~493 | slot 创建、prompt/task.md、manifest、staging |
| E | 871–1369 | ~498 | status 状态机、receipt 校验、`commitSlotResult` |
| F | 1370–1683 | ~313 | collect/merge/repair、高层 pipeline、`resolveSlotFromResultRef` |

段 C（fork/dispatch，~188 行）与段 F 中的 repair 诊断块（1412–1517，~106 行）同属 fork/repair 域。**定案：独立 `subagent-relay-fork-dispatch.mjs`**（~294 行）；A+B 为 `subagent-relay-schemas-trace.mjs`（~209 行）。行数低于 200 可接受——**逻辑切分优先于行数指标**。

### 历史教训

1. **拆分难度高、曾中途放弃**：根因是子模块间隐式共享 `_trace`/`_log` 模块级单例，以及 pipeline 函数横切多个域；若单例复制则 trace 断裂，若 circular import 则 ESM 初始化顺序出问题。（注：git 中无独立 revert commit；此叙述来自工程经验，成功对照为 gate-helpers 拆分。）
2. **成功先例**：`gate-helpers.mjs`（commit `074736ee`）— 2402 行 monolith → 80 行 barrel + 5 个 `gate-helpers-*.mjs`，外部 import 零改动，1091 tests pass。本 change **复用 barrel 模式**；子模块数为 **5**，与 pipeline 阶段一一对应。

### 约束

- 单文件 **约 200–800 行**（barrel 除外）— **软参考**，不为达标改边界；明显过小（<100）或过大（>1000）才在 review 时追问。
- 零行为变化；不新增 npm 依赖。
- Canonical import：`../engine/subagent-relay.mjs`（barrel）。
- `queue-manager.mjs` 已 import `SlotResult`, `validateRuntimeReceipt`, `resolveSlotFromResultRef` — barrel 必须继续 export。

## Goals / Non-Goals

**Goals:**

1. **5 个子模块 + 1 个 barrel**，按 pipeline 阶段划分；行数仅作 sanity check。
2. `schemas-trace`（trace + Zod）与 `fork-dispatch`（fork/repair 诊断）**分文件**，不为一凑行数合并。
3. trace/logger 单例 **唯一** 归属 `schemas-trace`，其他模块 import 使用。
4. 全量 `tests/engine/subagent-relay.test.mjs` + `tests/engine/queue-manager.test.mjs` 回归 0 fail。
5. 子模块间 **无 circular import**（依赖图 DAG）。

**Non-Goals:**

- 不改函数签名、schema 字段、trace 事件名、on-disk 路径。
- 不改 workflow / phase MD（全仓 0 处 inline import；runtime 经 `drive-relay-slot` CLI）。
- 不拆 `queue-manager.mjs`、`gate-helpers-core.mjs` 或其他大文件。
- 不 mirror 拆分 `tests/engine/subagent-relay.test.mjs`（可后续做）。
- 不引入 `subagent-relay/index.mjs` 替代 barrel 路径。

## Decisions

### Decision 1: 目录布局 — 5 个扁平子模块 + barrel

**选**（行数为 apply 前 `sed` 实测，仅供参考）:

```
DPT_FRAMEWORK/engine/
  subagent-relay.mjs                      # barrel re-export (~120 行)
  subagent-relay-schemas-trace.mjs        # ~209 — trace/logger + Zod schemas + path helpers
  subagent-relay-fork-dispatch.mjs        # ~294 — fork/dispatch + converge repair + 诊断块
  subagent-relay-stage.mjs                # ~446
  subagent-relay-slot-runtime.mjs         # ~464
  subagent-relay-collect-pipeline.mjs     # ~242 — collect/merge/pipeline（repair 块已迁出）
```

**不选** 为凑 200 行把 fork 并入 schemas-trace — 职责混杂，违背 pipeline 切分。

**不选** `engine/subagent-relay/` 子目录 — 扁平 `subagent-relay-*.mjs` 对齐 gate-helpers 先例。

### Decision 2: 模块边界与依赖图（DAG）

#### `subagent-relay-schemas-trace.mjs` (~209) — foundation

**源码行域**: 76–125 + 127–274（+ 域内 path helpers / `MAX_CONCURRENT_SUBAGENTS`）

- **含**: 全部 Zod schema（public + sibling-only internal）；trace/logger 单例（sibling export）；路径 helpers（`waveDirName`, `slotDirName`, `nextWaveIndex`）。
- **Import**: `./trace.mjs`, `./logger.mjs`, `zod`（与 monolith 相同）。

#### `subagent-relay-fork-dispatch.mjs` (~294) — fork/repair

**源码行域**: 291–372 + 376–386 + 1412–1517

- **含**: `ForkStep` + fork 步骤常量；`dispatchMap` / `getDispatchMap`；`classifyBranch`, `forkRouter`, `convergeRepair`, `validateAndDiagnose`, `inspectFailure`；repair 诊断块。
- **Import**: `./subagent-relay-schemas-trace.mjs` — schemas、`ensureTrace` 等（若需 trace）。

#### `subagent-relay-stage.mjs` (~446)

**源码行域**: 397–842（`createSlot` 至 `loadSlotByManifestEntry`）

- **Import**: `./subagent-relay-schemas-trace.mjs` + `./subagent-relay-fork-dispatch.mjs` — schemas、`classifyBranch`, `getDispatchMap()`, trace helpers, `MAX_CONCURRENT_SUBAGENTS`, internal `SlotConfig`/`SubagentSlot`/…
- **`getDispatchMap()` 策略（已定）**: `stageSubagentSlots` 内 L748 改为 `const map = customDispatchMap || getDispatchMap()`（**必须** — `drive-relay-slot.mjs` 只传 2 个参数，第三参为 `undefined`）。

#### `subagent-relay-slot-runtime.mjs` (~464)

**源码行域**: 871–1334

- **Import**: schemas-trace + stage（`buildSpawnPrompt` only）。
- **不得**被 stage import（单向：slot-runtime → stage）。

#### `subagent-relay-collect-pipeline.mjs` (~242)

**源码行域**: 1336–1411 + 1518–1683（repair 诊断块在 fork-dispatch）

- **Import**:
  - schemas-trace — `ensureTrace`, `traceEntry`, `logEvent`, `SubagentWorkflowState`
  - fork-dispatch — `forkRouter`, `convergeRepair`, `validateAndDiagnose`, `getDispatchMap()`
  - stage — `stageSubagentSlots`
  - slot-runtime — **`readSlotResult`**（`collectResults` L1339 **硬依赖**，非 optional）
  - `./helpers/ref-count.mjs` — `isCountable`（`mergeResults`）
- **`forkAndStageSubagents`**: L1522 改为 `customDispatchMap || getDispatchMap()`；L1542 继续把 resolved `map` 传给 `stageSubagentSlots(state, baseDir, map)`。

**依赖图**（无 cycle）:

```
trace.mjs / logger.mjs / ref-count.mjs
         ↓
schemas-trace (foundation)
    ↓
fork-dispatch
    ↓           ↘
  stage      collect-pipeline
    ↓           ↗
slot-runtime ──┘
    ↑
collect-pipeline (readSlotResult)
```

### Decision 3: Barrel 契约

- 保留文件头 role/pipeline 注释 + Sub-modules 列表（参照 `gate-helpers.mjs`）。
- Re-export **全部 32 个** public export（`rg '^export ' subagent-relay.mjs`；**不以**文件头 L63–74 注释为唯一依据）。
- sibling-only 符号（`ensureTrace`, internal schemas 等）不进入 barrel。

### Decision 4: 实施策略 — 渐进 re-export，step 8 变纯 barrel

1. Step 3–8：每迁出一个子模块，**当步**在 `subagent-relay.mjs` 末尾追加 `export { … } from './subagent-relay-….mjs'` 并从 monolith 删除已迁代码；测试始终 `import … from 'subagent-relay.mjs'`。
2. Step 9：删除 monolith 残留实现，仅留 barrel 头注释 + re-export 块。
3. 每步跑 `node --test tests/engine/subagent-relay.test.mjs`；step 7 起加 queue-manager test。

**不选** big-bang 五文件复制后一次性改 import。

### Decision 5: export 分层

| 层级 | 内容 |
|------|------|
| barrel（32 个） | 与 monolith `^export` 一一对应 |
| sibling-only | `ensureTrace`, `traceEntry`, `logEvent`, internal Zod schemas |
| 子模块 internal | `LIFECYCLE_EVENT_SPECS`, `failedResultForSlot`, `serializeState`, `forkMap` 等 |

## Risks / Trade-offs

| 风险 | 缓解 |
|------|------|
| trace 单例复制 | 仅 foundation 模块定义；grep `_trace =` |
| stage ↔ slot-runtime cycle | slot-runtime → stage 单向 |
| collect 遗漏 readSlotResult | task 7.4 显式 import slot-runtime |
| barrel 漏 export | 对照 32 个 `^export` + 全量 test |
| 中间态 monolith 半空 | 每步 re-export 后再删代码；step 8 验收无 inline 实现 |
| schemas-trace 略低于 200 行 | 逻辑上已是完整域；不强行合并 fork |

## Migration Plan

1. Apply 按 tasks.md。
2. 验证：`node --test tests/engine/subagent-relay.test.mjs tests/engine/queue-manager.test.mjs` + `validate-subagent-logging-contract.mjs`。
3. 回滚：revert 整个 apply commit 序列；避免 partial barrel 长期留存。
4. Archive：sync spec；登记 FRE-004。

## Impact Surface（全仓扫描，2026-07-04）

### 结论

| 层级 | 改 import？ | 数量 |
|------|------------|------|
| Production JS engine | **否** | 1（`queue-manager.mjs`） |
| Production CLI | **否** | 1（`drive-relay-slot.mjs`） |
| Workflow / phase MD | **否** | 0 inline import |
| Regression tests + fixtures | **否** | 4 |
| MD 静态契约 CLI | **须仍 PASS** | 1 |
| Experiment playbooks | **否** | 9 case |

Barrel 策略下 **MD 零触碰**（SNC-003）。

### Runtime 链

```
phase-wave*.md → shared-subagent-protocol.md §1.5
  → node …/drive-relay-slot.mjs stage|commit|merge
    → import subagent-relay.mjs (barrel)
      → re-export from subagent-relay-*.mjs
```

### Production barrel export union

| 消费者 | 符号 |
|--------|------|
| `queue-manager.mjs` | `SlotResult`, `validateRuntimeReceipt`, `resolveSlotFromResultRef` |
| `drive-relay-slot.mjs` | `stageSubagentSlots`, `stageReplacementSlot`, `recordAgentSpawnRequested`, `loadSlotByManifestEntry`, `ingestAgentReceipt`, `commitSlotResult`, `collectAndMergeSubagentResults` |

### Tests

| 文件 | 说明 |
|------|------|
| `tests/engine/subagent-relay.test.mjs` | 32 public exports |
| `tests/engine/queue-manager.test.mjs` | 7 符号集成 |
| `tests/integration/md/subagent-logging-contract.test.mjs` | 动态 import `stageSubagentSlots` |
| `tests/fixtures/DPT_FRAMEWORK/cli/drive-relay-slot.mjs` | CLI 镜像 |

### Apply 验收

```bash
rg '^export ' DPT_FRAMEWORK/engine/subagent-relay.mjs          # 迁移前基线：32
wc -l DPT_FRAMEWORK/engine/subagent-relay-*.mjs               # sanity：无单文件 >1000；<100 仅 review 追问
rg "from ['\"].*subagent-relay-" DPT_FRAMEWORK tests experiments_playbook \
  --glob '*.{mjs,js}' | rg -v 'DPT_FRAMEWORK/engine/subagent-relay'  # 应 0 匹配
node --test tests/engine/subagent-relay.test.mjs tests/engine/queue-manager.test.mjs
node --check DPT_FRAMEWORK/cli/drive-relay-slot.mjs
node DPT_FRAMEWORK/cli/validate-subagent-logging-contract.mjs
node openspec/governance/check-project-reqs.mjs
node openspec/governance/check-project-specs.mjs
```
