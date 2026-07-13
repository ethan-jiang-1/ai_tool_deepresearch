# Design Analysis: Agent-Facing Hint Quality — Test-Level Enforcement

## Metadata

| Field | Value |
|---|---|
| **Identifier** | `agent-hint-quality-test-enforcement` |
| **Category** | Test Policy & Governance Gap |
| **Severity** | **P0** — Agent猜错修复路径会直接损坏bundle，Engine已握有静态contract lineage却不分享 |
| **Status** | Analysis / Awaiting Decision |
| **Date** | 2026-07-13 |
| **Related Guidelines** | `evolution-simple-reliable-control.md` §Agent-Friendly Feedback, `evolution-helper-oriented-agent.md` §Preserve Agent Intelligence |
| **Related Change** | `repair-rerun-added-topic-bootstrap` (defines `hints[]` shape via gate-skeleton spec, does NOT address test enforcement) |
| **Related Memory** | [[contract-lineage-aware-feedback]], [[rerun-incremental-topic-semantic-gap]] |

---

## 1. What This Is

### The Core Gap

`repair-rerun-added-topic-bootstrap/specs/gate-skeleton/` 已经精确定义了每个 Gate CLI 失败时必须产出的 `hints[]` 结构——`rule_id`、`missing_fact`、`write_to`、`rerun`。这是 Engine 从静态 contract lineage 直接推导的、Agent 修复所需的全部导航信息。

**但有一个没有闭合的环：谁来验证每个 CLI 真的产出了合法的 hints？谁来确保新增 gate 时不会漏掉 hint-quality 的负面测试？**

当前状态：
- **spec 层**：gate-skeleton spec 定义了 `hints[]` 的 SHALL 契约 ✓
- **实现层**：尚未 apply，gate CLI 尚未产出 `hints[]`（待实现）
- **测试层**：**没有共享的 hint-quality 断言、没有 CLI→test 覆盖审计、没有 OpenSpec task 模板强制要求**
- **Agent 层**：Agent 收到的是 `inspect[]` 里的 prose 描述，没有结构化的 `missing_fact → write_to → rerun` 导航

### 这不是 gate-skeleton spec 的问题

gate-skeleton spec 已经说清楚了 WHAT。本 plan 要解决的是 **HOW to enforce that tests exist and actually verify hint quality** — 这是一个测试资产层面的治理缺口。

| 关注点 | gate-skeleton spec | 本 plan |
|---|---|---|
| 定义 hints[] 契约 | ✅ SHALL 包含 rule_id/missing_fact/write_to/rerun | ❌ |
| 定义 rule 的 repair metadata | ✅ blocking_basis + repair.owner + repair.write_to | ❌ |
| 确保每个 CLI 有 hint-quality 测试 | ❌ | ✅ |
| 确保新增 rule 不会漏掉测试 | ❌ | ✅ |
| 确保 CI/apply 阶段能自动发现遗漏 | ❌ | ✅ |

### 为什么这个问题是 P0

两个 guideline 都明确要求 Engine 分享其静态知识：

- `evolution-simple-reliable-control.md:187-214`：**Contract-Lineage-Aware Rejection** — "当 Agent 反复猜测字段名、位置、格式，或抱怨搞不过去时，这是 Engine 信息保留的 symptom，不是 Agent 能力不足。"
- `evolution-helper-oriented-agent.md:117`：**Preserve Agent Intelligence** — "Engine 保留这些静态知识即剥夺 Agent 在合法边界内执行机械修复的能力——这与 helper posture 矛盾。"

如果 `hints[]` 实现了但测试没有覆盖：
1. 某个 gate CLI 的 `hints[]` 实现有 bug → Agent 拿到的是垃圾导航 → Agent 猜错 → bundle 损坏
2. 新增 gate 时开发者忘了在 rule definition 里加 `repair` metadata → `hints[]` 为空 → Agent看不到修复路径 → 求助用户 → 违背 helper posture
3. 回归修改破坏了 `hints[]` 的输出 → 所有依赖该 gate 的 Agent flow 一起挂

**测试是 hint quality 的最后一道防线。spec 定义契约，测试证明契约被遵守。**

---

## 2. Design: Three-Layer Enforcement

不是加一个通用测试框架或 controller。是三层具体的、逐层收紧的约束：

### Layer 1: Shared Hint-Quality Assertion Helper

**文件**：`tests/helpers/assert-hint-quality.mjs`

一个可复用的断言函数，任何 gate/inspect CLI 测试都可以调用：

```js
// 签名
export function assertHintQuality(jsonOutput, expectations) {
  // 1. 结构断言：失败时 hints[] 必须存在且为非空数组
  // 2. 字段完整性：每个 hint 必须有 rule_id, missing_fact, write_to, rerun
  // 3. 内容非空：所有四个字段都是非空字符串
  // 4. rerun 包含可执行命令（node ... check-gate-xxx ...）
  // 5. write_to 指向合法 surface 或 Engine operation（不是空字符串或 "unknown"）
  // 6. 可选：expectations 参数允许测试精确断言具体的 missing_fact 或 write_to
}

// 用法示例（在已有测试中）
import { assertHintQuality } from '../../helpers/assert-hint-quality.mjs';
const result = runGate('check-gate-wave1-complete.mjs', bundle);
assert.equal(result.check.passed, false);
assertHintQuality(result, {
  expectedRuleCount: 2,                           // 期望恰好 2 个独立根因
  hints: [
    { rule_id: 'W1C-004', write_to: 'seed_topics/topic-a.md' },
    { rule_id: 'W1C-007', write_to: 'advance-status' },  // Engine-owned → operation
  ],
});
```

**这解决了"测试里怎么断言"的问题**——不需要每个测试手写 hint 验证逻辑。

### Layer 2: Gate-CLI → Test Coverage Audit

**文件**：`DPT_FRAMEWORK/cli/audit-gate-test-coverage.mjs`

一个确定性审计脚本，在 CI 或 `/opsx:apply` 前运行：

```
输入：
  - DPT_FRAMEWORK/cli/gates/check-gate-*.mjs（active gate CLI inventory）
  - DPT_FRAMEWORK/cli/check-reentry.mjs, inspect-bundle.mjs 等非 gate 但产出诊断的 CLI
  - tests/ 下所有测试文件

输出：
  - 每个 gate CLI 是否至少有一个测试文件 import 了 assertHintQuality 且传入了该 CLI 的失败输出
  - 每个 gate definition 的每条 blocking rule 是否至少有一个测试用例覆盖其失败路径
  - 未覆盖的 gate/rule 列表 → exit code 1
```

审计逻辑：
1. 扫描 `DPT_FRAMEWORK/cli/gates/` 得到活跃 gate CLI 列表
2. 扫描每个 gate definition JSON 得到活跃 blocking rule 列表
3. 扫描 `tests/` 下所有 `.test.mjs` 文件，grep `assertHintQuality` 调用
4. 交叉比对：哪些 gate/rule 没有被任何测试的 hint assertion 覆盖
5. 报告缺失 → fail

**关键设计决定**：这个审计脚本是 **deterministic static analysis**——它检查测试代码的 import/调用模式，不运行测试。这避免了"测试存在但永远不跑"的假阳性。

实际上它可能需要一个简单的约定：测试文件中出现 `assertHintQuality(` 且该测试文件的描述或 fixture 中包含对应 gate 名称。审计脚本通过静态分析来匹配。

更可靠的方案：要求每个 gate CLI 有一个对应的测试文件，命名约定为 `tests/integration/cli/check-gate-<name>.test.mjs`，且该文件必须包含至少一个 `assertHintQuality` 调用。审计脚本检查命名约定 + import 存在性。

### Layer 3: OpenSpec Task Template Amendment

**文件**：`openspec/config.yaml` 或 governance rule

在 OpenSpec propose/apply 流程中插入约束：

当 change 包含以下任一情况时，task list 必须包含一个 "Write hint-quality negative tests" task：
- 新增 gate CLI（`DPT_FRAMEWORK/cli/gates/check-gate-*.mjs`）
- 修改已有 gate definition JSON（新增/修改/删除 blocking rule）
- 新增其他可失败 CLI（inspect、validate、check-reentry 等）

这个约束通过以下方式落地：
- `openspec/config.yaml` 中新增一条 governance rule
- `/opsx:apply` 前运行 `audit-gate-test-coverage.mjs`，不通过则阻塞 apply
- Code review checklist 中增加 hint-quality test 检查项

---

## 3. What This Is NOT

- **不是新的 gate**。不检查 Agent 行为，只检查测试资产的存在性。
- **不是新的 test framework**。`assertHintQuality` 是一个普通断言函数，用 `node:assert` 实现，零依赖。
- **不是 runtime controller**。审计脚本是离线静态分析，不在 bundle 运行时执行。
- **不替代真实验证**。deterministic 测试证明 Engine contract 被遵守；Agent 能否真正利用 hints 导航修复，仍需要 controlled E2E playbook 观察。

---

## 4. Implementation Specification

### 4.1 `tests/helpers/assert-hint-quality.mjs`（新增）

```
export function assertHintQuality(json, opts = {}) {
  // opts.expectedRuleCount: number | undefined — 期望的独立根因数量
  // opts.hints: Array<{ rule_id?, missing_fact?, write_to?, rerun? }> | undefined — 精确匹配

  // 1. 验证 check.passed === false 时 hints 存在
  // 2. 验证 hints 是数组且长度 > 0
  // 3. 对每个 hint：验证 rule_id/missing_fact/write_to/rerun 都是非空字符串
  // 4. 验证 rerun 字符串包含 "node" 和 gate/cli 名称（可执行命令的基本形状）
  // 5. 如果 opts.expectedRuleCount 给出，验证 hints.length === expectedRuleCount
  // 6. 如果 opts.hints 给出，验证每个期望 hint 都在实际 hints 中存在匹配
}
```

### 4.2 修改现有测试（渐进）

不要求一次性改完。首次 apply 时至少覆盖：
- `check-gate-wave1-complete`（最常见的 Agent-facing failure）
- `check-gate-wave2-complete`
- `check-reentry.mjs`（已有结构化输出，最容易加 hint 断言）

后续每次触碰 gate 时附加 hint-quality 测试。

### 4.3 `DPT_FRAMEWORK/cli/audit-gate-test-coverage.mjs`（新增）

第一阶段（最小可行）：
1. 扫描 `DPT_FRAMEWORK/cli/gates/` → gate CLI 列表
2. 扫描 `tests/` 下所有 `.test.mjs` → grep `assertHintQuality`
3. 报告：哪些 gate CLI 没有任何测试引用 `assertHintQuality`
4. Exit 0 = 全覆盖，Exit 1 = 有遗漏

第二阶段（完整）：
1. 解析 gate definition JSON → blocking rule 列表
2. 解析测试文件 → 提取每个 `assertHintQuality` 调用的 `opts.hints[].rule_id`
3. 报告：哪些 blocking rule 没有被任何 hint assertion 覆盖
4. 这一步需要更复杂的静态分析（可能要解析测试文件的 AST）

### 4.4 文件变更汇总

| File | Change Type | Description |
|---|---|---|
| `tests/helpers/assert-hint-quality.mjs` | **New** | 共享 hint-quality 断言函数 |
| `DPT_FRAMEWORK/cli/audit-gate-test-coverage.mjs` | **New** | Gate CLI → test 覆盖审计脚本 |
| `tests/integration/cli/check-gate-wave1-complete.test.mjs` | Modify | 添加 `assertHintQuality` 调用 |
| `tests/integration/cli/check-gate-wave2-complete.test.mjs` | Modify | 同上 |
| `tests/integration/cli/check-reentry.test.mjs` | Modify | 同上 |
| `openspec/config.yaml` | Modify | 新增 governance rule：新增 gate 必须配 hint-quality 测试 |
| `openspec/governance/` | Modify | 添加 audit-gate-test-coverage 到 apply 前检查列表 |

---

## 5. Interaction with Existing Mechanisms

### 与 gate-skeleton spec 的关系

```
gate-skeleton spec (WHAT)
  ├── gate-*.definition.json: 每条 rule 有 blocking_basis + repair metadata
  ├── check-gate-*.mjs: CLI 产出 hints[]（从 rule repair metadata 投影）
  └── ← 本 plan 验证这一步真的发生了 →
  
本 plan (HOW to enforce)
  ├── assert-hint-quality.mjs: 测试里的可复用断言
  ├── audit-gate-test-coverage.mjs: CI 里的覆盖审计
  └── openspec governance: 新增 gate 时的 task 模板约束
```

### 与 Simple Reliable Control 的关系

本 plan 严格遵循 `evolution-simple-reliable-control.md` 的纪律：

- **One Truth Path**：`hints[]` 是唯一的 Agent-facing repair navigation。测试审计确保这个 path 不被绕过。
- **Prerequisites Before Implications**：审计先检查 gate CLI 是否存在（parent），再检查其 rule 覆盖（dependent）。
- **Blocking Rule Burden of Proof**：审计脚本本身的 blocking 行为保护的是"Agent 不会因缺失导航而猜错"这一确定性底线。
- **State Must Own Irreplaceable Truth**：测试覆盖数据是 derived projection——不新增持久状态。
- **Recovery Stays Explicit**：测试失败 → 明确的"缺少 hint-quality 测试"报告 → 开发者加测试 → rerun 审计。
- **One Next Action**：审计失败时输出"gate X 缺少 hint-quality 测试，在 tests/integration/cli/check-gate-X.test.mjs 中添加 assertHintQuality 调用"。

### 与 Helper-Oriented Agent 的关系

- **Agent Executes Legal Mechanical Work（原则2）**：Agent 能执行修复的前提是 Engine 提供了精确导航。测试确保导航存在且正确。
- **Preserve Agent Intelligence（原则6）**：Engine 不保留静态 contract lineage。测试验证 Engine 确实通过 `hints[]` 分享了这些知识。
- **No Help Through Fabrication（原则5）**：测试验证 `write_to` 指向合法 surface/operation，不手写 authority。

---

## 6. Migration Path

### 渐进收敛策略

不要求一次性覆盖所有 gate。分三层递进：

1. **立即**：创建 `assert-hint-quality.mjs` + `audit-gate-test-coverage.mjs`（最小可行版：只检查 gate CLI → 测试文件的存在性映射）
2. **随 gate-skeleton apply**：修改 3 个核心 gate 的测试（wave1-complete, wave2-complete, check-reentry），加入 `assertHintQuality` 调用
3. **随后续 change**：每次触碰 gate 时，审计脚本自动发现该 gate 是否已有 hint-quality 测试，没有则阻塞

### 对已有 Bundle 的影响

零。本 plan 只涉及测试资产和 CI/apply 流程。不修改任何 bundle 运行时行为。

---

## 7. Verification

### 审计脚本自测试

- **Test A**：所有 gate CLI 都有对应的 hint-quality 测试 → audit exit 0
- **Test B**：新增一个 gate CLI（如 `check-gate-new-thing.mjs`）但无对应测试 → audit exit 1，输出明确指出缺失的 CLI 名称
- **Test C**：已有测试文件存在但没有 `assertHintQuality` 调用 → audit exit 1
- **Test D**：测试文件有 `assertHintQuality` 但传的 gate 名称不匹配 → audit exit 1

### 断言函数自测试

- **Test E**：合法 hints JSON → `assertHintQuality` 不抛出
- **Test F**：缺少 `write_to` 的 hint → throws with "hint[0].write_to is empty"
- **Test G**：`rerun` 不包含 "node" → throws with "hint[0].rerun 不包含可执行命令"
- **Test H**：`check.passed === false` 但 `hints` 为空数组 → throws

### Controlled Agent Observation（deferred）

最终验证：构造一个已知会触发 gate 失败的 bundle fixture，让真实 Agent 读取 `hints[]` 输出并执行修复，观察 Agent 是否能不读 JS 源码完成修复+rerun。这属于 controlled playbook，不在本 plan 的 deterministic 测试范围内。

---

## 8. Risks

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| 审计脚本的静态分析不够精确（误报/漏报） | Medium | Low-Medium | 第一阶段只做 gate CLI→测试文件的存在性映射，不解析 AST；先确保简单可靠再增强 |
| 开发者绕过审计（测试文件存在但断言故意写得很松） | Low-Medium | Medium | Code review + `assertHintQuality` 强制检查字段非空，不能传空对象 |
| 审计脚本本身成为新的阻塞点（CI 失败但实际测试已覆盖） | Low | Medium | 审计脚本自测试 + 允许显式 allowlist（如 gate 确实没有可自动化测试的失败路径） |
| 测试助手的 API 设计不够灵活，测试写起来别扭 | Medium | Low | `opts` 全是可选的；最简调用 `assertHintQuality(result)` 只做结构检查 |

---

## 9. Open Questions

1. **审计脚本放在 `DPT_FRAMEWORK/cli/` 还是 `tests/`？** — 建议放 `DPT_FRAMEWORK/cli/`，因为它是 Engine-owned tooling，审计的是测试资产的完整性。测试资产审计工具放在被测框架内而非测试目录内。

2. **allowlist 机制**：某些 gate 的失败路径需要真实的外部状态（如 network failure），无法在单元测试中构造。审计脚本是否需要 allowlist？ — 建议有，格式为 gate definition JSON 中的 `test_coverage_note` 字段声明 "requires live environment"。

3. **是否应该把 `assertHintQuality` 调用也加到 `experiments_playbook/` 的 controlled E2E 中？** — 长期是的。但 controlled playbook 已经通过观察 Agent 行为间接验证 hint 质量（Agent 能否不读源码完成修复）。可以后续再加显式断言。

4. **`rerun` 字段是完整的 CLI 命令还是结构化参数？** — gate-skeleton spec 说 "exact same Gate CLI checkpoint, using the Engine-resolved absolute bundle root"。建议是包含 `node DPT_FRAMEWORK/cli/gates/check-gate-wave1-complete.mjs --bundle /absolute/path` 的完整命令字符串，Agent 可以直接复制执行。

---

## 10. Bottom Line

这个问题本质上是：**gate-skeleton spec 定义了契约，但没有约束"谁证明契约被遵守"**。

答案不是加一个新的 gate、controller 或 watcher。答案是三层具体约束：
1. **共享断言**（测试怎么写）
2. **覆盖审计**（怎么知道测试写了）
3. **流程约束**（怎么确保下次不会忘）

三层都符合 simple-reliable-control 的纪律：direct facts → simple check → one next action。三层都不新增 runtime state、fallback、controller 或 Agent-facing mode。
