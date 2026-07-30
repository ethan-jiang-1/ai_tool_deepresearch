## Why

`BUG-148`、`BUG-174`、`BUG-179`--`BUG-182`、`BUG-185`、`BUG-186` 暴露的不是八个互不相干的
命令缺口。当前
work-unit 同时有 Phase Agent、delegated actor、result path、lease、transaction lock、queue
terminal history、index 和 submitted ledger，却没有一个可精确叙述的 attempt recovery
contract。结果是可恢复的 lock contention 泄漏为原始 `EEXIST`，Phase Agent 与 sub-agent
能竞争同一结果路径，而提交后的 hash/binding drift 只能靠手改多份 Engine authority 才能继续。

本 change 的读者是正在处理一个 work item 的 Phase Agent。它要回答的有界问题是：
“当前 attempt 由谁执行、哪些 bytes 已由 submitted authority 固化、现在是等待、同一 attempt
修复、终止并创建 successor，还是没有合法路径？”答案不能要求它重建 transaction journal、
ledger/index 镜像、queue history 和 actor 约定。

这里引入的语义层是派生的 **attempt disposition**，而不是新的 controller、persistent status 或
security boundary：它保留会改变答案的区别，即已有 `actor_execution` 所表达的 logical execution
guidance、`work_id` + `receipt_nonce` 的 attempt binding、global transaction lock/journal direct fact、
attempt-scoped result path、submitted historical acceptance、post-submit drift，以及已审计的
supersession relation。正常读者可在此层得到一个动作或明确的 `missing_contract`，无需把“已提交”
“当前 bytes”“可否重做”压成一个含混 status，也无需重建 ledger/index 镜像、queue history 和
actor 约定。这个 logical guidance 不认证物理 actor，也不证明 host 或 sub-agent liveness。

Direct Source of Record 仍是 attempt-bound index/manifest/beacon、global lock 与配对 journal、submitted
ledger row、queue terminal/successor authority；attempt disposition 只投影这些事实，不复制 authority。
最短合法闭环固定为“direct fact -> 既有 owner 或一个具名 Engine operation -> 同一 checkpoint”。净简化来自
删除 raw lock exception、手工多文件修复、双 current-hash mirror、候选 fence/status 和并行 correction
路径，而不是增加 watcher、repair controller 或第二个 Gate。Engine 作 deterministic verdict 并写审计
transition，Agent 读取反馈并执行已授权机械动作，用户只决定新的语义或风险问题；用户同意本身不创造
mutation authority 或 host capability。

来源：`_backlog/bugs/BUG-148-concurrent-work-unit-submit-lock-surface.md`、
`BUG-174-phase-agent-subagent-result-collision.md`、
`BUG-179-ledger-hash-cascade-failure.md`、
`BUG-180-no-legal-submitted-repair-path.md`、
`BUG-181-queue-terminal-no-reactivate.md`、
`BUG-182-uncommitted-tx-blocks-gate.md`、
`BUG-185-index-ledger-dual-hash-storage.md`、
`BUG-186-no-preflight-gate-validation.md`，以及
`_backlog/plans/framework-contract-remediation-openspec-sequence.md` 第 8 节。

## What Changes

- 明确每个 claimed attempt 的 logical `actor_execution`、既有 `work_id` + `receipt_nonce` binding、
  assigned result coordinate 与 controller 的不同责任。Phase Agent 仍可检查、运行 dry-submit 和执行
  已授权 terminal/rework operation，但不能把 delegated actor 的 claimed result path 当作自己的替代
  写入坐标；旧 attempt 的晚到结果也不能借由旧 binding 提交到 successor。该 guidance 不假装认证
  物理 actor 或证明 liveness。
- 将 global work-unit transaction lock contention 投影为稳定的 structured `busy` outcome，包含
  caller 请求的 operation/work ID、持锁 transaction 的 ID/operation/target coordinates，以及同一
  caller operation 的 rerun coordinate。`busy` 只在 schema-valid lock-owner record 与其
  schema-valid non-suspect `work-unit.transaction.v2` journal 精确配对时成立，并公开 holder journal
  disposition；它不是 candidate failure、重新 claim、actor liveness 或 force-timeout 的理由。
  `committed`/`rolled_back` 与尚未释放的 owner lock 只表示 helper 正处于最后释放窗口，仍会造成
  global busy，但不冒充 active attempt mutation。只有 `started` journal target set 包含被检查 work ID
  时，`timeout-preflight` 才把它作为 same-attempt transaction protection；不同 work ID 的合法全局
  contention 仍会阻止当前 mutation，但不得冒充该 attempt 正在执行。未配对、不可读、target
  不一致、proof-incomplete、legacy，或 disposition 为 `suspect` 的 lock/journal 是
  `suspect_transaction`；不得按年龄猜测 stale/dead。
- 为 normal submit/dry-submit 增加仅覆盖 submit-owned direct facts 的 integrity preflight：当前
  index/ledger binding、transaction disposition、queue binding 与可归因的 submitted-integrity
  状态。它复用一个 evaluator；formal submit 在持锁后重新运行，并且不预测或代替 Phase Gate 的
  内容、coverage、count 或 cross-work-unit verdict。
- 采用唯一的 submitted correction model：当 Engine 观测到 eligible post-submit drift，且
  predecessor 的 index/status/terminal-queue authority 仍完整时，
  `supersede` 在 submitted index record 写入一条 audited immutable supersession relation，并创建一条
  fresh successor queue demand。原 `status: submitted`、旧 ledger row 和 terminal history 都保持
  不变；Gate 从 relation 推导它已是 historical non-current coverage。initial successor 或从它经既有
  retry/replacement/再次 supersession contract 唯一到达的 current lineage leaf，必须经普通 claim，
  并由既有 normal submit 或 audited late-submit contract 产生 hash-valid row，才能重新建立 current
  coverage；分叉、循环或 lineage drift fail closed。不得直接 re-activate
  原 queue item、覆盖旧 row、重算 hash
  或从 ledger 向 index 做手工 sync。若缺失 ledger row 可由既有 `recover-declaration` 精确恢复，
  recovery 仍是唯一最近动作；`supersede` 不得成为绕过它的并行动作。index/status/terminal-queue
  authority drift、无法归因到该 predecessor 的 ledger corruption、或损坏的 supersession relation
  一律 fail closed，而不是由 `supersede` 选择赢家。
- 将 submitted hash 的解释方向收敛为 ledger-first。新 claim 以
  `submission_contract_version: work-unit.submission.v1` 固化解释分支；其 current submitted facts 从
  hash-valid ledger row 读取，且 ledger 是 current `result_hash`、`ledger_record_hash` 和 coverage 的
  唯一 authority。新 submitted index record 只保留一枚不可变
  `accepted_ledger_record_hash` acceptance fingerprint，status file 不再镜像 current hashes；fingerprint
  是历史 acceptance relation，不是可重写的 current hash authority。current ledger row 缺失或发生
  可归因 drift 时，supersession 只能在 exact declaration recovery 不可用、durable acceptance evidence
  与其余 parent authority 相容时继续；否则返回 `missing_contract`。legacy supersession 必须复用既有
  submission-presence evidence，而不是只信单个 index/status/trace 字段；历史 mirror 不一致保持
  fail-closed，不能由通用 sync/recompute 命令掩盖。
- 新 journal 使用 `work-unit.transaction.v2`，并将 durable post-operation disposition 收敛为
  committed、rolled_back 或 suspect；只有 committed/rolled_back 是已定案结果，suspect 仍是未决且
  只能由有界 proof 复核的 disposition。legacy v1 只读兼容，不假装拥有 v2 proof。可读、与
  lock-owner record 精确配对的 `started` journal 仅是短暂的 direct transaction fact，不是 liveness
  claim。每个 v2 journal 必须在首次 durable target mutation 前声明完整、无 glob 的 rollback-owned
  authority/canonicalization manifest，以及各 target 的 before-existence/digest；当前 transaction 自己的
  lock/journal 和 append-only audit trace/log 不是 before-image target，也不能隐藏 authority mutation。
  helper 只有在 callback 已停止且写过 post-operation disposition 后才能把 lock release 作为最后动作，
  release 后不得再写 declared target。正常 rollback 后 Engine 立即比对该 proof 并写
  `rolled_back`；未持锁的 orphaned started/suspect journal 只能通过
  `operate-work-unit recover-transaction <bundle> --tx-id <id>` 在相同 proof 证明所有 declared targets
  等于 before-image 时标为 `rolled_back`；已 committed/rolled_back 的 journal 重跑只返回现有 settled
  disposition。任一合法 global holder 都先阻止 recovery；non-suspect v2 pair 返回 honest `busy`，
  legacy/不完整 proof、任一 digest drift 或无法归因/suspect holder 返回 `suspect_transaction` root 与
  `missing_contract` boundary，不偷锁、不推断进程死亡。没有 age-based
  sweep、批量 cleanup 或手工删除建议。
- Gate/inspect 只把 unique current lineage leaf 的 hash-valid submitted ledger row 作为 delegated
  coverage。带有有效 immutable supersession relation 的 predecessor 仍可作为 historical acceptance
  审计，但不能与后继链形成两条并行 success path。只有可由 work ID 明确归因、且满足
  acceptance-evidence contract 的 missing/drifted predecessor row 可在 historical 分支隔离；无法解析或
  无法归因的 JSONL corruption 仍使 ledger fail closed。
- 同步 public operation guidance、structured feedback 和 release metadata 到 `v0.64`。

**BREAKING**：`WorkUnitStatus` 保持 `submitted`，但它不再单独表示 current coverage；current 与
historical coverage 由 immutable supersession relation 加 ledger authority 推导。
`work-unit.submission.v1` attempt 的 index/status 不再保存 current hash mirrors；legacy attempts 保留
显式兼容分支。正式 submit 的 preflight failure 将以 structured integrity/busy/suspect result 返回，
而不是 raw filesystem exception、timeout terminalization 或 Phase Gate prediction。

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `delegated-work-units`: Define logical attempt guidance from existing bindings, submit-owned preflight,
  structured transaction contention/recovery, ledger-first submitted facts, and one audited
  supersession-to-successor path.
- `agentic-queue`: Define the fresh successor queue relation for submitted predecessors with immutable
  supersession relations without
  reactivating or rewriting the parent terminal queue item.
- `work-unit-provenance-gate`: Derive current coverage from ledger authority plus immutable supersession
  relation while retaining historical submitted rows as auditable history.
- `check-inspect-feedback`: Return one root-first legal action for busy, transaction, ownership and
  supersession outcomes without advising authority-file edits.

## Impact

- Expected implementation surfaces: work-unit Zod contracts, claim/envelope/task generation, result and
  receipt validation, transaction/journal helper, submit/dry-submit/inspect/lifecycle code, queue schemas,
  provenance evaluator, `operate-work-unit` CLI and work-unit guidance.
- Expected verification: focused unit tests for derived disposition/existing-binding/journal/hash
  interpretation; CLI integration for concurrent formal submit, active-transaction timeout protection,
  stale result rejection, submit-owned preflight and one-action feedback; deterministic multi-step bundle
  tests for supersession -> successor/current lineage leaf -> existing submit/late-submit and Gate behavior;
  deterministic Markdown integration
  proving every new Engine operation has an Agent-facing caller and exact rerun wording. A future real
  Agent-flow observation may assess whether guidance changes physical writer behavior, but this change proves
  only logical binding and delivered guidance, not physical actor authentication, host liveness, or a
  sub-agent's eventual completion.
- No new dependency, host scheduler, generic repair controller, retry daemon, mutable-ledger workaround,
  direct queue reactivation, lock stealing/dead-process detector, automatic semantic correction, or full Gate
  preflight. `BUG-170` remains observation-gated.
- Version bump is required; the target framework release is `v0.64`.
