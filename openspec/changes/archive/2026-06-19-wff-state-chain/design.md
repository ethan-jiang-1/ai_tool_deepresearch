## Context

`wff-skeleton-validation` 的 `--next` flag 临时解决了路由问题，但负担全在 MD controller。本 change 把 Node 间转移从 Controller 剥离到独立的 Transition table 层——Gate 自己问 `askNext()`，Controller 只读响应。

核心约束：chain 和 FSM 必须提供相同的查询接口，文件命名区分实现，Gate 不感知差异。

## Goals / Non-Goals

**Goals:**
- 创建 `transitions.chain.json` — 静态 (gate, state) → next_node 转移表
- 创建 `transition-chain.mjs` — chain 引擎（load、validate、resolve），与 FSM 引擎对等
- 创建 `ask-next.mjs` — 统一分发，根据文件后缀路由到 chain 或 FSM loader
- 8 个 gate CLI 去掉 `--next` flag，改为内部调用 `askNext()`
- manifest.json 去掉 `next` 字段
- 更新 `exp_wff_validation` 两个 playbook

**Non-Goals:**
- 不实现 FSM graph（`.fsm.json` 文件 + FSM loader 已存在）
- 不改变 gate CLI 的 check/inspect/advice 输出形状
- 不改变 Playbook 的 controller 角色

## Decisions

### D1: 文件命名约定 — `transitions.<impl>.json`

**决策**：Transition table 文件命名 `transitions.chain.json` 或 `transitions.fsm.json`。前半段 `transitions` 表示是 transition table，后缀 `.chain.json` / `.fsm.json` 表示实现方式。

```
DPT_FRAMEWORK/workflows/
  transitions.chain.json     ← 当前：静态映射表
  transitions.fsm.json       ← 将来：FSM 状态转移图
```

**理由**：`askNext()` 通过文件名后缀决定 loader——`.chain.json` → `loadChain()`，`.fsm.json` → `loadFSM()`。命名一看看懂，不绑定实现。

### D2: `transitions.chain.json` 结构

**决策**：与 FSM 的 `states.<node>.on.<status>` 语义一致——gate 名作为 key，value 是 `{ state: next_node }` map：

```json
{
  "instantiation-complete": { "passed": "phases/phase-hitl1.md" },
  "hitl1-recorded":        { "passed": "phases/phase-setup.md" },
  "setup-ready":           { "passed": "phases/phase-wave0.md" },
  "wave0-complete":        { "passed": "phases/phase-wave1.md" },
  "wave1-complete":        { "passed": "phases/phase-wave2.md" },
  "wave2-complete":        { "passed": "phases/phase-hitl2.md" },
  "hitl2-recorded":        { "passed": "phases/phase-readiness.md" },
  "readiness-passed":      { "passed": "phases/phase-final.md" }
}
```

**`next_node` 硬约束——必须是可直接加载的 node 文件路径**（如 `phases/phase-hitl1.md`，含子目录前缀 + `.md` 后缀）。MD controller 读 `check.next` 后直接 `assessNode(next, ...)`，零转换、零拼接、零二次查表。Transition table 内部可以用任意状态名组织数据，但 `next_node` 值必须是显式文件路径——不许用内部 ID 让 Controller 再去 mapping。

未匹配的 state 返回 `null`（"不知道"——MD controller 决策）。

**理由**：Gate CLI 知道自己名字（definition JSON 的 `gate` 字段），用它查表最直接。`{ state: next }` map 预留多状态转移空间（`passed`、`failed`、`blocked`）。

### D3: `transition-chain.mjs` — Chain 引擎

**决策**：与 `workflow-fsm.mjs` 对等——提供 Zod schema、`loadChain()`、`resolveTransition()`：

```javascript
// Zod schema — matches D2 JSON shape: { [gate]: { [state]: next_node } }
export const ChainDefinition = z.record(
  z.string().min(1),
  z.record(z.string().min(1), z.string().nullable())
);

// Load and validate
export function loadChain(path) { ... }   // readFileSync + JSON.parse + ChainDefinition.parse

// Pure function: (gate, state) → { next: string|null, found: boolean }
export function resolveTransition(chain, gate, state) { ... }

// Factory: createChain(path) → { askNext(state), current, advance(state), ... }
export function createChain(path, trace?) { ... }
```

`createChain()` 返回与 `Machine` 相似形状的对象（`advance(state)` → 更新 current、写 trace receipt），确保 chain 和 FSM 的接口可互换。

**理由**：FSM 已有 `loadFSM` / `resolveTransition` / `createMachine`。Chain 端提供同名同形的函数——`ask-next.mjs` 分发时无需特殊处理。

### D4: `ask-next.mjs` — 统一分发

**决策**：根据文件后缀分发到对应 loader：

```javascript
import { loadChain, resolveTransition as resolveChain } from './transition-chain.mjs';
import { loadFSM, resolveTransition as resolveFSM } from './workflow-fsm.mjs';

export function askNext(path, gate, state) {
  if (path.endsWith('.chain.json')) {
    const chain = loadChain(path);
    const result = resolveChain(chain, gate, state);
    return result.found ? result.next : null;
  }
  if (path.endsWith('.fsm.json')) {
    const fsm = loadFSM(path);
    const result = resolveFSM(fsm, gate, state);
    return result.action === 'advance' ? result.next : null;
  }
  throw new Error(`Unknown transition format: ${path}`);
}
```

单函数，无状态。Gate CLI 通过 `--transitions` flag 接收路径（见 D5），传给 `askNext()`。将来换 FSM 只需改 flag 值指向 `.fsm.json`——Gate 零改动。

**理由**：Gate 只认 `askNext(path, gate, state)`——不认文件格式。

### D5: Gate CLI 适配 + 响应形状

**决策**：Gate CLI 通过 `--transitions <path>` flag 接收 transition table 路径——与 `--bundle` 同一个模式：外部告诉 gate 数据在哪，gate 不自己猜。

```bash
check-gate-instantiation-complete.mjs --bundle $B --transitions DPT_FRAMEWORK/workflows/transitions.chain.json
```

默认值：`DPT_FRAMEWORK/workflows/transitions.chain.json`（`--transitions` 可选）。

Output shape：

```json
{
  "check": {
    "passed": true,
    "gate": "instantiation-complete",
    "next": "phases/phase-hitl1.md"
  },
  "inspect": [],
  "advice": []
}
```

`check.next` 来自 `askNext(transitionsPath, definition.gate, state)`——`state` 为 `'passed'`（所有 rule pass）或 `'failed'`（任一 rule fail）。`null` 代表 "不知道下一步"。

实现：

```javascript
import { askNext } from '../../engine/ask-next.mjs';
import { parseArgs } from 'node:util';

const { values } = parseArgs({
  options: {
    bundle: { type: 'string' },
    transitions: { type: 'string' },
    'non-interactive': { type: 'boolean', default: false },
  },
});

const transitionsPath = values.transitions
  || join(REPO_ROOT, 'DPT_FRAMEWORK', 'workflows', 'transitions.chain.json');

// ... evaluate rules ...
const state = allPassed ? 'passed' : 'failed';
const next = askNext(transitionsPath, definition.gate, state);

const result = {
  check: { passed: allPassed, gate: definition.gate, next },
  inspect,
  advice,
};
```

**`check` 三字段**：`passed`（gate 自己判）、`gate`（来自 definition JSON）、`next`（来自 transition table）。MD controller 读 `check.next` 后直接 `assessNode(next, ...)`。

**理由**：`--transitions` flag 使 gate CLI 不硬编码 transition table 位置。Experiment 可指向 prototype 中的副本，FSM 迁移只需改 flag 值。Gate 不知道文件在哪——外面告诉它。

### D6: Manifest `next` 字段移除

manifest.json 每个 phase entry 去掉 `next` 字段。路由权威在 transition table。`gate: null` 的 phase（`final`）不 spawn gate CLI，不调 `askNext`——自然终止。

### D6.1: 只有 spawned gate 才调 askNext

`askNext` 只在 gate CLI 内部执行时调用。无 gate 的 phase（`gate: null`）不 spawn 进程，不触发任何 transition table 查询。MD controller 或 walker 读到 gate=null 就知道该停了。

### D7: Walker + Playbook 适配

- Walker：从 gate CLI 响应的 `check.next` 读 next_node，不再读 manifest `next`。Spawn gate CLI 时传 `--transitions` flag
- Playbook：去掉所有 `--next` flag，改为 `--transitions experiments/prototype-wff-validation/transitions.chain.json`

### D8: Gate 名统一使用 hyphens

**决策**：gate 名在所有位置统一使用 hyphens（`instantiation-complete`），不再混用 underscores（`instantiation_complete`）。涉及文件：

- `transitions.chain.json` key：`"instantiation-complete"` ✓（D2 已定义）
- manifest.json gate 字段：`"instantiation-complete"` ✓（wff-skeleton-validation 已改）
- gate definition JSON `gate` 字段：从 `"instantiation_complete"` → `"instantiation-complete"`
- CLI 文件名：`check-gate-instantiation-complete.mjs` ✓（未变）
- Gate CLI 内部：`definition.gate` 读取后直接作为 `askNext` 的 `gate` 参数

**理由**：`askNext(TRANSITIONS, definition.gate, state)` 的 `gate` 参数来自 definition JSON。如果 definition JSON 用 underscores 而 transitions.chain.json 用 hyphens，查表必然失败。统一 hyphens 后零歧义。

### D9: FSM 不需要改——askNext 内部适配

**决策**：`workflow-fsm.mjs` 的 `resolveTransition` 保持现有签名 `(fsm, node, status) → { action, next?, reason? }`。`ask-next.mjs` 在分发到 FSM loader 时适配返回形状：

```javascript
// FSM path in askNext:
const result = resolveFSM(fsm, gate, state);
// FSM returns { action: 'advance'|'complete'|'halt', next?, reason? }
// askNext normalizes: 'advance' → next, 'complete' → null, 'halt' → null
return result.action === 'advance' ? result.next : null;
```

`halt` 和 `complete` 都映射为 `null`——语义一致："没有可用的 next_node"。Gate CLI 不感知 FSM 的内部状态机语义，只关心 `next` 有无。

**理由**：`askNext` 是适配层——它负责统一 chain 和 FSM 的返回形状。FSM 引擎无需改动，Gate 无需改动。

## Risks / Trade-offs

- **[Risk] transitions.chain.json 与 manifest.json gate 名不同步** → `askNext()` 对未匹配 gate 返回 null，MD controller 处理
- **[Trade-off] gate CLI 多一次 readFileSync** → 文件 <1KB，可忽略
- **[Migration] 当前使用 `--next` 的 playbook** → 本 change 一并更新
