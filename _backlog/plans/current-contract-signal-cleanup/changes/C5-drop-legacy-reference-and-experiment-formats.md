# C5: Drop Legacy Reference and Experiment Formats

> 原候选 change：`drop-legacy-reference-and-experiment-formats`
>
> 状态：C5a-1 governed-archived；C5a-2 是 active dashboard item 09；C5b 是 item 11 的独立 decision card
>
> 风险：C5a L4; C5b L4

## 为什么必须拆开

reference topic-binding compatibility 是 research evidence 语义；experiment report/audit compatibility 是 test selection/history 语义。两者只有“带版本/旧 reader”这个表面共同点，实际 owner、consumer、失败后果完全不同。

独立审批卡： [C5a-1](C5a1-uid-only-current-reference-authoring.md)、
[C5a-2](C5a2-historic-reference-reader-policy.md) 与
[C5b](C5b-retained-experiment-history-policy.md)。C5a-1 已归档；C5a-2 已创建
standalone OpenSpec change；C5b 仍是 decision card，并只在 experiment-history
policy 与 C1f 对齐时共享 dashboard item 11。

## C5a: Reference metadata and topic binding

### 已验证事实

- `schema/contracts/reference.mjs` 的 thin Wave0 `source.yaml` metadata 是单一字段表；这一块本身不显示 v1/v2 parser。
- 真正的 compatibility 在 Markdown reference metadata：`related_topic_uid` 与 legacy `related_topic` 都被 `topic-layout.mjs`、gate checks、reference index、file observability、provenance 接受。
- `related_topic` 仍是 current writer/guidance contract：`subagent-dpt-evidence-extractor.md` 的 optional rich-reference example writes `{topic.slug}`，shared reference template 也把两种 binding form 都交给新 writer 选择。它不是 writer-free legacy branch。
- Wave1 的实际 Phase-owned materialization handoff 已提供 exact identity：queue payload 同时带 `topic_uid` / `topic_slug`，而 `resolveReviewedWave1SubmittedBacking()` 返回同一 `{ topic_uid, topic_slug }`；正常 evidence-extractor 不负责 rich reference 写入。
- Wave0 shared reference 是真实 `all` writer path；它不需要单 Topic UID。
- `related_topic_uid` 目前只能表达一个 UID 或 `all`，而 `related_topic` 仍可表达逗号分隔的多个 current/previous Topic id/slug。不能因为 Wave1 单 Topic 已有 UID，就把 shared/cross Topic subset 悄悄改写成 `all`。
- Wave2 当前文档要求 materialize `00-cross-*` reference，但没有给 scoped multi-Topic binding 一个 canonical current shape。现有 Wave2 fixture 使用 `related_topic: cross-topic`；shared resolver 不接受该 token，且 Wave2 cross-format finding 目前只是 advisory。因此该 fixture 不是合法 current writer 的证据，也不能作为 UID-only 已完成的证明。
- `related_topic_uid: all` is a current shared-reference sentinel and must remain.
- `_INDEX.md` 的 `related_topic` column is a navigation projection, not canonical authority; it must not be mistaken for the Markdown metadata compatibility reader.
- `previous_layouts` is current layout lineage, not a legacy version format. It allows a current UID to retain safe provenance/reference resolution after a current rename or reorder.
- current specs 明确允许 historical reference 不做 mass rewrite。

### 目标与风险

这项必须按两个顺序 slice 判断，不能直接删 reader：

1. **C5a-1 (L3):** 已证明 Wave1 per-topic Phase-owned materialization 可以取得 exact
   `related_topic_uid`；但 shared template 仍服务 Wave0/Wave2，不能在没有 multi-Topic
   current shape 的前提下宣称所有新 rich reference 已可只写 UID。
2. **C5a-1b (L4):** 先决定 shared/cross Topic reference 如何表达 one / all / exact
   subset bindings；它必须保留 Topic attribution 的语义，不能把 subset 变成 `all`。
2. **C5a-2 (L4):** 再决定 existing references with `related_topic` 是否由 current
   Gate/index/provenance reader 继续读取、明确拒绝，或只供人查看。

第二项直接影响 evidence countability 和 topic attribution；历史 reference 不做
mass rewrite 不等于 current Engine 必须继续把它当有效输入。

### Go / No-go

- [x] per-reader inventory 已确认：Gate、index sync、file observability、provenance、rerun 都通过 shared topic-layout resolver 受影响。
- [x] current writer/guidance 仍输出或允许 legacy key，故 reader removal 现在 No-go。
- [x] Wave0 `all` writer and Wave1 exact UID / slug handoff have been traced through the actual Phase-owned materialization path.
- [x] C5a-1b: B policy selected a lossless current writer form for shared/cross Topic references: self-contained exact `related_topic_uids: [uid, ...]` subsets, distinct from scalar UID and `all`.
- [x] C5a-1: `make-current-reference-authoring-uid-only` proved current authoring and removed `related_topic` from new-output guidance; it was governed-archived as `2026-08-14-make-current-reference-authoring-uid-only` (commit `0f415d92b`).
- [x] C5a-2: user selected explicit rejection for current Engine input while preserving historic Markdown bytes and manual readability.
- [ ] 用 Wave0/Wave1/rerun coverage 测试证明 UID-only current path 仍正确，并为 selected historic boundary 写 test。

## C5b: Experiment retained reports/audits and selection observations

### 已验证事实

- current writer 生成 report v2、audit v2 和 selection-observation v2。
- contract reader 仍接受 report v1/v2、audit v1/v2、selection observation v1/v2。
- `readRetainedExperimentObservations()` 会读取 `_reports` 和 audit history，把 v1 当 retained observation，而 v2 额外带 execution-surface fact；malformed retained history yields diagnostics, not launch failure.
- v1 observations still influence current behavior: `readRetainedExperimentObservations()` normalizes a matching v1 record without an execution surface; `projectExperimentCases()` and `currentHistoricalPrediction()` use its duration/cost; `regressionAdmission()` classifies an otherwise fast source-matching v1 PASS+CLEAN as `needs_qualification`; only explicit regression qualification can select and launch it. 删除 v1 reader 会改变选取、成本预测和 qualification，不只是格式卫生。

### 目标与风险

历史 reports 可以继续供人查看，但 current supervisor 是否还该把 v1 作为
selection input，是独立产品决定。风险 L4：错误处理会误选/漏选 regression
candidate，或者让旧 history 造成启动失败。

不在本项范围内的 current singleton schemas 必须保护，例如
`command-experiment/v2`、completion v1、health v1、run context v1、manifest
marker v1；名字带 v1 不表示存在可删的多版本 reader。

### Go / No-go

- [x] Current writer -> retained reader -> prediction/admission/selection consequence trace is closed by the focused host-tool test: normal regression does not launch a v1-only case, explicit qualification can select it with `observed_source_matching_history`.
- [ ] Actual `.exp-bundles` prevalence is unknown because it has not been authorized for inspection; sample this only if the user names a concrete path or authorizes the surface.
- [ ] 用户决定 v1 history 的作用：仍作 selection input、仅作 diagnostic/prediction input、或 human-only/ignored by Supervisor；三者的 tests and observable behavior differ.
- [ ] 若变 human-only/ignored，确认 selection 无 v1 history 时的 deterministic behavior、cost/prediction 语义与 no-launch reasons；malformed history must remain non-fatal unless a new contract explicitly changes that.
- [x] Protected current singleton schemas listed；不得仅因名字含 v1 而触碰。

## 影响面

| C5a | C5b |
|---|---|
| topic-layout, gate helpers, reference index, file observability, provenance, rerun specs/tests | agent-experiment contract, run strategy, supervisor, host tools docs, experiment specs/tests |
| evidence attribution / Gate pass-fail | selection / qualification / audit interpretation |

## 何时算完成

- [x] C5a-1 已 governed-archived；C5a-2 保持 standalone active proposal，不与 experiment history 合并。
- [ ] C5b 完成独立 policy decision；只在与 C1f 共享 experiment-history owner、policy 和 rollback boundary 时共用 dashboard item 11。
- [ ] 每项明确 retained artifacts 对 Engine 的政策。
- [ ] 所有 current writer/reader 和 legacy rejection/opaque boundary 有测试。
