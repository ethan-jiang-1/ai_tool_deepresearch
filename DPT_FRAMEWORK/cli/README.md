# cli/ — Deterministic CLI Tools

## Role

此目录是 Engine 的 CLI surface — 每个 script 是独立的 deterministic 工具，通过 `--flag` 接收参数，输出 JSON 到 stdout，通过 exit code 返回结果。

**CLI 不做的事：** 不编排多阶段流程、不做语义判断、不替 Agent 选策略。CLI 是 checkpoint/feedback 层——它告诉 Agent "pass or fail"、"缺什么"、"怎么修"。

## Structure

```
cli/
  gates/                     ← Gate CLI wrappers（每个 gate 一个 .mjs）
    gate-helpers.mjs         ← （位于 engine/helpers/，非此目录）
  instantiate-run-bundle.mjs ← 创建 production run bundle
  inspect-bundle.mjs         ← 审视 bundle 状态
  validate-bundle.mjs        ← Zod schema 校验 bundle
  validate-workflow-package.mjs ← 校验整个 workflow package 一致性
```

## Gate CLI Pipeline

每个 `check-gate-<name>.mjs` SHALL 遵循同一 pipeline（由 `gate-helpers.mjs` 提供共享函数）：

```
1. parseGateCliArgs()         → { bundle, currentNode, transitions }
2. loadGateDefinition(key)    → { gate, description, rules }
3. validateNodeGateBinding()  → null（OK）或 error message
4. iterate rules              → 对每个 rule 执行对应 check type
5. resolveRouting()           → ask-next（详细路由分类）
6. buildGateResult()          → { check, routing, inspect, advice }
7. append gate_attempt trace  → rb_trace.jsonl
8. emitGateResult()           → JSON stdout + exit(0|1|2)
```

**Step 4（rule iteration）的 check type dispatch 实现在每个 gate CLI 自己内部**——没有统一的 rule evaluator。Common helpers 提取到 `engine/helpers/gate-helpers.mjs` 只有当 ≥2 个 CLI 共用同一 check type 时才做（YAGNI）。

**Step 7（trace append）必须做**：readiness gate 的 `trace_has_all_gates` check 依赖每个 prior gate CLI 在末尾写 `gate_attempt` event。

## Exit Code Contract

| Code | 含义 |
|------|------|
| 0 | gate pass |
| 1 | gate fail（normal — 需要 repair） |
| 2 | routing contract error（`invalid_input` 或 `config_error`） |

`no_transition` 不是 routing error — 它是正常的 runtime outcome（chain 表故意稀疏）。

## Output Contract — CLI 不能返回无意义输出

CLI 是 Agent actor 的眼睛。如果 CLI 崩了、返回空 JSON、或 inspect 为空，Phase Agent 通过 Markdown control surface 执行时会不知所措——它不知道该修什么、该往哪走。**容错可以，但不能丢失可操作性。**

**MUST（硬性约束）：**

- **Always valid JSON on stdout**：无论什么情况——bundle 不存在、trace 损坏、YAML 不可解析、rule 炸了——CLI 必须输出合法的 JSON（含 `check`/`routing`/`inspect`/`advice` 四个 key），**不能** crash 到 stderr 只留一个 stack trace
- **Fail 时必须给出 actionable inspect**：`check.passed === false` 时 `inspect` 不能为空。Agent 需要知道**具体什么错了**（哪个文件、哪个字段、期望值 vs 实际值）
- **Fail 时 advice 必须给出方向**：`advice` 不能只有空数组。Agent 需要**怎么修**的方向——不是"去修一下"，而是"补建 `artifacts/hitl2/decision-brief.md`，内容从 Wave0/1/2 artifacts 派生"
- **Unknown check type 不能静默跳过**：遇到未实现的 `check` type 时，必须将该 rule 标记为 fail 并在 inspect 中写明 "Unknown check type: xxx"，不能 `continue`
- **Per-rule error isolation**：一个 rule 的 evaluation 抛异常，不能导致整个 gate 崩掉。异常被 catch 后该 rule 标记 fail，其余 rule 继续评估
- **Trace write failure 不能影响 gate result**：`rb_trace.jsonl` 写失败（磁盘满、权限等）时 gate result 仍然正常 emit，trace write 在 try/catch 内

**MUST NOT（禁止行为）：**

- 禁止在 rule evaluation 中 `process.exit()` ——只有 `emitGateResult()` 控制 exit
- 禁止输出纯文本到 stdout 替代 JSON
- 禁止在 inspect 里写"something went wrong" 这种无信息量的消息
- 禁止在无 bundle 时不输出 JSON 就 exit

**为什么这么严：** Agent 在长程任务中依赖 CLI 输出做路由决策。CLI 输出不清楚 → Agent 猜 → 猜错 → lifecycle 走到错误分支 → 整个 run 废掉。CLI 的可靠性是整个 agentic loop 的地基。

## 新增 Gate CLI Checklist

新增一个 gate CLI 时 MUST：

1. ✅ 创建 `cli/gates/check-gate-<key>.mjs`，遵循上述 pipeline
2. ✅ 在 `schema/gate_definitions/` 中创建对应的 `gate-<key>.definition.json`
3. ✅ 在 `schema/enums.mjs` 的 `CurrentGate` 中注册 gate key
4. ✅ 在 `workflows/manifest.json` 中注册 phase→gate 绑定
5. ✅ 在 `workflows/transitions.chain.json` 中添加入口/出口 routing
6. ✅ **Write `gate_attempt` trace event**（readiness 审计依赖）
7. ✅ CLI 输出 JSON 包含 `check`、`routing`、`inspect`、`advice` 四个 key
8. ✅ 创建 `tests/integration/cli/check-gate-<key>.test.mjs`（happy path + boundary fail cases）
9. ✅ 更新 `workflows/nodes/shared/shared-gate-rules.md` 的 gate overview 表

## CLI ↔ Agent Communication

CLI 输出 JSON 到 stdout。Agent 读取后：
- Gate pass → 按 `check.next` advance 到 next phase
- Gate fail → 读 `inspect`（具体什么错了）和 `advice`（怎么修），repair → rerun

CLI 不会自动修复问题、不会替 Agent 决策、不会在 fail 时继续推进。
