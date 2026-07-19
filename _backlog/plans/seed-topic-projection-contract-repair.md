# Seed Topic Projection Contract Repair — Analysis and Execution Plan

> 状态：执行中；Change A 已 archive，Change B 待 propose
> 创建：2026-07-19  
> 更新：2026-07-20
> 触发来源：`_backlog/bugs/BUG-092`、`BUG-093`、`BUG-094`

---

## 一句话

**先补完已经接受但没有落地的 section-scoped seed projection 护栏，再收敛 Agent 编写 seed topic 与 rerun direction 时使用的模板；不把合同修复、模板 UX、标题迁移和历史 bundle 改写塞进一个 change。**

---

## 1. 本计划的位置

本文件是 backlog 层的执行路线和分析记录，不是 capability behavior 的 Source of Record，也不授权修改 `DPT_FRAMEWORK/`。

后续行为变化仍必须依次经过：

```text
本计划
  -> Change A /opsx:propose
  -> Change A /opsx:apply
  -> Change A /opsx:archive
  -> Change B /opsx:propose
  -> Change B /opsx:apply
  -> Change B /opsx:archive
  -> 关闭 BUG-092/093/094 与本计划
```

OpenSpec proposal、delta specs、design 和 tasks 才拥有待实现行为；accepted specs 和 executable contracts 才拥有完成后的行为真相。

当前 `openspec list --json` 为无 active change。因此本计划不与其他 change 抢占同一 target surface。

---

## 2. 触发问题与事实校正

### 2.1 BUG-092：问题成立，但根因需要改写

原报告认为 gate 不检查 seed appendix body，因此自由叙述和 count summary 可以通过。当前事实更精确：

1. `inspect-wave0-output` / `inspect-wave1-output` / `inspect-wave2-output` 已把 return-map deterministic findings 计入 blocking result。
2. `validateReturnMapContent()` 已能检查五个 canonical fields、relationship/status、concrete `reference/*.md`、glob/count summary 和 prose-only conclusion。
3. 但 `inspectSeedTopicReturnMaps()` 把**整个 seed 文件**交给通用校验器，而不是只交给目标 wave section。
4. 因此，一个合法 Wave0 entry 可以在全文件范围内满足五字段和 ref 检查，从而掩盖 Wave1 section 内的自由叙述。
5. 当前代码可复现：seed 中 Wave0 有完整 entry、Wave1 只有 `10 sources` 叙述时，`validateReturnMapContent(..., { requireWave1Refs: true })` 返回 `passed: true`。

更关键的是，accepted `research-return-map` 的 `RRM-007` 已明确要求：

- 按目标 section 解析 refs；
- Wave0/Wave1 对每条 current-round eligible row 检查 `work_id`；
- Wave2 对 current-round finding 检查 `W2F-xxx`；
- 缺少 projection 或合法 no-projection disposition 时产生 blocking finding。

但当前 `return-map.mjs` 只实现了 `RRM-006` 的 per-wave token filtering，没有实现 `RRM-007` 的 section-scoped per-row authority check。归档 change `seed-backfill-round-continuity` 的 tasks 7.2、7.3 被标为完成，commit 和测试却没有对应实现。这是 accepted contract 与 executable contract 的真实漂移。

**结论：BUG-092 应按“RRM-007 未完整落地 + 全文件校验发生跨 section masking”修复。**

### 2.2 BUG-093：四个观察中只有一部分是 bug

| 原观察 | 当前判断 | 处理方式 |
|---|---|---|
| 定义分散在 renderer、phase docs、return-map helper、gate 等多个位置 | 成立；Agent 缺少一个明确的“从这里读”模板 | Change B 收敛 Agent-facing template，并建立 renderer parity |
| section 名不携带 wave 标识 | UX 观察成立，但不是当前 contract bug | 保留现有 header；模板责任表显式写 wave mapping |
| 所有 topic 中都没有 `__BACKFILL_*__` token，说明机制未使用 | 推断不成立；token 正常终态就是被替换 | 修正文档/bug closure rationale，不据此新增机制 |
| Agent 自行加括号说明导致风格不一致 | 成立，是 canonical write shape 不集中造成的症状 | Change B 固定 canonical authoring shape；兼容读取保持宽松 |

2026-07-15 归档的 `seed-backfill-round-continuity` proposal 明确把“不重命名 section header”列为 non-goal。新的 backlog 观察不能在没有新兼容性分析的情况下推翻 accepted 方向。

**结论：BUG-093 的有效范围是 Agent-facing template 分散和 canonical write shape 漂移，不包含 token 缺失推断，也暂不包含 header rename。**

### 2.3 BUG-094：格式漂移成立，crash recovery 影响被高估

报告中的实际方向 section：

- 标题带 `（rerun_count=4）` 后缀；
- 字段没有 bullet；
- 字段名有 bold；
- 缺少 `adjusted_depth`、`search_guardrails`；
- 多出 `target_dimension`。

当前 `resolveRerunDirection()` 有意兼容：

- 标题后缀；
- 有无 bullet；
- 有无 bold；
- 从 `rerun_count` 得出 matching/stale/future/legacy_unbound/invalid。

用报告中的实际格式执行 resolver，可得到 `state: matching`、`rerun_count: 4`。因此“bullet/标题差异直接导致 crash recovery 误判”不是当前事实。

真正缺口是：

1. canonical writer shape 只存在于 `phase-rerun.md` prose/code block；
2. accepted `rerun-incremental-node` 要求 direction 提供 action、new search dimensions、adjusted depth、search guardrails、rationale excerpt；
3. Engine resolver 只拥有 round freshness，不校验 downstream guidance 是否结构完整；
4. Agent 可以写出 resolver 可读、但 Wave0/Wave1 难以稳定消费的半完整 direction。

**结论：BUG-094 应修复 canonical authoring shape 与 deterministic structural readiness，不收紧 legacy read compatibility，不把 guidance 变成第二份 runtime state。**

---

## 3. 当前 authority 与数据流

### 3.1 Seed projection

```text
submitted work-unit rows / finding-index.yaml
                 │
                 │ direct authority
                 ▼
       Agent derives return-map entries
                 │
                 ▼
 seed_topics/<slug>.md target wave section
                 │
                 │ inspect/check navigation integrity
                 ▼
       next Agent / Wave2 / HITL2 reader
```

- Submitted ledger/index/finding-index 是 provenance 与 current-round authority。
- Seed appendix 是 Agent-readable navigation/interpretation projection，不是 evidence authority。
- Engine 可以检查 section、字段、引用、round binding 和 disposition；不能替 Agent判断 evidence meaning。

### 3.2 Rerun direction

```text
HITL2 rationale + canonical topic state
                 │
                 │ Agent semantic judgment
                 ▼
      ## 本轮重跑方向 guidance
                 │
        ┌────────┴────────┐
        ▼                 ▼
round freshness      downstream search/depth
Engine resolver      Wave Agents consume guidance
```

- HITL2 rationale 和 canonical topic state 决定语义。
- Agent 把语义投影为 direction guidance。
- Engine 只检查 round binding、closed action/字段结构等 deterministic facts。
- Direction 不得成为 topic registry、profile、queue 或 state transition 的替代 authority。

---

## 4. 为什么拆成两个 OpenSpec changes

一个 mega-change 会混合三类不同风险：

1. 已接受 requirement 的实现缺口；
2. Agent-facing Markdown/template 的收敛；
3. rerun direction structural readiness 的新/澄清行为。

它们的失败模式和验证证据不同：

| 维度 | Change A | Change B |
|---|---|---|
| 核心问题 | accepted RRM-007 没有落地 | writer guidance 分散、canonical shape 漂移 |
| 主要 owner | Engine inspect/check | Markdown Agent Flow + focused Engine structural check |
| Direct Source of Record | eligible submitted rows、finding index | shared Agent-facing template + accepted field contract |
| 主要风险 | false pass / cross-section masking | Agent 写法漂移 / downstream guidance 缺字段 |
| 主要验证 | unit + CLI integration + deterministic rerun chain | template parity + parser compatibility + rerun CLI/integration |
| 是否改变标题 | 否 | 否 |

Change A 必须先做，因为它修的是当前已经接受、却被错误标为完成的 deterministic guarantee。Change B 不应成为修复 false pass 的前置条件。

---

## 5. Change A — Restore Section-Scoped Seed Projection Contract

### 5.1 建议 change name

`restore-section-scoped-seed-projection-contract`

### 5.2 目标

补完 accepted `RRM-007`，让每个 wave inspect 只检查自己拥有的 seed sections，并把 current-round direct authority 与对应 projection 逐条对齐。

### 5.3 In scope

1. 定义并复用稳定的 wave → target section mapping：
   - Wave0：`## 本轮新增证据`
   - Wave1：`## 本轮新增机制理解`、`## 本轮新增趋势与难点`、`## 待验证问题`
   - Wave2：`## 当前判断`，并按 accepted contract 处理 pending question projection
2. 用 header boundary 提取目标 section；通用 validator 只读取目标 section，不读取整个 seed body。
3. 保留 `RRM-006` 的 target-wave token skip 语义，其他 wave token 不得 short-circuit 当前 wave。
4. Wave0/Wave1 复用现有 current-round eligible row authority，逐条检查：
   - `work_id` 出现在目标 section 的 parsed refs/entry identity 中；或
   - 存在满足 accepted fields 的 no-projection disposition。
5. Wave2 检查 current-round `created_in_rerun_count` findings；legacy finding 维持 accepted advisory/compatibility 语义。
6. Blocking finding 必须给出 exact seed path、section、missing work/finding id、repair kind、write target 和 same-check rerun。
7. 修复历史任务/证据漂移：proposal/design 必须记录“tasks 7.2/7.3 曾勾选但实现不存在”，不能继续引用旧 checkbox 作为 proof。

### 5.4 Out of scope

- 不新增通用 Markdown parser/linter 平台。
- 不改变 return map 的 evidence authority 边界。
- 不重命名 seed section。
- 不新增 token family，不重新注入 token。
- 不改 rerun direction format。
- 不自动修复 seed files。
- 不修改历史 runtime bundle。

### 5.5 预计 modified capabilities

- `research-return-map`：落实既有 `RRM-007`；如 delta 只澄清 executable acceptance，不应假装这是全新 requirement。
- `cli-inspect-output-conventions`：确保新的 blocking findings、masking 和 repair coordinate 与现有 CLI contract 一致。
- `verification-routing`：仅当现有 accepted routing 需要补充本缺口对应的 proof claim 时修改；否则只新增 change-root verification plan 和 tests。

Proposal 前必须先检查 requirement registry 和 archive，避免为同一行为分配重复 ID。

### 5.6 候选 implementation surfaces

| Surface | 预期工作 |
|---|---|
| `DPT_FRAMEWORK/engine/helpers/return-map.mjs` | section extraction、per-row/per-finding projection check、focused findings |
| existing work-unit inspect/read helpers | 只复用 direct authority reader；不得复制一套 eligible-row 筛选逻辑 |
| `DPT_FRAMEWORK/cli/inspect-wave{0,1,2}-output.mjs` | 保持现有聚合入口；必要时只传明确 context |
| `tests/engine/helpers/` | section parser、masking、disposition、compatibility unit tests |
| `tests/integration/cli/` | inspect CLI blocking output、repair coordinate、current-round binding |
| `tests/e2e/` | 复用/扩展 rerun continuity 链，证明真实生产 CLI 链中的 false pass 被关闭 |

这些是 proposal/design 的候选 target，不是本计划授权的最终清单。

### 5.7 必须覆盖的验收场景

1. Wave0 完整 entry + Wave1 prose-only：Wave1 inspect fail。
2. Wave0 完整 entry + Wave1 count summary：Wave1 inspect fail，finding 指向 Wave1 section。
3. Wave1 两条 current-round eligible rows，只投影一条：fail 并命名遗漏 work_id。
4. 第二条 row 有合法 no-projection disposition：pass。
5. 只有 prior-round rows：current-round projection check 不误报。
6. Wave1 token 存在时 Wave1 validation 按 accepted placeholder 语义 skip；Wave0 token 不影响 Wave1，反之亦然。
7. Wave2 current finding 缺 W2F id projection：blocking；legacy finding 缺失维持 accepted advisory。
8. Parser prerequisite 失败时只报最近 root cause，不级联一串缺字段症状。
9. Inspect 与 formal gate/check 若都消费该 contract，classification 和 pass/fail 不得矛盾。

### 5.8 完成条件

- `RRM-007` 的每个 accepted scenario 有 executable coverage。
- 复现 probe 从 `passed: true` 变为目标 Wave1 blocking failure。
- 不依赖模板重构即可关闭 BUG-092 的 false-pass 根因。
- verification plan、project req/spec checks、targeted tests 和适用的 regression suites 全部通过。
- Change A archive 后再开始 Change B proposal。

---

## 6. Change B — Centralize Seed Topic Authoring Contracts

### 6.1 建议 change name

`centralize-seed-topic-authoring-contracts`

### 6.2 目标

给 Agent 一个明确、稳定、可引用的 seed topic authoring surface，同时保证 initial materialization、rerun `add_topic` renderer 和 rerun direction writer 不再各自复制并漂移。

### 6.3 两个相关但不同的 template fragments

Change B 可以在一个 change 内处理两个 Agent-facing fragments，但必须保持边界：

1. **Seed topic skeleton / research appendix template**
   - 初始化 frontmatter 与正文骨架；
   - research append area；
   - wave responsibility table；
   - accepted one-time backfill tokens；
   - canonical return-map entry example。
2. **Rerun direction fragment**
   - 只描述 optional/current rerun guidance section；
   - 明确 canonical header 与 fields；
   - 明确 canonical topic mutation action 与 direction action 的映射；
   - 明确哪些字段按 action conditionally required。

不能把 direction token 预埋进所有新 seed skeleton。Direction 只在 sanctioned rerun、且有真实 HITL2 rationale 时产生。

### 6.4 Agent-facing template placement

默认候选位置：`DPT_FRAMEWORK/workflows/nodes/shared/` 下的 shared Markdown surfaces。

理由：

- 这是 Agent 需要读取的 workflow guidance，不是 machine schema authority；
- 它不会在 bundle instantiation 时直接复制，因此不属于 `rb_templates/`；
- 把 Markdown template 放进 `schema/` 会模糊 Engine contract 与 Agent control surface；
- phase nodes 可以引用 shared surface，减少 8+ 处重复 prose。

最终路径和加载方式必须在 Change B design 中决定，并由 `validate-phase-templates` / MD integration tests 证明可达。

### 6.5 Single reference 与 executable renderer 的关系

“单一模板”不能靠让 JS 随意解析大段 Markdown实现，否则会引入脆弱的跨层模板引擎。首选模型：

```text
shared Agent-facing template = 人/Agent 的唯一阅读入口
             │
             ├── phase-seed-topics 引用
             ├── phase-rerun 引用 direction fragment
             └── executable renderer parity test
                         │
                         ▼
             renderNewSeedBody() deterministic output
```

Design 必须比较两种实现并选择净复杂度更低者：

- 方案 1：shared Markdown 为 canonical readable projection，JS renderer 保留纯函数，parity tests 防漂移；
- 方案 2：一个足够小、无控制逻辑的 template fragment 被 JS deterministic substitution 直接消费。

不得引入通用 template engine、第二 renderer、运行时同步文件或生成缓存。

### 6.6 Rerun direction structural readiness

Change B proposal 必须冻结以下目前模糊的 contract：

1. canonical direction action wire values；
2. canonical topic-state actions（如 `add_topic` / `update_intent`）如何投影为 direction action（如 `add` / `supplement`）；
3. 所有 action 共用的 required fields；
4. `new_search_dimensions`、`adjusted_depth`、`search_guardrails` 等字段的 conditional requirements；
5. `rationale_excerpt` 只来自已记录用户 rationale，不能由 Agent编造；
6. 多余字段是 advisory、allowed extension 还是 blocking unknown；
7. canonical writer 是否必须使用 bullet + bold labels。

默认设计方向：

- canonical writer 只输出一种格式；
- reader/parser 保持兼容标题后缀、有无 bullet、有无 bold 的 legacy shape；
- `resolveRerunDirection()` 继续只拥有 round freshness；
- structural validator 复用现有 rerun-ready check/inspect pipeline，不新增 CLI、state 或 controller；
- Engine 只验证可解析字段和 cross-field conditions，不判断搜索维度、深度或 rationale 的语义质量。

### 6.7 In scope

- 新增 shared Agent-facing seed skeleton 和 rerun direction fragments。
- `phase-seed-topics.md`、`phase-rerun.md`、Wave backfill guidance 改为引用 shared contract，删除重复且易漂移的完整模板块。
- 对齐 `renderNewSeedBody()` 与 canonical shared skeleton。
- 固定 canonical return-map entry 和 rerun direction write shape。
- 保留兼容读取，新增 canonical-write parity/structure tests。
- 对 rerun direction 做最小 deterministic structural readiness check。
- 更正 BUG-093 中“token 不存在即未使用”的错误判断。

### 6.8 Out of scope

- 不重命名 `## 本轮新增证据`、`## 本轮新增机制理解`、`## 本轮新增趋势与难点`、`## 当前判断`、`## 待验证问题`。
- 不把 Wave0/Wave1/Wave2 写进标题作为 compatibility migration。
- 不批量改写历史 `dpt_rb_*` / `dpt_disp_*`。
- 不删除 Agent 对正文语义的 ownership。
- 不让 Engine 生成 search dimensions、depth、guardrails 或 rationale。
- 不重新引入 token reinjection 或 round subsection hierarchy。
- 不建设通用 output linter、template registry 或自动 repair loop。
- 不因 frontmatter 字段顺序差异失败；YAML mapping order 不是 contract。
- 不因非冲突 extension field 自动失败，除非 delta spec 明确把 closed shape 证明为必要。

### 6.9 预计 modified capabilities

- `seed-topic-materialization`：共享 Agent-facing skeleton、initial materialization contract。
- `canonical-topic-state`：rerun add-topic renderer 与 canonical skeleton parity。
- `research-wave-phase-content` / `research-return-map`：只收敛引用和 canonical write guidance，不重复 Change A 的 validator。
- `rerun-incremental-node` / `rerun-topic-integration`：direction canonical shape、round binding 和 downstream consumability。
- `cli-inspect-output-conventions`：仅当 direction structural finding 进入现有 check/inspect output 时修改。

Capability 和 requirement ID 必须按 `openspec/config.yaml` 的 registry 规则审计；已有 requirement 能通过 MODIFIED/clarification 覆盖时，不得为同一行为堆新 ID。

### 6.10 必须覆盖的验收场景

1. Initial seed materialization 和 rerun `add_topic` 产生相同 appendix headings/token set。
2. shared Agent template 与 renderer drift 时测试失败，并指出 exact section/token。
3. phase node 不再重复一份会独立漂移的完整 skeleton。
4. canonical direction writer 产出唯一格式。
5. 报告中的 legacy shape（标题后缀、无 bullet、bold fields）仍能解析为 matching。
6. `rerun_count` 缺失/损坏继续得到既有 legacy_unbound/invalid 状态。
7. supplement direction 缺少 proposal 定义的 downstream required field 时，现有 rerun readiness surface 给出 exact repair coordinate。
8. 多余 `target_dimension` 的处理与 delta spec 一致，不得 parser、guidance、test 三套说法。
9. Layout-only mutation 不新增或改写 direction guidance。
10. 无 HITL2 rationale 时不得写 direction section。

### 6.11 是否需要再拆第三个 change

Change B propose 阶段只在以下任一情况成立时再拆出 `formalize-rerun-direction-shape`：

- direction structural check 需要新 CLI 或新 gate rule family；
- action mapping 需要修改独立 Engine module/schema contract；
- compatibility 决策要求历史 bundle migration；
- seed skeleton 与 direction fragment 无法共享任何 target、test 或 Agent-facing contract。

如果只是两个 shared fragments、现有 resolver/check 的小幅扩展和同一组 phase-template parity tests，则保持一个 Change B，避免过度拆分。

### 6.12 完成条件

- Agent/人只需从一个 shared seed template 理解完整 skeleton/appendix。
- Rerun direction 有一个独立 shared fragment，不再埋在 phase prose 中作为唯一示例。
- renderer、phase guidance、parser/check 之间有 executable parity/compatibility proof。
- BUG-093 的有效 drift 问题和 BUG-094 的 structural guidance 问题关闭。
- 不发生 header rename、历史 bundle mutation 或新控制层扩张。

---

## 7. 与 `agent-output-linter` plan 的关系

当前 active `_backlog/plans/agent-output-linter.md` 也提到 `seed_topic_md`，但本计划**不依赖**它，原因如下：

| Concern | 本计划 owner | output-linter 是否 owner |
|---|---|---|
| current-round row 是否进入正确 wave section | Change A return-map inspect | 否，这是 authority/projection binding，不是通用格式 lint |
| concrete refs 是否存在且可导航 | existing return-map inspect/check | 否，不能复制规则 |
| seed frontmatter YAML 是否 parse | existing parser；将来可复用 linter Tier 1 | 可选复用，不是前置依赖 |
| shared skeleton 与 renderer 是否漂移 | Change B parity tests | 否，这是 framework source parity |
| rerun direction conditional fields | Change B focused contract | 只有未来 linter registry 被 accepted 后才可复用 parser，不得先耦合 |

规则：

1. Change A 不等待 output-linter，也不向它迁移 RRM-007。
2. Change B propose 时检查 output-linter 是否已成为 active/accepted change。
3. 若 linter 尚未 accepted，Change B 使用现有 focused parser/check surface，不顺便实现通用 linter。
4. 若 linter 已 accepted，只复用其 parser/schema registry，不复制 seed-specific authority checks。
5. 两份计划都禁止第二套 gate authority 和 JS repair loop。

---

## 8. Bug 到 Change 的映射与关闭条件

| Bug | Change A | Change B | 关闭条件 |
|---|---|---|---|
| BUG-092 | 主修：section-scoped validation、per-row binding、false-pass regression | 只改善 writer guidance | Change A archive 且真实复现变为 blocking；bug 文档更新根因 |
| BUG-093 | 关闭 enforcement 相关误差；证明 token absence 是正常终态 | 主修：shared template、renderer parity、canonical writer | Change B archive；记录 header rename/token-use 两项 disposition |
| BUG-094 | 无 | 主修：direction fragment、conditional fields、structural readiness、legacy compatibility | Change B archive；实际 legacy shape 可读、canonical shape 唯一、缺字段可诊断 |

关闭 bug 时按 `_backlog/bugs/README.md` 的流程移动文件并更新三个 README。不得在 change apply/verification 完成前提前标 fixed。

---

## 9. 执行顺序与阶段 Gate

### Stage 0 — 当前计划落盘

- [x] 读取 BUG-092/093/094。
- [x] 对照 accepted specs、current code、archive change 和 tests。
- [x] 用当前函数复现 cross-section masking。
- [x] 用当前 resolver 验证 BUG-094 legacy shape 可读。
- [x] 形成两个 change 的边界与依赖。

### Stage 1 — Propose Change A

- [x] 运行 `/opsx:propose restore-section-scoped-seed-projection-contract`。
- [x] Proposal 引用三个 bug 中与 Change A 直接相关的原始段落和本计划。
- [x] 读取并 paired-review 两条 Evolution Directions。
- [x] 明确 direct authority、最短闭环、net simplification 和不新增 parallel validator。
- [x] 审计 `RRM-007` registry/spec/archive/task/implementation/test traceability。
- [x] 创建 change-root `verification-plan.yaml`。
- [x] Tasks 中列出 apply 前/后 governance 与 verification routing checks。
- [x] 声明 framework version bump 决策。

### Stage 2 — Apply and Archive Change A

- [x] `/opsx:apply` 前运行 verification plan mode check。
- [x] 先写 failing focused tests，再实现 section-scoped/per-row contract。
- [x] 跑 unit、integration、selected deterministic e2e 和全量适用 regression。
- [x] 运行 governance req/spec checks 和 verification assets check。
- [x] Archive 并同步 accepted specs：`2026-07-19-restore-section-scoped-seed-projection-contract`，v0.35，commit `af5e6018c`。
- [x] 关闭 BUG-092；BUG-093 保持 open，Change A 只关闭 enforcement 子问题。

### Stage 3 — Propose Change B

- [ ] Change A archive 后重新读取 current specs/code，不复制旧假设。
- [ ] 运行 `/opsx:propose centralize-seed-topic-authoring-contracts`。
- [ ] Design 比较 template parity 两个方案，选择净复杂度更低者。
- [ ] 明确 direction action mapping、conditional fields、unknown field policy。
- [ ] 明确是否保持一个 Change B 或按 6.11 的条件拆第三个 change。
- [ ] 创建独立 verification plan，声明 agent_flow proof 是否必要。
- [ ] 声明 framework version bump 决策。

### Stage 4 — Apply and Archive Change B

- [ ] `/opsx:apply` 后才修改 shared workflow/template、renderer、resolver/check 和 tests。
- [ ] 删除被 shared surface 替代的重复模板 prose；不是只新增一份第九个定义。
- [ ] 运行 template validation、unit、integration、selected deterministic e2e。
- [ ] 若行为依赖真实 Agent 能否发现 shared template，运行最小 `agent_flow_e2e`，不得用 MD grep 冒充 Agent 行为 proof。
- [ ] 运行 governance req/spec checks 和 verification assets check。
- [ ] Archive，关闭 BUG-093/094。

### Stage 5 — Close umbrella plan

- [ ] 在本文件补充两个 archive change 名、commit、version 和验证证据。
- [ ] 移入 `_backlog/_done/_closed_plans/`。
- [ ] 更新 `_backlog/plans/README.md`、closed plans README 和 `_backlog/_done/README.md`。

---

## 10. Verification Routing

### Change A

| Test class | 证明什么 |
|---|---|
| `unit` | section extraction、field parsing、disposition predicate、per-row/finding matching |
| `integration` | inspect CLI pass/fail、finding classification、repair coordinates、formal check consistency |
| `deterministic_e2e` | production CLI rerun chain中 current-round authority 与 seed projection 连续性 |
| `agent_flow_e2e` | 默认不需要；Change A 不改变 Agent Flow。只有 proposal 另有真实 Agent claim 才加入 |

### Change B

| Test class | 证明什么 |
|---|---|
| `unit` | renderer/template parity、direction parser compatibility、conditional shape validator |
| `integration` | phase/shared template reachability、rerun readiness output、canonical writer shape |
| `deterministic_e2e` | add-topic + supplement direction 在真实 CLI 链中保持 canonical/compatible |
| `agent_flow_e2e` | 仅当 claim 是“真实 Agent 会发现并遵守 shared template”时需要；不能用 JS fixture 替代 |

所有实际 test assets 由各 change 的 `verification-plan.yaml` 决定。本计划不预先把 regression/cost/actor 当作第五种 test class。

---

## 11. 风险与抑制

| 风险 | 抑制方式 |
|---|---|
| 修 RRM-007 时复制 eligible-row authority，产生第二套 round filter | 必须复用 existing Engine reader/inspect helper；design 中画出唯一调用链 |
| section parser 依赖中文标题，未来重命名困难 | mapping 集中一处；本 change 不重命名；兼容策略进入 spec/tests |
| 通用 validator 仍读取全文件，masking 没真正关闭 | 必须有 Wave0-valid/Wave1-invalid negative regression，并断言 exact section |
| shared template 只是新增第九个定义，旧 prose 未删除 | Change B tasks 必须列出删除/替换的重复 blocks，做 net simplification audit |
| JS 直接解析复杂 Markdown template，形成脆弱模板引擎 | 只允许纯 substitution 或 renderer parity；禁止条件语言/循环/通用引擎 |
| direction validator 把语义 guidance 变成 machine state | Engine 只检查字段与 round/action cross-field；语义仍由 Agent/HITL rationale 拥有 |
| 收紧 parser 导致 legacy bundle 无法 rerun | canonical write strict、legacy read tolerant；实际 BUG-094 shape 必须作为 compatibility fixture |
| 为视觉一致性阻断 pipeline | 标题、bullet、bold 等 presentation 默认不是 blocking，除非它影响 deterministic parse 且 spec 明确要求 |
| 与 output-linter 重复建设 | 按第 7 节 ownership 表审查；无 accepted dependency 时不顺带实现 linter |
| 历史 bundle 被自动迁移 | 两个 changes 都明确禁止；需要迁移时另提 change 和授权路径 |

---

## 12. 明确不做的决定

1. 不用一个 mega-change 同时修 checker、模板、标题和历史数据。
2. 不把 section 改成 `Wave0/Wave1/Wave2` 标题。
3. 不因 token 在完成后的 seed 中消失而判定 token 机制失效。
4. 不重新注入一次性 backfill token。
5. 不创建 `seed_topic_appendix_schema.json` 作为新的 runtime authority，除非 proposal 证明现有 Markdown + deterministic parser 无法表达必要 contract。
6. 不把 template 放进 `rb_templates/`，除非它确实在 bundle instantiation 时被复制。
7. 不自动修复 Agent 输出。
8. 不让用户承担普通 lint/inspect/repair 命令执行。
9. 不批量迁移旧 bundle。
10. 不把本计划的推断当作已接受 requirement。

---

## 13. 最终完成定义

本计划只有在以下全部成立后才可关闭：

1. Accepted `RRM-007` 与 current implementation/tests 完整一致，不再存在 archive checkbox 假完成。
2. Wave0 的合法 entry 无法掩盖 Wave1/Wave2 目标 section 的非法或缺失 projection。
3. Current-round rows/findings 有逐条 projection/disposition proof。
4. Agent 有一个 shared seed skeleton/appendix 阅读入口。
5. Rerun direction 有一个 shared canonical fragment，canonical write 唯一、legacy read 兼容。
6. Resolver freshness、direction structural readiness 和 Agent semantic ownership 边界清楚。
7. 没有新增平行 linter、模板引擎、repair controller、runtime state 或自动 migration。
8. 两个 changes 均 archive，governance 与 verification checks 通过。
9. BUG-092/093/094 按事实修正后的关闭依据归档。
10. 本计划及所有 README 索引完成关闭流程。
