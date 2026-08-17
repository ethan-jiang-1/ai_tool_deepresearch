# Design: repair-run-contract-surfaces

## Context

动机见 proposal.md。current-head 逐项复验已完成（disposable bundle 实测 + 源码/测试对照），每个 bug
的根因与修复面都已用证据钉死：7 个 bug 全部是「Agent 读到的契约表面与 Engine 确定性契约不一致或缺失」，
引擎裁决逻辑（`lifecycleAuthorization`、`resolveThreshold`、`wave-depth-contracts` checker、claim 序列化
`emit`）经核验行为正确，**零引擎行为改动**。

关键复验事实（每项都有 source）：

- BUG-225：`cli/operate-work-unit.mjs#emit` 用 `JSON.stringify`；`prompt_refs[].spawn_prompt` 是 ~1.7KB
  引导文本；wave0 delegated 与 wave1 fallback 两条 claim 实测 stdout 均可 `JSON.parse`。原事故路径
  （task.md 全文内嵌 + 未转义）在 current head 不存在 → 修复 = 回归锁 + hash 基准文档。
- BUG-226：`engine/helpers/canonical-topic-state.mjs:1418` 硬性要求 `current_node ===
  phases/phase-hitl1.md`（accepted `research/canonical-topic-state` CTS 要求，引擎正确）；实测
  instantiation gate pass → `enter-phase --node phases/phase-hitl1.md`（exit 0，bootstrap target 豁免
  preflight）→ `advance-status --to hitl1_recorded` → `operate-topic-state apply --context hitl1`
  （committed）全链路可行。`tests/integration/md/harness-entry-doc-consistency.test.mjs:83-96` 把错误
  解读锁进测试，必须随文档一起改。
- BUG-227：`shared-hitl1-research-access-envelope.md:150-152` 单样本 `not_attempted`，与自身叙述
  （:92-97）、`profile.mjs:191`、`schema-core` SCO 要求矛盾；Unavailable 示例（:186-188）已是正确写法。
- BUG-228：`gate-wave1-complete.definition.json:53-59` 静态 `threshold: 1`/「at least one」；
  `resolveThreshold`（`gate-helpers-readers.mjs:119`）从 profile `wave1_per_topic_ref_floor` 解析；
  `evaluateWave1ReferenceTopic` 只数 reviewed submitted backing 的 canonical 候选。运行时 finding
  由 `wave1ReferenceConvergenceFinding` 生成（含 observed/required/deficit），definition 的
  failure_message 对该规则是静态误导面。
- BUG-229：`phase-setup.md:49` 把 gate 后状态当 gate 前检查；`check-gate-setup-ready.mjs` definition
  要求 `current_gate=setup_ready`/`next_gate=seed_topics_ready`，repair 指向 bootstrap
  `advance-status --to setup_ready`；`pre-research-phase-content` PRP-003 锁了错误措辞。
- BUG-230：`wave-depth-contracts.mjs:1124`（top-level 全键必填）与 `:1220`（resolution 非空
  `origin_refs`）；`wave2-synthesis` spec 已有对应要求；`shared-schemas.md:137,151` 未标注。
- BUG-231：`instantiate-run-bundle.mjs:119` dirs 列表无 `_scripts/`；`.gitignore:83-84` 存在
  `/.gen-*.mjs`/`/.wu*-*.mjs` 补丁；README「运行时边界」裸路径族与 BUNDLE_MAP 模板均无 `_scripts/`。

## Goals / Non-Goals

**Goals:**

- 7 个 bug 各用最小修复面收口：文档/示例/definition 文案对齐、`_scripts/` scaffold、回归锁测试。
- 被错误锁定的既有测试（harness-entry-doc-consistency WNC-010 断言）随 spec 修正一起更新。
- 全部修复可被确定性测试证明（无网络、无 Agent 执行、disposable bundle 模式）。

**Non-Goals:**

- 不改任何引擎裁决逻辑、CLI 序列化实现、schema 字段或 gate 校验语义（current head 行为正确）。
- 不做 BUG-231 的可选守卫（validate-bundle 检测 repo 根脚本）——新增控制层，违背 simple-reliable-control。
- 不重开 BUG-221 已修复项（单候选 inspect，v0.89 已修，仅确认不重复）。
- 不重做 BUG-225 事故恢复；不修 run 级环境观察（Bing 本地化等，见 bugs README）。

## Decisions

### D1: 一个 change 收口 7 个 bug（而非 7 个 change）

同一根因族（Agent 契约表面 ↔ Engine 契约不一致）、零引擎行为改动、修复面互不重叠但有共同收尾
（测试 + 文档 + governance）。仓库历史有同规模先例（`make-agent-operation-contracts-direct` 归档 12 bug）。
备选（按 bug 拆 change）会增加 6 个生命周期与 6 次 governance 收尾，无独立性收益。
→ 采纳单 change。

### D2: BUG-225 用「回归锁 + 文档」而非代码改动

实测 current head 行为已满足 SUD-008 新要求；若改序列化实现属于无的放矢。回归测试放在
`tests/integration/cli/work-unit-claim-stdout-json.test.mjs`：disposable bundle + engine enqueue
（复用 `work-unit-declaration-recovery.test.mjs` 的 `createQueue/enqueue/makeItem` 模式），wave0
delegated 与 wave1 fallback 各 claim 一次，断言 `JSON.parse(stdout)` 成功且 `claimed_work_ids[0]` 存在。
`result_hash` 基准文档放 `shared-schemas.md`（`_work_units/` 节附近）：`sha256(stableStringify(result))`，
Source of Record = `engine/work-unit-utils.mjs`（`hashValue`）。备选：改 claim 输出裁剪字段——过度设计，
`spawn_prompt` 已是 bounded，不做。
→ 采纳。

### D3: BUG-226 走文档修正（WNC-010 例外边界澄清），不改 `lifecycleAuthorization`

引擎要求与 accepted CTS spec 一致；错误在 phase 文档把「bootstrap 例外」泛化成了「不执行
enter-phase」。enter-phase 是 `current_node` 唯一写入者且对 bootstrap target 豁免 preflight，实测
fresh bundle 上完全合法。文档修正（option 1，bug 卡首选）比引擎放宽（option 2）改动更小且保持 CTS
严格性。同步改 `harness-entry-doc-consistency.test.mjs`：原断言「must not gain an enter-phase
instruction」是错误解读的锁，改为断言「§6 包含 enter-phase --node phases/phase-hitl1.md 指令 +
例外只豁免 advance-status」。
→ 采纳。

### D4: BUG-228 只改 definition failure_message 静态文案

运行时 finding（`wave1ReferenceConvergenceFinding`）已带 observed/required/deficit，无需动；误导源是
definition JSON 的静态 `threshold: 1`/「at least one」。文案改为声明「有效阈值来自
`rb_profile.yaml#/research_style_params/wave1_per_topic_ref_floor`，且仅 Wave1 submitted backing 的
canonical 候选计入」。不引入 `{threshold}` 模板注入（新增机制，无必要——Agent 可读 profile）。
测试：锁 definition 该规则文案包含 threshold_source 语义（静态 doc-lock）。
→ 采纳。

### D5: BUG-229 双面修正（PRP-003 delta + phase-setup.md）

PRP-003 当前锁「检查 rb_status.json 仍然是 setup_ready/seed_topics_ready」——与 gate 前置要求矛盾；
delta 改为 pre-gate 窗口 + bootstrap advance 前置。phase-setup.md §3 改同一语义、§5 补
`advance-status --to setup_ready` 前置注记（bootstrap `hitl1_to_setup` 窗口）、§6 措辞说明 post-gate
的 covered advance 是常规 handoff（进入 seed-topics 后）。不改 `advance-status.mjs`（CPT 已窄义声明
bootstrap 兼容分支）。
→ 采纳。

### D6: BUG-230 只改 shared-schemas.md + 文档锁测试

`wave2-synthesis` spec 与 checker 均已要求；shared-schemas.md 是唯一漂移面。top-level 列表标注
`ledger`/`synthesis` 必填并给合法形状；15 字段表 `origin_refs` 行补全约束（resolution 必填非空、
`wave1_legacy_question` 必填来源、emergent 可显式 `[]`）。文档锁测试断言 shared-schemas.md 含这两条。
→ 采纳。

### D7: BUG-231 四件套（scaffold + 文档 + gitignore 移除 + spec delta），不做守卫

- `instantiate-run-bundle.mjs`：dirs 列表加 `_scripts`，templates 加 `_scripts/README.md.tmpl`
  （与 `_cache/README.md.tmpl` 同模式：non-authority 声明 + 目录说明）。
- `BUNDLE_MAP.md.tmpl`、`DEEP_RESEARCH_HARNESS/README.md`「运行时边界」、根 `AGENTS.md` 补
  `_scripts/` 落点与「run-scoped 脚本不得写 repo 根」硬规则。
- `.gitignore` 移除 `/.gen-*.mjs` 与 `/.wu*-*.mjs`（治本后不再掩盖）。
- CMI-001 / WDC-004 delta 把 `_scripts/` 写入实例化内容与裸路径族契约。
- 不做 validate-bundle 守卫（non-goal，理由见上）。
- 测试：instantiate 集成测试断言新 bundle 含 `_scripts/README.md`（扩展既有
  `tests/integration/cli/instantiate-run-bundle.test.mjs` 或新增断言）。
→ 采纳。

### D8: semantic-closure 分类

status: `affected`，family `bundle.run-scoped-script-location`（F7 建立的新 runtime 事实：run-scoped
脚本的当前落点与 authority 状态；resolver/producer = `instantiate-run-bundle.mjs`）。apply 阶段已把
family 写入 global catalog `openspec/governance/semantic-fact-families.yaml`（closure record 的
`catalog_additions` 随之清空）。该 family 按设计**没有 gate/verdict consumer**（non-authority 区域）；
closure record 的 `consumers` 按 schema 结构性要求（≥1）列出创建者表面
`instantiate-run-bundle.mjs`，该分类细节由 plan/closeout review 判断，不构成 authority 声明。其余
修复（F1-F6）只触碰 derived 展示面（文档/示例/definition 文案/测试），以 overlap: derived 标注，不
列为 family consumer。
→ 采纳。

## 设计论证（constitutional route）

- **semantic precision**（F7 `_scripts/`）：读者 = Phase Agent；有界问题 = 「本 run 自产的一次性脚本
  durably 落在哪」；必须保留的区别 = `_scripts/` 是 non-authority 运行时区域（与 `_logs/`/`_cache/`
  同类，不进 gate/inspect），`repo_command_root` 与 `current_run_bundle_root` 坐标区分不变；推理停止点 =
  文档 + scaffold + gitignore 移除，不做运行时守卫。
- **simple reliable control**：每项修复都指向唯一直接权威（accepted spec / executable contract），
  不新增任何 check/state/fallback；F1 用一条回归测试替代 Agent 永久反推；F7 移除两条掩盖性 gitignore
  模式；唯一「新增」的 SUD-008 是行为锁而非新控制。
- **helper-oriented**：无新 user decision；文档修正后 Agent 按文档即可通过既有确定性检查；Engine
  裁决零改动，无新 permission/capability/authority 面。

## Risks / Trade-offs

- [WNC-010 是 spec 级修改，既有测试锁的是旧解读] → 显式任务同步更新 delta + 测试，apply 顺序先 spec
  后文档后测试，回归验证以受影响子集 + 全量 `npm test` 双保险。
- [BUG-225「症状未复现」结论基于 disposable 实测，若未来 claim 输出重新内嵌长文本则回归测试必须抓到]
  → 回归测试覆盖 wave0 delegated + wave1 fallback 两条路径，SUD-008 作规范性要求。
- [`_scripts/` 是新增 bundle 运行时表面] → 严格 non-authority 语义（CMI-001/WDC-004 delta 写明不进
  gate/inspect required shape），不扩张 inspect-bundle 校验。
- [修改 harness-entry-doc-consistency 测试可能与其他 md 测试交叉] → 该文件是唯一锁 WNC-010 措辞的
  测试（grep 已确认），apply 时跑 `tests/integration/md/` 全目录回归。

## Migration Plan

- 无数据迁移、无运行时兼容问题：`_scripts/` 是新增可选区域，旧 bundle 不强制回填；definition
  文案与 phase 文档只影响未来读取；`.gitignore` 移除后 repo 根若再出现脚本会暴露在 `git status`
  （这正是意图——不再掩盖）。
- 回滚：本 change 全部改动可单独 revert（无级联状态变更）。

## Open Questions

无。所有决策均已由 current-head 证据钉死；`_scripts/` 守卫是否要做已明确列为 non-goal（用户可随时
要求追加为后续 change）。
