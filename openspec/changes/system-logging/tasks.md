## 1. logger.mjs API 扩展与便捷函数

- [x] 1.1 `createLogger` 加可选 `bundle` option — 设置后所有日志行自动包含 `bundle=<name>`（bundle 名） @impl LOG-005
- [x] 1.2 实现 `logToRun(bundlePath, level, msg, detail?)` — 一次性日志写入，封装 `_logs/run.log` 路径、时间戳、bundle 读取、格式、try/catch 静默 @impl LOG-005, LOC-007
- [x] 1.3 实现 `createRunLogger(bundlePath)` — 返回 `{ info, warn, error, debug }`，内部调 `createLogger({ file, bundle })`，bundle 从 `rb_status.json` 自动读取 @impl LOG-005, LOC-008
- [x] 1.4 实现 `readBundleName(bundlePath)` — 从 `rb_status.json` 读 `bundle` 字段，文件缺失/非法 JSON 时返回 `'<unknown>'`，永不抛错。export 自 `logger.mjs`（与 `logToRun`/`createRunLogger` 同文件，已有 `node:fs` + `node:path`）。`logToRun`、`createRunLogger`、`writeGateAttempt`、queue-manager trace wrapper、subagent-relay trace wrapper 均 import 此单一 helper，避免 5 处重复 `rb_status.json` 读取逻辑 @impl LOG-005, TRW-003

## 2. Agent log CLI

- [x] 2.1 新建 `DPT_FRAMEWORK/cli/log-event.mjs` — `--bundle`/`--level`/`--msg`/`--detail`(可选) flags，内部调 `logToRun()` 写入 @impl LOC-009

## 3. bundle 基础设施

- [x] 3.1 更新 `rb_status.json.tmpl` — 加 `"bundle": ""` 字段；更新 `schema/contracts/status.mjs` `StatusSchema` — 加 `bundle: z.string()`（或 `.passthrough()` 兼容存量 bundle）@impl LOC-001
- [x] 3.2 修改 `instantiate-run-bundle.mjs` — 将 bundleName 作为 `bundle` 写入 `rb_status.json`；调 `traceInit` 写 `run_start` trace；调 `logToRun` 写首条 log 行 @impl LOC-001, LOG-004, TRW-004
- [x] 3.3 修改 `gate-helpers.mjs` `writeGateAttempt()` — 从 `rb_status.json` 读 `bundle`（via `readBundleName()`），注入 trace JSONL 入口（加 `bundle` 字段）；log 部分改用 `logToRun(bundlePath, level, 'gate_attempt', { gate, passed, currentNodeRef, next, inspect_count, advice_count })`——gate 信息进 detail JSON，msg 固定为 `'gate_attempt'`；删除旧的手写 `appendFileSync` log 块 @impl LOC-001, LOC-002, TRW-003, GSK-005
- [x] 3.4 审计所有写 `rb_status.json` 的代码路径 — 确认均经 `StatusSchema.parse()`，无局部对象整体覆盖（防止 `bundle` 在 run 生命周期中途丢失，见 design D8）@impl LOC-001
- [x] 3.5 更新 `inspect-bundle.mjs` `REQUIRED` 数组 — 加 `_logs/run.log`。bundle 实例化后此文件即存在（task 3.2 写首条 log），inspect-bundle 应验证其存在性 @impl LOC-002

## 4. Gate 写路径统一

- [x] 4.1 转换 `check-gate-hitl1-recorded.mjs` — 删除 inline `appendFileSync`→`rb_trace.jsonl` 块，改用 `writeGateAttempt(bundlePath, result)` @impl GSK-005
- [x] 4.2 转换 `check-gate-instantiation-complete.mjs` — 同上 @impl GSK-005
- [x] 4.3 转换 `check-gate-readiness-passed.mjs` — 同上；额外清理：本地 `readAllTraceEvents()` → 共享 `readTraceEvents()` @impl GSK-005
- [x] 4.4 转换 `check-gate-seed-topics-ready.mjs` — 同上 @impl GSK-005
- [x] 4.5 转换 `check-gate-setup-ready.mjs` — 同上 @impl GSK-005
- [x] 4.6 转换 `check-gate-wave0-complete.mjs` — 同上 @impl GSK-005
- [x] 4.7 转换 `check-gate-wave1-complete.mjs` — 同上 @impl GSK-005
- [x] 4.8 转换 `check-gate-wave2-complete.mjs` — 同上 @impl GSK-005

## 5. Engine Logger 激活

- [x] 5.1 修改 `queue-manager.mjs` — import `createRunLogger`, `readBundleName`；在 `loadQueue` 入口懒初始化 `_log`；修改 `traceEntry` wrapper 注入 `bundle`（via `readBundleName(bundleDir)`）；在 enqueue/claim/complete/fail/preempt/refill 时调用 `_log.info/warn()`（已有 `traceEntry()` 旁）@impl LOC-006
- [x] 5.1a 修改 `render()`（line 608）— 在 projection epigraph 行中加 runtime coordinates：`> **Runtime** — bundle: \`<bundleDir>\` | CLI: \`--bundle <bundleDir>\` | projection ≠ authority`。`bundleDir` 是 `render()` 已有参数，不新增 import。Phase Agent 每次读 queue projection 时被提醒 `--bundle` 值，降低 OQ#1 的"忘记 bundle 路径"子风险 @impl LOC-006
- [x] 5.2 修改 `subagent-relay.mjs` — import `createRunLogger`, `readBundleName`；在首个 public 函数入口懒初始化 `_log`；修改 `traceEntry` wrapper 注入 `bundle`（via `readBundleName(bundleDir)`）；在 slot_create/dispatch/spawn/result/collect/merge 时 `_log.info()`；在 `forkAndStageSubagents()` 和 `collectAndMergeSubagentResults()` 两处 repair 触发点（**调用方**，非 `convergeRepair` 内部）：`_log.warn('repair', { trigger, iterations })` **且** `traceEntry('repair', { trigger, outcome, iterations })`——`trigger` 分别为 `'fork_reject'` 和 `'all_subagents_failed'`；charter `framework-runtime-boundary.md:278` MUST 要求 repair events 进入 `rb_trace.jsonl`，单有 log 不满足 @impl LOC-006, TRW-003

## 6. inspect-bundle 可观测性扩展

- [x] 6.1 实现 `--summary` flag — 读取 `rb_trace.jsonl`，调 `traceSummary()`，输出 `{ events, passed, failed }` 表。额外输出 `_logs/run.log` 行数统计（`log: N lines`）；若行数为 0，输出 `[warning]` 提示日志可能静默失败（不改变 exit code）@impl LOC-005, TRW-004
- [x] 6.2a 实现 `--timeline` sink 读取器 — JSONL sink parser（`rb_trace.jsonl`、`_trace_subagent.jsonl`、`_trace_agq_cli.jsonl`）：逐行 `JSON.parse`，遇 unparseable 行跳过并收集 warning；free-text sink parser（`_logs/run.log`）：regex 解析 D6.1 信封格式 `[ISO8601] LEVEL msg bundle=<name> {optional JSON}`，遇无法解析行原样标注 `[unparsed]` 插入尾部，不 crash @impl LOC-005
- [x] 6.2b 实现 `--timeline` merge 引擎 — 从上述 reader 收集所有带 `ts` 的条目，按 `ts` 排序合并输出，每行标注来源 sink（`[trace]`/`[subagent]`/`[queue]`/`[log]`）。依赖：task 1.4（`readBundleName`）、5.1、5.2（engine trace wrapper 注入 bundle）必须先完成——否则 3 个 JSONL sink 无 `bundle` 字段，无法按 bundle 标注 @impl LOC-005
- [x] 6.3 实现 `--log` flag — 输出 `_logs/run.log` 全部内容 @impl LOC-005

## 7. Guidelines 文档体系

- [x] 7.1 新建 `guidelines/logging-conventions.md` — 宪章级日志约定：双通道哲学、API surface（logToRun/createRunLogger/log-event.mjs）、level 选择、.mjs 模式、.md `## Log` 段约定、decision table（log vs trace vs both）、MUST/MUST NOT @impl LOC-001, LOC-002, LOC-003, LOC-004
- [x] 7.2 更新 `guidelines/README.md` — reading order 和 guidance map 中加入 `logging-conventions.md`；更新所有 guideline 的 `siblings` frontmatter
- [x] 7.3 更新 `guidelines/framework-runtime-boundary.md` — "Trace 是真相，Log 是解释" 节加前向指针到 `logging-conventions.md`
- [x] 7.4 更新 `DPT_FRAMEWORK/README.md` — run bundle 外形节提及 `_logs/run.log`

## 8. Phase Node ## Log 段

- [x] 8.1 `phase-instantiation.md` — 加 `## Log` 段（引用 `log-event.mjs` 命令）@impl LOC-004
- [x] 8.2 `phase-hitl1.md` — 同上 @impl LOC-004
- [x] 8.3 `phase-setup.md` — 同上 @impl LOC-004
- [x] 8.4 `phase-seed-topics.md` — 同上 @impl LOC-004
- [x] 8.5 `phase-wave0.md` — 同上 @impl LOC-004
- [x] 8.6 `phase-wave1.md` — 同上 @impl LOC-004
- [x] 8.7 `phase-wave2.md` — 同上 @impl LOC-004
- [x] 8.8 `phase-hitl2.md` — 同上 @impl LOC-004
- [x] 8.9 `phase-readiness.md` — 同上 @impl LOC-004
- [x] 8.10 `phase-final.md` — 同上 @impl LOC-004

## 9. 验证与收尾

- [x] 9.1 运行 `node --test tests/engine/logger.test.mjs tests/engine/trace.test.mjs` — 已有测试全 PASS
- [x] 9.2 扩 `tests/engine/logger.test.mjs` — 新增 LOG-005 用例：`logToRun()` 写出 `[ISO8601] LEVEL msg bundle=<name> {detail}` 且从 `rb_status.json` 读 bundle；`createRunLogger()` 返回绑定 `_logs/run.log` 的 `{info,warn,error,debug}`；`_logs/` 不可写时 `logToRun()` 静默不抛 @impl LOG-005
- [x] 9.3 扩 `tests/engine/helpers/gate-helpers.test.mjs` — `writeGateAttempt()` 注入 bundle：`rb_trace.jsonl` 的 `gate_attempt` 与 `_logs/run.log` 行均含与 `rb_status.json` 一致的 `bundle` @impl GSK-005, TRW-003
- [x] 9.4 新建 `tests/cli/log-event.test.mjs` — `log-event.mjs` 写 `_logs/run.log`；`--bundle` 目录不存在时 exit(0) 不抛；`--detail` JSON 正确附加 @impl LOC-009
- [x] 9.5 扩 `tests/integration/cli/inspect-bundle.test.mjs` — `--summary` 输出 pass/fail 表与计数；`--log` tail `_logs/run.log`；`--timeline` 跨 sink 按 ts 排序并标注来源；默认（无 flag）行为与 exit code 语义不变 @impl LOC-005
- [x] 9.6 扩 schema 测试 — `StatusSchema` 接受并保留 `bundle` 字段；`rb_status.json.tmpl` 含 `"bundle": ""` @impl LOC-001
- [x] 9.7 集成断言 — disposable bundle 实例化后 `rb_trace.jsonl` 首行为 `run_start`、`_logs/run.log` 首行含 `bundle`；跑 2+ gate 后两文件 `bundle` 一致 @impl TRW-004, LOG-004
- [x] 9.7a 格式一致性 — 验证 `logToRun`/`createRunLogger`/`log-event.mjs`/`writeGateAttempt` 产生的所有 log 行均符合统一信封 `[ISO8601] LEVEL msg bundle=<name> {optional JSON}`；`--timeline` 单 regex 可解析全部 4 个来源 @impl LOC-002
- [x] 9.7b 确认 `plan-hostfile-sections` 交互 — `gate-helpers.mjs` 新增函数（`writePlanProgress`/`readTraceEvents`/`readBundlePlan`/`parseMdFrontmatter`/`stripMdFrontmatter`）与本 change 的 `writeGateAttempt` 改造无冲突；`instantiate-run-bundle.mjs` 仅本 change 写入；`check-gate-setup-ready.mjs` 中两个函数调用点共存
- [x] 9.8 运行 `node openspec/governance/check-project-reqs.mjs` — 0 duplicate / 0 orphan / 0 unregistered / 0 reusedRetired
- [x] 9.9 运行 `node openspec/governance/check-project-specs.mjs` — 0 deltaHeaderInMain / 0 missingPurpose / 0 missingRequirements / 0 missingReqHeader
- [x] 9.10 手动 smoke — disposable bundle，验证 `inspect-bundle --summary/--timeline/--log` 输出

## 10. Command Experiment

单元测试验证每个写入点的格式正确性，但证明不了 agent workflow 里真正发生的事——不同进程 append 同一文件的时间戳顺序、Agent 从 `## Log` 段复制 bash 命令执行、4 个 sink 真实交织后的 `--timeline` 解析、`bundle` 在 run 生命周期中途不丢失。这些是 agentic-mechanism 问题，只有 command experiment 能回答。

实验 family：`exp_system-logging`，group 7。两个 case：

- **case-71**：主 Agent + gate 路径（light）。纯 CLI/JS，不启动 subagent。验证 `writeGateAttempt` + `log-event.mjs` + `logToRun` 三种写入源产生统一信封、`bundle` 一致、`--timeline` 单 regex 全解析。
- **case-72**：engine + subagent 路径（standard/heavy）。验证 `queue-manager.mjs` 和 `subagent-relay.mjs` 的 logger 激活，closed-set 事件写 log + trace，engine log 行与 gate/Agent log 行在 `_logs/run.log` 中自然交织。

两个 case 合在一起覆盖全部 4 个写入源（gate/Agent/queue-manager/subagent-relay），证明统一信封 + bundle 传播 + timeline 缝合的完整闭环。

- [x] 10.1 新建 `experiments_playbook/exp_system-logging/` — 实验目录；含 `EXPERIMENT.md`（mechanism/hypothesis/result）@impl LOC-001..009
- [x] 10.2 新建 `experiments_env/prototype-system-logging/` — fixture 目录，含 `EXPERIMENT.md`
- [x] 10.3 新建 `case-71-light-unified-envelope.md` — 主 Agent + gate 路径：创建 bundle → 跑 gate → Agent 通过 `log-event.mjs` 写 phase 日志 → `inspect-bundle --timeline` 缝合验证 → trace 裁决 → 清理。**已执行：PASS（10/10 checks）** @impl LOC-001, LOC-002, LOC-009
- [x] 10.4 新建 `case-72-standard-engine-lifecycle.md` — engine + subagent 路径：创建 bundle → queue-manager enqueue/claim/complete → subagent-relay dispatch → 启动真实 subagent → collect/merge → `inspect-bundle --timeline` 验证 engine log 与 gate log 交织 → trace 裁决 → 清理。**playbook 已就绪，待执行** @impl LOC-006
- [x] 10.5 执行 case-71 — coding agent 按 playbook 逐步执行。结果：**PASS**（10 checks：9 normal + 1 boundary gate），bundle 已清理
- [ ] 10.6 执行 case-72 — coding agent 按 playbook 逐步执行（含真实 native subagent），PASS 后清理 disposable bundle
