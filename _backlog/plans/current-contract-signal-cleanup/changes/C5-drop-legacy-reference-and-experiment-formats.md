# C5: Drop Legacy Reference and Experiment Formats

> 原候选 change：`drop-legacy-reference-and-experiment-formats`
>
> 状态：must split before proposal
>
> 风险：C5a L4; C5b L4

## 为什么必须拆开

reference topic-binding compatibility 是 research evidence 语义；experiment report/audit compatibility 是 test selection/history 语义。两者只有“带版本/旧 reader”这个表面共同点，实际 owner、consumer、失败后果完全不同。

## C5a: Reference metadata and topic binding

### 已验证事实

- `schema/contracts/reference.mjs` 的 thin Wave0 `source.yaml` metadata 是单一字段表；这一块本身不显示 v1/v2 parser。
- 真正的 compatibility 在 Markdown reference metadata：`related_topic_uid` 与 legacy `related_topic` 都被 `topic-layout.mjs`、gate checks、reference index、file observability、provenance 接受。
- `previous_layouts` 让历史 slug/id 仍可解析为 current canonical UID。
- current specs 明确允许 historical reference 不做 mass rewrite。

### 目标与风险

如果要只允许 UID binding，不能只删除一个 metadata key；必须先决定 retained historical reference 是否还被 current Gate/index/provenance 读取。风险为 L4：会直接影响 evidence countability 和 topic attribution。

### Go / No-go

- [ ] 建立 per-reader matrix：Gate、index sync、file observability、provenance、rerun 各自如何处理 legacy binding。
- [ ] 证明 current writer 只输出 UID binding，且没有 current authoring guidance 继续要求 legacy key。
- [ ] 对 immutable historical reference 选择明确 policy：opaque, reject, or retain reader; 不做 silent rewrite。
- [ ] 用 Wave0/Wave1/rerun coverage 测试证明 UID-only path 仍正确。

## C5b: Experiment retained reports/audits and selection observations

### 已验证事实

- current writer 生成 `agent-experiment-batch-report/v2` 与 audit v2。
- contract reader 仍接受 report v1/v2、audit v1/v2、selection observation v1/v2。
- `readRetainedExperimentObservations()` 会读取 `_reports` 和 audit history，把 v1 当 retained observation，而 v2 额外带 execution-surface fact。
- current selection logic 使用 retained history 来决定 qualification/regression；删除 v1 reader 会改变选取与成本预测，不只是格式卫生。

### 目标与风险

历史 reports 可以继续供人查看，但 current supervisor 是否还该把 v1 作为 selection input，是独立产品决定。风险 L4：错误处理会误选/漏选 regression candidate，或者让旧 history 造成启动失败。

### Go / No-go

- [ ] 以样本证明 v1 report/audit 在 current retained history 中是否实际存在；没有实际对象不等于无需定义 malformed/old artifact policy。
- [ ] 决定 v1 history 的作用：human-only，diagnostic-only，还是仍可驱动 current selection；三者的测试不同。
- [ ] 若变 human-only，确认 selection 无 v1 history 时的 deterministic behavior、cost/prediction 语义与 no-launch reasons。
- [ ] 不触碰当前 `command-experiment/v2`、completion v1、health v1 等单一 current schema，只因为它们名字含 v1。

## 影响面

| C5a | C5b |
|---|---|
| topic-layout, gate helpers, reference index, file observability, provenance, rerun specs/tests | agent-experiment contract, run strategy, supervisor, host tools docs, experiment specs/tests |
| evidence attribution / Gate pass-fail | selection / qualification / audit interpretation |

## 何时算完成

- [ ] C5a 和 C5b 建成独立 proposals；不共享一张泛化 “legacy format” delta。
- [ ] 每项明确 retained artifacts 对 Engine 的政策。
- [ ] 所有 current writer/reader 和 legacy rejection/opaque boundary 有测试。
