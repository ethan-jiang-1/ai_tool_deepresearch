## Why

`hitl1` 和 `seed-topics` 阶段被插入 lifecycle 后出现了两类互相叠加的 transition 层问题，使框架无法端到端跑通任何新研究：

**Bug #1 — 初始状态写错**（`_backlog/_bugs/bug-rb-status-next-gate-stale-after-seed-topics-insertion.md`）：transition 相关工件只有一部分跟着更新了。`rb_status.json.tmpl` 的 `next_gate` 仍是旧链值 `wave0_complete`，instantiation-complete gate 在 definition 里"祝福"了这个错值，hitl1 gate 不检查 status，setup-ready gate（已更新）要求 `seed_topics_ready`——矛盾爆发。每个新建 bundle 死在 setup-ready gate。

**Bug #2 — 运行期状态/留痕无写入途径**（`_backlog/_bugs/bug-no-cli-to-emit-phase-trace-or-advance-status.md`）：即使修了 bug #1，过了 setup gate，下一个 phase gate（seed-topics-ready）要求 (a) `rb_trace.jsonl` 里有 `seed_topics_completion` 事件，(b) `current_gate` 已推进到 `seed_topics_ready`，(c) `next_gate` 已推进到 `wave0_complete`。这三样**没有任何 CLI 能做**——`log-event.mjs` 只写 `_logs/run.log`，gate CLI 只写 `gate_attempt`，没有任何工具写 phase-completion trace 事件或推进 `rb_status.json`。结果：seed-topics 及之后每一个 phase gate（wave0/1/2、hitl2、readiness）全部卡死。

**底层同一个根**：lifecycle 的状态推进（status）与完成留痕（trace）没有统一的 Agent-facing 写入 API。散落在三份互不通的日志里（`rb_trace.jsonl`、`_logs/_trace_agq_cli.jsonl`、`_logs/run.log`），且都写不到 gate 读的那个文件。详见 `_backlog/_trainsistion/cc_transition_systemic_analysis.md`。

## What Changes

### 修复初始状态（Bug #1）
- **修复 `rb_status.json.tmpl` 模板**: `next_gate` 从 `wave0_complete` 改为 `seed_topics_ready`（对齐真相源链 setup→seed-topics）
- **修复 `gate-instantiation-complete.definition.json`**: expected `next_gate` 从 `wave0_complete` 改为 `seed_topics_ready`
- **修复 `phase-setup.md` 文档**: 文字中引用的 `next_gate: wave0_complete` 改为 `seed_topics_ready`
- **补全 `gate-hitl1-recorded.definition.json`**: 新增 `status_current_gate` 和 `status_next_gate` 规则

### 提供运行期状态/留痕写入工具（Bug #2）
- **新增 `advance-status.mjs` CLI**: Agent 调用它以 `transitions.chain.json` 为真相源自动推进 `rb_status.json` 的 `current_gate`/`next_gate`，无需手填。终端 gate（readiness_passed）的 `next_gate` 写字符串 `"none"`。
- **扩展 `log-event.mjs` CLI**: 新增 `--event` 参数，有 `--event` 时写 `rb_trace.jsonl`（带 `event` 字段供 `trace_event_present` 匹配）；无 `--event` 时维持现状写 `run.log`

### 退役旧抽象 + 修正相关工件
- **退役 `schema/contracts/gate.mjs` 抽象 FSM**: 加 deprecation banner，改 `tests/helpers/md-phase-checks.mjs` 以 `transitions.chain.json` 为真相源
- **修正 test/实验辅助代码**: `new-disposable-bundle.mjs`、test fixtures、playbook 文档中属于 setup 上下文的 stale `next_gate: wave0_complete` 引用
- **新增回归测试**: 从零 instantiate → 连续跑通 instantiation→hitl1→setup→seed-topics gate，**全程不手编 control file**，断言每个 gate 自然 pass

## Capabilities

### New Capabilities
- `cli-phase-transition`: Agent-facing CLI tools for phase transition — `advance-status`（基于 chain.json 推进 `current_gate`/`next_gate`）和 `log-event --event`（写 phase-completion trace 事件到 `rb_trace.jsonl`）

### Modified Capabilities
- `cmd-bundle-instantiation`: `rb_status.json` 模板初始 `next_gate` 值从 `wave0_complete` 改为 `seed_topics_ready`
- `pre-research-gate-implementation`: instantiation-complete gate 的 expected `next_gate` 值对齐新链；hitl1-recorded gate 补充 status 检查规则
- `pre-research-phase-content`: phase-setup.md 文档中引用的 status 值对齐新链
- `seed-topic-materialization`: 模板初始值描述更新
- `transition-table`: `gate.mjs` 抽象 FSM 退役为 deprecated；`md-phase-checks.mjs` 校验逻辑迁移到以 `transitions.chain.json` 为真相源

## Impact

- **新 CLI**: `DPT_FRAMEWORK/cli/advance-status.mjs`（新增）、`DPT_FRAMEWORK/cli/log-event.mjs`（扩展 `--event`）
- **Template**: `DPT_FRAMEWORK/rb_templates/rb_status.json.tmpl`（line 6）
- **Gate definitions**: `gate-instantiation-complete.definition.json`（line 102-103）、`gate-hitl1-recorded.definition.json`（新增 2 规则）、`gate-rerun-ready.definition.json`（补 `status_next_gate`）
- **Phase docs**: `phase-setup.md`（line 37, 52, 64）、`phase-seed-topics.md`、`phase-wave0.md`、`phase-wave1.md`、`phase-wave2.md`、`phase-hitl2.md`、`phase-readiness.md`、`phase-rerun.md`（8 个 phase body 加 `advance-status` + `log-event --event` 指令）
- **Schema contracts**: `gate.mjs`（deprecation banner）、`md-phase-checks.mjs`（truth source 切换）
- **Test helpers**: `experiments_env/shared/new-disposable-bundle.mjs`（line 95）
- **Test fixtures**: `tests/schema/contracts/status.test.mjs`（line 6）、`tests/integration/cli/check-gate-setup-ready.test.mjs`（line 57,80）、`tests/integration/cli/validate-bundle.test.mjs`（line 35）
- **New test**: `tests/integration/cli/gate-chain-consistency.test.mjs`
- **Live specs**: `openspec/specs/cmd-bundle-instantiation/spec.md`、`pre-research-gate-implementation/spec.md`、`pre-research-phase-content/spec.md`、`seed-topic-materialization/spec.md`、`schema-core/spec.md`
- **Playbooks**: `experiments_playbook/exp_wff_validation/case-51-standard-happy-path.md`、`experiments_playbook/exp_wff_wave-chain/case-125-standard-waves-full-chain.md`
- **Breaking changes**: 无。现有 bundle 如果 `rb_status.json` 的 `next_gate` 仍是旧值 `wave0_complete`，修复后的 instantiation gate 会正确 reject 并给出清晰的 fix 指引——这是期望行为。
