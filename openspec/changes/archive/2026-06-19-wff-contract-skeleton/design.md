## Context

`wff-directory-contract` 已经建立了目录约定：`DPT_FRAMEWORK/workflows/nodes/phases/`、`shared/`、`schema/gate_definitions/`、`cli/gates/` 已创建。本 change 在这些目录中一次性创建全部 ~31 个骨架文件。骨架意味着：frontmatter metadata 完整且正确，body 有最小结构，gate definition 和 CLI 有正确的占位 shape。内容留空或最小，由后续 `wff_content-*` changes 填充。

核心原则来自 `workflow-foundation-requirements.md` §4.3：Node 是 Agent 指令，不是 Engine 程序。Markdown 里的 code block 不应被 Engine 自动执行。

## Goals / Non-Goals

**Goals:**
- 定义 phase node 和 shared node 的 metadata contract（frontmatter 字段及其语义）
- 定义 `manifest.json` 的结构——lifecycle navigation 的 single source of truth
- 创建 9 个 phase node 骨架文件，每个含正确 metadata 和最小 body 结构
- 创建 5 个 shared node 骨架文件，每个含正确 metadata 和 authority 声明
- 创建 8 个 Gate definition JSON 骨架——`gate`、`description`、`rules[]` 占位
- 创建 8 个 Gate CLI 骨架——`--bundle` flag、check/inspect/advice JSON output shape
- 建立 Agent 执行 behavior 的最小约定（spec 层规则，不创建 experiment playbook 文件）

**Non-Goals:**
- 不定义 node body 的完整内容（留给 `wff_content-*`）
- 不定义 gate 的最终 rule set（留给 `wff_content-*`）
- 不实现 CLI 的具体 gate check 逻辑（留给 `wff_content-*`）
- 不修改现有 Engine 代码（`workflow-chain.mjs`、`gate-loop.mjs`）
- 不创建 experiment playbook（那是 `wff-skeleton-validation` 的事）

## Decisions

### D1: Node metadata 用 Markdown frontmatter（YAML 子集）

**决策**：所有 node 的 metadata 用 Markdown frontmatter 表达，字段使用 YAML 子集。

Phase node required fields:
```yaml
node_type: phase
id: phase-wave0
phase: wave0
gate: wave0_complete
next: wave1
stop: "no"
requires: []
suggested_context: []
```

Shared node required fields:
```yaml
node_type: shared
id: shared-profile
shared_scope: profile
authority: guidance-only
requires: []
suggested_context: []
```

**理由**：当前项目已使用 Markdown frontmatter（正则提取 + JSON.parse()）。不需要额外依赖。`node_type` 字段让 loader 和 reviewer 一眼区分 phase vs shared，不需要从文件路径推断。`phase-`/`shared-` 前缀（D9 from wff-directory-contract）与 `node_type` 值一致，形成双重标识。

**替代方案**：用纯 YAML sidecar 文件存 metadata → 拒绝，因为 Agent 加载 node 时需要读两个文件，增加 context 碎片化风险。

### D2: Manifest 作为最小 phase map

**决策**：`manifest.json` 是包含 phase order 和 node→file 映射的最小 JSON：

```json
{
  "phases": [
    { "key": "instantiation", "node": "phases/phase-instantiation.md", "gate": "instantiation_complete", "next": "hitl1" },
    { "key": "hitl1",          "node": "phases/phase-hitl1.md",          "gate": "hitl1_recorded",          "next": "setup" },
    { "key": "setup",          "node": "phases/phase-setup.md",          "gate": "setup_ready",             "next": "wave0" },
    { "key": "wave0",          "node": "phases/phase-wave0.md",          "gate": "wave0_complete",          "next": "wave1" },
    { "key": "wave1",          "node": "phases/phase-wave1.md",          "gate": "wave1_complete",          "next": "wave2" },
    { "key": "wave2",          "node": "phases/phase-wave2.md",          "gate": "wave2_complete",          "next": "hitl2" },
    { "key": "hitl2",          "node": "phases/phase-hitl2.md",          "gate": "hitl2_recorded",          "next": "readiness" },
    { "key": "readiness",      "node": "phases/phase-readiness.md",      "gate": "readiness_passed",        "next": "final" },
    { "key": "final",          "node": "phases/phase-final.md",          "gate": null,                      "next": null }
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

**理由**：Manifest 是 lifecycle navigation 的 single source of truth。Phase metadata 在 node frontmatter 里存一份、manifest 里存一份——但 manifest 拥有 navigation authority（D4 from requirements baseline）。Node frontmatter 是给 Agent 读的便利信息，manifest 是 loader 的实际导航依据。如果两者冲突，以 manifest 为准。

**替代方案**：去掉 manifest，完全依赖 node frontmatter 做 navigation → 拒绝，因为 loader 需要在不打开所有 14 个文件的情况下知道 lifecycle shape。

### D3: Gate definition JSON 的骨架结构

**决策**：每个 gate definition JSON 使用最小但正确的结构：

```json
{
  "gate": "wave0_complete",
  "description": "Verify Wave0 produced minimum shared foundation evidence.",
  "rules": [
    {
      "id": "placeholder_rule",
      "check": "placeholder",
      "target": "placeholder",
      "threshold": null,
      "failure_message": "Not yet implemented."
    }
  ]
}
```

骨架阶段每个 gate 只包含 1 条占位 rule（`check: "placeholder"`、`target: "placeholder"`、`failure_message: "Not yet implemented."`），不包含真实检查逻辑。Rule 结构（`id`、`check`、`target`、`threshold`、`failure_message`）是真实 shape 的最小表达。`check` 的未来合法值（`file_exists`、`schema_valid`、`count_floor`、`status_value`、`trace_event_present`）在骨架阶段不使用——content changes 会替换 placeholder 为真实 rule。

**理由**：后续 content changes 只需要在已有 JSON 里增加 rules，不需要争论 rule shape。骨架阶段不要求 loader/evaluator 能解析这些规则——那是 `wff_content-*` 或 `wff-skeleton-validation` 的事。

**替代方案**：用空 object `{}` 做占位 → 拒绝，因为 reviewer 无法从空 object 判断 shape 是否正确。

### D4: Gate CLI 骨架 shape

**决策**：每个 gate CLI 是一个最小 ESM 脚本，包含：

1. `node:util.parseArgs` 解析 `--bundle <path>`
2. 验证 `--bundle` 必须提供
3. 输出固定的 check/inspect/advice JSON（骨架阶段始终返回 `"passed": true` 或一个占位 pass/fail）
4. `process.exit(0)` on pass, `process.exit(1)` on fail

```javascript
#!/usr/bin/env node
import { parseArgs } from 'node:util';

const { values } = parseArgs({
  options: {
    bundle: { type: 'string' },
  },
});

if (!values.bundle) {
  console.error('Error: --bundle <path> is required');
  process.exit(2);
}

// TODO: Load gate definition, evaluate rules against bundle
// For skeleton phase, returns placeholder pass
const result = {
  check: { passed: true, gate: 'wave0_complete' },
  inspect: [],
  advice: []
};

console.log(JSON.stringify(result, null, 2));
process.exit(result.check.passed ? 0 : 1);
```

**理由**：CLI 骨架验证了调用链（Agent runs `node cli/gates/check-gate-*.mjs --bundle <path>` → gets structured JSON → reads pass/fail），不需要实现真实 gate logic。Shape 正确比逻辑完整更重要——content changes 只填充实现，不改变 interface。

**替代方案**：写空文件 → 拒绝，因为 Agent 无法调用空文件验证 invocation chain。写复杂的真实 gate evaluator → 拒绝，因为那是 content change 的职责。

### D5: Node body 的最小结构

**决策**：每个 phase node body 包含 9 个 section title（内容留空或只有 placeholder），对应 `workflow-foundation-requirements.md` §7.2：

1. Stage goal
2. Required inputs
3. Allowed actions
4. Expected artifacts
5. Gate command
6. On gate pass
7. On gate fail
8. Stop behavior
9. Anti-cheating rules

Shared node body 包含 3 个 section：Purpose、What this covers、Authority boundary。

**理由**：统一 body 结构让 Agent 在每个 phase 看到相同的信息架构——降低 "Agent 不知道该读什么" 的认知负担。Content changes 只需要填充每个 section 的内容。

### D6: Skeleton 完整性标准

**决策**：骨架不要求任何文件有"内容"。正确标准是：
- 每个文件可以被对应的 reader（Agent 或 CLI）"打开"并"解析"
- Agent 可以读 frontmatter 知道这是哪个 phase、下一个 phase 是哪个、跑什么 gate
- CLI 可以被调用、返回合法 JSON

**理由**：`workflow-foundation-requirements.md` §4.5 和 §12 Phase A 的 success criterion 是：Agent 能加载每个 phase，执行 minimum real action，运行 gate，并只在 gate pass 后 advance。Skeleton 阶段不需要 body 内容——只需要正确的 shell 让这个 loop 能演示。

## Risks / Trade-offs

- **[Risk] Skeleton 文件太多，reviewer 可能跳过逐文件检查** → tasks 中包含按 breakdown A01-* checklist 逐文件验证 metadata 的步骤。
- **[Risk] Gate definition JSON skeleton 的 rule shape 在 content phase 被修改** → 接受。骨架只保证"有一个 shape"，不保证"这个 shape 在后续不需要演进"。如果 content change 需要修改 shape，那是那个 change 的职责。
- **[Risk] CLI skeleton 的 `--bundle` flag name 可能与现有 CLI 不一致** → `wff-directory-contract` D7 已经明确 flag 属于 executable command contract。骨架用 `--bundle` 作为 placeholder，最终 flag 由第一个实现真实 gate logic 的 content change 固定。
- **[Trade-off] Manifest 和 node frontmatter 存了重复的 phase 信息** → 接受。双重存储是为了两个 use case：loader 读 manifest 做 navigation（不需要打开 node），Agent 读 node 做上下文理解（不需要查 manifest）。冲突时 manifest wins。
