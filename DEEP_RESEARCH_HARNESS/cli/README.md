# cli/ — Deterministic CLI Tools

## Role

此目录是 Engine 的 CLI surface — 每个 script 是独立的 deterministic 工具，通过 `--flag` 接收参数，输出 JSON 或 documented structured output 到 stdout，通过 exit code 返回 coarse branch signal。

**CLI 不做的事：** 不编排多阶段流程、不做语义判断、不替 Agent 选策略。CLI 是 checkpoint/feedback 层——它告诉 Agent "pass or fail"、"缺什么"、"怎么修"。

## Structure

```
cli/
  gates/                     ← Gate CLI wrappers（每个 gate 一个 .mjs）
    gate-helpers.mjs         ← （位于 engine/helpers/，非此目录）
  instantiate-run-bundle.mjs ← 创建 production run bundle
  inspect-bundle.mjs         ← 审视 bundle 状态
  operate-work-unit.mjs      ← delegated work-unit claim/submit/terminal/inspect
  operate-queue.mjs           ← queue lifecycle: check/enqueue/claim/complete/fail/preempt/count/render/project/repair
  validate-bundle.mjs        ← Zod schema 校验 bundle
  validate-work-unit-hygiene.mjs ← 静态阻止旧 delegated authority surface 回流
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

## Exit-Code Convention

This convention matches `DEEP_RESEARCH_HARNESS/COMMANDS.md`: exit codes are coarse control-flow signals, while stdout JSON / structured output is the Agent's actionable decision surface.

| Code | Canonical meaning |
|------|------|
| `0` | command succeeded, or gate passed |
| `1` | normal repairable failure, validation failure, gate rule failure, or business error |
| `2` | configuration, routing contract, or invocation/caller error |

Gate CLIs preserve the gate-specific tri-state:

- stdout shape is `{ check, routing, inspect, advice }`;
- `check.next` mirrors `routing.next` only when `routing.kind === "next"`;
- `routing.kind: "invalid_input"` or `"config_error"` exits `2`;
- `passed: false` with normal gate/content/preflight failure exits `1`; and
- `passed: true` exits `0`.

`no_transition` 不是 routing error — 它是正常的 runtime outcome（chain 表故意稀疏）。

Non-gate current-state inventory:

- Inspect-wave CLIs emit `{ check, inspect, advice }` without `routing`; they use `0` for inspected structure pass, `1` for inspect failure, and `2` for caller invocation errors such as missing bundle input.
- `check-reentry.mjs` emits structured stdout with `inspect`/`advice`; it uses `0` clean, `1` blockers/drift, and `2` invalid target/args/config/caller request.
- `operate-work-unit.mjs` is the delegated work-unit lifecycle CLI. Successful `submit` is the Engine boundary that completes the queue demand and appends the submitted ledger row. Its public recovery operations are exact:

  ```bash
  node DEEP_RESEARCH_HARNESS/cli/operate-work-unit.mjs recover-declaration <bundle> --work-id <submitted_id>
  node DEEP_RESEARCH_HARNESS/cli/operate-work-unit.mjs recover-transaction <bundle> --tx-id <id>
  node DEEP_RESEARCH_HARNESS/cli/operate-work-unit.mjs supersede <bundle> --work-id <submitted_id> --reason <audit-reason>
  ```

  Read structured output even on a non-zero runtime outcome. `busy` names caller operation/work coordinates separately from holder transaction/operation/target work/queue coordinates and its journal disposition; wait and rerun the exact caller operation at the same checkpoint without inferring physical actor identity, progress, or liveness. `suspect_transaction` permits `recover-transaction` only when the returned `repair_kind`, exact journal `write_to`, and transaction ID select one unlocked proof-complete v2 journal; otherwise `missing_contract` is the boundary. Exact `recover-declaration` precedes `supersede`. A successful supersession returns the predecessor work/queue coordinates, committing transaction, and one `successor_queue_item_id`; use that successor's ordinary actor-observed claim/poll/submit route and rerun the original inspect/Gate. Never manually edit ledger, index, status, queue, lock, journal, or hash authority.
- `operate-queue.mjs` is the queue lifecycle CLI: `check/enqueue/claim/complete/fail/preempt/count/render/project/repair`. `check` exits `0` when the queue is drained or healthy and `1` when blocked or conveying admission feedback. `complete` consumes a result.json (not an enqueue task card). Other verbs exit `0` on success and `1` on repairable failure or invocation error. See `DEEP_RESEARCH_HARNESS/COMMANDS.md` for the full invocation forms.
- `validate-work-unit-hygiene.mjs` is a static production-surface hygiene gate. It exits `1` when removed delegated authority tokens, unsupported provenance check names, or queue/index semantic regressions appear in active framework surfaces. It participates in the guarded parseArgs utility batch: `--help`/`-h` prints the usage line and exits `0`; an undeclared option exits `2` before the gate runs.
- The guarded parseArgs utility batch (`reconcile-plan-progress.mjs`, `audit-phase-status.mjs`, `check-reentry.mjs`, `log-event.mjs`, `validate-work-unit-hygiene.mjs`, `apply-research-style.mjs`) shares one argument-guard helper (`engine/helpers/cli-args.mjs`): a `--help`/`-h` token prints the usage line and exits `0`; an undeclared option or unparseable invocation prints `invocation error` plus the usage line and exits `2` before domain evaluation. This does not generalize the helper to other utilities in this directory.
- Many utility validators are binary `0/1` and do not yet share a common exit helper.
- `log-event.mjs` always exits `0` for diagnostic and logging outcomes of a well-formed invocation, even when a diagnostic log or trace write cannot be completed. This exception keeps logging failure from blocking Agent flow, but it is not evidence that a load-bearing trace event was written. Within the guarded batch, its help token exits `0` with usage and an invocation rejection exits `2`.

Exit codes SHALL NOT encode morale, encouragement, progress pressure, fatigue, or reassurance. Put repair direction and autonomous-continuation reminders in `inspect[]`, `advice[]`, structured diagnostics, or Agent-readable Markdown.

### Selected Public Operation Parsing

Only the following public operations use the canonical topic-state static invocation helper. For each, standalone `--help` or `-h` exits `0` before bundle/input/domain access. Any unlisted positional, duplicate, mixed, unknown, missing-value, or unusable explicit-path form exits `2` with a structured invocation/configuration root before an evaluator, writer, trace append, status mutation, or controls render runs. This is not a claim that every utility in this directory shares that parser.

| CLI | Accepted non-help grammar | Preserved owner/output boundary |
| --- | --- | --- |
| `inspect-wave{0,1,2}-output.mjs` | exactly `--bundle <bundle-path>` | Non-gate `{ check, inspect, advice, hints }`; its existing evaluator owns domain findings. |
| `operate-topic-state.mjs` | `inspect --bundle <bundle-path>`; `schema --context <context>`; `apply --bundle <bundle-path> --input <input-path>`; `recover --bundle <bundle-path> --operation-id <operation-id>` | `schema` is read-only Zod-derived discovery. Invalid retained `apply` input carries safe `validation_errors[]`; topic-state keeps authorization and writing ownership. |
| `enter-phase.mjs` | `--bundle <bundle-path> --node <file-ref> [--full]` | Default presentation is cue, exact status-sync command, target action core, and target-excluding manifest. `--full` additionally returns full loaded closure; entry does not synchronize status or prove target work. |
| `advance-status.mjs` | `--bundle <bundle-path> --to <source-gate-enum>` | Keeps its existing trace-witness validation and remains the sole status writer. |
| `plan-hostfile-sections.mjs` | `render-no-controls`; `render-supplied-controls --input <snapshot-path>` | Prints deterministic text only; it does not resolve, select, or write a bundle. |

Do not reflect an unvalidated token into `write_to`, a rerun command, or a writable coordinate. Read each command's structured output for the direct root and the existing legal next operation.

`advance-status --to` 的 `<source-gate-enum>` 是 `schema/enums.mjs` `CurrentGate` 的 snake_case 值；它与 `workflows/manifest.json` gate key 的对应是机械的 `-` ↔ `_` 替换（例如 `wave0-complete` → `wave0_complete`）。两个单一真相源是 manifest（kebab key、生命周期序）与 enums.mjs（snake enum）；文档不另立手写对照表。

## Gate Output Contract — Structured CLIs Cannot Return Useless Output

Gate CLIs and documented structured-output CLIs are Agent actor 的眼睛。如果它们崩了、返回空 JSON、或 inspect 为空，Phase Agent 通过 Markdown control surface 执行时会不知所措——它不知道该修什么、该往哪走。**容错可以，但不能丢失可操作性。**

**Gate CLI MUST（硬性约束）：**

- **Always valid JSON on stdout**：无论什么情况——bundle 不存在、trace 损坏、YAML 不可解析、rule 炸了——gate CLI 必须输出合法的 JSON（含 `check`/`routing`/`inspect`/`advice` 四个 key），**不能** crash 到 stderr 只留一个 stack trace
- **Fail 时必须给出 actionable inspect**：`check.passed === false` 时 `inspect` 不能为空。Agent 需要知道**具体什么错了**（哪个文件、哪个字段、期望值 vs 实际值）
- **Fail 时 advice 必须给出方向**：`advice` 不能只有空数组。Agent 需要**怎么修**的方向——不是"去修一下"，而是"补建 `artifacts/hitl2/decision-brief.md`，内容从 Wave0/1/2 artifacts 派生"
- **Unknown check type 不能静默跳过**：遇到未实现的 `check` type 时，必须将该 rule 标记为 fail 并在 inspect 中写明 "Unknown check type: xxx"，不能 `continue`
- **Per-rule error isolation**：一个 rule 的 evaluation 抛异常，不能导致整个 gate 崩掉。异常被 catch 后该 rule 标记 fail，其余 rule 继续评估
- **Trace write failure 不能影响 gate result**：`rb_trace.jsonl` 写失败（磁盘满、权限等）时 gate result 仍然正常 emit，trace write 在 try/catch 内

**Gate CLI MUST NOT（禁止行为）：**

- 禁止在 rule evaluation 中 `process.exit()` ——只有 `emitGateResult()` 控制 exit
- 禁止输出纯文本到 stdout 替代 JSON
- 禁止在 inspect 里写"something went wrong" 这种无信息量的消息
- 禁止在无 bundle 时不输出 JSON 就 exit

Non-gate utilities must follow their documented output class. Some are binary validators today; do not describe them as gate-result JSON unless the implementation actually emits that shape.

**为什么这么严：** Agent 在长程任务中依赖 gate/structured CLI 输出做路由和修复决策。输出不清楚 → Agent 猜 → 猜错 → lifecycle 走到错误分支 → 整个 run 废掉。CLI 的可靠性是整个 agentic loop 的地基。

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

Gate CLIs output JSON to stdout. Agent 读取后：
- Gate pass → 读取 `check.next`，通过 `enter-phase --bundle <path> --node <check.next>` 消费 phase handoff
- Gate fail → 读 `inspect`（具体什么错了）和 `advice`（怎么修），repair → rerun

CLI 不会自动修复问题、不会替 Agent 决策、不会在 fail 时继续推进。Non-gate commands must document their own stdout envelope before Agent callers use them for decisions.
