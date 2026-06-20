# CC: Transition Layer Systemic Analysis

> **写给接手此文档的 Agent/人**：本文档是 DPT 框架 transition 层的系统性分析。项目背景见 repo 根 `/Users/bowhead/ai_tool_deepresearch/CLAUDE.md` 和 `guidelines/project-charter.md`。关键原则：LLM Agent 负责搜索/读写/综合，JS Engine 负责 schema、gate、state transition、receipt、check —— Agent 不自检。所有路径以 repo 根为基准。

---

## 1. 涉及的全部文件（绝对路径）

### Transition 数据文件
- `/Users/bowhead/ai_tool_deepresearch/DPT_FRAMEWORK/workflows/transitions.chain.json`
- `/Users/bowhead/ai_tool_deepresearch/DPT_FRAMEWORK/workflows/transitions.fsm.json`
- `/Users/bowhead/ai_tool_deepresearch/DPT_FRAMEWORK/workflows/manifest.json`

### Transition Engine 代码
- `/Users/bowhead/ai_tool_deepresearch/DPT_FRAMEWORK/engine/ask-next.mjs` — 统一 dispatch（chain/fsm 后缀路由）
- `/Users/bowhead/ai_tool_deepresearch/DPT_FRAMEWORK/engine/transition-chain.mjs` — chain loader + resolver + Chain tracker
- `/Users/bowhead/ai_tool_deepresearch/DPT_FRAMEWORK/engine/transition-fsm.mjs` — FSM loader + resolver + FSM tracker
- `/Users/bowhead/ai_tool_deepresearch/DPT_FRAMEWORK/engine/workflow-fsm.mjs` — Machine tracker（重导出 transition-fsm，加 Machine class）
- `/Users/bowhead/ai_tool_deepresearch/DPT_FRAMEWORK/engine/workflow-chain.mjs` — 含 `parseFrontmatter()` 和 `NodeFrontmatter` Zod schema

### Phase Node 文件（9 个）
- `/Users/bowhead/ai_tool_deepresearch/DPT_FRAMEWORK/workflows/nodes/phases/phase-instantiation.md`
- `/Users/bowhead/ai_tool_deepresearch/DPT_FRAMEWORK/workflows/nodes/phases/phase-hitl1.md`
- `/Users/bowhead/ai_tool_deepresearch/DPT_FRAMEWORK/workflows/nodes/phases/phase-setup.md`
- `/Users/bowhead/ai_tool_deepresearch/DPT_FRAMEWORK/workflows/nodes/phases/phase-wave0.md`
- `/Users/bowhead/ai_tool_deepresearch/DPT_FRAMEWORK/workflows/nodes/phases/phase-wave1.md`
- `/Users/bowhead/ai_tool_deepresearch/DPT_FRAMEWORK/workflows/nodes/phases/phase-wave2.md`
- `/Users/bowhead/ai_tool_deepresearch/DPT_FRAMEWORK/workflows/nodes/phases/phase-hitl2.md`
- `/Users/bowhead/ai_tool_deepresearch/DPT_FRAMEWORK/workflows/nodes/phases/phase-readiness.md`
- `/Users/bowhead/ai_tool_deepresearch/DPT_FRAMEWORK/workflows/nodes/phases/phase-final.md`

### Shared Node 文件（5 个）
- `/Users/bowhead/ai_tool_deepresearch/DPT_FRAMEWORK/workflows/nodes/shared/shared-profile.md`
- `/Users/bowhead/ai_tool_deepresearch/DPT_FRAMEWORK/workflows/nodes/shared/shared-gate-rules.md`
- `/Users/bowhead/ai_tool_deepresearch/DPT_FRAMEWORK/workflows/nodes/shared/shared-schemas.md`
- `/Users/bowhead/ai_tool_deepresearch/DPT_FRAMEWORK/workflows/nodes/shared/shared-repair-guidance.md`
- `/Users/bowhead/ai_tool_deepresearch/DPT_FRAMEWORK/workflows/nodes/shared/shared-anti-cheating-rules.md`

### Gate CLI Checker（8 个）
- `DPT_FRAMEWORK/cli/gates/check-gate-instantiation-complete.mjs`
- `DPT_FRAMEWORK/cli/gates/check-gate-hitl1-recorded.mjs`
- `DPT_FRAMEWORK/cli/gates/check-gate-setup-ready.mjs`
- `DPT_FRAMEWORK/cli/gates/check-gate-wave0-complete.mjs`
- `DPT_FRAMEWORK/cli/gates/check-gate-wave1-complete.mjs`
- `DPT_FRAMEWORK/cli/gates/check-gate-wave2-complete.mjs`
- `DPT_FRAMEWORK/cli/gates/check-gate-hitl2-recorded.mjs`
- `DPT_FRAMEWORK/cli/gates/check-gate-readiness-passed.mjs`

### Spec 文件
- `/Users/bowhead/ai_tool_deepresearch/openspec/specs/transition-table/spec.md` — TRT-001 到 TRT-004
- `/Users/bowhead/ai_tool_deepresearch/openspec/specs/workflow-fsm-transition/spec.md` — WFS-002
- `/Users/bowhead/ai_tool_deepresearch/openspec/specs/workflow-node-contract/spec.md` — WNC-001 到 WNC-006

### 测试文件
- `/Users/bowhead/ai_tool_deepresearch/tests/engine/ask-next.test.mjs`
- `/Users/bowhead/ai_tool_deepresearch/tests/engine/transition-chain.test.mjs`
- `/Users/bowhead/ai_tool_deepresearch/tests/engine/transition-fsm.test.mjs`
- `/Users/bowhead/ai_tool_deepresearch/tests/engine/workflow-chain.test.mjs`
- `/Users/bowhead/ai_tool_deepresearch/tests/engine/workflow-fsm.test.mjs`

---

## 2. 原始数据：四个关键文件的完整内容

### 2a. `transitions.chain.json`（完整）

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

**结构**: `{ gate_name: { state_verb: next_node_path } }`
- 8 个 gate entry
- 每个 gate 只有 `"passed"` 状态映射，没有 `"failed"` 分支
- 无显式 terminal marker（最后一个 gate `readiness-passed` 的值指向 `phase-final.md`，chain 本身不标记谁 terminal）

### 2b. `transitions.fsm.json`（完整）

```json
{
  "name": "wff-lifecycle",
  "initial": "phases/phase-instantiation.md",
  "states": {
    "phases/phase-instantiation.md": { "on": { "success": "phases/phase-hitl1.md" } },
    "phases/phase-hitl1.md":        { "on": { "success": "phases/phase-setup.md" } },
    "phases/phase-setup.md":        { "on": { "success": "phases/phase-wave0.md" } },
    "phases/phase-wave0.md":        { "on": { "success": "phases/phase-wave1.md" } },
    "phases/phase-wave1.md":        { "on": { "success": "phases/phase-wave2.md" } },
    "phases/phase-wave2.md":        { "on": { "success": "phases/phase-hitl2.md" } },
    "phases/phase-hitl2.md":        { "on": { "success": "phases/phase-readiness.md" } },
    "phases/phase-readiness.md":    { "on": { "success": "phases/phase-final.md" } },
    "phases/phase-final.md":        { "on": { "success": null } }
  }
}
```

**结构**: `{ name, initial, states: { node_path: { on: { event_verb: next_node_path|null } } } }`
- 9 个 state（含 initial `phase-instantiation`）
- 所有 transition 用 `"success"` event
- `phase-final.md` → `null` 显式标记 terminal

### 2c. `manifest.json`（完整）

```json
{
  "phases": [
    { "key": "instantiation", "node": "phases/phase-instantiation.md", "gate": "instantiation-complete" },
    { "key": "hitl1",          "node": "phases/phase-hitl1.md",          "gate": "hitl1-recorded" },
    { "key": "setup",          "node": "phases/phase-setup.md",          "gate": "setup-ready" },
    { "key": "wave0",          "node": "phases/phase-wave0.md",          "gate": "wave0-complete" },
    { "key": "wave1",          "node": "phases/phase-wave1.md",          "gate": "wave1-complete" },
    { "key": "wave2",          "node": "phases/phase-wave2.md",          "gate": "wave2-complete" },
    { "key": "hitl2",          "node": "phases/phase-hitl2.md",          "gate": "hitl2-recorded" },
    { "key": "readiness",      "node": "phases/phase-readiness.md",      "gate": "readiness-passed" },
    { "key": "final",          "node": "phases/phase-final.md",          "gate": null }
  ],
  "shared": [
    "shared/shared-profile.md",
    "shared/shared-gate-rules.md",
    "shared/shared-schemas.md",
    "shared/shared-repair-guidance.md",
    "shared/shared-anti-cheating-rules.md"
  ]
}
```

**结构**: `{ phases: [{ key, node, gate }], shared: [path] }`
- 9 个 phase entry
- `key` = short identifier（lowercase，无连字符，如 `wave0`）
- `node` = phase MD 文件相对路径
- `gate` = gate name（kebab-case，如 `wave0-complete`），`final` 的 gate 为 `null`
- `shared` = shared MD 文件路径数组

### 2d. 全部 9 个 Phase 的 Frontmatter（完整）

| # | 文件 | node_type | id | phase | gate | stop | subagent | requires | suggested_context |
|---|------|-----------|-----|-------|------|------|----------|----------|-------------------|
| 1 | phase-instantiation.md | phase | phase-instantiation | instantiation | instantiation-complete | no | — | `[]` | `[]` |
| 2 | phase-hitl1.md | phase | phase-hitl1 | hitl1 | hitl1-recorded | **yes** | — | `[shared/shared-profile]` | `[]` |
| 3 | phase-setup.md | phase | phase-setup | setup | setup-ready | no | — | `[shared/shared-profile]` | `[shared/shared-schemas]` |
| 4 | phase-wave0.md | phase | phase-wave0 | wave0 | wave0-complete | no | — | `[shared/shared-anti-cheating-rules]` | `[shared/shared-schemas]` |
| 5 | phase-wave1.md | phase | phase-wave1 | wave1 | wave1-complete | no | true | `[shared/shared-anti-cheating-rules]` | `[shared/shared-repair-guidance]` |
| 6 | phase-wave2.md | phase | phase-wave2 | wave2 | wave2-complete | no | — | `[]` | `[shared-schemas]` ❌ |
| 7 | phase-hitl2.md | phase | phase-hitl2 | hitl2 | hitl2-recorded | **yes** | — | `[shared/shared-profile]` | `[]` |
| 8 | phase-readiness.md | phase | phase-readiness | readiness | readiness-passed | no | — | `[]` | `[shared-gate-rules]` ❌ |
| 9 | phase-final.md | phase | phase-final | final | null | no | — | `[]` | `[shared-schemas]` ❌ |

**Frontmatter 字段含义**（来自 spec WNC-001）：
- `node_type`: `"phase"` — 标记为 phase node
- `id`: stable identifier，等于文件名去 `.md`
- `phase`: 当前 phase key（对应 manifest 的 `key`）
- `gate`: phase 完成后要运行的 gate key；`final` 为 `null`
- `stop`: `"yes"` 仅 HITL1/HITL2；Agent 必须等待用户输入
- `requires`: 强依赖 shared MD 的路径数组
- `suggested_context`: 可选参考的路径数组
- `subagent`: 可选，标记未来使用 subagent mechanics

### 2e. 全部 5 个 Shared Node 的 Frontmatter

| # | 文件 | node_type | id | shared_scope | authority | requires | suggested_context |
|---|------|-----------|-----|-------------|-----------|----------|-------------------|
| 1 | shared-profile.md | shared | shared-profile | profile | guidance-only | `[]` | `[shared-schemas]` ❌ |
| 2 | shared-gate-rules.md | shared | shared-gate-rules | gate-summary | generated-summary | `[]` | `[]` |
| 3 | shared-schemas.md | shared | shared-schemas | schema-summary | guidance-only | `[]` | `[]` |
| 4 | shared-repair-guidance.md | shared | shared-repair-guidance | repair | guidance-only | `[]` | `[]` |
| 5 | shared-anti-cheating-rules.md | shared | shared-anti-cheating-rules | rules | guidance-only | `[]` | `[]` |

---

## 3. 关键 Engine 代码（简化但保留签名）

### 3a. `ask-next.mjs` — 统一 dispatch（完整核心逻辑）

```js
// 签名: (path, gate, state) → next_node | null
export function askNext(path, gate, state) {
  if (path.endsWith('.chain.json')) {
    const chain = loadChain(path);
    const result = resolveChain(chain, gate, state);   // chain lookup: chain[gate][state]
    return result.found ? result.next : null;
  }

  if (path.endsWith('.fsm.json')) {
    const fsm = loadFSM(path);
    const result = resolveFSM(fsm, gate, state);       // ← BUG: 传入 gate name，resolveFSM 期望 node path
    return result.found ? result.next : null;
  }

  throw new Error(`Unknown transition format: ${path}`);
}
```

**关键**：两个分支都接收 `(path, gate, state)`，但对 FSM 的 `resolveFSM` 调用传入的是 `gate`（gate name），而 `resolveFSM(fsm, node, state)` 的第二个参数期望 `node`（file path）。两者 key space 不同。

### 3b. `transition-chain.mjs` — Chain resolver

```js
// Zod schema: { [gate: string]: { [state: string]: next_node | null } }
export const ChainDefinition = z.record(z.string().min(1), z.record(z.string().min(1), z.string().nullable()));

// 纯函数: (chain, gate, state) → { next: string|null, found: boolean }
export function resolveTransition(chain, gate, state) {
  const node = chain[gate];
  if (!node) return { next: null, found: false };
  const next = node[state];
  if (next === undefined) return { next: null, found: false };
  return { next, found: true };
}

// Chain tracker class（有状态）
export class Chain {
  // _current: 最近查询的 gate name
  // _next: 最近查询得到的 next node path
  // _outcome: 'running' | 'complete'（next === null 时变 complete）
  // askNext(gate, state) → 查表 + 记录 receipt + 更新 outcome
  // 注意: Chain tracker **不自动推进** _current 到 next node
  //       调用方自己管理位置（gate CLI 每次调用 askNext 传当前 gate name）
}
```

### 3c. `transition-fsm.mjs` — FSM resolver

```js
// Zod schema: { name, initial, states: { [node]: { on: { [event]: next|null } } } }
export const FSMDefinition = z.object({
  name: z.string(),
  initial: z.string().min(1),
  states: z.record(z.string().min(1), z.object({
    on: z.record(z.string().min(1), z.string().nullable()),
  })),
}).refine(fsm => fsm.initial in fsm.states);

// 纯函数: (fsm, node, state) → { next: string|null, found: boolean }
export function resolveTransition(fsm, node, state) {
  const stateDef = fsm.states[node];
  if (!stateDef) return { next: null, found: false };
  const target = stateDef.on[state];
  if (target === undefined) return { next: null, found: false };
  return { next: target, found: true };
}

// FSM tracker class（有状态）
export class FSM {
  // _current 初始 = fsm.initial
  // _next: 最近一次解析的 next node
  // _outcome: 'running' | 'complete' | 'halted'
  // askNext(state) → 查当前 node + state → 自动推进 _current = result.next
  // 注意: FSM tracker **自动推进** _current 到 next node
  //       调用方只需传 state，不需要传当前 node
}
```

### 3d. Chain vs FSM Tracker 行为差异

| 维度 | Chain tracker | FSM tracker |
|------|--------------|-------------|
| 当前状态管理 | 调用方管理（每次传 gate name） | 内部管理（`_current` 自动推进） |
| `askNext` 参数 | `(gate, state)` — 需要知道当前 gate | `(state)` — 不需要知道当前 node |
| 状态推进 | 不推进；调用方负责下次传正确的 gate | 自动推进 `_current = result.next` |
| terminal 行为 | `next === null` → outcome = `'complete'` | `next === null && found` → `'complete'`；`!found` → `'halted'` |
| 使用场景 | gate CLI（每次执行知道当前 gate name） | Agent 侧流程（跟随生命周期自动步进） |

### 3e. Gate CLI 调用模式（以 `check-gate-wave0-complete.mjs` 为例）

```js
const { askNext } = await import('../../engine/ask-next.mjs');

// 默认使用 chain 格式
const transitionsPath = values.transitions
  || join(__dirname, '..', '..', 'workflows', 'transitions.chain.json');

// 传入 gate name + 'passed'，得到 next node path
const next = askNext(transitionsPath, 'wave0-complete', 'passed');

const result = {
  check: { passed: true, gate: 'wave0-complete', next },  // next = 'phases/phase-wave1.md' | null
  inspect: [],
  advice: [],
};
```

所有 8 个 gate CLI checker 使用相同模式，gate name 硬编码在各自文件中。

---

## 4. 发现的问题（按严重程度排序）

### 🔴 Critical — `askNext` 的 FSM dispatch 在真实数据上静默失败

**位置**: `DPT_FRAMEWORK/engine/ask-next.mjs:38-41`

**根因**: `askNext` 签名是 `(path, gate, state)`，gate CLI 传 gate name（如 `'wave0-complete'`）。但 `resolveFSM(fsm, node, state)` 期望第二个参数是 node path（如 `'phases/phase-wave0.md'`）。真实 `transitions.fsm.json` 的 state keys 是 node paths，不是 gate names。所以 `fsm.states['wave0-complete']` → undefined → 返回 null。

**为什么测试没发现**: `tests/engine/ask-next.test.mjs` 用 synthetic FSM 数据，state keys 是 `'node-a.md'` 这样的简单字符串，测试调用时也传 `'node-a.md'`（传的是 node path，符合 FSM 期望）。但真实 gate CLI 传的是 gate name。测试合约和生产调用方合约在第二个参数的语义上不一致。

**影响**: `.fsm.json` 通过 `askNext()` dispatch 路径在真实场景下永远不可用。gate CLI 默认 `--transitions transitions.chain.json`，生产不受影响。但 "chain/FSM dual engine" 声明名存实亡。

**更多证据**: `tests/engine/ask-next.test.mjs:122-133` 只测试了真实 `transitions.chain.json` 文件，没有测试真实 `transitions.fsm.json`。

### 🟡 问题 2 — 三套命名系统，仅 manifest 同时知道三者

同一 phase 有三个身份，存储在不同文件的 primary key 位置：

| 命名系统 | 示例 | primary key of | 可推导性 |
|----------|------|---------------|---------|
| short key | `wave0` | `manifest.json` `key`、frontmatter `phase` | 不可从 gate name 或 path 推导 |
| file path | `phases/phase-wave0.md` | FSM `states` key、chain value、`manifest.json` `node` | 可从 short key: `phases/phase-{key}.md` ✅ |
| gate name | `wave0-complete` | chain top-level key、frontmatter `gate`、gate def 文件名 | **不可**从 short key 推导：`hitl1`→`hitl1-recorded`(非 `hitl1-complete`)、`setup`→`setup-ready`、`readiness`→`readiness-passed` |

**只有 `manifest.json` 同时持有三者**，但被 spec WNC-003 定位为 "Agent-readable lifecycle inventory/index"，不是 "identity authority" 或 "registry"。

**后果**：要从 chain 的 gate name 找到对应 short key → 必须通过 manifest 查表。要从 FSM 的 node path 找到 gate name → 必须通过 frontmatter 或 manifest。三文件间的引用完整性没有任何自动化校验。

### 🟡 问题 3 — Verb 不统一：`"passed"` vs `"success"`

```
chain:  gate_name → { "passed"  → next_path }
FSM:    node_path → { "on": { "success" → next_path } }
```

- `passed` 来自 gate 评估域（passed/failed）—— gate CLI 输出 `{check: {passed: true}}`
- `success` 来自状态机域（success/failure/error）—— 通用 FSM event
- 语义等价（gate pass = 成功转移），拼写不同

**补充**：chain spec TRT-002 定义 state enum 为 `'passed'`/`'failed'`，但 chain 数据只映射 `passed`，没有 `failed` 分支。`failed` 语义在 chain 外处理（repair loop → re-evaluate gate）。

### 🟡 问题 4 — `suggested_context` 路径前缀不一致

以下文件在 `suggested_context`（或 shared 自身的 `suggested_context`）中使用了缺少 `shared/` 前缀的短名：

| 文件 | 字段 | 当前值 | 正确值 |
|------|------|--------|--------|
| phase-wave2.md | suggested_context | `shared-schemas` | `shared/shared-schemas` |
| phase-readiness.md | suggested_context | `shared-gate-rules` | `shared/shared-gate-rules` |
| phase-final.md | suggested_context | `shared-schemas` | `shared/shared-schemas` |
| shared-profile.md | suggested_context | `shared-schemas` | `shared/shared-schemas` |

其他 3 个 phase 文件（setup, wave0, wave1）和所有 `requires` 字段都正确使用 `shared/shared-*` 路径格式。格式约定是 `<dirname>/<id>`，其中 shared node 的 `id` 就是文件名去 `.md`。

### 🟡 问题 5 — FSM 定位模糊

- 8 个 gate CLI checker 全部默认 `transitions.chain.json`，FSM 无生产消费者
- FSM 文件存在、engine 存在、spec 存在、Zod schema 存在——但 `askNext` dispatch bug 使其在真实数据上不可用
- FSM tracker stateful（自动推进 `_current`），Chain tracker stateless（调用方管理位置）——行为语义根本不同
- git commit `79c1345` 标题为 "chain/FSM dual engine"，但 dual 的实际分工从未明确

---

## 5. 方向性建议（待讨论对齐）

### A. Verb 统一 → 推荐 `"passed"`

理由（按用户给的评估维度）：

**A) LLM 熟悉度**：
- `passed/failed` 是 checkpoint/gate 评估的通用语义，所有 LLM 理解
- `success/failure` 歧义大——什么成功了？Phase 工作？Gate 检查？Research 质量？Agent 看到 gate 输出 `passed: true`，transition table 查 `"passed"`，不需要脑内映射

**B) 场景适配**：
- Transition 的触发条件精确等于 "gate passed"。Gate CLI 输出 `{check: {passed: true}}`，verb 和触发源用同一个词
- 未来多分支 FSM：`{on: {passed: next, failed: repair, timeout: hitl}}` 每个 event 名自解释
- TRT-002 已定义 state enum 为 `passed`/`failed`——chain 已统一，只有 FSM 是 outlier

**改动范围（估算）**：
- `transitions.fsm.json`：`s/success/passed/g`
- `transition-fsm.mjs`：注释/示例中的 verb 引用
- `workflow-fsm.mjs`：Machine class 注释/示例
- `workflow-fsm-transition/spec.md`：spec 示例中 `success` → `passed`
- 3 个 test 文件中的 synthetic 数据

### B. 双格式 → 保留但先修 bug

**推荐 B3**：FSM 保持为独立 tracker（`createFSM()` + `fsm.askNext(state)`），不经 `askNext` dispatch。Gate CLI 继续用 chain。分工明确：

- **chain** = gate CLI 的 transition lookup（stateless，gate name in → node path out）
- **FSM** = Agent/lifecycle 侧的 stateful tracker（自动步进，适合长时间运行的 workflow）

之后方向更清晰时再决定是否统一 dispatch 接口。

### C. Canonical identifier → 用 file path

**不需要新增 canonical key → path 的映射层**。File path 天然就是 canonical identifier：
- 唯一 + 物理可解析
- Chain value 用 file path、FSM key 用 file path、manifest `node` 用 file path
- Short key 和 gate name 是便利属性，从 manifest 查询

实现：在 `workflow-node-contract` spec 或 README 中声明 file path = canonical node identifier。然后实现一致性校验器（见 D）自动检查所有引用。

### D. 一致性校验器 → 需要

建议实现 `validate-workflow-consistency.mjs`，检查以下完整性约束：

1. **Phase ↔ Manifest**：每个 manifest `node` 文件存在，frontmatter `phase`/`gate`/`id` 与 manifest 一致
2. **Chain ↔ Manifest**：chain gate keys ⊆ manifest gate 值，manifest gates ⊆ chain keys（除 null），chain values ⊆ manifest nodes ∪ {null}
3. **FSM ↔ Manifest**：FSM states ⊆ manifest nodes，manifest nodes ⊆ FSM states，FSM `initial` = manifest 第一个 phase 的 node
4. **Frontmatter 内部**：`requires`/`suggested_context` 路径存在且格式统一，`stop: "yes"` 仅 hitl1/hitl2
5. **Chain ↔ FSM**：两者编码同一 lifecycle（通过 manifest 桥接验证 transition 目标一致）

---

## 6. Git 历史上下文

```
9339206 Archive WFF spec boundary sync
2d33ed9 chore: remove walk-lifecycle.mjs — JS lifecycle loop violates guideline boundary
79c1345 feat: wff-state-chain -- transition table, askNext, chain/FSM dual engine   ← 引入 transition 双格式
e96fad2 docs: add Agent-Engine communication rules to framework-runtime-boundary
cd0a498 feat: wff-skeleton-validation -- logger, walker, engine compat, experiment infra
5026e05 feat: wff-contract-skeleton — lifecycle shell with 31 skeleton files
```

Commit `79c1345` 是 transition 层的起点：引入 chain/FSM 双格式、`askNext` dispatch、8 个 gate CLI checker 改为动态 `askNext()` 调用、manifest 移除 `next` 字段、所有 phase frontmatter 移除 `next` 字段、gate name 从 underscore 改为 hyphen。

---

## 7. 建议的下一步（按优先级）

1. **修 frontmatter 路径前缀**（4 个文件，纯数据修正）
2. **统一 FSM verb** `success` → `passed`（1 数据文件 + 若干注释/spec/test）
3. **实现 `validate-workflow-consistency.mjs`**
4. **文档化 canonical identifier = file path**
5. **处理 FSM dispatch bug**（根据 B 的讨论结果）
