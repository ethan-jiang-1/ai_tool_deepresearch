# C5: Drop Legacy Reference and Experiment Formats

> 原候选 change：`drop-legacy-reference-and-experiment-formats`
>
> 状态：split discovery complete; C5a must become writer-first / reader-second, C5b needs a retained-history policy decision
>
> 风险：C5a L4; C5b L4

## 为什么必须拆开

reference topic-binding compatibility 是 research evidence 语义；experiment report/audit compatibility 是 test selection/history 语义。两者只有“带版本/旧 reader”这个表面共同点，实际 owner、consumer、失败后果完全不同。

独立审批卡： [C5a-1](C5a1-uid-only-current-reference-authoring.md)、
[C5a-2](C5a2-historic-reference-reader-policy.md) 与
[C5b](C5b-retained-experiment-history-policy.md)。它们不是已创建的
OpenSpec changes。

## C5a: Reference metadata and topic binding

### 已验证事实

- `schema/contracts/reference.mjs` 的 thin Wave0 `source.yaml` metadata 是单一字段表；这一块本身不显示 v1/v2 parser。
- 真正的 compatibility 在 Markdown reference metadata：`related_topic_uid` 与 legacy `related_topic` 都被 `topic-layout.mjs`、gate checks、reference index、file observability、provenance 接受。
- `related_topic` 仍是 current writer/guidance contract：`subagent-dpt-evidence-extractor.md` template writes `{topic.slug}` and shared reference guidance explicitly permits both forms. It is not yet a writer-free legacy branch.
- current phase/task context already exposes exact `topic_uid` alongside slug, so UID-only authoring is technically plausible but must be separately demonstrated in the actual reference-writing handoff.
- `related_topic_uid: all` is a current shared-reference sentinel and must remain.
- `_INDEX.md` 的 `related_topic` column is a navigation projection, not canonical authority; it must not be mistaken for the Markdown metadata compatibility reader.
- `previous_layouts` is current layout lineage, not a legacy version format. It allows a current UID to retain safe provenance/reference resolution after a current rename or reorder.
- current specs 明确允许 historical reference 不做 mass rewrite。

### 目标与风险

这项必须按两个顺序 slice 判断，不能直接删 reader：

1. **C5a-1 (L3):** 修改 current authoring/task context/template，使所有新 rich
   reference 只写 exact `related_topic_uid` 或 `all`；证明 Wave0/Wave1 writer
   在实际 handoff 中确实取得 UID。
2. **C5a-2 (L4):** 再决定 existing references with `related_topic` 是否由 current
   Gate/index/provenance reader 继续读取、明确拒绝，或只供人查看。

第二项直接影响 evidence countability 和 topic attribution；历史 reference 不做
mass rewrite 不等于 current Engine 必须继续把它当有效输入。

### Go / No-go

- [x] per-reader inventory 已确认：Gate、index sync、file observability、provenance、rerun 都通过 shared topic-layout resolver 受影响。
- [x] current writer/guidance 仍输出或允许 legacy key，故 reader removal 现在 No-go。
- [ ] C5a-1: prove the exact reference-authoring handoff always carries `topic_uid`, then change current output/guidance to UID-only while retaining `all`.
- [ ] C5a-2: user selects immutable historic-reference policy: Engine retain-reader, explicit reject, or human-only opaque; no silent rewrite.
- [ ] 用 Wave0/Wave1/rerun coverage 测试证明 UID-only current path 仍正确，并为 selected historic boundary 写 test。

## C5b: Experiment retained reports/audits and selection observations

### 已验证事实

- current writer 生成 report v2、audit v2 和 selection-observation v2。
- contract reader 仍接受 report v1/v2、audit v1/v2、selection observation v1/v2。
- `readRetainedExperimentObservations()` 会读取 `_reports` 和 audit history，把 v1 当 retained observation，而 v2 额外带 execution-surface fact；malformed retained history yields diagnostics, not launch failure.
- v1 observations still influence current behavior: duration/cost prediction and source-matching `PASS+CLEAN` can become `needs_qualification` for explicit regression qualification. 删除 v1 reader 会改变选取、成本预测和 qualification，不只是格式卫生。

### 目标与风险

历史 reports 可以继续供人查看，但 current supervisor 是否还该把 v1 作为
selection input，是独立产品决定。风险 L4：错误处理会误选/漏选 regression
candidate，或者让旧 history 造成启动失败。

不在本项范围内的 current singleton schemas 必须保护，例如
`command-experiment/v2`、completion v1、health v1、run context v1、manifest
marker v1；名字带 v1 不表示存在可删的多版本 reader。

### Go / No-go

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

- [ ] C5a-1、C5a-2 和 C5b 建成独立 proposals；不共享一张泛化 “legacy format” delta。
- [ ] 每项明确 retained artifacts 对 Engine 的政策。
- [ ] 所有 current writer/reader 和 legacy rejection/opaque boundary 有测试。
