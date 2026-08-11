# 活跃 Bug 系统性修复研究与 OpenSpec 路线

> 状态：Change A 与 Change B 均已归档并提交；BUG-216--219 的当前回归已复验通过，计划结案。
> 
> 范围：仅核验当前 `_backlog/bugs/`、已接受 OpenSpec spec、现行实现和可执行测试；不把历史 run snapshot 或聊天结论当作行为证据。

## 结论

本轮最初确认 BUG-216--219 四张真实活跃卡。最小可辩护路线是 **2 个** OpenSpec change：

1. 一个 Agent-facing guidance/test repair，同时收敛 BUG-216 与 BUG-217；
2. 一个 Agent-authored deterministic-contract change，同时收敛 BUG-218 与 BUG-219。

这不是按 bug 编号机械合并。第一个 change 只修已接受行为的文档和测试漂移；第二个 change 只处理 Agent 用公开 schema 构造输入、以及 Engine 对 reference 格式给出确定性反馈的边界。将两类工作强行合成一个 change 会把 `CONTEXT.md` 的测试归属与公开 CLI/Gate 行为混在同一次 review；反过来把 BUG-218/219 拆开会重复同一套 Agent authoring / direct-format review、版本和 closeout 成本。

Change A 已于 2026-08-12 通过受治理流程归档为
`2026-08-12-repair-agent-guidance-contract-drift`，并以 commit `65fdb829a`
提交。Change B 已于同日归档为
`2026-08-12-harden-agent-authored-contracts`，并以 commit `ab2f17c49`
提交。BUG-216--219 的目标范围均已完成；本次 backlog hygiene 将把四张卡和本计划
移入对应的完成目录，并清除 active README 的陈旧链接。

对 BUG-219，本计划作出有界产品决定：**原始 HTML 文档标记出现在 required semantic section 的非代码内容中，是 reference 格式污染，不是研究内容质量判断。** 规则只识别有限的 document-like signatures（例如 `<!doctype`、`<html>`、`<head>`、`<body>`、`<script>`、`<style>`、`<iframe>`），忽略 fenced code，且不自动清洗、改写或判断事实是否正确。这样它能拦住真实 page dump，而不会升级为通用 Markdown linter 或语义 Gate。

## 结案卡与索引

`rg --files _backlog/bugs` 在本次核验时只返回以下四张卡：

| Card | 最终分类 | 结论 |
| --- | --- | --- |
| BUG-216 | 已修复：static test 的 authority drift | Change A 移除了错误的 `CONTEXT.md` Final glossary 所有权断言，保留真实 Final command/release/RUN 覆盖；focused suite 6/6 和全量 suite 通过。 |
| BUG-217 | 已修复：guidance/test 词汇 drift | Change A 在 shared/Wave0/Wave1 正常 top-up 处补上既有 batch/cap/capacity 术语映射，保留公式、fallback 与 drain 顺序；focused suite 12/12 和全量 suite 通过。 |
| BUG-218 | 已修复：公开 schema projection 行为缺陷 | Change B 的 conditional forms 公开 Wave2 `finding_id` shape 和可解析 template；focused suite 3/3、CLI integration 15/15 与全量 suite 通过。 |
| BUG-219 | 已修复：reference-format enforcement gap | Change B 以 bounded fenced-code-excluded document-markup predicate 返回既有 `reference_format` repair；focused helper 24/24、Wave CLI integration 33/33 与全量 suite 通过。 |

`_backlog/bugs/README.md:23-26` 仍链接 BUG-212--215，但这些文件已在
`_done/_fixed_bugs/`，故该四个 README 链接是陈旧索引。所有四张实际活跃卡现已
获得明确 disposition；本次独立 backlog hygiene 将按 README 的归档步骤同步索引、计数
和卡片位置。

## 逐卡证据与处置

### BUG-216：已确认的 Final 词汇测试归属 drift

`node --test tests/integration/md/artifact-persistence-contract.test.mjs` 当前为 5/6 subtests 通过、1 失败；失败点是 `tests/integration/md/artifact-persistence-contract.test.mjs:66-69` 对 `CONTEXT.md` 的三个加粗术语断言。`CONTEXT.md` 当前没有三者。

这不是 Final Engine/backing 行为失效。accepted `research/final-delivery-backing` 已定义 Evidence Map 是 Final key-finding declarations 的完整集合（`openspec/specs/research/final-delivery-backing/spec.md:13-22`），并定义 Final Evidence Map link 的 submitted backing（同文件 `:71-80`）。更关键的是，`a1e8fa3d5` 将 `CONTEXT.md` 从约 487 行刻意压缩为 74 行，并明确要求不要把它重新变成第二份 glossary；当前文件也把行为术语路由回其权威 owner（`CONTEXT.md:3-17,59-74`）。

结论：**confirmed，但 defect 在 static test，不在 Context。** 修复应删除该测试对三个加粗 Context 术语的断言及其不再需要的 `context` 读取，保留它对 artifact-persistence 的真实 Agent-facing command/release surfaces 的检查。不得把 Context 扩写成第二份 Final contract，也不得改变 `persist-final-report`、submitted backing 或 Final lifecycle。

### BUG-217：已确认的 guidance/test 词汇 drift，不是并发机制缺失

`node --test tests/integration/md/parallel-delegated-reference-materialization.test.mjs` 当前失败：shared protocol 与 Wave0/Wave1 document-contract subtests 在最早的 `/bounded top-up/i` 断言停止。该测试还要求 `--count <claim-count>`、`accepted/default cap` 和 `remaining free delegated in-flight capacity` 等字面锚点（`tests/integration/md/parallel-delegated-reference-materialization.test.mjs:20-55`）。

但当前三个目标文档已经保留 accepted 的实际机制：

- shared protocol 读 `delegated_concurrency_cap`，以 `12` 为默认，并计算 `claim_count = min(...)`（`DEEP_RESEARCH_HARNESS/workflows/nodes/shared/shared-subagent-protocol.md:62-75`）；
- Wave0 和 Wave1 都有同一公式、free-capacity 定义和 `--count <claim_count>` claim（分别为 `phase-wave0.md:128-148`、`phase-wave1.md:133-153`）。

这与 accepted `agent/agentic-queue` 的 cap、公式、fallback 和 batch 要求一致（`openspec/specs/agent/agentic-queue/spec.md:792-832`），也与 wave phase contract 的 bounded top-up/drain-before-gate 要求一致（`openspec/specs/research/research-wave-phase-content/spec.md:552-626`）。

结论：**confirmed 的 static contract 红灯，但不是 queue、scheduler、cap 或 work-unit allocator 的行为缺陷**。accepted wave-phase contract 本身明确把 “bounded top-up batch claims” 作为 normal posture（`openspec/specs/research/research-wave-phase-content/spec.md:617-623`），所以修复应在三份文档中显式使用这一既有术语并保留现有公式、fallback 和 drain-before-gate 顺序。现有 static test 已在锁定这条 accepted guidance，不应为了绕过 regex 删除这个锚点。不得新增 host concurrency claim、CLI/env override、scheduler、queue state 或 `--count 1` 默认路径。

### BUG-218：已确认的 schema discovery/validator 矛盾

现行 CLI 的实际输出将 `updates[].entries[].source_identity.work_id` 列为 required/value shape，且 closed kind 同时含 `submitted_work` 和 `finding`；`wave_rules.wave2` 仅以文字说 `entry_id === finding_id`。相反，真正的 Zod discriminated union 对 finding branch 严格要求 `finding_id`（`DEEP_RESEARCH_HARNESS/engine/helpers/canonical-topic-state.mjs:340-352`）。根因是 projection visitor 聚合 discriminator literal 后只递归第一个 union option（同文件 `:630-639`），而后加的 `wave_rules` 不能补回 conditional field form（`:645-665`）。

accepted spec 明确要求 schema 是由真实 Zod contract 导出的 authoring projection（`openspec/specs/research/canonical-topic-state/spec.md:398-412`），并进一步要求 Wave2 显示 `{ kind: "finding", finding_id }`，且 author 能只凭输出构造成功 packet（`:845-866`）。现有回归测试名为 “packet built from schema”，但只断言 `finding` kind 在数组中存在，没有建 packet 或执行 apply（`tests/integration/topic-state-schema-wave-identity.test.mjs:8-31`）；它是 false-pass seam。

结论：**confirmed 的 accepted-spec behavior drift**。不能把 `finding_id` 粗暴加入 global `required_fields`，那会把两个 strict union branch 都伪装为同时必填。应在同一 authoring projection 中表达 conditional `source_identity` forms（每个 wave/kind 各自的 required field、shape 和可用 template），并让 Wave2 form 直接可构造；字段名和向后兼容表示由 Explore 选择，但不得另造 validator 或手写 duplicate schema。

### BUG-219：已确认的 raw-document-markup 格式污染 false-pass

`checkReferenceFormatFiles` 只检查 metadata/frontmatter、topic binding 和五个 section 的非空性（`DEEP_RESEARCH_HARNESS/engine/helpers/gate-helpers-checks.mjs:532-624`）。本次以带完整 metadata/sections、但 `Key Facts` 为 `<!DOCTYPE html><html><script>...` 的临时 reference 调用该 helper，结果为 `{"passed":true,"inspect":[],"findings":[]}`；现有 helper test 也全绿（23/23），没有 raw-HTML regression。

不过 accepted `bundle/reference-flat-format` 当前只把 metadata、可识别且非空的五个 semantic sections 作为 blocking contract，并将 Key Facts 的数量/prose-richness 留为 advisory（`openspec/specs/bundle/reference-flat-format/spec.md:127-145,183-198`）。Agent-facing extractor guidance 说 Key Facts 应来自 fetched page 的 concrete facts（`DEEP_RESEARCH_HARNESS/workflows/nodes/phases/subagent-dpt-evidence-extractor.md:206-213`），但这不是现有 Engine 的 raw-markup rule。

结论：**confirmed，且需要一个小的 `REF-002` behavior extension。** 这个 extension 不判断事实、研究质量或可读性分数。它只令 shared reference-format evaluator 在每个 required semantic section 的 fenced-code-excluded body 中拒绝一组有限的 raw document markup signature，并给出 exact reference path、section 和 Agent-owned same-check repair。所有已存在文件保持原样；在未来 inspect/gate 中被发现时才获得同一普通 `reference_format` repair，不批量迁移或自动剥离 cache/evidence。模板同时要求 Phase Agent 将 fetched page 解释/压缩为 Markdown facts，而非复制原始 page bytes。

## 最小 OpenSpec change 边界

| 顺序 | 建议 change 名 | 覆盖 | Delta spec | 版本含义 |
| --- | --- | --- | --- | --- |
| A | `repair-agent-guidance-contract-drift` | BUG-216、BUG-217 | `skip_specs: true`：两个 accepted behavior owner 已完整；只修测试 owner 和三份 guidance wording。Capability Discovery 已将 `research/final-delivery-backing` 与 `research/research-wave-phase-content` 列为 Verify-only。 | 已完成：2026-08-12 受治理归档为 `2026-08-12-repair-agent-guidance-contract-drift`，提交 `65fdb829a`；无版本 bump。 |
| B | `harden-agent-authored-contracts` | BUG-218、BUG-219 | `research/canonical-topic-state` 是 Verify-only（CTS-010 已要求可构造 Wave2 form）；`bundle/reference-flat-format` 修改既有 REF-002，加入有限 raw-document-markup prohibition；`workflow/shared-node-content` 为 Verify-only guidance consumer。 | 已完成：`v0.88` public schema/reference-format 收敛，CHANGELOG/RUN、semantic closure、feedback review 和 governed archive 均通过；归档 `2026-08-12-harden-agent-authored-contracts`，提交 `ab2f17c49`。 |

因此最小 change 数是 **2**。A 合并 216/217 是因为两者均是 Agent-readable static-document contract repair，且都不触碰 runtime truth、queue ownership 或 Final delivery transaction。B 合并 218/219 是因为两者都保护同一个 Authoring boundary：Agent 无需读 Engine source 即可构造合格 packet，并不会把 raw fetched document bytes 当作合格 reference body。B 的 direct Sources of Record 仍独立：`TopicApplyPlanSchema` / `ProjectionSourceIdentitySchema` 决定 packet form，`checkReferenceFormatFiles` 决定 reference-format verdict；change 不能让其中一者替代另一者。

## No-go 边界

- 不修改 run bundle、ledger、receipt、trace、queue、Final 交付状态或历史 evidence 来让测试变绿。
- BUG-216 不把 `CONTEXT.md` 升格为行为 spec；BUG-217 不增 scheduler、host capacity detector、并发承诺或新 queue path。
- BUG-218 不添加第二 validator、不从 bundle state 推断 schema、也不把所有 union-branch fields 伪装成共同 required。
- BUG-219 只新增有限 document-markup syntax check，不自动剥离/重写 HTML，不加依赖，也不把 artifact 可读性偷换为 Engine 的语义质量 verdict。
- 不在 Harness Apply 中顺手处理 README 的 BUG-212--215 stale links；那是各卡 disposition 后的 backlog hygiene。BUG-215 已有用户批准的工作区移动，必须保留而非重复移动。

## 验证策略

Change A：

```bash
node --test tests/integration/md/artifact-persistence-contract.test.mjs
node --test tests/integration/md/parallel-delegated-reference-materialization.test.mjs
npm test
```

除 green 外，检查 `CONTEXT.md` 仍明确 defer 行为/运行时事实，三份 delegated guidance 仍使用同一 profile cap、公式、fallback 和 drain-before-gate，且没有引入第二 policy source。

Change B：

```bash
node --test tests/integration/topic-state-schema-wave-identity.test.mjs
node --test tests/integration/cli/operate-topic-state-projection.test.mjs
node DEEP_RESEARCH_HARNESS/cli/operate-topic-state.mjs schema --context wave_projection
npm test
```

新增/加强的 integration regression 必须从 CLI schema 输出选择 Wave2 `finding` form、构造 `{ kind: "finding", finding_id: "W2F-001" }`，并在合法 disposable bundle 上达到 apply 的非-`input_invalid` 结果；它不能只重断言 `kind` array。reference-format helper regression 必须覆盖 raw document markup blocker、code-fenced literal、正常 plain-text Key Facts 和无 mutation；Wave1/Wave2 inspect or gate integration 必须验证 `reference_format` 的 exact repair feedback。历史 bundle 测试应证明它们不被改写；再次 inspect 时可以被如实指出为格式污染，而不是得到一个 silent compatibility bypass。

## 执行顺序

1. **完成 A**：已完成 Explore/Propose/Polish/Apply/Archive；Change A 的 tasks 持续记录了验证证据，归档最终器全部通过。
2. **完成 B**：`harden-agent-authored-contracts` 已完成 Review/Polish/Apply、REF-002 主规范同步、v0.88 release 对齐与 feedback closeout；全量 2,776 tests / 484 suites 通过，governed finalizer 归档成功。
3. **完成 backlog hygiene**：四张卡的 focused 回归重验通过，BUG-212--215 stale active links 将移除；BUG-216--219 与本计划移入 completed archive，且更新 fixed-bug / done 索引计数。

## 本次复现记录

- `node --test tests/integration/md/artifact-persistence-contract.test.mjs`：失败，唯一失败为缺少 `**Final key-finding declaration**`。
- `node --test tests/integration/md/parallel-delegated-reference-materialization.test.mjs`：失败，shared protocol 与 Wave0/Wave1 wording assertions 失败。
- `node DEEP_RESEARCH_HARNESS/cli/operate-topic-state.mjs schema --context wave_projection`：输出只列 `source_identity.work_id`，未列 `finding_id`，同时 `wave_rules.wave2` 提及 finding。
- `node --test tests/integration/topic-state-schema-wave-identity.test.mjs`：3/3 green，证明当前 regression 未实际构造/应用 Wave2 packet。
- `node --test tests/engine/helpers/gate-helpers-checks.test.mjs`：23/23 green；临时 HTML-polluted reference 的 `checkReferenceFormatFiles` 结果为 passed，证明 BUG-219 的观察事实和现有回归缺口。新规则的 acceptance 将由 Change B 的 REF-002 delta、focused tests 和 governed review 建立。
