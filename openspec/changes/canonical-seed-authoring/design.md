## Context

当前 `canonical-topic-state.mjs` 已经具备本 change 需要的大部分确定性能力：`renderSeed()` 用 `{ ...existingFrontmatter, ...canonicalFrontmatter }` 保留 enrichment、覆盖 canonical binding，再由 `yaml.stringify()` 做一次序列化；现有 `_diagnostics/topic-state/<operation-id>/` workspace 负责 compare-and-swap、prepared publication 和 exact recover；`evaluateSeedTopicAuthoring()` 已由 queue completion、canonical inspect 与 seed-topics Gate 共同消费。

缺口在 authoring path。`phase-seed-topics.md` 仍要求 Agent 直接手写整个 frontmatter，并在正文再次写 `must_answer`、scope 和 evidence route。Evaluator 只在 queue completion 或更晚 Gate 被调用，因此一次 canonical rewrite 会在 Agent 已完成整份 seed 后才暴露。来源是 `_backlog/plans/evidence-production-and-phase-projection-boundaries.md` Change 1；本设计也吸收 companion `architecture-review.md` 对 parsed-value equality、正文重复 surface、明确 checkpoint 与 legacy compatibility 的修正。

本设计依次审视了三条 evolution direction。语义层上，`enrich_seed` 只回答 Seed Topics Agent 的有界问题：“如何提交 seed-local structured enrichment，同时没有 canonical Topic 写权限？”它保留 Topic selector/canonical value、structured enrichment/body prose、合法 gap/schema error、pre-existing drift/post-render binding 的区别；success 或一个 direct root 足以让 Agent 停止向下重建。控制层上，direct Source of Record 是 registry、当前 seed 与 explicit input，最短闭环复用同一 writer/workspace/evaluator；不新增 state、CLI family、validator 或 recovery path。责任层上，用户只决定新的 Topic/研究语义，Agent形成 enrichment并执行 body/input repair，Engine裁决结构、binding、serialization和commit；普通机械步骤不推回用户。

## Goals / Non-Goals

**Goals:**

- 在既有 topic-state apply family 中增加一个 exactly-one-topic、closed-schema 的 seed enrichment form。
- 保证 canonical fields 来自 registry，enrichment input 不能携带或覆盖 canonical keys，Markdown body bytes保持不变。
- 把 canonical equality 定义为 parsed JSON-value equality，并覆盖 quoted/multiline/CJK/Unicode round trip。
- 在 queue completion 前的 named authoring checkpoint 复用现有 evaluator，报告并机械修复可解析的 canonical drift。
- 让 frontmatter 成为 structured enrichment 的唯一 authoring surface；新 body skeleton 不再复制 `must_answer`、scope 或 evidence route。
- 保持既有 apply forms、workspace recovery、queue completion和Gate兼容，并为 in-flight/legacy seed 给出明确迁移边界。
- 发布为 `DPT_FRAMEWORK v0.50`，topic-state response/input contract minor bump为 `1.1.0`。

**Non-Goals:**

- 不改变 `rb_plan.md#/topic_registry`、queue、submitted ledger、reference、artifact、status、trace或evidence provenance authority。
- 不加入 queue admission、work-unit kind、Wave projection、shared-reference producer/floor或后续计划 change。
- 不让 Engine 生成、补全或评价 hypothesis、scope、guardrail、evidence route或正文语义；显式 gap仍是合法 Agent judgment。
- 不提供 arbitrary seed patch、partial JSON Patch、raw YAML formatter、generic Markdown linter、第二 seed writer或第二 evaluator。
- 不批量改写现有 bundle，不把 legacy duplicate body prose提升为machine authority，也不因presentation差异阻塞Gate。
- 不新增用户 interaction、retry tree、background repair、runtime state或queue-owned enrichment receipt。

## Decisions

### 1. 扩展现有 `apply` union，而不是新增 CLI 或 writer

新增 strict input form：

```json
{
  "context": "seed_topics",
  "action": "enrich_seed",
  "topic_uid": "tp_...",
  "enrichment": {
    "hypothesis": "...",
    "in_scope": "...",
    "out_of_scope": "...",
    "search_guardrails": {
      "required_terms": ["..."],
      "forbidden_broadening": ["..."]
    },
    "evidence_route": {
      "preferred_sources": ["..."],
      "noise_to_avoid": ["..."]
    }
  }
}
```

所有五个 enrichment fields 都是 required；strings非空，四个nested arrays都至少一个非空string。上游信息不足时，Agent提交明确的non-empty gap value，而不是省略字段。Top-level、`enrichment` 与nested objects全部strict；`topic_uid`只作selector，`id`、`slug`、`title`、`must_answer`、`scope_role`、`depends_on_topic_uids`及任何unknown key都不能进入input。

Engine用`topic_uid`从当前canonical registry解析唯一topic和current seed path。Operation不得接受caller-provided path/slug/canonical snapshot，也不得从filename或body猜identity。`context`只选择input shape；真正授权来自`current_node: phases/phase-seed-topics.md`、合法setup/rerun incoming handoff和对应`setup_ready|rerun_ready -> seed_topics_ready` status window。

选择existing apply union，是因为writer、path safety、workspace与recover都已存在。备选new `write-seed-enrichment` CLI会复制bundle resolution、authorization、atomic write和recovery；generic patch/partial input会扩大permission并制造stale-field semantics，均拒绝。

### 2. 一个complete enrichment input替换全部五个字段

`enrich_seed`读取existing seed，保留unknown non-canonical frontmatter keys以兼容历史扩展，随后用complete validated enrichment覆盖exact five fields，再由canonical registry覆盖exact seven binding fields。它不删除其他legacy keys，不接受field-by-field patch，也不改变registry。

Complete input让每次提交的structured search controls可单独理解，避免partial patch需要区分“未提供”“保留旧值”“故意清空”的额外状态。显式gap承担unknown语义，无需null/default/fallback分支。

### 3. Frontmatter拥有structured authoring；正文不再复制同一判断

新seed的canonical/structured authoring surface为：

- `rb_plan.md#/topic_registry`拥有seven canonical fields；seed frontmatter只投影它们；
- seed frontmatter拥有Agent-authored `hypothesis`、`in_scope`、`out_of_scope`、`search_guardrails`与`evidence_route`；
- Markdown body拥有topic positioning、known/gap/tension elaboration、why-now、final-deliverable contribution、optional downstream position与research-round appendix等自由研究判断。

`renderNewSeedBody()`和shared contract删除`## must_answer`、`## 研究边界与不深挖范围`、`## 证据锚点与优先来源`的required copy。Canonical `must_answer`只从registry/frontmatter读取；scope/evidence consumers只读frontmatter。Body中的known/gap/tension可以展开hypothesis，但不是structured equality target。

备选“body authoritative”会迫使现有downstream structured readers新增parser；备选“renderer持续同步正文投影”会破坏body preservation并引入Markdown section rewriter。选择frontmatter authority可删除双写义务，且复用现有consumer shape。

### 4. Enrichment apply先观察drift，再canonicalize，并在commit前复核

Phase执行顺序固定为：读取registry/profile/current seed -> 只编辑body -> 写retained complete enrichment input -> 调用`operate-topic-state apply` `enrich_seed` -> queue complete。

Operation读取existing seed后先调用`evaluateSeedTopicAuthoring()`：

- parseable且binding通过：继续render；
- parseable但canonical field drift：保留evaluator按fixed field order返回的第一个failure，在同一次render中由现有canonical merge修复全部canonical fields，success output以`binding_repair`返回该direct root的field/expected/observed/coordinate；Agent无需再手改或多跑一次；
- frontmatter不可解析：在workspace前返回`frontmatter_invalid`、exact coordinate和同一个apply rerun；因为无法可靠识别body boundary，不猜测或自动salvage bytes；
- unknown UID、unsafe/missing current seed或strict input error：workspace前fail closed，不写plan/seed/queue。

Render后、prepared publication前，同一个evaluator对staged bytes再运行一次。失败代表writer postcondition defect，返回`writer_postcondition_failed`/`missing_contract`且不发布workspace；不启动fallback writer。这样`must_answer` rewrite在enrichment checkpoint被显式报告并机械修复，queue completion和Gate仍是同源defense，而不是首次发现点。

Strict input error使用structured `input_invalid` output，至少包含first rejected coordinate、`repair_kind: agent_action`和same apply rerun。成功输出包含`action: enrich_seed`、`topic_uid`、current `slug/path`、`verdict: committed|unchanged`和nullable `binding_repair`。Topic-state schema version提升到`1.1.0`；existing operation/result fields保持兼容。

备选“drift立即block”没有合法canonical repair surface，只会把Agent逼回raw YAML；备选“静默覆盖”延续BUG-127 signalling缺口。Report-and-canonicalize同时保留single writer和decision-point feedback。

### 5. Reuse existing workspace，body bytes与queue authority不变

Enrichment mutation通过现有topic-state workspace staging exactly one current seed和byte-identical `rb_plan.md` contract；prepared manifest记录existing authorization、input hash和affected UID，recover仍只roll forward staged bytes。Seed正文定义为closing frontmatter delimiter之后的exact bytes，render前后必须byte-equal，包括appendix、legacy duplicate sections与rerun direction。

`enrich_seed`只在Seed Topics lifecycle可用，因此不套用用于canonical intent/layout mutation的generic active-topic quiescence blocker；当前`seed_topic_materialize` queue item正是operation的caller work。它不读取、claim、complete或修改queue，也不借此允许later-Wave enrichment。Accepted workspace继续优先返回exact recover；late drift继续fail closed。

备选将operation绑到一个特定queue item会让topic-state writer取得queue admission/claim责任，并妨碍Gate repair；lifecycle authorization加single-topic selector已经是更窄且完整的owner boundary。

### 6. Queue completion与Gate保留同一evaluator，但修复owner改变

`operate-queue complete`仍先admit exact `seed_topic_materialize` declaration，再调用相同evaluator，只有pass才能terminalize。若fallback发现`canonical_binding_mismatch`，feedback改为：

- `repair_kind: engine_operation`；
- `missing_fact`保留exact canonical field/expected/observed；
- `write_to`命名该UID的`operate-topic-state apply` `enrich_seed` owner/input contract，不授权direct YAML edit；
- `rerun`仍是同一个queue completion command。

`frontmatter_invalid`是唯一需要Agent对exact syntax coordinate做bounded parse repair的legacy/accidental exception；修到可解析后必须立即走`enrich_seed`，不能手填canonical values。Ambiguous card declaration仍是`missing_contract`。Final seed-topics Gate和topic-state inspect对canonical mismatch采用同一个writer owner；Gate不校验enrichment语义或body duplicate prose。

### 7. Legacy与in-flight bundle采用read-compatible、write-canonical策略

Existing v0.49 apply inputs、seed paths、frontmatter keys、unknown enrichment keys、queue cards和body bytes保持可读。升级后：

- parseable legacy seed可直接`enrich_seed`；canonical drift会report-and-repair；
- legacy body中的`## must_answer`、scope/evidence sections保留但明示non-authoritative，不批量删除，不参与binding/Gate；
- old already-enqueued/claimed `seed_topic_materialize` card仍可complete；失败时按new writer owner修复，无queue migration；
- malformed legacy YAML只允许exact syntax repair到parseable，再由writer canonicalize；
- new skeleton从v0.50起省略duplicate sections，旧renderer output仍被reader接受。

Rollback可恢复v0.49 workflow/code，因为writer没有新增persistent state或文件格式，v0.50写出的seed仍是旧reader可解析的既有frontmatter/body shape。Rollback后只失去structured authoring入口；已写seed无需data reversal。

### 8. Apply target manifest与net simplification

预计修改：

- topic-state input schema/lifecycle authorization/build/render/result与CLI error projection；
- seed authoring evaluator的explicit parsed-value equality contract（仍一个helper）；
- queue completion/inspect/Gate canonical-repair owner adapters；
- `renderNewSeedBody()`、shared authoring contract、Seed Topics phase/task card、topic-state playbook/command index；
- focused unit/integration/deterministic E2E与一个real Subject Agent playbook；
- `CHANGELOG.md`和`DPT_FRAMEWORK/RUN.md` v0.50 release surfaces。

预计删除或收敛：raw canonical YAML authoring guidance、new-body `must_answer` copy、body scope/evidence-route duplicate obligations、queue/Gate direct canonical-file repair wording，以及“等到completion才知道identity drift”的隐含流程。明确避免：new CLI、writer、workspace、state、hash identity、body parser/synchronizer、lint Gate、retry/recovery branch或queue coupling。

最短闭环是registry/current seed + one complete Agent input -> existing renderer/workspace -> existing evaluator -> existing completion。一个input variant换掉三份Agent记忆义务并把反馈前移，满足net simplification。

## Risks / Trade-offs

- [Legacy duplicate body prose可能与frontmatter不同] -> 明确frontmatter/registry authority，所有正常consumer和guidance停止读取duplicate section；保留bytes仅为compatibility，不声称一致。
- [Complete enrichment object比partial patch冗长] -> 它消除missing-vs-preserve状态；五个字段有界且task本来就要求一次形成完整search controls。
- [Pre-existing drift被同一次写入修复，调用者可能忽略signal] -> success output固定暴露nullable `binding_repair`并由CLI/测试锁定；queue completion仍做defense。
- [Malformed YAML无法由structured writer自动恢复] -> fail在最早parse root，只授权bounded syntax repair；不写第二salvage parser或猜body boundary。
- [Seed Topics lifecycle authorization需兼容setup与rerun两个incoming edge] -> 复用existing handoff preflight与status windows，并用focused initial/rerun/post-final negative tests证明不扩权。
- [Skippingcanonical-mutation quiescence可能被误用] -> closed `context/action`只在Seed Topics node生效且只改five enrichment fields；later phases和arbitrary maintenance全部fail closed。
- [Topic-state schema minor bump影响exact-version consumers] -> v1.1保持existing fields/forms additive compatibility，同步docs/tests/version banner；没有runtime data migration。
- [Real Agent canary可能受runtime availability影响] -> 它只证明给定legal setup boundary后Agent使用structured writer并完成queue/Gate，不评价enrichment质量；不可运行时诚实NOT_RUN，不能由JS fixture替代。

## Migration Plan

1. Apply开始先运行verification plan-mode；添加failing unit/integration/E2E tests，锁定parsed equality、strict input、body preservation、authorization、atomic recovery和fallback owner。
2. 扩展topic-state schema/apply path与CLI output；复用existing renderer/workspace/evaluator，不先改Markdown flow。
3. 更新queue/inspect/Gate feedback adapter，使canonical mismatch只指向new writer；验证所有failure无queue/plan/seed意外副作用。
4. 删除new-body duplicate sections，更新shared/phase/task/command guidance与static regression，确保normal flow是body edit + structured apply + completion。
5. 更新deterministic full chain和new real-Agent case，运行native verification；同步v0.50 release notes。
6. 运行focused/full tests、verification assets-mode、requirement/spec governance与strict OpenSpec validation后归档。

Rollback恢复旧code/guidance和v0.49 banner即可；无新persistent state、queue migration或seed format migration。已由v0.50 writer产出的YAML仍符合v0.49 reader，body删减只影响非Gate-requiredpresentation，新/旧canonical frontmatter保持兼容。

## Open Questions

无阻塞问题。若apply发现downstream production consumer实际读取legacy body `## must_answer`、scope或evidence section而非frontmatter，必须返回explore并修订capability scope；不得在本change内临时加入body synchronizer或第二authority。若real-Agent proof需要新增host permission、generic Subject runner或semantic judge，也必须缩窄claim或另提change。
