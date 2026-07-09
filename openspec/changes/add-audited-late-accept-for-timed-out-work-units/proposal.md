## Why

`_backlog/plans/delegated-attempt-timeout-and-redo-postmortem-修复计划.md` 建议把 timeout / REDO 修复拆成两个 OpenSpec change。Change A `harden-delegated-timeout-preflight-and-progress-lease` 已经覆盖“timeout 前不要误杀 claimed attempt”。这个 change 是 Change B：处理已经被 terminalized 为 `timed_out`、但随后完整原始产物回来的 work-unit attempt。

当前 accepted contract 让 terminal `failed` / `timed_out` / `abandoned` attempt 的 late submit 全部 fail-closed。这保护了 ledger、queue、nonce 和 gate authority，但也留下一个真实 race：Sub-agent 产物完整、identity 没错、cache/receipt/output 可验证，只是 Main Agent 已经先把 attempt 置为 `timed_out` 并触发 retry。此时不应该手改 result 为新 retry identity，也不应该手写 ledger；需要一个显式、可审计、queue-safe 的 Engine path 接住原 attempt。

## What Changes

- 新增显式命令：
  - `node DPT_FRAMEWORK/cli/operate-work-unit.mjs late-submit <bundle> --work-id <timed_out_id> --result <result.json> --reason <reason>`
  - 普通 `operate-work-unit submit` 对 terminal `timed_out` 仍然拒绝，并继续记录 late-submit rejection diagnostic。
- `late-submit` 只适用于 `timed_out` attempt：
  - `failed` / `abandoned` attempt 继续 fail-closed。
  - `submitted` attempt 只允许既有 duplicate/idempotency 语义；不能通过 late-submit 制造第二次成功。
- `late-submit` 必须复用原 attempt identity：
  - result、runtime receipt、manifest、beacon、index 和 ledger row 必须匹配原 `work_id`、`queue_item_id`、`kind`、`receipt_nonce`。
  - 不把旧产物改写成 retry attempt 的 `work_id` 或 `receipt_nonce`。
- `late-submit` 必须执行和 normal submit 等价的 result / receipt / output / cache / source / nonce / hash validation：
  - 可复用 normal submit 的 canonicalization 和 validation plan，但 late mode 只能放宽“record status 必须是 claimed”这一点。
  - 不允许 metadata-only relabel、hand-written ledger row、path escape、cache/source/receipt validation bypass。
- `late-submit` 必须是 queue-safe transaction：
  - 如果同一 `queue_item_id` 的后续 retry attempt 已经 `submitted` 或已有 submitted ledger row，late-submit 拒绝，不能双 ledger。
  - 如果 retry demand 仍在 `active_window` / `refill_pool`，late-submit 可以移除该 retry demand，并完成原 queue demand。
  - 如果 retry attempt 已经 claimed 但未 submitted，late-submit 可以把 retry attempt terminalize 为 superseded/abandoned，清理 `delegated_in_flight`，并完成原 queue demand。
  - 上述 queue/index/ledger/status/log/trace 变化必须在一个 work-unit transaction 中完成，并验证 durable queue postcondition。
- ledger row 增加 audited late-accept 标记：
  - `late_accept: true`
  - `late_accept_reason`
  - `terminal_status_before_accept: "timed_out"`
  - `superseded_retry_work_ids: []`
  - 可选记录 removed/superseded retry queue demand refs，但不能替代 `superseded_retry_work_ids`。
- gates 继续只读 Engine-written submitted work-unit ledger rows：
  - audited late-accepted row 如果通过同样 hash/nonce/result/cache/source cross-check，计入 delegated coverage。
  - filesystem-only output、hand-written declaration、index-only state 仍不计入 coverage。
- 更新 controlled wave fault-tolerance / late-accept coverage：
  - normal submit after timeout still fails；
  - explicit `late-submit` may pass under strict audited conditions；
  - replacement already submitted 时 `late-submit` 拒绝；
  - queued retry demand / claimed retry attempt 被 late-submit 安全清理或 supersede；
  - failed / abandoned late-submit 拒绝。

明确不产出：

- 不让普通 `submit` 悄悄接受 terminal `timed_out`。
- 不允许 failed / abandoned late accept。
- 不手改历史 ledger row。
- 不允许 old attempt 和 retry attempt 双成功。
- 不绕过 result、receipt、cache、source、nonce、queue binding、hash validation。
- 不实现 pause/resume lease、Engine-owned fetcher、watcher 或 daemon。
- 不新增依赖，不使用 Python。

版本：需要 version bump，target version 为 `v0.16`。implementation 阶段需要更新 `CHANGELOG.md` 和 `DPT_FRAMEWORK/RUN.md` 版本横幅。

## Capabilities

### New Capabilities

- 无。

### Modified Capabilities

- `delegated-work-units`: 增加 audited `late-submit` terminal recovery path，保持 normal submit fail-closed，并定义 queue-safe retry cleanup / supersede transaction。
- `work-unit-provenance-gate`: 让 gate 计入通过 Engine validation 的 audited late-accepted ledger row，同时继续拒绝 non-work-unit / hand-written / filesystem-only authority。
- `research-wave-experiments`: 调整 fault-tolerance coverage，从“late submit after timeout 一律失败”细分为 normal submit 失败、explicit late-submit 严格可通过、replacement submitted 时拒绝。

## Impact

- 预计 implementation 面包括 `DPT_FRAMEWORK/cli/operate-work-unit.mjs`、`DPT_FRAMEWORK/engine/work-unit-submit.mjs`、`DPT_FRAMEWORK/engine/work-unit-lifecycle.mjs`、`DPT_FRAMEWORK/schema/contracts/work-unit.mjs`、gate ledger readers / provenance helpers、work-unit inspect/health projection，以及 controlled experiment playbook。
- 预计测试面包括 work-unit submit / terminal / queue transaction unit tests、CLI integration tests、gate provenance helper tests、fault-tolerance controlled playbook coverage、static/hygiene checks。
- Requirement registry 已登记 `DEW-015`、`WPG-014`、`RWE-012`；apply 和 archive 前必须保持 `node openspec/governance/check-project-reqs.mjs` 与 `node openspec/governance/check-project-specs.mjs` PASS。
- 技术约束保持不变：Node.js >=20，纯 JavaScript ESM，`node:test` + `node:assert`，不新增依赖，不使用 Python。
