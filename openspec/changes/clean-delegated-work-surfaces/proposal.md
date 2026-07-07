## Why

`replace-subagent-relay-with-work-units` 已经归档，work-unit 路径也已经成为当前 delegated work 的正确方向。但当前仓库 surface 里仍有旧 relay/slot 生产语义：未来 coding agent 读 `openspec/specs`、framework docs、tests、playbooks 时，仍可能误以为 `drive-relay-slot`、`_subagents/wave_NN/slot_MM`、`subagent-relay`、`slot_result_ref`、`subagent_slot_presence` 还是生产路径。

这个 change 是卫生清理，不是兼容迁移。项目是滚动开发，旧 relay/slot 生产路径不需要作为 fallback 保留；当前 source-of-truth surface 应该只教新的 work-unit 路径。

## What Changes

- **BREAKING cleanup**：当前 guidance 只暴露一条 delegated production path：queue demand item -> work unit -> sub-agent -> submit -> ledger -> gate。
- Active main specs 停止在正向生产描述里携带旧 relay/slot wording，包括 archive/sync 后残留的 stale Purpose。
- Hygiene validation 扫描 current specs、active change deltas、framework surfaces、shared experiment infra、tests、guidelines、governance metadata、`experiments_playbook/`；唯一排除 `openspec/changes/archive/` 这个历史归档目录。
- Hygiene validation 不只扫旧 CLI/module/path 名，也扫旧 relay 身份字段、事件字段和 helper API，例如 `slotKey`、`roleAgentKey`、`relay_commit_*`、`relay_spawn_*`、`dispatch.json`、`recordAgentSpawnRequested`、`ingestAgentReceipt`、`runProvenanceForensics`。当前 work-unit 字段如 `runtime_receipt_ref` 必须按上下文分类，不能误杀。
- Apply 阶段维护 stale-surface inventory/triage ledger：每个 focused token hit 都必须闭环为 migrated、removed、negative regression、deprecated registry entry、checker/test self-reference，或压缩到不能被读成当前命令指导的 release-history wording。未解决的 `legacy/backlog` 不是 archive-ready 状态。
- Current runnable experiment playbooks 必须使用 `operate-work-unit claim/submit` 或有效的 non-delegated queue path。旧 relay/slot playbook、test、helper code 逐项评估：有当前 work-unit 证明价值就迁移；没有当前证明或诊断价值就从 current surfaces 移除。
- `legacy/backlog` 只能作为 apply-time 临时盘点标签。这个 change 归档后，当前 runner/doc/test surfaces 不保留可见的旧 relay/slot legacy/backlog 表。
- `experiments_playbook/` 的任何 playbook 编辑都必须遵循 `guidelines/command-experiments.md`：Markdown 控 Agent Flow，inline JS 只做薄 deterministic checkpoint。
- `openspec/changes/archive/` 不编辑、不审计为问题来源、不清理。
- 不为 relay/slot 路径增加 runtime compatibility layer。

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `delegated-work-units`：明确 archive 外的 current specs/docs/tests/playbooks 只表达 work-unit delegated path。
- `requirement-traceability`：扩展项目 hygiene gate，拒绝 current surfaces 上的 stale retired production terms、旧 relay 身份字段和旧 relay event families，同时忽略 archived change history。
- `work-unit-provenance-gate`：清理 stale archive-derived Purpose，并确保 provenance-forensics guidance/playbooks 只描述 work-unit signals。
- `playbook-runner`：明确 current runner surfaces 不能把旧 relay/slot playbooks 当作当前证明，也不能长期展示 legacy/backlog 表。
- `agent-testing`：让 real sub-agent experiments 对齐 work-unit-only execution，移除 relay/slot 作为当前实验路径。
- `subagent-directory-contract`：让 capability 读起来是 work-unit envelope/directory contract，而不是 `_subagents/` relay slot authority。
- `subagent-node-contract`：让 sub-agent task/result/lifecycle requirements 绑定 work units，不绑定旧 relay driver/task generation。
- `subagent-dispatch`：让 dispatch 表达 Engine work-unit claim 和 prompt handoff，不表达 bounded relay slots。
- `agent-output-declaration`：让 output declarations 表达 work-unit submit ledger rows，不表达 relay slot result declarations。
- `framework-engine`：让 framework engine/import guidance 命名 work-unit helpers 和 hygiene，不命名 subagent relay mechanisms 为生产路径。
- `repair-loop`：移除 `subagent-relay.mjs` 这个 stale implementation anchor，同时保留 deterministic repair-loop semantics。

## Impact

- OpenSpec change artifacts：`proposal.md`、`design.md`、`tasks.md`、delta specs，以及 apply-time `surface-inventory.md`。
- 后续 apply 阶段只触碰 `openspec/changes/archive/` 以外的 current surfaces：通过 OpenSpec sync/archive 更新 `openspec/specs`，更新 `DPT_FRAMEWORK/cli/validate-work-unit-hygiene.mjs`、focused tests、current docs、shared experiment infra、需要分类文本的 governance metadata，以及相关 `experiments_playbook` runner/playbook surfaces。
- Apply 阶段可以删除已无当前 work-unit 证明或诊断价值的 obsolete current-surface files。
- 不新增 npm dependency。
- 不要求 framework runtime version bump，因为生产 run-bundle 行为不变；这是 spec、hygiene、experiment-surface 清理。
