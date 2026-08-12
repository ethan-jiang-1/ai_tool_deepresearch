# C6: Drop Legacy Work-Unit Contracts

> 候选 change：`drop-legacy-work-unit-contracts`
>
> 状态：blocked by product decision and L4 evidence
>
> 风险：L4, highest

## 要解决什么

work-unit contract 同时保留 `assignment.v1`、`assignment.v2`、current `assignment.v3`、markerless historical envelope，以及 transaction v1/v2 readers。这些确实降低理解信噪比，但它们不是单纯没有调用的 compatibility code：accepted specs 仍明确将它们定义为 immutable historical records 的 read-only interpretation。

因此这张卡的第一结论不是“准备删除”，而是“必须先决定 current Engine 是否还支持读取旧 work-unit artifact”。

## 已验证事实

| Surface | Current behavior | 风险含义 |
|---|---|---|
| Assignment contract | schema exports v1/v2/v3; records can lack `assignment_contract_version` | markerless path 是显式历史语义，不是 accidental default |
| Assignment reader | `work-unit-assignment-contract.mjs` branches on legacy version | submit/output validation depends on recorded interpretation |
| Lifecycle | current claims write v3; manifest/index/beacon repeat version | current positive writer 已是单一 v3 |
| Transaction | schema has v1/v2; inspect/transaction logic treats v1 as strict read-only legacy branch | recovery/inspection semantics may depend on old journals |
| Accepted spec | `delegated-work-units` says legacy artifacts remain readable and must not acquire v2/v3 behavior | 删除需要修改 explicit product contract |
| Tests | schema, assignment, transaction, submit, recovery and CLI test historical records | test quantity reflects a broad behavior surface, not merely fixture clutter |

## 目标 contract options

这不是技术细节，而是需要明确选择的 product policy：

| Option | Current Engine sees old work-unit artifact as | 优点 | 代价 |
|---|---|---|---|
| A. Current-only hard stop | unsupported artifact | 最低长期复杂度 | 旧 run 无法由 current inspect/recovery/reentry 继续处理 |
| B. Human-only opaque history | 可查看原文件，不进入 Engine computation | 保留人工取证、切断执行兼容 | 要确保所有 reader 都不偷偷消费旧 ledger/receipt |
| C. Retain read-only compatibility | recorded-version reader input | 现行历史/recovery最稳 | 永久保留多个 reader branch，信噪比收益较小 |

本 plan 的 current-only 偏好指向 A 或 B，但不能在没有用户明确确认的情况下替用户选择，因为它会改变历史 run 的可操作性。

## 必须保留的当前语义

- current v3 claim -> actor -> submit 的 immutable assignment contract。
- queue authority、attempt identity、receipt/provenance validation。
- timeout recovery、eligible late-submit、supersession、submitted ledger。
- current transaction v2 的 locking/recovery protocol。
- current schema discriminators，例如 `work-unit.result.v1`、receipt event v1；它们并不自动代表 legacy compatibility。

## 影响面

| Layer | Candidate surfaces |
|---|---|
| Schemas | `schema/contracts/work-unit.mjs`, `work-unit-transaction.mjs`, schema barrel |
| Engine | assignment contract, lifecycle, envelope, validation, submit, inspect, transaction, provenance helpers |
| CLI / guidance | `operate-work-unit`, actor-decision playbook, work-unit Markdown guidance |
| Current research behavior | Gate provenance, Wave source/reference acceptance, reentry/recovery, queue terminals |
| Specs | delegated-work-units, subagent-node-contract, work-unit provenance/gates, related recovery specs |
| Verification | unit, integration, deterministic e2e; possibly Agent-flow contracts where payload guidance changes |

## Failure modes to prevent

- A legacy record accidentally defaults to v3 and is accepted with missing/changed requirements.
- A rejected historical journal leaves a current lock/transaction state misleadingly stuck.
- Removing legacy lookup breaks Gate provenance for a currently selected rerun with historical submitted inputs.
- A broad parser deletion creates a false “clean” result instead of an explicit unsupported-current-contract failure.
- Tests only prove parser rejection but no longer prove current timeout/recovery/supersession paths.

## Proposal before Apply: mandatory evidence gates

- [ ] User decides A, B, or C above; record it in proposal/design as a product decision.
- [ ] Map every current reader of work-unit index, manifest, beacon, receipt and transaction journals, separating active execution from historical inspection.
- [ ] Inventory actual compatible shapes: v1, v2, markerless, transaction v1; include repository fixtures and any selected current bundle evidence if explicitly supplied.
- [ ] Establish characterization coverage for current v3 claim/submit, timeout/recovery, late-submit and supersession before deleting a branch.
- [ ] Design one explicit failure contract for old artifacts, including whether inspection can still output raw coordinates without parsing them as current state.
- [ ] Assess semantic-closure record impact; this is a deterministic fact-family change, not just schema cleanup.
- [ ] Limit the first implementation slice to one artifact family, likely assignment reader or transaction reader, not both.

## Recommended sequence if policy A or B is chosen

1. Write an evidence-only OpenSpec proposal and keep target files unchanged.
2. Add current-path characterization tests and old-artifact rejection/opaque test semantics.
3. Remove one reader family, verify reentry/recovery/Gate behavior, archive.
4. Re-audit before touching the next family; historical artifact semantics are likely to uncover coupling.

## Verification baseline for a future proposal

```bash
node --test tests/engine/work-unit-assignment-contract.test.mjs tests/engine/work-unit-submit.test.mjs
node --test tests/engine/work-unit-transaction.test.mjs tests/engine/work-unit-attempt-recovery.test.mjs
node --test tests/integration/cli/operate-work-unit.test.mjs tests/integration/cli/work-unit-declaration-recovery.test.mjs
node --test tests/e2e/work-unit-attempt-recovery.test.mjs
node DEEP_RESEARCH_HARNESS/cli/validate-workflow-package.mjs
```

## 何时算完成

- [ ] Old artifact policy has user-approved, observable semantics.
- [ ] Each eliminated reader family has a replacement rejection/opaque boundary, not silent inference.
- [ ] Current recovery/provenance/supersession behavior has direct regression evidence.
- [ ] No spec still claims a removed legacy reader remains supported.
