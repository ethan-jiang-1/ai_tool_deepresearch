---
title: Progressive OpenSpec Sequence for Framework Contract Remediation
status: c2_applied_verified_pending_archive
created: 2026-07-29
predecessor: framework-contract-feedback-and-control-structure-analysis
last_completed_change: converge-artifact-contract-evaluators
last_completed_archive: openspec/changes/archive/2026-07-30-converge-artifact-contract-evaluators
active_change: make-canonical-topic-state-projections-coherent
active_change_status: applied_verified_pending_archive
next_change: make-agent-operation-contracts-direct
next_change_status: pending_proposal
source_bugs:
  - BUG-143
  - BUG-146
  - BUG-148
  - BUG-150
  - BUG-151
  - BUG-152
  - BUG-153
  - BUG-154
  - BUG-155
  - BUG-156
  - BUG-157
  - BUG-158
  - BUG-159
  - BUG-160
  - BUG-162
  - BUG-170
  - BUG-171
  - BUG-172
  - BUG-173
  - BUG-174
  - BUG-175
  - BUG-176
  - BUG-177
  - BUG-178
  - BUG-179
  - BUG-180
  - BUG-181
  - BUG-182
  - BUG-183
  - BUG-184
  - BUG-185
  - BUG-186
---

# Progressive OpenSpec Sequence for Framework Contract Remediation

## 1. 计划结论

本计划建议 **4 个必做的顺序 OpenSpec change，加最多 1 个有外部前提的 host-integration
change**。它不是把 32 张 bug 卡逐张拆开，也不是建设一个“大修复 controller”。每个 change
只拥有一个能让读者精确推理的语义对象：artifact family、canonical topic-state、Agent-facing
operation contract、work-unit attempt，或 research capability surface。

```text
current real-bundle evidence
          |
          v
C1 artifact contract / evaluator convergence [archived 2026-07-30]
          |
          v
C2 canonical topic-state and projection integrity
          |
          v
C3 Agent-facing control and feedback contract
          |
          v
C4 work-unit attempt ownership and legal recovery

C5 semantic research-access adapter  (only after a real host/provider is selected)
```

`BUG-170` 和 `BUG-175` 不被预先塞进 implementation change：前者需要真实 Agent/host
observation 才能判定 DPT 可拥有的故障；后者是研究质量政策，不能因为当前操作成本高就自动
改写 accepted floor。它们在本计划中有明确的决策/验证位置，但不制造投机性的代码任务。

C1 已于 2026-07-30 归档至
`openspec/changes/archive/2026-07-30-converge-artifact-contract-evaluators`。C2 已完成 proposal、
explore、polish 与 `/opsx:apply` 的全部 26 项任务，active change 为
`openspec/changes/make-canonical-topic-state-projections-coherent`，当前状态为
`applied; verified; pending archive`。其 selected `node:test` assets 为 277 passed / 0 failed；真实
disposable-bundle replay 记录了合法 append 的 `i0001/1..2`、`i0002/3` ownership，以及 controlled
prefix drift 的单一 `submitted_source_contribution_prefix_drift` root（零 candidates）。routing、strict
OpenSpec、requirement/spec governance 与 `git diff --check` 均已通过。C3 可以在此时仅创建 proposal
供审阅，但不得在 C2 archive 前进入 `/opsx:apply`；其后续实现仍保持
`propose -> explore -> apply -> archive` 的顺序。

## 2. 为什么是这个数量

| 划分方式 | Change 数 | 结论 |
|---|---:|---|
| 一张卡一个 change | 32 | 拆散同一 semantic root，重复 proposal、release、governance 和测试成本。 |
| 一个“大框架修复” | 1 | 混合 document grammar、状态时间、CLI UX、queue finality、host capability；无法证明一个 Source of Record，也无法安全回滚。 |
| **本计划：4 个核心 + 至多 1 个条件 change** | **4--5** | 每个 change 有单一 reader 问题、最短 control loop 和可独立 archive 的验证边界。 |
| 先新增通用 repair/capability controller | 0--1 表面上 | 实际新增另一套状态、权限和 retry tree，违反当前 guideline 的复杂度纪律。 |

这不是按文件数切分。C1 和 C2 可能都会触碰 return-map/topic-state 周边文件，但它们回答不同
问题：C1 问“这个 artifact 是什么、哪个 evaluator 能读它”；C2 问“合法 writer 如何保证它
写出的 canonical state 在时间上和解析上保持一致”。把二者合并会让 parser scope、writer
transaction、style freshness 和 historical provenance 在一个 proposal 内互相遮蔽。

同理，C4 不再拆成“加一个锁错误提示”“加一个 hash sync”“加一个 queue reactivate”。这些
表面小改实际上都在回答同一个尚未收敛的问题：**一个 work item 的 attempt 在何时、由谁
拥有，submitted 后的纠错到底创建什么新的 legal authority。** 分开做会极易生成两套矛盾的
recovery path。

## 3. Change 总览

| 顺序 | 暂定 change id | 状态 | 精确问题 | 主要票据 | 明确不包含 |
|---:|---|---|---|---|---|
| C1 | `converge-artifact-contract-evaluators` | archived 2026-07-30 | 每种 artifact 的 grammar、authority classification 和 evaluator scope 是什么？ | 146, 162, 172, 178 | topic writer、count-floor policy、work-unit recovery |
| C2 | `make-canonical-topic-state-projections-coherent` | applied; verified; pending archive | canonical topic state 如何在合法写入后保持 whole-document parseability、时间语义与 derived freshness？ | 151, 152, 154, 157, 176 | CLI help framework、queue/work-unit rework |
| C3 | `make-agent-operation-contracts-direct` | planned | Agent 在每个决定点如何发现 protocol、看到最早 direct root，并得到一个合法下一动作？ | 150, 153, 155, 156, 158, 159, 160, 171, 173, 177, 183, 184 | 自动 repair controller、改变 evidence authority、host adapter |
| C4 | `make-work-unit-attempt-recovery-explicit` | planned | active/submitted attempt 的 owner、contention、finality、correction 与 transaction recovery 的 legal semantics 是什么？ | 148, 174, 179--186 | mutable ledger workaround、full-phase Gate prediction、generic retry service |
| C5 | `connect-hitl1-research-access-by-semantic-capability` | conditional; not proposed | 当前 host 如何以真实 search + same-URL fetch 能力接入 HITL1，而不是用工具名或配置猜测？ | 143 | 通用 capability registry、虚假 search 成功、host liveness promise |

## 4. 逐项执行清单

下面的勾选项是唯一的执行顺序。不要为了“先试一试”跳过 `explore` 直接开始 code，也不要在
C4 的语义尚未决定时为 BUG-179--186 单独加 sync/recompute/retry 命令。

- [ ] **0. 固定基线。** 保存当前 real-bundle red evidence、命令输出、active accepted specs 与本计划的 ticket map；确认 `openspec list --json` 仍无冲突 active change。对每个票据记录它是 deterministic fixture、真实 Agent observation、host observation，还是 authority-mutation 后的 recovery incident。

- [x] **1. 创建 C1 proposal。** 已创建 `converge-artifact-contract-evaluators` proposal，限定为恢复 artifact family 的正确 evaluator scope，而不是把合法内容改写成错误 parser 喜欢的形状。
- [x] **2. C1 explore。** 已完成 artifact/consumer matrix 与 authority interpretation 决策，涵盖 Seed projection entry、rich reference、Wave artifact、phase-owned projection、index、canonical metadata presentation，以及 normal Wave Gate 与 `check-reentry` 的共享解释。
- [x] **3. C1 apply。** 已按 accepted task list 收敛 evaluator composition、reference-format/return-map routing、reentry reuse 和相应 Agent guidance；focused regression 保留对真正不合格 Seed entry 的 owner 检出。
- [x] **4. C1 archive。** 已完成 C1 verification plan、requirement/spec governance 与真实 bundle inspect/reentry counterexample，并于 2026-07-30 归档至 `openspec/changes/archive/2026-07-30-converge-artifact-contract-evaluators`。

- [x] **5. 创建 C2 proposal。** 已创建 `make-canonical-topic-state-projections-coherent`，其 proposal 的中心是 canonical topic-state 这个 module 的 interface，而不是“给 `apply` 多加几个 if”。
- [x] **6. C2 explore 与 polish。** 已决定并记录三件不能混合的语义：Wave0 candidate identity 是 submission-bound contribution 之上的 current projection coordinate；supplement/append 不重写历史 authority；Seed template 的 editable body、appendix slot 与 projection slot 有明确 writer。writer postcondition 与 reader/evaluator 同源，style recomputation 保留唯一 owner 与可见顺序；严格 Change、routing、requirement/spec checks 均通过，并已作为 `/opsx:apply` 的约束实施。
- [x] **7. C2 apply。** 已完成全部 26 项 accepted tasks：committed postcondition 覆盖整个受影响 slot/document 的可解析性；topic registry/style projection freshness 有唯一 writer 与同一 Gate repair loop；ref-existence/forward-reference 只由共享 owner checkpoint 裁决。topic-state 未获得 profile、ledger、queue 或手工 Markdown fallback 写入权。
- [ ] **8. C2 archive。** 所需 multi-entry replay、supplement/provenance、body-template edit、style/topic ordering、missing/near-match ref 和 complete-current-candidate negative cases 已完成并记录；remaining action 是在最终审阅后执行 native archive。replay 已证明写入成功后同一 reader 可读回相邻历史 entry，且不会把新增 source 伪装成旧 submitted result。

- [ ] **9. 创建 C3 proposal。** 运行 `/opsx:propose make-agent-operation-contracts-direct`。此 change 的 reader 是当前执行中的 Agent，不是 shell 熟练用户；它必须复用 C1/C2 已经稳定的 contract facts。
- [ ] **10. C3 explore。** 列出所有 public Engine operation 的共同最小 interface：invocation/help、schema/context discovery、validation root、owner/writable surface、same-check rerun、以及“无合法路径”的 honest boundary。把 phase-entry action core 与 full reference closure 分开；确认 task checklist、role guidance、timeout diagnosis 和 phase ordering分别只是同一 contract 的不同呈现，不再复制 validator。
- [ ] **11. C3 apply。** 在不新增 generic agent controller 的前提下，收敛 CLI `--help`/usage、context/schema discovery、field-level/root-first rejection、task/phase action cards、`enter-phase` 默认输出、status preflight、cache/reference mapping guidance 与 timeout explanation。修复缺失的 phase-declared surface 或删除错误引用。反馈只指向已有 legal operation；无路径时返回 owner/missing-contract，而不是诱导 Agent 手改 authority。
- [ ] **12. C3 archive。** 用 focused CLI/Markdown tests 证明 Agent 无须读 Engine 源码即可发现合法 protocol；用 deterministic negative cases 验证 root-first、one-next-action、help invocation 与 output-size/cue placement；以真实 Agent-flow observation 评估信息形状改善，但不把它当作 host liveness 证明。

- [ ] **13. 创建 C4 proposal。** 运行 `/opsx:propose make-work-unit-attempt-recovery-explicit`。此 change 的 proposal 必须先陈述当前 immutable submitted authority 为什么正确，以及它无法处理的已接受 attempt 损坏事实是什么。
- [ ] **14. C4 explore。** 在设计中先选择且只选择一个 audited correction model：例如 terminalize-and-successor 或有明确 identity/receipt rules 的 audited supersession；不得同时保留两条静默 success path。明确定义 Phase Agent、delegated actor、lock owner、result path 和 lease 的 ownership transfer/fencing；区分 submit-integrity preflight 与 phase-Gate verdict；确定 stale transaction 的 truth/recovery 归属及 index/ledger hash 的唯一 interpretation direction。
- [ ] **15. C4 apply。** 依照选定模型实现 structured contention、attempt ownership、合法 correction/rework、queue relation、transaction cleanup/recovery 和只检查 submit-owned direct facts的 preflight。保留 ledger/hash fail-closed，不允许任意 recompute/sync、直接 queue reactivation 或已提交 row 就地覆盖；任何新 legal path 必须产生审计可读的 attempt lineage。
- [ ] **16. C4 archive。** 使用真实 filesystem/interleaving fault-injection 或等价 deterministic transaction evidence，覆盖 concurrent submit、late delegate completion、hash mismatch、failed transaction、terminal correction 和 index/ledger consistency。验证 Phase Gate 不被 dry-submit 承诺预测，且无合法 recovery 时 Engine 明确返回 missing-contract/terminal，而非 raw exception。

- [ ] **17. C5 的外部决策门。** 在启动 C5 前，记录一个当前 Agent 实际可调用、可授权、能返回真实 candidate URL 的 search provider/surface。只有 fetch/curl、launcher 配置成功、或模型声称“可搜索”都不满足此门；若没有这样的 surface，保持 HITL1 honest unavailable，C5 不创建。
- [ ] **18. 创建并 explore C5（仅在第 17 项满足后）。** 运行 `/opsx:propose connect-hitl1-research-access-by-semantic-capability`，明确 search 与 fetch 是两个 capability、同一 URL binding 是什么、host adapter 的可信 observation 是什么、不可用时哪个 owner/用户边界可处理。不得扩张为 host scheduler、tool matrix、background retry 或通用 provider registry。
- [ ] **19. C5 apply 与 archive（条件项）。** 接入真实 semantic surface，保留现有 unavailable fail-closed 分支；以 real Agent search -> returned URL -> same-URL fetch observation 验证 available，以无 provider / permission denied 观察验证 unavailable。fixture 只能验证 Engine schema/gate mechanics，不能作为能力可用证明。

- [ ] **20. BUG-170 验证门。** 在 C3 后用多个独立真实 Agent-flow run 观察 sub-agent completion、host/permission、工具调用与 context shape。只有发现 DPT 可确定性 handoff/ownership defect，才从观察中提出一个新的、有界 change；一次 stop、一次 SendMessage 介入或静态 prompt 测试都不能开新 controller。
- [ ] **21. BUG-175 政策门。** C1--C3 稳定后，用真实、合格、无填充的研究 bundle 评估 `exploratory_map` 的 floors 是否确实与用户选择的研究目标失配。若用户决定改变质量语义，才提出一个单独、policy-only 的小 change；它不得与 parser、writer 或 recovery 变更捆绑，也不得把 fabrication 变成 degraded pass。

## 5. C1：Artifact Contract And Evaluator Convergence

**精确的 reader question：** “这个 bundle artifact 的文档角色、authority class 和允许的
grammar 是什么；当前这个 evaluator 是否有资格把它判为 blocking？”

**为什么先做：** BUG-146、BUG-162、BUG-178 会把符合 producer contract 的文件变成 false
blocker。若不先校正这些 consumer，后续 C2/C3 的 postcondition 和 feedback 都会围绕错误
verdict 设计。

**应修改的 accepted capability 范围：** `research-return-map`、`reference-flat-format`、
`research-wave-gate-implementation`、`runtime-reentry-debuggability`，以及必要的
`check-inspect-feedback`。proposal 必须明确哪些已有 requirement 被 refine，不能新建一个
笼统的“document registry” capability。

**核心设计约束：**

- return-map evaluator 只读它拥有的 Seed Topic projection slots；rich reference、Wave artifact、
  index 和 phase-owned reference 使用其自己的 accepted consumer contract。
- normal Gate、inspect、reentry 对同一个 reference authority 复用一个 interpretation；独立
  audit 只能检查不同的事实，不能重新发明 `ledger_coverage`。
- `BUG-172` 必须在 proposal 中选择一个 canonical metadata presentation，并使 template、parser、
  validation 和 direct feedback 同步；不能让 seed/reference 各自靠“惯例”猜。
- 保持 fail-closed provenance：放宽错误 parser 不等于让 filesystem-only artifact 计入 evidence。

**Done 不是：** 让所有 `reference/*.md` 都通过某个宽松 regex。Done 是每种 artifact 都只被
其 declared consumer grammar 判定，且同一 submitted backing 在主 Gate 与 reentry 不出现相反
结论。

## 6. C2：Canonical Topic-State And Projection Integrity

**精确的 reader question：** “一次 authorized topic-state operation 成功后，哪一份 canonical
topic/projection state 已经成立；它与当前/历史 evidence、相邻 Markdown entry 和 style projection
之间有什么可证明的关系？”

**合并的理由：** BUG-151、152、154、157、176 都位于同一个 state/materialization seam。
把 writer newline、template ghost、style follow-up、ref timing 拆开，会继续让 `apply` 的
context union 和 raw Markdown edits 承载隐藏的 lifecycle 语义。

**应修改的 accepted capability 范围：** `canonical-topic-state`、`seed-topic-materialization`、
`research-styles`、`research-return-map`；若 C1 的 final artifact classifications 要求，引用其
已 archive 的 shared helper，而不再复制 parser。

**核心设计约束：**

- Writer 成功必须意味着 reader 成功：postcondition 以整份受影响 canonical slot/document 的
  parseability/identity 为准，不能只查本次 packet entry 是否存在。
- `BUG-151` 的 current-coordinate 规则已写入 accepted return-map spec；若要改变它，proposal
  必须明确替换什么 Source of Record，不能悄悄 freeze/renumber。若保留它，supplement 对 current
  projection 的影响必须有明确的、不会篡改 submitted history 的路径。
- 由 topic registry 长度决定的 style projection 必须有一个唯一 owner 和可见的合法顺序；topic
  state 不能越权代替 profile writer。
- Seed template 的可编辑正文、appendix 与 projection card 要有不可混淆的 ownership/编辑范围；
  no raw Markdown side path 成为第二 canonical writer。

**Done 不是：** 给每次 `apply` 后再加一个人工检查步骤。Done 是相同合法 packet 的 replay
不会损坏邻项，失败能在 writer boundary fail closed，时间/identity 规则在 inspect、Gate 和
repair guidance 中同源。

## 7. C3：Agent-Facing Operation Contract

**精确的 reader question：** “我现在可以运行什么、输入应该长什么样、为什么这个结果失败、
我是否有 legal writer，以及完成后应重跑哪一个 checkpoint？”

**合并的理由：** BUG-150、153、155、156、158--160、171、173、177、183、184 都不是要求
Engine 做研究判断；它们都是 Engine/Markdown 已知的静态 facts 没有在 Agent 作决定时交付。
一个 shared public operation contract 比散落地新增 help text、task note 和 error phrase 更能
降低未来 drift。

**应修改的 accepted capability 范围：** `check-inspect-feedback`、`research-wave-phase-content`、
`canonical-topic-state`、`delegated-work-units`、必要的 CLI/command documentation contracts。
它不创建第二套 `repair-loop` 或 Agent state machine。

**核心设计约束：**

- 每个 public CLI 都有 discoverable invocation/operation/schema surface；context-dependent
  protocol 必须让 caller 选择，而不是让 caller 到源码里猜。
- 可修复 rejection 以 root-first 形状交付：direct fact、schema/owner、现有 legal surface、
  same checkpoint。无合法路径的 root 不能伪装成 `agent_action`。
- `enter-phase` 默认输出的是 bounded action core 和 manifest；完整 reference closure 可访问，
  但不得淹没 cue。task/role guidance 将“必须产出什么”置于动作入口，长背景保留为 reference。
- `advance-status`、timeout recommendation、cache/reference mapping、candidate omissions 等
  要向 Agent 解释决定它们的直接事实，不把几十条派生 message 当作任务列表。

**Done 不是：** 将每个 CLI 都包进一个聊天式 assistant，或把所有 validation 变 advisory。
Done 是 Agent 不读 Engine 实现也能区分 invocation error、可修复 direct root、owner-only
boundary 与真实 semantic decision。

## 8. C4：Work-Unit Attempt Ownership And Legal Recovery

**精确的 reader question：** “这个 queue item 的当前 attempt 由谁拥有；当前 bytes 与 submitted
authority 的关系是什么；若 attempt 损坏，唯一合法的纠正/重做路径是什么？”

**合并的理由：** BUG-148、174、179--186 不只是七个操作按钮缺失。它们围绕一个事实：系统
同时有 delegate、Phase Agent、lease、result path、queue terminal history、index、ledger、hash 和
transaction，但没有把 submitted correction/rework 表达为一个审计清晰的 attempt model。

**应修改的 accepted capability 范围：** `delegated-work-units`、`agentic-queue`、
`work-unit-provenance-gate`，以及必要的 `check-inspect-feedback`。C4 应优先复用已 archive 的
terminal replacement/late-submit contracts，清楚说明为什么新语义没有制造与之并列的 success path。

**核心设计约束：**

- Lock contention 必须是 public structured state，不是裸 `EEXIST`；但仅把异常换成文字不是
  C4 的完成条件。
- 一次 attempt 的 writable owner、delegate completion 和 Phase intervention 必须可区分；不能
  让两个 actor 在同一 result path 上无 fencing 地竞争。
- submitted ledger/hash 的 fail-closed 保护保留。若 correction 合法，它必须是被接受的、可审计
  的新关系，不是“重算所有 hash”“index 覆盖 ledger”或直接修改 terminal history。
- submission preflight 只回答 submission 可验证的 direct facts；正式 Phase Gate 继续拥有内容、
  coverage 和跨 work-unit 的 verdict。
- transaction recovery 要么能在同一 authority 下完整解释/清理，要么成为明确 terminal/missing
  boundary；它不能长期作为一个阻断 clean state 的幽灵副产品。

**Done 不是：** 允许已提交工作就地换内容。Done 是每一种 legal attempt transition 的 source,
writer, receipt/hash lineage, queue relation, failure mode 和 same-check action 都能精确叙述和
验证。

## 9. C5：Conditional HITL1 Research Capability Integration

**精确的 reader question：** “当前 Agent 是否通过一个真实、当前可调用的 semantic search surface
获得 candidate URL，并通过合法 fetch surface 抓取同一个 URL？”

**为何条件化：** 已 archive 的 HITL1 probe contract 正确地要求 real search + fetch 且在不可用时
fail closed；BUG-143 不是要取消这一点，而是当前 Codex/host 没有一个已选择并可验证的 search
adapter。没有 provider choice 时，任何 DPT code 都无法合法把 shell、`curl` 或 launcher config
升级为 search success。

**应修改的 accepted capability 范围：** `pre-research-phase-content`、
`pre-research-gate-implementation`、`research-styles`/profile observation，以及需要时新的窄
host integration contract。开始 proposal 前必须已经具备第 17 项的真实 surface evidence。

**核心设计约束：**

- 不按 `WebSearch`/`WebFetch` 名称判断，而按 search 返回真实候选 URL、fetch 使用该 URL
  返回内容这两个语义判断。
- available/unavailable observation 仍是当前 Agent 的真实执行记录；Engine 不把 provider config
  当成证据，不把 probe 泄漏到 research evidence surface。
- 不把 C5 扩张成模型 liveness、sub-agent scheduler、host daemon 或 generic tool registry。

**Done 不是：** 在开发机能 `curl` 一个页面。Done 是目标 host 上真实 Agent 产生 search ->
same-URL fetch observation，HITL1 Gate 在 available/unavailable 两条真实路径上都忠实运行。

## 10. 跨 Change 的不可违反规则

每个 proposal/design 都必须把以下内容写成可 review 的短句，随后才可进入 apply：

1. **Semantic precision**：这个 change 创造或恢复的单一 reader question 是什么？哪些差异会改变
   答案？
2. **One truth path**：它读取的 direct authority 是什么？它删除/复用哪一条重复 evaluator、
   writer 或 check，而不是又新增一条近似验证？
3. **One next action**：每一个 independent root 返回的最近 legal action，或 owner/terminal/
   missing-contract boundary，分别是什么？
4. **Action responsibility**：Agent 能做的机械执行是什么；什么必须等待用户的新语义/风险决定；
   什么只能由 host 证明？
5. **Verification class**：哪些是 node:test deterministic evidence，哪些必须是 real Agent-flow，
   哪些必须是 host/provider observation？三者不得互相替代。
6. **Deletion/accounting test**：该 change 删除、合并或停止扩张了什么复杂度？若只新增逻辑，
   为什么它是不可避免的 deterministic bottom line？

## 11. 明确保留为决策而非偷偷实施的事项

### BUG-170：Sub-agent 未完成

当前唯一确定事实是若干真实 sub-agent 没有按时完成；长 task/context 是可测风险，不是充分因果。
C3 可减少 action-surface 噪声，C4 可消除 Phase/actor 同写的错误处理，但二者都不能声称使
host 发起下一 turn 或保证模型调用工具。观察之后若发现的是 DPT handoff/readiness contract 缺陷，
再提一个有界 change；若是 host liveness residual，则记录为 host evidence，不建设 watcher。

### BUG-175：Count floors

当前 accepted research-style contract 把 floor 作为动态 profile threshold。是否应降低
`exploratory_map`、允许何种 degradation，或是否保留该研究深度，是用户/产品的质量语义决定。
在 C1 修正 false blockers、C2 修正 candidate/time truth、C3 让缺口可见之前，无法用当前 run
的填充行为证明 floor 本身错误。任何未来 policy change 必须独立，且仍禁止 fabricated source/
reference。

### BUG-184：所有 current candidates 的 disposition

accepted return-map contract 当前明确要求每个 current candidate coordinate 有 entry 或显式、
identity-bound deferred disposition。C2 处理这个 coordinate 的时间语义，C3 处理批量、直接的
omission feedback；本计划不预先取消 coverage contract。若未来要改变“每个 candidate”这个规则，
它应与 BUG-175 同样作为独立质量/coverage policy decision。

## 12. 计划完成的定义

本计划本身在下列条件满足时才从 `plans/` 移入 closed：

1. C1--C4 均完成 `propose -> explore -> apply -> archive`，并保持各自的 focus 和
   verification evidence；
2. C5 已根据第 17 项被 honest archived，或记录为没有合法 external surface 的明确
   non-implementation decision；
3. BUG-170 已有重复真实 observation 的 disposition，BUG-175/184 已有明确质量政策决定或
   被保留为 accepted residual；
4. 没有用 hand-edited ledger/hash/queue、fake external evidence、或 new controller 绕过任何
   Gate/authority contract；
5. 每个 archive 都更新 accepted specs、requirement registry、verification routing、release
   evidence 与本计划的 ticket disposition。
