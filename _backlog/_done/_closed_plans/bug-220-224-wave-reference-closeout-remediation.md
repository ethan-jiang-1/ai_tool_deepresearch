# BUG-220--224 Wave Reference Closeout Remediation

> 状态: completed and archived | 更新: 2026-08-12 | 实现提交: `5503cc37b`
>
> 证据底稿: [active-bugs-220-224-primary-source-research.md](active-bugs-220-224-primary-source-research.md)

## Closeout (2026-08-12)

`repair-wave1-reference-closeout-feedback` 已完成 apply、RWP-015 主规范同步和受治理归档，
归档目录为 `openspec/changes/archive/2026-08-12-repair-wave1-reference-closeout-feedback/`。
它保持一个 convergence resolver、一个 verdict consumer 和一个 derived Phase projection，
没有新增 controller、state、queue、Gate 或第二套 validator。

| Bug | Closeout basis |
| --- | --- |
| BUG-220 | 当前 field-level `finding_id` feedback 保持不变，并加入精确 regression；无 runtime change。 |
| BUG-221 | Phase guidance 已改为 valid depth review -> inspect -> exact-target closeout；locator 细节仍为 implementation regression，不成为 Agent contract。 |
| BUG-222 | submitted-backing root 现在优先于 synthetic null Topic/profile guards，缺失 depth review 保留直接可修复 root。 |
| BUG-223 | supplementary detector 使用 current hash-valid supplementary assignment，遗漏 review 时 public repair 直接指向 `depth-review.yaml#reviewed_work_unit_refs`。 |
| BUG-224 | accepted one-contribution deferred grammar 未改变；playbook 明确 multiple explicit entries、one deferred contribution per packet 和 sequential applies。 |

验证：选定 native unit/integration evidence 通过；`npm test` 以 exit 0 完成，
`2,786` tests / `484` suites 通过、`0` failures；strict validation、semantic closure、
requirements/spec governance 与 archive finalizer 均通过。

## 决策

这批五张卡不应按编号拆成五个 change。当前源码、已接受的 OpenSpec 契约和 focused
tests 表明，真正待修的是同一条 Wave1 post-submit reference-closeout 路径中的三个断点。

| Bug | current-head 分类 | 处置 |
| --- | --- | --- |
| BUG-220 | 已由当前 validation-error projection 覆盖 | 不改 runtime；在同一 change 补一个精确 missing-`finding_id` regression 后结案。 |
| BUG-221 | "仅第一候选"及 Wave0 batch 观察已过时；Wave1 首次 closeout 顺序和 locator 说明仍有缺口 | 纳入唯一 Wave1 change。 |
| BUG-222 | 已复现：缺失 `depth-review.yaml` 的直接 root 被 generic topic root 掩盖 | 纳入唯一 Wave1 change。 |
| BUG-223 | 已复现：slug 调用、supplementary 筛选及 primary repair 投影未完整接通 | 纳入唯一 Wave1 change。 |
| BUG-224 | 当前单 contribution deferred packet 是已接受的 grammar；只有 playbook 词句含混 | 不扩 schema、不放宽 slot uniqueness；在同一 change 收紧一句指引后结案。 |

## 共同根因

Wave1 已有正确的 authority 和 pure convergence evaluator；问题不是缺一个 controller、
Gate 或 materialization API，而是既有最短合法闭环的输入顺序和反馈投影没有完全接通：

```text
successful Wave1 submit
  -> complete valid Phase-owned depth-review.yaml
  -> Wave1 inspect exposes exact current candidates
  -> materialize exactly the inspect-provided target
  -> synchronize the existing index and seed
  -> rerun the same Wave1 inspect
```

当前 phase guidance 把 materialization 放在必需 `depth-review.yaml` 之前；缺失 review 时，
evaluator 又先把 `topic: null` 诊断为 generic topic failure；supplementary work 的
unreviewed detector 则把对象传进只接受 slug 的 API。三个问题共同让 Agent 无法沿现有
inspect -> repair -> rerun 回路完成首次或补充 closeout。

这条路线保留以下现有 Source of Record：submitted work-unit rows 是 backing authority，
`depth-review.yaml#reviewed_work_unit_refs` 是 Phase-owned review binding，convergence
evaluator 是 deterministic verdict owner，Phase Agent 仍做 reference authoring 和语义判断。

## 建议 Change

### `repair-wave1-reference-closeout-feedback`

**目标**：让已接受的 Wave1 reference-closeout loop 可达、root-first 且对 Agent 可执行，
不增加状态、权限、队列或第二套检查器。

**范围**

1. 在 `wave1-reference-convergence.mjs` 中让具体的 unusable submitted-backing root
   优先于 synthetic null-topic guard；缺失 depth review 必须保留
   `reviewed_work_unit_refs_missing` 及其直接路径。
2. 延伸既有 depth-review prerequisite masking，使 inspect/Gate 只暴露一个直接
   depth-review root，不并列 generic count-floor/topic-invalid 提示；不新增 checker。
3. 保持 `unreviewedSubmittedSupplementaryRows` 的 slug API：调用处传
   `submittedBacking.topic.topic_slug`，检测器只纳入 hash-bound 且
   `assignment_mode === "supplementary"` 的 row。存在遗漏时，把 depth-review 的
   `write_to`/repair 作为 primary action，而不是 enqueue-first 下的 detail；保留既有
   `reference_floor_deficit` outcome/rule identity。
4. 调整 `phase-wave1.md` 的 post-submit closeout 顺序为 submit -> complete valid depth
   review -> inspect -> exact-target materialization -> index/seed sync -> same inspect。
5. 不把 locator 的 `48` token / `12` digest 升级为 REF-011 或 Agent-facing contract。
   REF-011 继续只约束 normalized URL + safe token + stable digest；WAI-010 继续要求消费
   inspect 给出的 exact target。仅用 implementation regression 固定当前常量行为。
6. BUG-220 只补 exact missing-`finding_id` regression，不改 runtime。BUG-224 只将
   playbook 澄清为：多个 explicit entries 可共用一个 update；deferred form 每个 packet
   选择一个 contribution；多个 contribution 使用 sequential applies。

**预期 OpenSpec 边界**

- 只考虑一个最小 RWP-015 delta：已接受 phase spec 当前在 submit 后立即进入
  convergence，需要补上 valid depth-review prerequisite 的正确顺序。
- WAI-005/WAI-009/WAI-010、RWG-017/RWG-021、REF-011 均为 verify-only；已有契约已覆盖
  目标行为。尤其不为 `48/12` 增加 REF-011 delta。
- proposal 应声明 Harness behavior/version bump，目标为 `v0.89`；apply 时同步
  `CHANGELOG.md` 与 `DEEP_RESEARCH_HARNESS/RUN.md`。
- proposal、design、tasks、spec delta、semantic closure 和 verification plan 均通过
  OpenSpec CLI 生成/维护；apply 前后按项目的 feedback-lifecycle 和 archive governance
  完成规定检查。

**验证证据**

- Unit：BUG-220 exact missing-`finding_id`；BUG-222 backing-root precedence；locator
  `48/12` 仅作为 implementation regression。
- Integration：缺失 `artifacts/wave1/<topic>/depth-review.yaml` 时，inspect 和 Gate 只报告
  一个 `reviewed_work_unit_refs_missing` / exact missing path，不附加 generic
  topic-invalid 或 count-floor root。
- 一个 reviewed primary 和一个未写入 review 的 submitted supplementary row 产生
  `reference_floor_deficit`，并把缺失 work-unit ref 对应的 depth-review sync 作为 primary
  repair；primary-row omission 不得误入该 supplementary signal。
- Markdown integration 固定 canonical Wave1 顺序、inspect exact-target consumption 和
  Wave0 deferred wording。既有 sequential 测试只证明两次 apply 后 final inspect，不宣称
  两次 apply 中间还有 inspect。
- 已执行的 current-head baseline：`69/69` focused tests passed，完整命令见研究底稿。

## 明确不做

- 不新增 locator CLI、queue、state、status、Gate、controller、retry tree 或 evidence
  authority。
- 不新增 batching schema、duplicate validator 或另一套 prerequisite checker。
- 不将 Wave0 的 intentionally bounded single-candidate feedback 改成 batch planner。
- 不为 BUG-224 添加 `deferred_contributions[]`、不放宽 one-slot-per-packet，也不改变
  contribution interval / collision / idempotency 语义。
- 不重开 BUG-220 的 union-error projector；当前 `finding_id` field-level feedback 已可用。
- 不把 `48/12` 写入 REF-011 或 Agent 指引，也不让 Agent 自行推导 locator。
- 不手改任何真实 run bundle、ledger、reference 或 seed，以测试或 backlog 文档伪造修复。

## 推进顺序

1. 以 `repair-wave1-reference-closeout-feedback` 走 `/opsx:propose`，先完成 coherent
   proposal/design/spec/tasks，并明确 version 和验证选择。
2. proposal 审查确认没有新增 authority、state 或 Wave0 scope 后，走 `/opsx:apply`；每完成
   一组任务即时更新该 change 的 `tasks.md`。
3. 跑 change 选定的 focused regressions、OpenSpec requirements/spec checks 和 semantic
   closure/feedback closeout；通过 governed archive finalizer 归档。
4. 用 archive evidence 更新 BUG-221--223 的 closeout；同时以本研究的 current-head evidence
   关闭 BUG-220，并将 BUG-224 标为 accepted-contract/non-schema-defect。按 backlog 索引规约
   移入对应 resolved directory，而不是保留为伪活跃 bug。

## 重新打开条件

- BUG-220: 当前同一 malformed Wave2 finding packet 再次以 Wave0 branch/slot error 作为
  primary feedback。
- BUG-221: inspect 不再对每个 incomplete Wave1 candidate 给 exact backing/target，或
  canonical locator 与 documented contract 不一致。
- BUG-224: 产品决定要求在一个 transaction 内 atomically accept multiple whole-contribution
  deferrals；这才是单独设计 packet grammar、collision semantics 和 migration 的触发条件。
