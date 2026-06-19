## Context

`wff-contract-skeleton` 创建了 31 个骨架文件——14 node MD + manifest + 8 gate JSON + 8 CLI stub。但没有任何东西把这些文件串联成可执行的 lifecycle loop。Engine 代码 (`workflow-chain.mjs`) 有两个兼容问题：`nodePath()` 不接受子目录、`parseFrontmatter()` 只接受 JSON。而且整个 codebase 没有 logging 基础设施——错误靠 `throw`、进度靠 trace event、调试靠 `console.log`。

本 change 的目标不是填 content，而是建基础设施 + 修兼容 + 写通路示范——让 lifecycle shell 在被 content logic 覆盖之前就能跑、能 debug、能审计。

## Goals / Non-Goals

**Goals:**
- 建立 `logger.mjs`——零配置默认用，高级按需开文件，与 `trace.mjs` 对称
- 修复 `workflow-chain.mjs`——加载 `phases/` `shared/` 子目录下的 node，解析 YAML 子集 frontmatter
- 所有 engine 公共函数注入 `logger` optional parameter（`logger = null` silent no-op）
- 写 `walk-lifecycle.mjs`——manifest-driven loop，spawn gate CLI，trace + log 双轨记录
- 实现一个真实 gate（`instantiation_complete` 检查 control files），demonstrate fail → repair → pass

**Non-Goals:**
- 不实现其余 7 个 gate 的真实 logic
- 不填 node body 完整内容
- 不做真实 research、subagent、复杂 queue
- 不修改 gate CLI output shape（保持 check/inspect/advice JSON）

## Decisions

### D1: Logger 默认零配置

**决策**：`createLogger()` 无参数时 console only（`console.log/warn/error`），所有细节由 logger 内部处理——时间戳、level 标签、detail 序列化。调用者只管 `log.info('message')`。

**理由**：降低使用门槛。Engine 代码注入 logger 时传 `null` 就是 silent no-op，传 `createLogger()` 就是 console output。不需要每次调 logger 前检查 logger 是否存在。

### D2: Logger API 与 trace 对称

**决策**：

```javascript
// trace
const trace = createTrace('path/rb_trace.jsonl', { consoleEcho: true });
trace.traceEntry('check', { passed: true });

// logger
const log = createLogger({ file: 'path/_logs/run.log' });
log.info('phase entered', { phase: 'wave0' });
```

两者都是 factory → 返回对象 → 方法调用。`file` option 控制文件输出。默认 `createLogger()` = console only。

**理由**：同一个 codebase 里两个基础设施 API 形状一致，降低认知负担。

### D3: `nodePath()` 允许子目录

**决策**：修改 `nodePath()` 的验证逻辑，允许 `phases/` 和 `shared/` 前缀：

```javascript
export function nodePath(fileRef, nodesDir) {
  if (fileRef.includes('..') || fileRef.startsWith('/')) {
    throw new Error(`Invalid fileRef "${fileRef}"`);
  }
  // fileRef can now be 'phases/phase-wave0.md' or 'shared/shared-profile.md'
  return join(nodesDir, fileRef);
}
```

移除 `basename(fileRef) !== fileRef` 检查，保留 traversal 防护（`..`、绝对路径）。

**理由**：`wff-directory-contract` 已经将 node 放在 `phases/` 和 `shared/` 子目录下。`workflow-chain.mjs` 必须能加载它们。不引入深度嵌套——只允许一层子目录。

### D4: `parseFrontmatter()` 兼容 YAML 子集

**决策**：当前 `parseFrontmatter()` 用 `JSON.parse(match[1])` 解析 `---` 之间的 frontmatter 内容。YAML 子集兼容：尝试 `JSON.parse`，如果失败则用简单的 YAML 行解析（`key: value` per line，arrays as `[a, b]`）。

或者更简单的方案：修改 node frontmatter 内容为合法 JSON（在引号里写值），而不是改 parser。我们的 14 个 node frontmatter 已经用 YAML 写了，14 个文件的修改成本 vs 改 parser 的成本。

**选择**：修改 `parseFrontmatter()` 支持 YAML 子集，因为：
- Node frontmatter 已经是 YAML 且经过 review
- YAML 比 JSON 在 frontmatter 场景下可读性更好
- 改动量小——`JSON.parse` 失败后 fallback 到 YAML 行解析

YAML 子集解析器（最小实现，只处理我们 frontmatter 需要的）：
- 跳过空行和注释行
- `key: value` → value 去掉前后空格，处理引号
- `key:` 后空值 → `null`
- `key: [a, b]` → 解析为数组
- `key:` 后缩进块 → 不处理（我们不用）

### D5: Logger 注入 engine 公共函数

**决策**：所有 `workflow-chain.mjs` 导出的公共函数增加 `logger = null` trailing parameter。与 `trace = null` 一样的 injection pattern。

注入点：
- `assessNode(fileRef, state, runtime, trace, logger)`：入口 "Loading entry node"、出口 "load complete/failed"
- `readMarkdownFile(fileRef, runtime, trace, logger)`：首次读取 "reading file: ..."
- `resolveDependencyClosure(fileRef, runtime, trace, logger)`：解析完成 "resolved N dependencies"
- `loadMarkdownFile(fileRef, runtime, trace, logger)`：cache hit / loaded

**理由**：不传 logger 的人不受影响（`logger = null` silent no-op）。传了 logger 的人获得 engine 内部诊断——这对调试 workflow loading 问题至关重要。

### D6: Lifecycle walker 架构

**决策**：`walk-lifecycle.mjs` 是 manifest-driven 的 synchronous loop：

```
const trace = createTrace('<bundle>/rb_trace.jsonl', { consoleEcho: true });
const log = createLogger({ file: '<bundle>/_logs/run.log' });

load manifest.json from --manifest flag (default: DPT_FRAMEWORK/workflows/manifest.json)
for each phase in phases:
    log.info('Entering phase: ' + phase.key)
    trace.traceEntry('phase_enter', { phase: phase.key })

    load node frontmatter via workflow-chain
    // Agent would read node body here — walker just verifies loadability

    if phase.gate:
        spawn check-gate-*.mjs --bundle <path>
        read JSON from stdout
        trace.traceEntry('check', result.check)
        log.info('Gate: ' + phase.gate + ' → ' + (result.check.passed ? 'PASS' : 'FAIL'))

        if not passed:
            // repair + retry loop
            repair according to inspect/advice
            rerun gate (max 3 retries)
            if still failed → escalate/block

    advance to next phase
print traceSummary()
```

使用 `node:child_process.spawnSync` 调用 gate CLI——简单、可靠、不需要管理子进程生命周期。

Walker spawn gate CLI 时传 `--transitions` flag 指向 Transition Table。Gate 内部调 `askNext()` 查表获取 `next_node`——Walker 从 Gate 响应的 `check.next` 读路由，不再依赖 manifest `next` 字段或 `--next` flag。路由权威在 `transitions.chain.json`。

**理由**：Walker 不是 Agent——它是确定性验证工具。它证明 manifest → load → gate → advance 的链可以走通。Agent 以后会读 node body 并做 decision，但 walker 只验证机械通路。

### D7: 一个真实 gate——`instantiation_complete`

**决策**：`check-gate-instantiation-complete.mjs` 实现一条真实 rule：

```json
{
  "id": "control_files_exist",
  "check": "file_exists",
  "target": "rb_plan.md",
  "threshold": null,
  "failure_message": "Missing control file: rb_plan.md. Create it from rb_templates/."
}
```

Gate evaluator：读取 `gate-instantiation-complete.definition.json`，遍历 rules，对 `file_exists` rule 检查 `--bundle` 路径下文件是否存在。

Walker 演示 fail → repair loop：第一次调用时不创建 `rb_plan.md` → gate fail → log 显示 inspect/advice → walker "修复"（创建文件）→ rerun gate → pass。

**理由**：一个 gate 的真实逻辑足够证明 check/inspect/advice feedback loop。其余 7 个 gate 保持 placeholder——content changes 会按照同样的 pattern 实现。

> **\[wff-state-chain 更新\]** Gate CLI 的路由方式已演进：`--next` flag 被 `--transitions` + `askNext()` 取代。Gate 不再接收 `--next`，改为自己查 Transition Table 获取 next_node。路由权威从 manifest `next` 字段移到 `transitions.chain.json`。

### D8: Retry 和 Escalation

**决策**：Walker 内置 3 次 retry limit（默认，可配置）。No-progress（连续两次 inspect/advice 相同且 repair 无效）→ escalate/block→ 记录到 trace + log。

**理由**：`workflow-foundation-requirements.md` §10 要求 bounded retry 和 no-progress escalation。Walker 先于 Agent 实现——证明这个 control loop 的机械结构正确。

### D9: Experiment 基础设施配对

**决策**：本 change 创建 `experiments/prototype-wff-validation/` + `experiments_playbook/exp_wff_validation/` 一对一配对。

```
experiments/prototype-wff-validation/
  manifest.json                           ← frozen copy（9 phase，不随后续 change 变化）
  nodes/
    phases/                               ← frozen copies of 9 phase nodes
    shared/                               ← frozen copies of 5 shared nodes
  EXPERIMENT.md

experiments_playbook/exp_wff_validation/   ← playbook 入口（light-only）
  test-simple-happy-path.md              ← 9 phase 全部 gate pass
  test-medium-fail-repair.md             ← gate fail → repair → pass 回环
```

**Node 和 manifest 冻结策略**：实验使用 prototype 中的 frozen copies，不读 `DPT_FRAMEWORK/workflows/nodes/`。后续 Change 4/5/6 修改真实 node body 和 manifest 时，Change 3 的 experiment 不受影响——它验证的是 walker 机制，不是 node 内容。

Gate CLI 仍从 `DPT_FRAMEWORK/cli/gates/` spawn——gate 是被测 framework 代码。Node 和 manifest 是测试数据，冻结后不可变。

**Walker `--manifest` flag**：`walk-lifecycle.mjs` 接受可选 `--manifest <path>` flag。默认值 `DPT_FRAMEWORK/workflows/manifest.json`。实验 playbook 传入 `--manifest experiments/prototype-wff-validation/manifest.json`。

两个 playbook 都是 **light**（纯 JS E2E，不 spawn Agent）。Walker 是确定性 CLI，不存在 Agent 决策回路——不符合 command-experiments 的 Applicability Test 中 "Agent-facing mechanism" 条件。当前阶段 proof 目标是：manifest → load → gate → trace + log → advance 的机械通路可重复、可回归。

**HITL 非交互 bypass**：当前 HITL gate（`hitl1_recorded`、`hitl2_recorded`）是 placeholder，直接 return pass——实验无阻塞。未来真实 HITL gate 实现时，gate CLI 通过 `--non-interactive` flag 自动通过（不读 env var）。Experiment playbook 传 `--non-interactive` 即可。

**理由**：`command-experiments.md` 要求 experiment 可重复、可回归。Frozen fixtures 确保 Change 3 的 experiment 不会因后续 change 修改 node 而退化。配对命名使 prototype 和 playbook 的对应关系一目了然，且为后续 wff changes 建立 convention。

## Risks / Trade-offs

- **[Risk] YAML 子集解析器有边界 case 无法处理** → 只实现我们 frontmatter 实际用到的语法（`key: value`、`key: [a, b]`、引号字符串）。遇到不支持的语法时报错退出，不静默跳过。
- **[Risk] `walk-lifecycle.mjs` 变成 hidden workflow runner** → Walker 职责严格限定：验证通关链，不做 research decision，不替代 Agent。它是 dev tool / 验证工具。
- **[Trade-off] 只实现一个真实 gate** → 接受。足够证明闭环。其余 7 个遵循相同 pattern，content changes 时批量实现。
