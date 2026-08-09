## Why

BUG-212、BUG-213 与 BUG-214 不是同一个 runtime 行为，但它们有同一个失效
模式：一个已经由 Engine 建立的 deterministic conclusion，被另一个 consumer
重新从较窄的 raw record 推导。于是同一合法 work-unit attempt 会在 task、dry-submit、
depth review 或 Gate 上得到互相矛盾的答案。

- BUG-214 中，assignment resolver 已为 supplementary Wave1 返回空的
  `required_outputs[]`，生成的 task 也明确“没有 direct output”；但 submit 仍继承
  通用 `output_files.required`，拒绝空 `output_files[]`。
- BUG-213 中，formal submit 已经通过 hash-valid prior submitted-output lineage
  授权 `source_ref`；depth review 却只检查当前 row 的 `output_files[]`，因而拒绝同一
  source claim。
- BUG-212 中，normalized submitted ledger 已将有完整 immutable supersession relation
  的 predecessor 归为 historical；bypass diagnostic 却拿 raw JSONL row 与 normalized
  current set 比较，把 predecessor 误报为手写绕过。

原始问题记录是
`_backlog/bugs/BUG-212-supersede-predecessor-bypass-misreport.md`、
`_backlog/bugs/BUG-213-depth-review-rejects-authorized-prior-source-ref.md` 与
`_backlog/bugs/BUG-214-supplementary-empty-output-files-vs-dry-submit-contract.md`。
它们验证了 Change A 所建立的治理问题：不是再添加一层 schema 或 Gate，而是让每个
outcome-changing consumer 使用其已有的 semantic resolver。

## What Changes

- 为新 claim 引入 `work-unit.assignment.v3`，让其 Wave1 assignment contract 同时决定
  `required_outputs[]` 和 `output_files.required`：`assignment_mode: supplementary` 且没有
  required direct outputs 的合法 attempt 可提交空 `output_files[]`；它仍必须满足当前 source claim、
  cache/degraded-capture、receipt 与 result contract。primary Wave1 的成对
  evidence-summary/question-list obligation 不被放宽，任何已要求 output 的内容验证也不被
  放宽。已 claim 的 v1/v2 attempt 保留其 immutable bound output contract；Wave2 保留其现有
  `output_files.required` 行为。
- 将“accepted `source_ref` 是当前 output 或唯一合法 prior submitted output”的
  authorization conclusion 收敛为 formal submit 和 Wave1 depth review 共用的 resolver。
  prior branch 继续要求 hash-valid ledger、同 canonical Topic UID、同 wave/kind、
  authorized role、无歧义的 exact path，并继续拒绝 filesystem-only、cross-topic、wrong
  role/wave/kind 或损坏 authority。depth review 只消费这个结论及当前 row 的 cache
  binding，不再从 `row.output_files[]` 另写一条较窄的准入规则。
- 让 delegated-bypass diagnostic 以 normalized submitted-ledger/supersession
  conclusion 判断 current 与 historical。raw `rb_output_declarations.jsonl` reader 可继续
  用于显示历史或定位真正未提交的 row，但一个有效 superseded predecessor 不得单凭 raw
  存在而成为 bypass evidence；真正缺失、损坏或手写的 current declaration 仍 fail closed。
- 为三个闭合点添加 focused truth-table proofs 及真实 CLI cross-surface regression：
  supplementary empty-output dry/formal submit、authorized prior `source_ref` 经过 submit
  与 depth review、以及 supersede 后 Wave1 Gate 不报 bypass；相邻的非法 case 保持拒绝。
- 该 change 修改 Harness runtime behavior，需要版本更新，目标为 **v0.82**。Apply 将按
  `governance/version-management` 更新 repo-root `CHANGELOG.md` 与
  `DEEP_RESEARCH_HARNESS/RUN.md` banner；当前缺失的 root changelog 必须先恢复为这一份
  单一版本源，而不是创建 Harness-local 副本。

不新增 runtime state、schema registry、Gate、Agent controller、修复 command、自由
fallback 或第十四个 semantic fact family；不重写其它十个 cataloged fact families，也不把
raw readers 移除或伪装为 authority。

## Capabilities

### New Capabilities

无。

### Modified Capabilities

- `agent/subagent-node-contract`: 明确 generated result/task、dry-submit、formal submit
  与下游 verdict consumer 对 current/prior submitted `source_ref` 采用同一 authorization
  conclusion，并保留 supplementary 的无当前 paired-output 合法路径。
- `agent/delegated-work-units`: 新 claim 用 v3 assignment contract 表达 Wave1
  assignment-derived output declaration requiredness，使 supplementary empty-output submit 与
  generated task contract 一致，同时保留 v1/v2 和其它 kind 的 bound behavior。
- `agent/work-unit-provenance-gate`: 让 delegated-bypass diagnostic 使用 normalized
  ledger/supersession conclusion，并把 superseded predecessor 限定为 historical display
  context。
- `research/wave1-intake`: 让 Wave1 reviewed submitted-backing/depth-review consumer
  使用正式 source-claim authorization，而不是以 current `output_files[]` 重判 prior
  source reference。

## Capability Discovery

| Candidate path | Evidence read | Decision | Reason |
| --- | --- | --- | --- |
| `agent/subagent-node-contract` | `spec.md` SNC-005/SNC-006，特别是 current-or-prior `source_ref`、supplementary lineage 与 result/task/submit parity clauses；`work-unit-validation.mjs#buildSourceRefLineage` and `#validateSourceClaims` | Modify | 它拥有 result schema、task guidance 与 source-claim acceptance contract；需要把已有的 authorized conclusion 明确交给所有 verdict consumer。 |
| `agent/delegated-work-units` | `spec.md` DEW-004/DEW-013 的 assigned output contract、generated projection 与 dry-submit requirements；`work-unit-assignment-contract.mjs#resolveWorkUnitAssignmentContract` and `work-unit-validation.mjs#validateOutputFiles` | Modify | 它拥有 assignment-derived output contract 与 submit preflight。BUG-214 是这个 contract 的 task projection 和 validation consumer 不一致。 |
| `agent/work-unit-provenance-gate` | `spec.md` WPG-001/WPG-007/WPG-016 的 submitted ledger、bypass 与 supersession requirements；`gate-helpers-provenance.mjs#scanDelegatedBypassSuspicion` and `work-unit-supersession.mjs#evaluateNormalizedSubmittedWorkUnitLedger` | Modify | 它拥有 Gate provenance/bypass verdict；BUG-212 要求该 verdict 不从 raw historical row 重新推断 current status。 |
| `research/wave1-intake` | `spec.md` WAI-005 的 reviewed submitted-row and shared convergence contract；`wave1-reference-convergence.mjs#resolveReviewedWave1SubmittedBacking` | Modify | 它拥有 depth-review consumer behavior；BUG-213 在此 consumer 缺失 formal authorization 的 prior branch。 |
| `bundle/file-observability` | Catalog row and `file-observability.mjs` non-authoritative declaration diagnostics | Verify-only | 该 surface 也读取 raw declarations，但本 change 不改变其 file-observation classification；它只需继续不把 raw history 升格为 Gate authority。 |
| `verification/verification-routing` | Catalog row, accepted spec, `verification-routing-contract.mjs`, and current focused/integration test layout | Verify-only | 它确定 proof asset 分类；不改变 test taxonomy、routing schema 或 permission。 |
| `governance/semantic-fact-closure` | Catalog row, accepted SEF-001..004 spec, `semantic-fact-families.yaml`, and Change A record shape | Verify-only | Change B 使用已有 13-family vocabulary 和 closure record；不改变 catalog/checker contract，也不新增 family。 |

## Authority And Control Boundary

本 change 不引入新的 named state、projection、module 或 reader-facing view。它让三个既有
bounded questions 回到各自已有的 resolver：

| Fact family | Direct Source of Record and resolver | Changed consumers |
| --- | --- | --- |
| `work-unit.assignment-output-obligation` | Immutable version-selected assignment binding resolved by `work-unit-assignment-contract.mjs#resolveWorkUnitAssignmentContract` | generated task/result contract; `validateOutputFiles`; dry-submit/formal submit |
| `work-unit.source-claim-provenance` | hash-valid submitted-output lineage resolved from ledger/index/manifest/queue topic binding by `work-unit-validation.mjs#buildSourceRefLineage` and its shared accepted-source-ref decision | `validateSourceClaims`; Wave1 `validateSubmittedClaimBacking` / reviewed backing convergence |
| `work-unit.submission-ledger-and-supersession` | normalized current/historical ledger conclusion from `work-unit-supersession.mjs#evaluateNormalizedSubmittedWorkUnitLedger` | `scanDelegatedBypassSuspicion`; Wave1 Gate diagnostic |

这些 distinction 会改变 legal outcome：无 direct-output obligation 与“required output
content invalid”不同；authorized prior evidence 与 filesystem-only path 不同；historical
predecessor 与未提交 current declaration 不同。每个 resolver 的 result 给出正常的 reasoning
stop point，consumer 不再自己推导另一种答案。

最短合法闭环是：immutable assignment/ledger facts -> one resolver conclusion -> submit,
inspect, Gate consumer -> focused and cross-surface regression。相较于复制三条 raw-row
predicate，这删除或避免了 output-required override、current-output-only source check 和
historical-row bypass comparison三种 duplicate control logic；不增加新的 state、checker chain
或 recovery path。

Agent 仍依照生成 task 撰写 source/cache/result，并在 Engine feedback 后修复。Engine 仍是
assignment、source authorization、submit、Gate 与 trace 的唯一 deterministic verdict owner。
用户不需要执行普通补救，也不因同意该 change 获得绕过 ledger、receipt 或 source provenance
的权限。

## Impact

- Planned implementation surfaces: `DEEP_RESEARCH_HARNESS/engine/work-unit-assignment-contract.mjs`,
  `DEEP_RESEARCH_HARNESS/engine/work-unit-validation.mjs`,
  `DEEP_RESEARCH_HARNESS/engine/helpers/wave1-reference-convergence.mjs`,
  `DEEP_RESEARCH_HARNESS/engine/helpers/gate-helpers-provenance.mjs`, and the smallest existing
  submit/reader wiring needed to carry the resolved facts.
- Planned regression surfaces: existing unit suites for assignment, submit/source validation, Wave1
  convergence and provenance, plus existing CLI integration suites for `operate-work-unit`, Wave1
  convergence/inspect, and `check-gate-wave1-complete`.
- Planning metadata: this change will contain an `affected` `semantic-closure.yaml` with exactly
  `work-unit.assignment-output-obligation`, `work-unit.source-claim-provenance`, and
  `work-unit.submission-ledger-and-supersession`, and `catalog_additions: []`; its
  `verification-plan.yaml` will select the focused unit and CLI integration proofs.
- There are no dependency additions, no API/CLI command additions, and no migration of existing run
  bundle data. Existing v1/v2 attempts retain their recorded output interpretation; malformed,
  unauthorised, ambiguous, or current-required-output cases remain rejected.
