# Design: prototype-gate-loop

## Context

Deep Research 的执行模型需要 **Gate 条件路由 + Repair loop + 动态段加载**。这些机制在 config.yaml 的 C&I 原则里描述了，但没有代码验证。这个 prototype 用可运行的 JavaScript 实验这些模式，成功代码后续提取到 engine 包。

## Goals / Non-Goals

**Goals:**
- 验证 Gate 状态机：条件路由 `(state) → "pass" | "fail"`，pass 加载下一段，fail 进 repair
- 验证 Repair loop：修好后重回 Gate 重判
- 验证动态段加载：Late binding，不预编译整个 DAG
- 验证 C&I 反馈环：Check 失败 → Inspect 诊断 → 反馈 → 纠正

**Non-Goals:**
- 不实现真实业务逻辑（Wave/Gate 审计/证据）
- 不追求生产级质量
- 不建立完整的测试套件
- 不集成到 DPT_FRAMEWORK/

## Decisions

### 1. 纯 JavaScript，无框架

**决策：** Gate 状态机用显式 Map/Object 转换表，不引入 XState 或任何 workflow engine。

```javascript
const GateResult = { PASS: "pass", FAIL: "fail", NEEDS_REPAIR: "needs_repair" };

const transitions = new Map<GateResult, Step>([
  ['pass', nextSegment],
  ['fail', repairSegment],
]);

function gateRouter(state) {
  const result = gate.evaluate(state);
  return transitions.get(result) ?? escalateStep;
}
```

**理由：** 先验证模式，模式对了一个简单的 Map 就够。外部框架是后面的事。

### 2. Repair loop 结构

```
Gate → fail → Repair → Gate → pass → next segment
              ↑                    │
              └── loopback ────────┘
```

```javascript
function repairLoop(state, maxIterations = 3) {
  for (let i = 0; i < maxIterations; i++) {
    const result = gate.evaluate(state);
    if (result === 'pass') return advanceSegment(state);
    if (result === 'fail') state = repairSegment.execute(state);
    if (result === 'needs_repair') state = repairSegment.execute(state);
  }
  return escalate(state); // exhausted
}
```

**关键防护：** `maxIterations` 硬上限 + state hash 检测（状态没变化说明修不了）。

### 3. 动态段加载 — Late Binding

```javascript
const segmentRegistry = new Map([
  ['wave0_search', new Step('wave0_search', (s) => {
    console.log('  🔍 开始搜索 official + academic 来源...');
    console.log('  结果: 3 official + 2 academic = 5 条共享参考');
    console.log('  gate: setup_ready → wave0_complete');
    return { ...s, current_gate: 'wave0_complete' };
  })],
  ['wave0_audit', new Step('wave0_audit', (s) => {
    console.log('  📋 审计共享参考, floor=5 实际=5 → PASS');
    return { ...s, current_gate: 'wave0_complete' };
  })],
  ['wave1_evidence', new Step('wave1_evidence', (s) => {
    console.log('  🔬 深挖独立证据, Topic 01:4条 02:3条 独立率70%');
    return { ...s, current_gate: 'wave1_complete' };
  })],
  ['repair_references', new Step('repair_references', (s) => {
    const before = s.ref_count, after = before + 2;
    console.log('  🔧 补充参考: ' + before + ' → ' + after);
    return { ...s, ref_count: after };
  })],
]);

function loadNextSegment(key) {
  const step = segmentRegistry.get(key);
  if (!step) throw new Error(`Unknown segment: ${key}`);
  return step;
}

// MD 说话 → Segment 做事
function executeMDAndRun(key) {
  const step = loadNextSegment(key);
  const mdPath = `experiments/prototype-gate-loop/segments-gate-loop/${key.replace(/_/g, '-')}.md`;
  const md = readFileSync(mdPath, 'utf-8');
  return { step, md };
}
```

**理由：** Gate 输出 key → registry 解析 → 加载 MD 展示内容 → execute 执行并输出状态变化。MD 名与 key 对应 (snake_case → kebab-case)。段库在 `segments-gate-loop/`，专属 gate-loop 实验。

### 4. C&I 反馈环

```
Check (Zod) → fail → Inspect (诊断) → 反馈 → Repair → 重回 Check
```

```javascript
function checkAndReflect(state, schema) {
  const result = schema.safeParse(state);
  if (result.success) return state;
  
  // Inspect: 生成诊断信息反馈给 LLM
  const diagnostic = inspectFailure(result.error);
  const repaired = reflectAndRepair(state, diagnostic);
  return repaired;
}
```

### 5. 实验痕迹系统 (trace.mjs)

`trace.mjs` 提供全局声明式痕迹记录。每个测试脚本调用 `setTraceFile()` 声明当前活跃文件，后续所有 `traceEntry()` 自动写往该文件。每个 `node` 进程需独立声明。Segments 通过 `traceEntry()` 自动留痕，无需知道文件名。

```javascript
// trace.mjs API
setTraceFile('dpt_rb_test_gl_simple/_trace_gl_simple.jsonl'); // 全局声明
traceInit('label');       // 初始化 (创建或覆盖)
traceEntry('event', {});  // 追加事件
traceSummary();           // 汇总输出
traceCleanup();           // 删除痕迹文件
```

测试 playbook 按复杂度分 3 级，各用独立 bundle 和 trace:
- simple: `dpt_rb_test_gl_simple/` → `_trace_gl_simple.jsonl`
- medium: `dpt_rb_test_gl_medium/` → `_trace_gl_medium.jsonl`
- complex: `dpt_rb_test_gl_complex/` → `_trace_gl_complex.jsonl`

### 6. ANSI 颜色 (无需 npm 依赖)

所有 CLI 输出使用 ANSI escape codes:
```javascript
const G = '\x1b[32m'; // 绿色 PASS
const R = '\x1b[31m'; // 红色 FAIL
const Y = '\x1b[33m'; // 黄色 warn
const C = '\x1b[36m'; // 青色 header
const B = '\x1b[0m';  // 重置
```

已应用: check.mjs, inspect.mjs, 3 级 test playbook (simple/medium/complex)。

## Risks / Trade-offs

- **[Risk] 过度简化** → Mitigation: 实验只验证控制流模式，不追求真实数据
- **[Risk] prototype 代码被当成生产代码** → Mitigation: 放在 `experiments/` 目录，明确标记
