## Why

来源：`_backlog/plans/delegated-attempt-timeout-and-redo-postmortem-修复计划.md` 将修复拆成 Change A 和 Change B。Change A 已经降低“过早 timeout”的概率；本 Change B 只处理剩下的小竞态：命令指定的 work unit 已经变成 `timed_out`，但它的 result 随后到达，并且仍能用该 `work_id` / `queue_item_id` / `kind` / `receipt_nonce` 验证通过。

如果没有一个很窄的 Engine path，Agent 容易手改状态、把旧 result 改写成 retry identity，或者无意义重做。这里不需要一套新系统，只需要一个显式、可审计、足够留痕的 recovery 命令。

## What Changes

- 新增显式恢复命令：
  - `node DPT_FRAMEWORK/cli/operate-work-unit.mjs late-submit <bundle> --work-id <timed_out_id> --result <result.json> --reason <reason>`
- 普通 `operate-work-unit submit` 仍然拒绝 terminal attempts。
- `late-submit` 只恢复命令指定的 `timed_out` attempt；`failed` / `abandoned` 不恢复。
- candidate result 必须按 normal submit 规则验证目标 work unit 的 identity、receipt、outputs、cache trails、source claims、hashes 和 nonce。
- 同一 `queue_item_id` 已经有 submitted replacement 时拒绝。
- retry 还没 submitted 时，删除 queued retry demand 或 abandon claimed retry，然后完成目标 work unit。
- 只追加一条目标 work unit 的 submitted ledger row，并加最小 audit 字段：
  - `late_accept: true`
  - `late_accept_reason`
  - `terminal_status_before_accept: "timed_out"`
  - `superseded_retry_work_ids`
- Gate 只有在 normal submitted-ledger provenance checks 仍然通过时，才计入这条 audited row。
- 更新 work-unit command guidance，让 Agent 知道这是 timeout 后的显式恢复入口，不是普通 submit 的宽松模式。
- 增加 focused controlled coverage：normal submit rejection、explicit late-submit success、replacement-submitted rejection、retry cleanup、audited row gate coverage。

## Non-Goals

- 不让普通 `submit` 接受 `timed_out`、`failed` 或 `abandoned`。
- 不恢复 `failed` 或 `abandoned`。
- 不把旧 output 改写成 retry identity。
- 不新增 work-unit status。
- 不引入 watcher、daemon、queue-complete bypass、manual ledger repair 或环境变量配置。
- 不新增依赖，不使用 Python。

## Modified Capabilities

- `delegated-work-units`: 增加 explicit audited `late-submit` exception。
- `agentic-queue`: late-submit 成功后保持同一 `queue_item_id` 只有一个 durable queue location。
- `agent-output-declaration`: audited row 仍属于 submitted ledger authority class。
- `work-unit-provenance-gate`: 只有 normal provenance checks 通过时才计入 audited late-accepted row。
- `research-wave-experiments`: 覆盖新的显式恢复路径。

## Impact

- 预计实现面：`operate-work-unit`、work-unit submit/terminal transaction helpers、work-unit ledger schema/hash、queue cleanup、command guidance、provenance gate readers。
- 预计测试面：focused engine/CLI/queue/ledger/gate tests，加一个 controlled playbook 更新。
- Requirement IDs：新增/使用 `DEW-015`、`WPG-014`、`RWE-012`；复用 `AGQ-018`、`AGQ-019`、`AGO-003`、`AGO-005`。
- Version bump：target framework version `v0.16`。
