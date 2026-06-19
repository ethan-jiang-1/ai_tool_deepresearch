> req: LFW-001, LFW-002, LFW-003, LFW-004

## Purpose

定义 lifecycle walker——manifest-driven 的确定性验证工具，端到端证明 skeleton loop 可以跑通。Walker 不是 Agent，不做 research decision；它只验证机械通路：manifest → load node → spawn gate CLI → parse JSON → trace + log → advance。

## ADDED Requirements

### Requirement: Walker reads manifest and walks lifecycle

`walk-lifecycle.mjs` SHALL 读取 manifest.json（默认 `DPT_FRAMEWORK/workflows/manifest.json`，可通过 `--manifest <path>` 覆盖），按 `phases` 数组顺序遍历每个 phase。

每个 phase SHALL：
1. `trace.traceEntry('phase_enter', { phase: key })`
2. 通过 `workflow-chain` 加载对应的 phase node frontmatter
3. 如果 `gate` 不为 null：spawn `check-gate-<name>.mjs --bundle <path> --transitions <path>`，解析 stdout JSON，`trace.traceEntry('check', result.check)`
4. 如果 gate pass：advance 到 `next` phase
5. 如果 gate fail：进入 repair/retry loop，max 3 retries

`phase-final`（gate=null, next=null）SHALL 终止 walker loop。

#### Scenario: Walker completes full lifecycle

- **WHEN** `node walk-lifecycle.mjs --bundle dpt_rb_demo` 被调用且所有 gate pass
- **THEN** walker SHALL 遍历全部 9 个 phase，trace SHALL 包含 9 条 `phase_enter` 事件和 8 条 `check` 事件
- **AND** final traceSummary SHALL 显示 8/8 PASS

#### Scenario: Walker skips gate for final phase

- **WHEN** walker 进入 `final` phase
- **THEN** walker SHALL NOT spawn 任何 gate CLI，SHALL NOT attempt advance（next=null）

### Requirement: Walker demonstrates gate fail → repair → pass

Walker SHALL 能 demonstrate 至少一次 gate fail → repair → rerun → pass 的闭环。

Fail demonstration 方法（至少一种）：
- Gate 检查到 bundle 中缺少 required file → gate fail → walker 接收 inspect/advice → walker 创建缺失文件 → rerun gate → gate pass

Retry 超过 3 次后 SHALL escalate/block 到 trace。

#### Scenario: Gate fail triggers repair loop

- **WHEN** `instantiation_complete` gate 检查到 `rb_plan.md` 不存在
- **THEN** gate CLI SHALL 返回 `check.passed: false`，`inspect` 包含缺失文件名，`advice` 包含修复建议
- **AND** walker SHALL 根据 advice 修复（创建文件）并 rerun same gate
- **AND** rerun 后 gate SHALL pass

#### Scenario: Exceeded retry limit escalates

- **WHEN** gate 连续 fail 3 次且修复无效
- **THEN** walker SHALL 记录 escalation event 到 trace，SHALL 停止循环

### Requirement: Walker logs progress via logger

Walker SHALL 使用 `createLogger({ file: '<bundle>/_logs/run.log' })` 记录执行进度。

每个 phase 的进入、gate invocation、gate result、advance SHALL 有对应的 log entry。

#### Scenario: Walker logs each step

- **WHEN** walker 执行 lifecycle
- **THEN** `_logs/run.log` SHALL 包含以 `[timestamp] INFO Entering phase: instantiation`、`[timestamp] INFO Gate: instantiation_complete → PASS` 等格式的行

### Requirement: Walker requires --bundle flag

`walk-lifecycle.mjs` SHALL 要求 `--bundle` 参数指定目标 run bundle 路径。`--manifest <path>` SHALL 为可选参数，默认 `DPT_FRAMEWORK/workflows/manifest.json`。未提供 `--bundle` 时 SHALL 报错退出。

#### Scenario: Walker called without --bundle

- **WHEN** `node walk-lifecycle.mjs` 被调用且未提供 `--bundle`
- **THEN** script SHALL 输出错误信息并 exit(2)
