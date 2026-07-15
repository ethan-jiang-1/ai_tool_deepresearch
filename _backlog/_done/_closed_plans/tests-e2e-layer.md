# 测试策略：Agentic Workflow 的四层验证体系

> **Superseded 2026-07-15:** Historical design input only. `formalize-verification-routing` replaces this plan's ordinal layers and repo-top-level `tests_e2e/` proposal with the canonical `unit`, `integration`, `deterministic_e2e`, and `agent_flow_e2e` taxonomy. The deterministic intent now lives under `tests/e2e/`; see the `verification-routing` spec. The body below is preserved unchanged as historical context.

## Metadata

| Field | Value |
|---|---|
| **Identifier** | `tests-e2e-layer` |
| **Category** | 项目基础设施 + 测试策略 |
| **Severity** | P1 |
| **Status** | Superseded by `formalize-verification-routing` |
| **Date** | 2026-07-15 |

## 1. 传统程序 vs Agentic Workflow 的测试差异

### 传统程序

```
输入 → 代码 → 输出
```

测试验证：给定 X 输入，代码产出 Y 输出。三层清晰：单元（纯函数）、集成（多模块）、端到端（全链路）。

### Agentic Workflow

```
输入 → Agent 读 MD → Agent 做决策 → Agent 调用 CLI/写文件 → Engine 检查 → 反馈 → Agent 继续
```

这里有两类完全不同的"被测对象"：

1. **Engine**（JS 代码）——**确定性的**。Schema 校验、状态转移、Gate 检查、Receipt 验证。传统测试方法完全适用。
2. **Agent**（LLM 读 MD 后的行为）——**非确定性的**。同一个 phase doc，Agent 可能选不同的搜索策略、不同的修复路径、不同的措辞。无法用传统测试方法验证。

### 关键洞察：Engine 和 Agent 的测试必须分层，不能混

传统程序没有 "Agent 行为" 这一层——所有的执行路径都是代码定义的。Agentic workflow 中，有一部分执行路径是 LLM 在运行时决定的。把 Agent 行为测试和 Engine 行为测试混在一起，会让两者都测不好。

## 2. 四层验证体系

```
Layer 1: Unit           tests/engine/        确定性函数      node:test    毫秒    CI 每次
Layer 2: Integration    tests/integration/   单 CLI 行为      node:test    秒      CI 每次
Layer 3: Engine E2E     tests_e2e/           多 phase 流程    node:test    秒      CI 每次
Layer 4: Agent E2E      experiments_playbook/  Agent 执行     trace 裁决    分钟    手动/定期
```

### Layer 1: Unit（`tests/engine/`）

**测什么**：纯函数的输入输出。Zod schema 的校验/拒绝。状态转移表的转换。Helper 函数的边界条件。

**不测什么**：文件 I/O。CLI 行为。Agent 行为。

**工具**：`node:test` + `node:assert`。零依赖。零 I/O。

### Layer 2: Integration（`tests/integration/`）

**测什么**：单个 CLI 命令在给定 bundle 状态下的输出。`check-gate-wave1-complete.mjs --bundle <fixture>` 产出 JSON → 断言 `passed: true/false`、`inspect` 内容、`hints` 结构。

**不测什么**：多 phase 流程。Agent 如何生成 bundle 状态。

**工具**：`node:test` + `spawnSync`。临时 bundle 在 `/tmp`。

**关键约束**：测试只验证 **Engine 对给定 bundle 状态的判断是否正确**。不验证 bundle 状态本身是否 "正确"——bundle 状态是 Agent 的责任。

### Layer 3: Engine E2E（`tests_e2e/`）—— 新增

**测什么**：多 phase 流程中 Engine 的行为一致性。JS 代码模拟 Agent 对 bundle 状态的修改（写方向段、创建队列项、写入提交行），然后运行 Engine CLI，验证跨 phase 的确定性行为。

**核心问题**：Engine 在跨 phase 状态转换下是否正确？

- Round 1 完成 → phase-rerun 写方向 → Engine 是否识别方向为 `matching`？
- Direction 过期 → Engine 是否识别为 `stale`？
- `--eligible-rows` 是否只返回当前轮次的行？
- Per-row authority check 是否在 work_id 缺失时 blocking？

**不测什么**：Agent 是否会正确地写方向段。Agent 是否会正确地跟随 rebuild 指令。Agent 的任何行为。

**工具**：`node:test` + `spawnSync`。临时 bundle 在 `/tmp`。共享 fixture helper。

**与传统 E2E 的区别**：传统 E2E 测试全链路（用户→前端→后端→数据库）。Engine E2E 测试的是 **Engine 在多个 phase 状态转换下的行为**——相当于把 Agent 的修改当作 "已知输入"，验证 Engine 在 "已知输入序列" 下的输出一致性。

### Layer 4: Agent E2E（`experiments_playbook/`）

**测什么**：真实 Agent 执行 phase 文档后，bundle 的最终状态是否满足要求。从 trace JSONL 裁决。

**核心问题**：Agent 是否会正确地遵循 phase 指令？

- Agent 是否在 phase-rerun 中正确写入 `rerun_count: <target>`？
- Agent 是否在 wave1 中正确分类 topic（reuse/supplement/new）？
- Agent 是否从 submitted outputs 正确提取 return-map entries？

**为什么这一层不能省**：Layer 1-3 只能验证 Engine 的正确性。它们**无法验证 Agent 是否正确地遵循了 phase 指令**。Phase 文档是 Markdown——它不是可执行的代码。只有真实 Agent 执行才能验证它。

**为什么这一层代价高**：每个 playbook 需要 Agent 执行完整的 phase 流程——搜索、阅读、写作、提交。耗时长、成本高、结果不完全可复现。

## 3. 每层验证的"责任边界"

一个典型的 rerun 流程：

```
HITL2 → phase-rerun → seed-topics → wave0 → wave1 → wave2 → HITL2
```

| 步骤 | Engine 责任（确定性） | Agent 责任（非确定性） |
|---|---|---|
| Phase-rerun 写方向 | `resolveRerunDirection()` 返回正确状态 | Agent 正确写入 `rerun_count: <target>` |
| Wave0 §3.0 分类 | 无（Agent 指令） | Agent 正确判断 reuse/new/supplement |
| Wave0 提交 work unit | Schema 校验、Receipt 检查、Ledger 追加 | Sub-agent 产出有效 result.json |
| Wave1 gate | Pattern match、Count floor、Provenance | Agent 在 gate 前完成所有工作 |
| Wave1 §3.3 backfill | `hasBackfillToken()` 按 wave 过滤 | Agent 正确提取 return-map entries |
| Inspect authority check | Check work_ids in section refs | Agent 正确重建 projection section |

**测试策略**：
- **Engine 责任** → Layer 1-3 覆盖
- **Agent 责任** → Layer 4 覆盖

关键：不要用 Layer 4 去测 Engine 行为（太贵），也不要用 Layer 1-3 去测 Agent 行为（不可能）。

## 4. tests_e2e 的具体设计

### 4.1 测试什么（Engine 跨 phase 行为）

```
场景 1: 正常 Run
  创建 bundle（rerun_count=0, token 存在）
  → wave0 gate 通过
  → wave1 gate 通过（token 被消费后 gate 通过）
  → wave2 gate 通过

场景 2: Round-2 Supplement
  创建 round-1 完成 bundle（token 已消费, rerun_count=1）
  → 写入方向（rerun_count: 2, action: supplement）
  → 写入本轮提交行（index.rerun_count: 2）
  → resolveRerunDirection 返回 matching
  → --eligible-rows 只返回 rerun_count=2 的行
  → authority check 通过（work_id 在 projection refs 中）

场景 3: Round-3 Stale Direction
  创建 round-2 完成 bundle（rerun_count=2, 方向保留 rerun_count: 2）
  → profile 递增到 3
  → resolveRerunDirection(content, 3) 返回 stale
  → checkRerunAddFullSynthesis 不应用 action:add

场景 4: Crash Recovery
  方向已写入（rerun_count: 2）
  → profile 仍为 1（崩溃窗口）
  → target = 1 + 1 = 2
  → 方向已有 rerun_count: 2 == target → 跳过写方向 → 递增 profile

场景 5: Eligible Rows 过滤
  3 个提交行：rerun_count=1, rerun_count=2, 无字段（legacy）
  → profile.rerun_count = 2
  → --eligible-rows 只返回 rerun_count=2
  → legacy 行在 warnings 中报告

场景 6: Per-Row Authority Check
  2 个本轮提交行（rerun_count=2）
  → 1 个 work_id 在 projection refs 中, 1 个缺失
  → authority check: 缺失的 work_id → blocking finding
  → 修复后（补充 disposition entry）→ check 通过
```

### 4.2 不测试什么（Agent 行为）

- 不测试 Agent 是否写对了 `rerun_count` 的值
- 不测试 Agent 是否选择了正确的 return-map entries
- 不测试 Agent 是否正确执行了 rebuild 流程

这些是 Layer 4（playbook）的责任。

### 4.3 目录结构

```
tests_e2e/
├── README.md              — 层级约定 + 责任边界说明
├── helpers/
│   └── bundle-fixture.mjs — 共享工具（创建 bundle、写 profile、写 index、运行 CLI、清理）
├── rerun-round-continuity/
│   └── main.test.mjs      — 场景 1-4: run + supplement + stale + crash recovery
├── eligible-rows/
│   └── main.test.mjs      — 场景 5: eligible rows 过滤 + legacy exclusion
└── authority-check/
    └── main.test.mjs      — 场景 6: per-row authority reference verification
```

### 4.4 强制约定

- **所有 bundle 在 `/tmp` 下创建**（`os.tmpdir()`）。严禁在项目目录下创建任何 bundle。
- **`after()` hook 必须清理**：`rmSync(dir, { recursive: true, force: true })`
- **使用 `spawnSync` 运行 CLI**（验证真实的 CLI 行为，不绕过 parseArgs/emit/exit 逻辑）
- **不 import Engine 内部函数**（tests_e2e 是 CLI 消费者视角，不是模块调用者视角）
- **每个 test file 自包含**——不依赖其他 test file 的副作用或执行顺序

### 4.5 package.json 集成

```json
{
  "scripts": {
    "test": "node --test tests/",
    "test:e2e": "node --test tests_e2e/",
    "test:all": "node --test tests/ tests_e2e/"
  }
}
```

## 5. Playbook 的重新定位

有了 `tests_e2e/` 之后，playbook 的职责更清晰：

- **不再用 playbook 验证 Engine 行为**——太贵。Engine 行为在 Layer 1-3 验证。
- **Playbook 聚焦 Agent 行为**：Agent 是否能正确遵循 phase 指令？Agent 产出的 bundle 状态是否能通过所有 gate？Agent 是否能在反馈后修复错误？

`experiments_playbook/exp_rerun-round-continuity` 的定位：
- 验证 Agent 在 phase-rerun 中正确写入 `rerun_count`
- 验证 Agent 在 wave1 中正确分类 topic
- 验证 Agent 从 submitted outputs 正确提取 return-map entries
- 从 trace JSONL 裁决（不是从 Engine output 裁决）

## 6. 实现步骤

1. 创建 `tests_e2e/README.md`（层级约定 + 责任边界说明）
2. 创建 `tests_e2e/helpers/bundle-fixture.mjs`（共享工具）
3. 创建 `tests_e2e/rerun-round-continuity/main.test.mjs`（场景 1-4）
4. 创建 `tests_e2e/eligible-rows/main.test.mjs`（场景 5）
5. 创建 `tests_e2e/authority-check/main.test.mjs`（场景 6）
6. 更新 `package.json` 添加 `test:e2e` 和 `test:all` 脚本
7. 运行 `npm run test:all` → 全部通过
8. 更新 `experiments_playbook/exp_rerun-round-continuity/README.md` ——重新聚焦于 Agent 行为验证

## 7. 与现有 change 的关系

本 plan 是**独立的基础设施变更**，不依赖 `seed-backfill-round-continuity`。`tests_e2e/` 是验证引擎行为的通用基础设施——任何涉及多 phase 流程的 change 都可以用它写测试。

`seed-backfill-round-continuity` 中需要 `tests_e2e` 来验证的确定性行为：
- `resolveRerunDirection` 的 5 种状态判断
- `--eligible-rows` 的轮次过滤
- Per-row authority check 的 blocking/advisory 区分

这些是 Layer 3 的责任。Agent 行为（Layer 4）留给 playbook。
