## Why

`dpt_rb_martin-fowler-ai-sdlc-retreats` 正式 run 暴露出第二类系统性 contract drift：Agent 已经能通过 work-unit submit 产出真实文件和 ledger row，但 gate definition、gate helper、inspect CLI、phase docs 和 return-map guidance 对同一份 phase completion truth 的判断仍不一致。结果是 Agent 合规提交后，仍会在 gate 层遇到只有读 Engine helper 源码才能理解的 hidden contract。

本 change 来源于 `_backlog/plans/martin-fowler-run-bugfix-change-split.md` 的第二个 change：`align-gate-contracts-and-reference-navigation`。直接覆盖 `_backlog/bugs/BUG-068-wave1-role-set-inconsistency-and-depth-review-ref-drift.md`、`_backlog/bugs/BUG-070-seed-topic-map-refs-not-resolvable-to-reference-files.md`，以及 `_backlog/bugs/BUG-069-silent-autonomous-execution-unreachable-contract-not-self-sufficient.md` 中 gate / systemic 部分。

第一轮 active change `stabilize-agent-facing-work-unit-contracts` 已把 Agent-facing entrance contract 收束到 submit / ledger append 前。本 change 接在它后面，处理 **出口 / judgment layer contract**：Agent、Phase Agent 或 Sub-agent 已经产出 runtime surfaces 之后，从 `operate-work-unit submit`、submitted ledger、gate helper、inspect/advice、reference projection、return map 到 phase handoff 的整条判断链，哪些 surface 足以让 gate 可解释地 pass，哪些必须 fail，以及 diagnostics 应怎样告诉 Agent 修哪一个 deterministic surface。

因此本 change 不是 “BUG-068 + BUG-070 点修”。这两个 bug 只是入口合同修完之后暴露出来的出口合同漂移样本。和第一个 change 一样，本 change 的第一任务是横向审计：凡是同一 judgment / output contract 附近存在 “gate declares X, helper checks Y, phase docs ask for Z, inspect labels W” 的 mismatch，只要影响 pass/fail、gate-readable submitted coverage、reference navigation truth、或 Agent 是否能在 stop:no phase 自主修复，都属于本 change 范围。不要等第三、第四个 bug 再补丁式追加。

当前已知症状包括：

- Wave1 required outputs `artifacts/wave1/{topic}/evidence-summary.md` 和 `question-list.md` 可以被 work-unit result 以 `role: "other"` 合法提交，但 `wave1_work_unit_output_coverage` 只接受 `reference` / `evidence_summary` / `question_list`，导致 gate 下游失败。
- `phase-wave1.md` 的 `reviewed_work_unit_refs` 示例使用 `_work_units/wave1/<work_id>/` 尾斜杠，但 `depth_review_contract` helper 对 submitted ledger refs 做 exact set comparison，照文档写会 fail。
- `seed_topics/*.md` return-map `refs` 本应是 consumer navigation map，却允许只指向 `artifacts/`、`_cache/`、`_work_units/`，或者使用 `reference/topic-*.md (N files)` / `reference/topic-*.md（N 个）` 这种 glob/count summary，无法按图索骥到具体 `reference/*.md` 文件。
- `return-map.mjs`、inspect CLIs、gate output 的 wording 对 blocking / advisory / diagnostic-only 的分类不清：一些会影响 pass/fail 的 ref backing / projection drift 被看起来像 diagnostic-only 的文字覆盖。
- 没有一个静态审计能证明 active gate rule id、helper/check implementation、artifact shape、Agent-facing producer instruction 和 pass/fail consequence 已对齐。

这不是研究质量规则加严。本 change 只处理当前 active deterministic gate / navigation contracts；不会把“更好的研究质量愿望”塞进 gate。

## What Changes

- 在 design 中建立 gate/output-alignment audit：按 active gate rule id 和相邻 output/navigation surfaces 盘点 gate definition、helper / CLI dispatch、artifact shape、Agent-facing phase / sub-agent instruction、inspect/advice wording、pass/fail consequence，并标出本 change 要修复的 drift。
- 在 design 中定义 judgment layer contract closure model：每个 blocking deterministic contract 必须从 producer instruction、runtime authority、checker/helper、diagnostic/advice、test guard 五段闭合；同一事实的 Source of Record 与冲突处理必须清楚。
- 将 implementation 中发现的同类 deterministic mismatch 纳入本 change，而不是只完成 BUG-068/070 的已知实例。纳入条件是：它影响 gate pass/fail、submitted ledger coverage、reference/navigation truth、blocking/advisory/diagnostic classification，或 stop:no 自主执行所需的自足 contract。
- Wave1 required output path role contract 对齐：
  - `artifacts/wave1/{topic}/evidence-summary.md` 在 submitted ledger 中必须以 canonical role `evidence_summary` 被 gate 消费。
  - `artifacts/wave1/{topic}/question-list.md` 在 submitted ledger 中必须以 canonical role `question_list` 被 gate 消费。
  - 若 submitted result 把这两个 required paths 标成 `other`，submit 应在 ledger append 前 deterministic normalize role，并记录 submit normalization diagnostic。
  - `other` 仍可用于真正额外、非 blocking 的 output。
- Depth-review work-unit refs 对齐：
  - phase examples 改为 `_work_units/wave1/<work_id>`，无尾斜杠。
  - validator 在 exact submitted-ledger comparison 前 canonicalize safe refs，允许 harmless trailing slash。
  - unsafe refs 或没有指向 submitted work-unit row 的 refs 仍 fail。
- Seed-topic return-map reference navigation contract 对齐：
  - evidence-bearing return-map entries 必须至少包含一个 concrete existing `reference/*.md` ref。
  - `artifacts/`、`_cache/`、`_work_units/` 可作为 secondary provenance，不能单独满足 consumer navigation。
  - glob/count summaries such as `reference/topic-*.md (8 files)` 和 `reference/topic-*.md（8 个）` 必须 fail。
  - helper 必须验证 concrete `reference/*.md` refs 存在于 active bundle root。
  - phase docs 必须明确 `reference/` 是 primary consumer navigation layer，internal build surfaces 是 secondary provenance。
- Gate / inspect diagnostics 要明确 classification：blocking、advisory、diagnostic-only；不得把会影响 pass/fail 的 finding 打成 diagnostic-only。
- 增加 static audit test：每个 active gate rule id 必须有已知 check implementation / helper route，并在 change design 或 apply evidence 中有 artifact contract 说明。
- 增加 focused regression / fixture tests：
  - Wave1 role normalization 防止 `other` 静默进入 gate failure。
  - depth-review trailing slash canonicalization pass，unsafe / unsubmitted refs fail。
  - return-map only-internal refs fail；globbed `reference/` fail；concrete existing `reference/*.md` pass。
  - gate / inspect output classification 与实际 pass/fail authority 对齐。
- 明确不产出：不为 historical bad submitted-ledger rows 提供通用 amend path；不新增依赖；不使用 Python；不把 advisory-only research quality desires 变成 blocking gate；不以“审计”名义重做无关架构或重写所有 gate。
- 版本：需要 version bump，target version 为 `v0.13`。implementation 阶段需要更新 `CHANGELOG.md` 和 `DPT_FRAMEWORK/RUN.md` 版本横幅。

## Capabilities

### New Capabilities

- 无。

### Modified Capabilities

- `research-wave-gate-implementation`: wave gates、helpers、definition rules 和 diagnostics 必须作为一个 coherent judgment layer；Wave1 role/path coverage、depth-review ref canonicalization、return-map reference navigation blocking rules，以及 apply 审计中发现的同类 pass/fail drift 都要与 implementation 对齐。
- `work-unit-provenance-gate`: work-unit output coverage 必须区分 required delegated outputs、extra outputs、Phase-owned projections 和 submitted ledger authority；canonical required path roles 是 coverage contract 的一部分。
- `agent-output-declaration`: work-unit submit / ledger append 必须对 Wave1 required paths 做 narrow role normalization，并记录 normalization diagnostic。
- `research-return-map`: seed-topic return-map refs 必须可作为 consumer navigation，evidence-bearing entries 至少指向 concrete existing `reference/*.md`。
- `research-wave-phase-content`: phase docs 必须教 Agent 写 canonical role、canonical work-unit refs、reference-first return-map refs。
- `cli-inspect-output-conventions`: inspect output 必须准确标注 blocking / advisory / diagnostic-only，而不是把 blocking return-map / reference navigation failures 表述成 diagnostic-only。
- `gate-skeleton`: active gate rule hygiene 必须证明每个 rule id 有已知 implementation 和 documented artifact contract。

## Impact

- 预计 implementation 面包括 `DPT_FRAMEWORK/engine/work-unit-submit.mjs`、`DPT_FRAMEWORK/engine/helpers/gate-helpers-provenance.mjs`、`DPT_FRAMEWORK/engine/helpers/wave-depth-contracts.mjs`、`DPT_FRAMEWORK/engine/helpers/return-map.mjs`、`DPT_FRAMEWORK/cli/inspect-wave*-output.mjs`、`DPT_FRAMEWORK/cli/gates/check-gate-*.mjs`、`DPT_FRAMEWORK/schema/gate_definitions/gate-*.definition.json`、`DPT_FRAMEWORK/workflows/nodes/phases/phase-wave0.md`、`phase-wave1.md`、`phase-wave2.md`、`phase-seed-topics.md`、static hygiene / validation helpers。实际 apply 只应修改审计证明相关且影响 deterministic judgment/output contract 的 surfaces。
- 预计测试面包括 `tests/engine/helpers/`、`tests/engine/work-unit-submit.test.mjs`、`tests/integration/cli/check-gate-wave1-complete.test.mjs`、`tests/integration/cli/inspect-wave-return-map.test.mjs`、fixture-level gate tests，以及 static regression tests。
- Requirement registry 同步需要在 apply 开始时完成：本 proposal 暂在 change-local specs 中使用 pending IDs `AGO-007`、`GSK-011`、`IOC-005`、`RRM-004`、`RWG-018`、`RWP-016`、`WPG-013`；apply 阶段必须登记到 `openspec/governance/req-registry.yaml` 后再运行治理检查。
- 技术约束保持不变：Node.js >=20，纯 JavaScript ESM，`node:test` + `node:assert`，不新增依赖，不使用 Python。
