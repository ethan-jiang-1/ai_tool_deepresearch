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
| B | 127–267 | ~140 | Zod schemas（public + internal）+ `ForkStep` |
| C | 269–372 | ~100 | fork 分类、`dispatchMap`、`getDispatchMap` |
| D | 376–869 | ~493 | slot 创建、prompt/task.md、manifest、staging |
| E | 871–1369 | ~498 | status 状态机、receipt 校验、`commitSlotResult` |
| F | 1370–1683 | ~313 | collect/merge/repair、高层 pipeline、`resolveSlotFromResultRef` |

### 历史教训

1. **拆分难度高、曾中途放弃**：根因是子模块间隐式共享 `_trace`/`_log` 模块级单例，以及 pipeline 函数横切多个域；若单例复制则 trace 断裂，若 circular import 则 ESM 初始化顺序出问题。（注：git 中无独立 revert commit；此叙述来自工程经验，成功对照为 gate-helpers 拆分。）
2. **成功先例**：`gate-helpers.mjs`（commit `074736ee`）— 2402 行 monolith → 80 行 barrel + 5 个 `gate-helpers-*.mjs`，外部 import 零改动，1091 tests pass。本 change **复用同一模式**。

### 约束

- 单文件 **200–800 行**（用户要求；trace 单段 ~50 行，必须合并，不单独成文件）。
- 零行为变化；不新增 npm 依赖。
- Canonical import：`../engine/subagent-relay.mjs`（barrel）。
- `queue-manager.mjs` 已 import `SlotResult`, `validateRuntimeReceipt`, `resolveSlotFromResultRef` — barrel 必须继续 export。

## Goals / Non-Goals

**Goals:**

1. 5 个子模块 + 1 个 barrel，每文件 200–800 行。
2. 按 pipeline 阶段划分，与文件头注释和 `@impl` 注释对齐。
3. trace/logger 单例 **唯一** 归属一个模块，其他模块 import 使用。
4. 全量 `tests/engine/subagent-relay.test.mjs` + `tests/engine/queue-manager.test.mjs` 回归 0 fail。
5. 子模块间 **无 circular import**（依赖图 DAG）。

**Non-Goals:**

- 不改函数签名、schema 字段、trace 事件名、on-disk 路径。
- 不改 workflow / phase MD（全仓 0 处 inline import；runtime 经 `drive-relay-slot` CLI）。
- 不拆 `queue-manager.mjs`、`gate-helpers-core.mjs` 或其他大文件。
- 不 mirror 拆分 `tests/engine/subagent-relay.test.mjs`（可后续做）。
- 不引入 `subagent-relay/index.mjs` 替代 barrel 路径（避免破坏 canonical path table）。

## Decisions

### Decision 1: 目录布局 — 扁平 `subagent-relay-*.mjs` + 根级 barrel（对齐 gate-helpers）

**选**:

```
DPT_FRAMEWORK/engine/
  subagent-relay.mjs                      # barrel re-export (~100 行)
  subagent-relay-schemas-trace.mjs        # ~320 行
  subagent-relay-fork-dispatch.mjs        # ~200 行
  subagent-relay-stage.mjs                # ~490 行
  subagent-relay-slot-runtime.mjs         # ~500 行
  subagent-relay-collect-pipeline.mjs     # ~310 行
```

与 `helpers/gate-helpers-core.mjs` 等同理：**主模块名 + 减号 + 职责后缀**，全部落在 `engine/` 根下，无子目录。

**不选** `engine/subagent-relay/` 子目录 — 本 change 暂不用；扁平命名与 repo 现有 gate-helpers 先例一致，import 路径更短，glob/搜索更直观。

**不选** `engine/helpers/subagent-relay-*.mjs` — relay 是顶级 engine，不是 gate helper。

**不选** 无前缀的 `relay-*.mjs` — 与 `subagent-relay.mjs` 命名空间不一致。

### Decision 2: 模块边界（对齐 pipeline + 行数预算）

#### `subagent-relay-schemas-trace.mjs` (~320)

- **含**: 全部 Zod schema 定义；**public exports**（`Branch`, `SlotStatus`, `SlotResult`, …）与 **sibling-only exports**（`SubagentSlot`, `SlotConfig`, `SlotStatusFile`, `RuntimeReceiptEvent`, `AgentMetadata`, `ManifestSlotEntry`, `RuntimeMode` 等 parse 用 internal schema）；`ForkStep` class；`MAX_CONCURRENT_SUBAGENTS`；trace/logger 单例（`ensureTrace`, `traceEntry`, `logEvent`, `logEventCliPath` — **sibling export，barrel 不 re-export**）；路径 helper（`waveDirName`, `slotDirName`, `nextWaveIndex`）；`__dirname` / `logEventCliPath` 依赖。
- **Import**: `./trace.mjs`, `./logger.mjs`（现有 monolith 顶部依赖不变）。
- **理由**: trace 单例必须唯一；internal schema 被 stage/runtime 多处 `*.parse()` 依赖，必须在同一模块 export 给 sibling（barrel 可不 re-export）。

#### `subagent-relay-fork-dispatch.mjs` (~220)

- **含**: `classifyBranch`, `forkRouter`, `forkMap`, `dispatchMap`, `getDispatchMap`, `convergeRepair`, `defaultRepairStep`, `serializeState`, `validateAndDiagnose`, `inspectFailure`.
- **Import**: `./subagent-relay-schemas-trace.mjs`（`SubagentWorkflowState`, `ForkStep`, `classifyBranch` 用到的 schema 等）。
- **Sibling export**: `dispatchMap` **或** apply 时把 monolith 内 `customDispatchMap || dispatchMap` 统一改为 `customDispatchMap || getDispatchMap()`（等价、更干净）——二选一，**不得**让 stage/collect-pipeline 与 fork-dispatch 形成 circular import。

#### `subagent-relay-stage.mjs` (~490)

- **含**: `createSlot`, `resultJsonSchemaForSlot`, lifecycle prompt 模板, `taskMarkdownForSlot`, `buildSpawnPrompt`, `materializeSlotDir`, `createDispatchManifest`, `stageSubagentSlots`, `stageReplacementSlot`, `loadSlotByManifestEntry`.
- **Import**: `./subagent-relay-schemas-trace.mjs`；`./subagent-relay-fork-dispatch.mjs` 的 **`classifyBranch`** + **`getDispatchMap()`**（`stageSubagentSlots` L748–749 现用 `dispatchMap` 与 `classifyBranch`）。
- **不得** import slot-runtime。

#### `subagent-relay-slot-runtime.mjs` (~500)

- **含**: `slotTransitions`, `readSlotStatus`, `writeSlotStatus`, `recordAgentSpawnRequested`, `readReceiptEvents`, `validateRuntimeReceipt`, `ingestAgentReceipt`, `validateSlotResult`, `commitSlotResult`, `markSlotFailed`, `readSlotResult`, `failedResultForSlot`.
- **Import**: `./subagent-relay-schemas-trace.mjs`, `./subagent-relay-stage.mjs`（`buildSpawnPrompt`）。
- **Cycle 缓解**: `recordAgentSpawnRequested` 调用 `buildSpawnPrompt` — stage 不得 import slot-runtime。依赖方向：slot-runtime → stage（单向）。DAG: schemas-trace ← fork-dispatch ← stage ← slot-runtime ✓

#### `subagent-relay-collect-pipeline.mjs` (~310)

- **含**: `collectResults`, `mergeResults`, `forkAndStageSubagents`, `collectAndMergeSubagentResults`, `resolveSlotFromResultRef`.
- **Import**: schemas-trace（trace/helpers）；fork-dispatch（`forkRouter`, `convergeRepair`, `classifyBranch`, `getDispatchMap()`）；stage（`stageSubagentSlots`）；slot-runtime（`commitSlotResult` 等若 pipeline 内联调用——按剪切后实际依赖）；`./helpers/ref-count.mjs` 的 `isCountable`（`mergeResults` 现 L83 import，**跨 engine 依赖须保留**）。
- **理由**: 编排层集中；`forkAndStageSubagents` L1522 同样依赖 `dispatchMap`/`forkRouter`/`convergeRepair`。

### Decision 3: Barrel 契约 — 与 gate-helpers 相同

`subagent-relay.mjs` 仅保留：

- 文件头 role/pipeline 注释（canonical 文档）
- `export { … } from './subagent-relay-….mjs'` 列表
- **不** re-export 内部-only 符号（`SubagentSlot`, `SlotConfig`, `ensureTrace` 等保持 internal）

现有 **全部 public export** 必须保留（以 `rg '^export ' subagent-relay.mjs` 为准，当前 **32 个**；文件头 L63–74 注释**不完整**，缺 `OutputFileRole`, `OutputFileEntry`, `AgentOutputDeclarationSchema`, `writeSlotStatus`, `ingestAgentReceipt`, `collectResults`, `resolveSlotFromResultRef` 等——**不得以注释为唯一清单**）。

### Decision 4: 实施策略 — 自底向上 + 每步全量测试

参照 gate-helpers 成功路径：

1. 创建空子模块 + barrel skeleton（barrel 先 re-export 原 monolith — 可选，或一步到位）。
2. **实际推荐**：自 schemas-trace 起逐段剪切，每完成一个模块跑 `node --test tests/engine/subagent-relay.test.mjs`。
3. 最后删除 monolith 内已迁出代码，barrel 切换为子模块 re-export。
4. 跑 queue-manager 集成测试确认 import 链。

**不选** big-bang 复制 5 文件后一次性改 import — 这正是历史上回滚的原因。

### Decision 5: 内部符号 export 策略

- **Export 给 barrel 的**：上述 32 个 public export（与 monolith `^export` 一一对应）。
- **仅 sibling export、barrel 不 re-export**：`ensureTrace`, `traceEntry`, `logEvent`；internal Zod schema（`SubagentSlot`, `SlotConfig`, …）；若未采用 `getDispatchMap()` 统一策略则还包括 `dispatchMap`。
- **仅子模块 internal**：`LIFECYCLE_EVENT_SPECS`, `failedResultForSlot`, `serializeState`, `defaultRepairStep`, `forkMap` 等。

## Risks / Trade-offs

| 风险 | 缓解 |
|------|------|
| trace 单例被复制到多模块 | 强制只在 `subagent-relay-schemas-trace.mjs` 定义；code review grep `_trace =` |
| stage ↔ slot-runtime circular import | 依赖方向：slot-runtime → stage（单向）；stage 不得 import slot-runtime |
| 剪切时遗漏 export | barrel 对照 `rg '^export ' subagent-relay.mjs`（32 个）；跑 subagent-relay + queue-manager tests |
| 行数漂移出 200–800 | apply 完成后 `wc -l` 验收；若 stage/slot-runtime 超 800，二次切分（本 design 预估在范围内） |
| 行为回归 | 零逻辑改动原则；仅移动代码；测试不变 |

## Migration Plan

1. **Apply 阶段**（`/opsx:apply`）：按 tasks.md 自底向上迁移。
2. **验证**：`node --test tests/engine/subagent-relay.test.mjs tests/engine/queue-manager.test.mjs`
3. **回滚**：按 task 分段 commit 或单次 squash；若失败则 revert 整个 apply PR/commit 序列，**避免** partial barrel 状态长期留存。
4. **Archive**：sync delta spec 到 main；登记 FRE-004。

## Open Questions

- **dispatchMap 访问策略**（apply 前择一写入 task 5.4 / 7.4）：
  - **A（推荐）**：stage / `forkAndStageSubagents` 内 `dispatchMap` → `getDispatchMap()`，fork-dispatch 不 sibling-export `dispatchMap`。
  - **B**：fork-dispatch sibling-export `dispatchMap`，stage/collect-pipeline 直接 import（与 Decision 5 internal 表述冲突，需改措辞）。

## Impact Surface（全仓扫描，2026-07-04）

### 结论先行

| 层级 | 是否需要改 import / 路径 | 数量 |
|------|--------------------------|------|
| **Production JS 直接 import** | **否**（barrel 不变） | **2 文件** |
| **Production CLI** | **否** | 1（`drive-relay-slot.mjs`） |
| **Workflow / phase MD** | **否** | 0 处 `import`；全走 CLI |
| **Guidelines / OpenSpec / backlog MD** | **否**（文档引用路径不变） | 若干 prose |
| **Regression tests** | **否**（import 路径不变） | 4 文件（含 integration + fixtures CLI 镜像） |
| **Experiment playbooks MD** | **否**（import 路径不变） | 9 case 文件 |

**Barrel 策略下，MD 是零触碰面**——这是本 repo 架构刻意设计的结果（SNC-003：Phase Agent 禁止 inline JS 直调引擎）。

### Runtime 调用链（MD 实际怎么用到 relay）

```
phase-wave0.md / phase-wave1.md / phase-wave2.md
  └─ 读 shared-subagent-protocol.md §1.5
       └─ bash: node DPT_FRAMEWORK/cli/drive-relay-slot.mjs stage|commit|merge
            └─ drive-relay-slot.mjs
                 └─ import from ../engine/subagent-relay.mjs  ← barrel，路径不变
                      └─ (拆分后) re-export from subagent-relay-*.mjs
```

`queue-manager.mjs` 在 delegated `complete()` 时间接依赖：
`SlotResult` / `validateRuntimeReceipt` / `resolveSlotFromResultRef` ← 同样从 barrel import。

**Workflow MD 里没有任何 `import … subagent-relay.mjs` 代码块**（已 grep `DPT_FRAMEWORK/workflows/**/*.md`，0 匹配）。

### Production JS 直接消费者（必须 barrel export 完整）

| 文件 | import 符号 |
|------|-------------|
| `DPT_FRAMEWORK/engine/queue-manager.mjs` | `SlotResult`, `validateRuntimeReceipt`, `resolveSlotFromResultRef` |
| `DPT_FRAMEWORK/cli/drive-relay-slot.mjs` | `stageSubagentSlots`, `stageReplacementSlot`, `recordAgentSpawnRequested`, `loadSlotByManifestEntry`, `ingestAgentReceipt`, `commitSlotResult`, `collectAndMergeSubagentResults` |

### Tests 直接消费者

| 文件 | 说明 |
|------|------|
| `tests/engine/subagent-relay.test.mjs` | 主回归（27 个 export 符号） |
| `tests/engine/queue-manager.test.mjs` | 集成：`stageSubagentSlots`, `commitSlotResult`, `writeSlotStatus`, `ingestAgentReceipt`, `createSlot`, `SlotResult`, `MAX_CONCURRENT_SUBAGENTS` |
| `tests/integration/md/subagent-logging-contract.test.mjs` | 动态 import `stageSubagentSlots` |
| `tests/fixtures/DPT_FRAMEWORK/cli/drive-relay-slot.mjs` | fixture 镜像 CLI（同 production import） |

### MD 静态契约守卫（非 runtime import，但 apply 后应仍 PASS）

| 文件 | 作用 |
|------|------|
| `DPT_FRAMEWORK/cli/validate-subagent-logging-contract.mjs` | 扫描 phase/role/protocol MD，禁止 `stageSubagentSlots(` 等直调措辞（SNC-003 防回归） |

Apply 后跑此 CLI，确认 **workflow MD 仍 driver-first**（与「MD 零改」假设一致）。

### Experiment playbooks（MD 内嵌 JS import，路径均为 `…/subagent-relay.mjs`）

| 目录 | case 文件数 | import 方式 |
|------|-------------|-------------|
| `exp_subagent/` | 4 | 静态 `import` |
| `exp_system-logging/` | 2 | 静态 / 动态 `import` |
| `exp_engine-boundary/` | 3 | 动态 `import()` |
| `exp_wfn_wave1/` | 1 | 仅注释提及，无 import |

### MD 文档引用（prose only，非代码 import）

Workflow / shared 节点 MD 中**按名称**提及 engine 或函数（拆分后语义不变，**无需改 MD**）：

- **路径引用**：`phase-wave0.md`, `phase-wave1.md`, `shared-subagent-protocol.md`, `shared-schemas.md` → `DPT_FRAMEWORK/engine/subagent-relay.mjs`（canonical path 不变）
- **CLI 引用**（真正 runtime 路径）：`drive-relay-slot.mjs` stage/commit/merge — 出现在 10+ 个 phase/shared MD
- **函数名 prose**：`stageSubagentSlots`, `commitSlotResult`, `collectAndMergeSubagentResults`, `ingestAgentReceipt` — 出现在 `shared-subagent-protocol.md` 等，说明 driver 内部行为
- **常量引用**：`MAX_CONCURRENT_SUBAGENTS` — `shared-subagent-protocol.md` §2

Guidelines（`agentic-subagent-mechanism.md` 等）和 OpenSpec main specs 同理——文档引用，无 runtime import。

### 文档漂移（非阻塞，可选后续清理）

- `_backlog/` 中多处 **行号引用**（如 `subagent-relay.mjs:390`）拆分后会 stale
- `guidelines/agentic-subagent-mechanism.md` 写「1067 lines」——数字会变
- 这些**不影响 runtime**；可在 apply 后顺手更新，或单独 docs change

### Apply 验收 grep（防遗漏 export）

```bash
# 1. 所有 JS import 仍指向 barrel（不应出现 subagent-relay-*.mjs 外部 import）
rg "from ['\"].*subagent-relay" --glob '*.{mjs,js}' DPT_FRAMEWORK tests experiments_playbook

# 2. barrel 必须 re-export 以下 union（production + test 用到的全部符号）
#    见 subagent-relay.test.mjs L9-37 + drive-relay-slot.mjs L30-38 + queue-manager.mjs L65

# 3. 回归
node --test tests/engine/subagent-relay.test.mjs tests/engine/queue-manager.test.mjs
node --check DPT_FRAMEWORK/cli/drive-relay-slot.mjs
```

