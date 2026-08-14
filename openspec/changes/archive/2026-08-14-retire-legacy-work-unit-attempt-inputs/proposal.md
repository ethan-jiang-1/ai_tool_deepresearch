## Why

当前 Engine 仍会把三种历史 work-unit attempt 当成可计算输入：显式
`work-unit.assignment.v1/v2`、缺少 `work-unit.submission.v1` 而依赖 hash
mirror 的记录，以及没有 actor contract 的记录。它们分别保留了旧 assignment
解释、旧 submit/recovery/supersession 和 `legacy_unrecorded` provenance，造成一条
当前 Engine 应只服务当前 contract 却仍有多分支历史成功路径的边界。

用户已在
[`_backlog/plans/current-contract-signal-cleanup/`](../../../_backlog/plans/current-contract-signal-cleanup/)
的 C6a、C6b、C6c 逐项选择 A：拒绝这些旧输入，不迁移、不推断、不静默丢弃。
三项合并门已复核通过，因此本 change 把它们收敛成一个原子边界。

## What Changes

- **BREAKING**：Engine SHALL 只接受完整 current work-unit attempt profile：
  `work-unit.assignment.v3`、`work-unit.submission.v1` 及其 ledger-first immutable
  acceptance representation、`work-unit.actor.v1` 和合法 `actor_execution`，并要求
  index、manifest、beacon 的绑定一致。
- **BREAKING**：在 submit、inspect、recover-declaration、late-submit、supersession、
  submitted-ledger/provenance 与相关 projection 开始计算前，旧/缺失 profile SHALL
  返回一个 Engine-owned `unsupported_current_contract` boundary。该边界必须指出
  直接不支持的 discriminator，不得以 current defaults、路径、hash mirror、runtime
  refs 或旧 guidance 解释、升级或补全记录。
- 删除仅用于旧 assignment v1/v2、markerless hash-mirror 和
  `legacy_unrecorded` actor 的正向 reader/schema/projection/guidance/test 分支；历史
  字节仍可由人读取，但不再构成 current Engine input 或 current provenance。
- 保留并回归验证 current v3 assignment、current `work-unit.submission.v1`、完整
  delegated-subagent 与 authorized Phase Agent fallback、正常/late submit、声明恢复、
  supersession 和 current Gate coverage。
- 不创建 migration、adapter、version router、raw-history display API 或 bundle-wide
  rewrite；不改变 C6d transaction-v1，也不改变 `legacy_non_work_unit_rows` 的诊断处理。

## Capability Discovery

| Candidate path | Evidence read | Decision | Reason |
| --- | --- | --- | --- |
| `agent/delegated-work-units` | accepted work-unit claim, submit, late-submit, actor, recovery and supersession requirements | Modify | Owns the acceptance/recovery contract that currently grants v1/v2, markerless, and actor-unrecorded attempts a positive Engine path. |
| `agent/work-unit-provenance-gate` | accepted submitted-ledger, submission-presence, Wave0 reference-backing, bypass and supersession requirements | Modify | Owns current Gate/inspect treatment of markerless historical acceptance and the Wave0 reference/count backing reader that must not retain old attempt authority. |
| `agent/subagent-node-contract` | accepted generated task/result and assignment-contract requirement | Modify | Explicitly promises marked v1/v2 their recorded output interpretation; that promise must become an unsupported-current-contract boundary. |
| `agent/agent-output-declaration` | accepted declaration/ledger contract | Verify-only | Its current output/ledger facts remain the protected representation after the input boundary changes; it does not own the retired compatibility decision. |
| `agent/agentic-queue` | accepted queue lifecycle contract | Verify-only | Queue lifecycle and replacement demand remain current behavior; no queue state or transition is added or removed. |
| `agent/subagent-dispatch` | accepted current claim/dispatch contract | Verify-only | Current claim continues to write the complete profile; dispatch is not a historical-reader owner. |
| `agent/subagent-runtime-logging` | accepted runtime logging contract | Excluded | Runtime refs stay diagnostic-only and must not be promoted into a compatibility or actor-authority substitute. |
| `research/wave1-intake` | accepted Wave1 current output consumption | Verify-only | It consumes valid submitted backing only; this change must not alter its current evidence semantics. |

No new capability is created: the observable behavior belongs to the three
existing work-unit contracts above.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `agent/delegated-work-units`: Current attempt admission, submit, recovery,
  actor provenance, and supersession accept only the complete current profile.
- `agent/work-unit-provenance-gate`: Gate/inspect provenance readers reject old
  attempt profiles before ledger coverage or historical-lineage computation.
- `agent/subagent-node-contract`: Generated task/result contract no longer
  promises recorded v1/v2 assignment interpretation as a current Engine path.

## Contract Shape And Responsibility

The direct attempt-entry Source of Record is the Engine-owned index record,
cross-checked against its manifest and beacon; a submitted attempt then uses
the Engine-written ledger as coverage authority. The bounded reader question
is: "Does this attempt have the complete current profile?" A `yes` proceeds to
the existing current validation; a `no` stops at one explicit unsupported
boundary. The design keeps malformed/drifted current records distinct from an
old/missing discriminator, but neither can become a fallback success path.

This removes three version-applicable readers and their downstream
normalization/reconstruction branches rather than adding a new router. The
user made the compatibility decision; the Agent performs approved mechanical
work only after Apply authorization; the Engine alone issues the deterministic
accept/reject verdict. A rejection does not create permission to hand-edit,
migrate, or rewrite historical attempt bytes.

## Impact

- Affected Engine/schema readers and projections include
  `work-unit-assignment-contract`, `work-unit-validation`,
  `work-unit-envelope`, `work-unit-submit`, `work-unit-submitted-ledger`,
  `work-unit-inspect`, `work-unit-attempt-disposition`,
  `work-unit-submit-integrity`, `work-unit-timeout-preflight`,
  `helpers/gate-helpers-readers`,
  `work-unit-supersession`, `work-unit-projection`, and the work-unit contract
  schemas.
- Affected deterministic tests cover assignment validation, submit/recovery,
  actor provenance, CLI behavior, Gate provenance, and attempt recovery.
- Affected accepted specifications are limited to the three modified
  capabilities above. No dependency, real run bundle, or historical byte
  migration is introduced.
