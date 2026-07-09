## Why

`_backlog/plans/delegated-attempt-timeout-and-redo-postmortem-修复计划.md` 建议把 timeout / REDO 修复拆成两个 OpenSpec change。这个 change 是其中的 Change A：先防止新的 delegated work-unit 被 wall-clock timeout 误杀。Change B 的 audited late accept 另行处理，不混入本轮。

最近几个已归档 change 已经修掉了相邻问题：

- `2026-07-08-stabilize-agent-facing-work-unit-contracts` 让 generated work-unit task/result/schema 和 submit-time validator 对齐。
- `2026-07-08-parallel-delegated-phase-execution-and-reference-materialization` 让 Wave0/Wave1/Wave2 phase guidance 使用 bounded top-up claim、active polling、submit/repair/terminalize loop。
- `2026-07-09-harden-delegated-preflight-and-fetch-hygiene` 增加了只读 `operate-work-unit dry-submit`，并修掉 JS/Node-first fetch hygiene 与 floor+margin planning。

剩余缺口是 timeout terminalization 仍过硬：

- `claim` 写入 `deadline_at = claimed_at + timeout_ms`，但 timeout eligibility 仍主要来自绝对 wall-clock。
- `operate-work-unit timeout` 对 `claimed` attempt 可直接 terminalize，不先判断是否已有 result、receipt、output/cache 或可 dry-submit 的产物。
- `inspect` 能报告 expired lease，但没有给出 “submit / repair / wait / timeout” 的 deterministic preflight advice。
- phase docs 已经 teach active polling，但 terminalize 前没有强制走 Engine preflight，仍可能在 Sub-agent 已有真实进展时把 attempt 打成 `timed_out` 并触发 REDO。

这会浪费真实 Agent 工作，也会制造后续 late submit 被 fail-closed 的 race。防误杀应该先做；terminal `timed_out` 后的 audited late accept 留给 Change B。

## What Changes

- 新增 `operate-work-unit timeout-preflight <bundle> --work-id <id> [--result <result.json>]`：
  - 检查指定 `claimed` attempt 是否真的 timeout-eligible。
  - 加载 deterministic surfaces：candidate result、identity-matched runtime receipt/log、declared output/cache files、work-unit status/index/queue binding，以及必要时的 dry-submit 等价诊断；其中 status/index/queue binding 是身份与状态检查，不是 progress authority。
  - 输出结构化 `timeout_eligible`、`check`、`recommended_action`、`progress`、`initial_deadline_at`、`lease_anchor_at`、`idle_timeout_ms`、`effective_timeout_at`、`inspect[]`、`advice[]`。
  - `recommended_action` 使用闭合枚举：`submit|repair|wait|timeout|inspect|block`。
  - 未传 `--result` 时检查 assigned result path；传入 `--result` 时按 submit/dry-submit 既有 candidate path 语义预检该 candidate。
  - 当 assigned / provided candidate result 存在且 dry-submit 预计通过时，recommend `submit`。
  - 当 dry-submit 失败但同一 `work_id` 可修复时，recommend `repair`；身份、binding、terminal status 等不可同 attempt 修复的问题走 `inspect` / `block`。
  - 当近期有 identity-matched receipt/log、declared output/cache 或 assigned result 进展且 idle window 未过期时，recommend `wait`。
  - 只有没有可提交产物、没有可修复 candidate、没有未过期 progress lease，或 progress 已超过 idle timeout，才允许 `timeout_eligible: true`。
- 让 `operate-work-unit timeout` 默认受 preflight guard 保护：
  - progress-positive attempt 默认拒绝 timeout，返回结构化 inspect/advice。
  - Engine-owned timeout terminalization path 也默认受同一 guard 保护，不能只在 CLI 层拦截而留下 `closeWorkUnitAttempt(... status: timed_out)` 或等价 exported helper 绕过口。
  - 需要强制 terminalize 时必须显式 `--force`；force 仍应运行 preflight 生成审计摘要，但不被 `timeout_eligible: false` 阻断，并在 trace/log/output 中记录 `forced_timeout: true`、reason、`preflight_timeout_eligible`、`preflight_recommended_action`、`default_timeout_would_refuse`、`effective_timeout_at`、`latest_engine_observed_progress_at`、`lease_anchor_at` 和结构化 `progress_sources[]` 审计明细。
  - no-progress / idle-expired attempt 仍可 timeout，并保留现有 timeout retry 行为。
- 把 lease 语义从纯 wall-clock 提升为 progress-aware：
  - 保留 `deadline_at = claimed_at + timeout_ms` 作为 initial lease hint 和兼容 surface。
  - timeout eligibility 使用 `effective_timeout_at = lease_anchor_at + idle_timeout_ms`；默认 `idle_timeout_ms` 取 work-unit `timeout_ms`，除非已有 accepted runtime/profile surface 明确提供更窄约束。
  - `lease_anchor_at` 是 `latest_engine_observed_progress_at` 或无进展时的 `claimed_at`；`latest_engine_observed_progress_at` 只表示真实 Engine-observed progress，不用 `claimed_at` 伪装。
  - `latest_engine_observed_progress_at` 来自 Engine 可观测事实，优先使用 filesystem mtime / Engine observation time，不把 Sub-agent 自填 receipt `ts` 当作唯一 truth。
  - helper/API 支持注入 `nowMs` 或等价测试时钟；CLI 使用真实当前时间；未来 mtime 不得把 `lease_anchor_at` 推到当前时间之后，也不得把 `effective_timeout_at` 延到 `now + idle_timeout_ms` 之外。
  - 本轮 preflight 默认只读，不通过更新 `last_observed_at` 来延长 lease；如实现阶段发现必须持久化 observation，必须先在 design/evidence 中明确写入 surface、transaction boundary 和 no-authority side-effect proof。
- 更新 Sub-agent role/task guidance：
  - slow fetch/search/cache batches 前后写入 progress receipt/log。
  - 每批 cache/output 写入后写 receipt/log progress。
  - progress receipt 是 timeout preflight 的诊断输入，不是 gate coverage 或 submit authority。
- 更新 Wave0/Wave1/Wave2 phase guidance：
  - active drain loop 在 terminal timeout 前必须跑 `timeout-preflight`。
  - 根据 `recommended_action` 走 `submit`、repair same `work_id`、wait/poll、inspect/block，或最后才 `timeout`。
  - gate 只在 queue demand 和 delegated in-flight attempt 都被 submit/repair/terminalize 后运行。
- 增加回归与 controlled experiment 覆盖：
  - no-progress attempt 仍能 timeout/retry。
  - progress-positive attempt 默认拒绝 timeout。
  - result 存在且 dry-submit pass 时 advice 指向 submit。
  - result 存在且 dry-submit fail 时 advice 指向 repair same `work_id`。
  - `--force` timeout 有审计记录。

明确不产出：

- 不改变 successful submit 语义。
- 不允许普通 `submit` 接受 terminal `timed_out` attempt。
- 不实现 audited late accept；这属于后续 Change B。
- 不改变 gate floors、source floors、reference authority 或 submitted-ledger coverage。
- 不实现 Engine-owned fetcher、watcher、daemon、workflow walker 或 pause/resume lifecycle。
- 不新增依赖，不使用 Python。

版本：需要 version bump，target version 为 `v0.15`。implementation 阶段需要更新 `CHANGELOG.md` 和 `DPT_FRAMEWORK/RUN.md` 版本横幅。

## Capabilities

### New Capabilities

- 无。

### Modified Capabilities

- `delegated-work-units`: 增加 progress-aware `timeout-preflight` 和 guarded timeout terminalization，保留 terminal fail-closed 和 timeout retry 语义。
- `subagent-node-contract`: 要求 slow work 写入可观测 progress receipt/log，让 Engine preflight 能区分“完全无进展”和“慢但正在产出”。
- `research-wave-phase-content`: Wave0/Wave1/Wave2 delegated drain loop 在 timeout 前走 preflight advice，而不是仅凭 expired wall-clock terminalize。
- `research-wave-experiments`: 增加 timeout-preflight / progress lease 的 controlled coverage，同时保留 normal late submit rejection。

## Impact

- 预计 implementation 面包括 `DPT_FRAMEWORK/cli/operate-work-unit.mjs`、`DPT_FRAMEWORK/engine/work-unit-lifecycle.mjs`、`DPT_FRAMEWORK/engine/work-unit-inspect.mjs` 或新增 focused preflight helper、`DPT_FRAMEWORK/schema/contracts/work-unit.mjs`、Wave0/Wave1/Wave2 phase docs、Sub-agent role/task guidance，以及可能的 hygiene/static tests。
- 预计测试面包括 `tests/engine/work-unit-terminal.test.mjs`、`tests/engine/work-unit-inspect.test.mjs` 或新的 timeout-preflight tests、`tests/integration/cli/operate-work-unit.test.mjs`、`tests/integration/md/` phase guidance tests、以及 `experiments_playbook/` 中 focused fault-tolerance/progress-lease case。
- Requirement registry 已登记 `DEW-014`、`SNC-008`、`RWP-018`、`RWE-011`；apply 和 archive 前必须保持 `node openspec/governance/check-project-reqs.mjs` 与 `node openspec/governance/check-project-specs.mjs` PASS。
- 技术约束保持不变：Node.js >=20，纯 JavaScript ESM，`node:test` + `node:assert`，不新增依赖，不使用 Python。
