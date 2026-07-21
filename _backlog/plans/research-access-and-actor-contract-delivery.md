# Research access and actor contract delivery — two-change roadmap

> 状态：Ready to propose in sequence
>
> 来源：`_backlog/bugs/BUG-096-web-fetch-curl-fallback.md`、`BUG-097-silent-execution-surfacing-wave0.md`、`BUG-098-wave1-output-contract-mismatch.md`，以及 production bundle `dpt_rb_ai-agents-enterprise-bpm-productivity`
>
> 决策：不用一个 omnibus Change。按本 plan 固定为两个 implementation Change；两者依次 propose、apply、archive，不并行 apply。

## 1. 结论

这组三个 production observations 不共享一个足够窄的 deterministic owner，不能因为它们发生在同一 run 就合成一个 Change。

本路线只建立两个 implementation Change：

1. `allow-bounded-hitl1-fetch-surface-fallback`
   - 修 BUG-096 的 HITL1/main-Agent capability-probe 路径。
   - 先做，因为它是进入 silent waves 前最早的直接 blocker。
2. `deliver-work-unit-role-contracts-to-actors`
   - 修 BUG-096 的 delegated Wave fetch 路径。
   - 修 BUG-098 的 work-unit actor authoring-contract delivery 路径。
   - 后做，因为它建立在已经接受的 v0.38 direct-output contract owner 上，并处理进入 Wave 后的 actor execution boundary。

BUG-097 不塞入这两个 Change。它是“完整 silent contract 和 continuation cue 已可见，真实 Agent 仍然违规”的 actor-compliance observation；在没有找到新的 direct decision-point 缺口前，再加一条 prompt 或一个 `do_not_summarize` 字段只会制造第二份控制真相。

## 2. Bug 与 Change 对照

| Bug / 路径 | Direct failure | Owner | 处理 |
|---|---|---|---|
| BUG-096：HITL1 probe | 当前 accepted contract 只允许一次 fetch；native fetch 被 policy block 后不能在同一 probe 合法尝试 `curl` | `pre-research-phase-content` + `phase-hitl1.md` | Change 1 |
| BUG-096：Wave actor | 角色文档已有 fallback，但生成的 `task.md` / spawn prompt 没把该角色/fetch contract交给真实 actor | work-unit task projection + Sub-agent role guidance | Change 2 |
| BUG-098 | Engine 已有统一 direct-output evaluator，但 actor 只看到 opaque contract ID，没有看到 minimum authoring shape / role template | v0.38 direct-output contract owner + work-unit task projection | Change 2 |
| BUG-097 | accepted silent spec、Gate cue、loaded-node cue 和 autonomous header 均已禁止 surfacing，真实 Agent仍主动总结并询问继续 | Coding Agent behavior，非现有 Engine chat authority | 独立诊断，不计入两个 Change |

## 3. 两条 Evolution Directions 的约束

本 plan 必须 paired-apply：

- `guidelines/evolution-helper-oriented-agent.md`
- `guidelines/evolution-simple-reliable-control.md`

由此得到以下硬边界：

1. `curl` 或其他现有合法 fallback 可用且不需要新权限时，由 Agent 自己执行；不得让用户成为 capability-probe 或 work-unit pipeline co-runner。
2. 只有所有合法 surface 都失败、需要新的 host permission，或外部环境必须由用户处理时，才暴露最小人类边界。
3. 不给 `research_access` 增加 `fallback_used`、`available_surfaces[]`、retry history 或 derived verdict。现有 direct observation 已足够记录最终成功 surface 或直接失败原因。
4. 不新增 generic fetch controller、自动 retry tree、background watcher、通用 output linter 或 plugin registry。
5. 不为 BUG-098 新建 fuzzy/semantic 第二 validator。现有 shared direct-output evaluator继续是唯一 deterministic verdict owner。
6. 不给 BUG-097 增加 `do_not_summarize`、chat-state 字段或 Engine chat interceptor。`interaction: do_not_initiate` 已是唯一 placement projection。

## 4. Change 1 — bounded HITL1 fetch fallback

### 4.1 Change identity

推荐名称：`allow-bounded-hitl1-fetch-surface-fallback`

目标：当第一个 usable URL 的 native fetch 明确 blocked/unavailable，但同一环境已有合法 alternative fetch surface 时，Agent 在同一 HITL1 probe 内完成一次 bounded mechanical fallback，而不是把普通执行推回用户。

### 4.2 最短合法闭环

```text
one neutral search
  -> first usable HTTP(S) URL
  -> one native fetch attempt
  -> only if blocked/unavailable: one approved alternative fetch attempt for the same URL
  -> record one final direct research_access observation
  -> rerun the same hitl1-recorded gate
```

这里的 fallback 上限是一个，不是“native → curl → wget → Node → browser”的隐藏树。Change proposal 必须明确当前支持的 alternative surface 和 host-permission边界；BUG-096 已验证的首选是 `curl -sSL --max-time <bounded-seconds> <same-url>`，Codex native surface 名称按实际 runtime 表达，不虚构 `WebFetch`。

### 4.3 Source of Record

- Probe direct fact：`rb_profile.yaml#/research_access`。
- Fetch 成功：实际返回的 page content，仅用于判定 capability；不得进入 evidence/cache/receipt/coverage。
- Gate verdict：现有 `hitl1-recorded` gate。
- Optional `fetch_surface`：只记录最终实际成功或最终尝试的 surface audit label，不保存 fallback history。

### 4.4 Expected spec/design scope

- 修改 `pre-research-phase-content` 的 one-fetch requirement：保持一次 search、一个 URL，只把 fetch surface attempts 放宽为 native + 最多一个 same-URL fallback。
- 同步 `phase-hitl1.md` 的 fixed order、observation branches 和 unavailable recovery。
- 保持 `schema-core` 的现有 `research_access` shape；除非 proposal 用直接证据证明现有字段无法表达事实，否则不得改 schema。
- 保持 `stop: yes` HITL1 边界：用户只决定研究语义、权限或外部环境；Agent执行已授权 probe、写 observation、跑 Gate。
- 不把 probe URL/content 变成研究证据，不新增 offline report 或 capability state tree。

### 4.5 Verification direction

- `integration`：Markdown/spec contract 证明一次 search、同 URL、最多两次有序 fetch attempts、现有 observation shape 和 evidence boundary。
- `agent_flow_e2e`：真实 Subject Agent 在 native fetch blocked 而 `curl` 可用时自己完成 fallback、记录 `fetch_surface: curl` 并通过 Gate；若外部条件无法构造则诚实 `NOT_RUN`，不得用 mock page 或手写 success 冒充。
- Negative branch：native 与唯一 fallback 都失败时记录 unavailable，保留 HITL1 choices，只暴露最小环境/permission boundary。

### 4.6 Completion boundary

Change 1 archive 后：

- BUG-096 只标记为“main/HITL1 path fixed”；不能关闭整个 BUG-096。
- 不声称 Wave actor 已收到 fetch fallback contract。
- Change 2 才拥有 BUG-096 delegated closure。

## 5. Change 2 — deliver role/direct contracts to work-unit actors

### 5.1 Change identity

推荐名称：`deliver-work-unit-role-contracts-to-actors`

目标：真实 Sub-agent 打开生成的 `task.md` 时，立即看到与其 registered role、assigned outputs 和 fetch behavior 对应的既有 authoritative guidance；不再要求 actor 从 opaque `direct_contract` ID 猜格式，也不再依赖 Phase Agent 临场记得补一句 fallback。

### 5.2 已确认的真实缺口

- v0.38 已让 candidate submit 与 Wave Gate 复用同一个 `direct-output-contract` evaluator。
- `wave1.question-list.v1` 当前正确要求：
  - `Topic Investigation Targets`
  - `Question Reconciliation`
  - `Emergent Question Protocol`
  - `Exploration / Exploitation Decision`
- `dpt-evidence-extractor` role guidance 也包含这套 authoring template。
- 但生成的 work-unit `task.md` 只显示 exact path、role 和 contract ID；spawn prompt 只让 actor 打开 task/beacon/schema，没有交付 role guidance 或最低 semantic authoring projection。
- 同一 delivery gap 也让 role 文件中的 native/browser/Node/`curl` fetch chain 到不了实际执行 actor。

因此 BUG-098 不是再造一个 validator 的理由，而是把已有 contract lineage 送到 actor decision point 的理由。

### 5.3 最短合法闭环

```text
registered role_key + Engine-resolved required_outputs
  -> derive canonical role guidance ref and direct-contract authoring projection
  -> render both into generated task/spawn prompt
  -> actor reads them before search/fetch/output authoring
  -> existing dry-submit evaluator returns the same contract roots
  -> actor repair/replacement follows existing v0.38 path
```

### 5.4 Source of Record and ownership

- Role identity：现有 registered work-unit kind / `actor_policy.delegated_role_key`。
- Required output identity：现有 v0.38 assignment contract的 exact path + canonical role + closed `direct_contract`。
- Deterministic minimum semantic verdict：现有 `direct-output-contract` evaluator。
- Rich Agent-facing authoring/search/fetch guidance：canonical Sub-agent role Markdown。
- Generated `task.md`、spawn prompt、beacon/schema：projection/binding，不成为第二个 verdict owner。

### 5.5 Preferred design shape

1. 从已有 closed role registration 派生 canonical role guidance path，不让 queue、payload、Phase Agent 或 actor选择任意 role file。
2. 在 generated `task.md` 和 spawn prompt 的最前部给出该 canonical ref，并要求 actor 在执行前读取。
3. 从同一个 direct-output contract owner 投影 minimum authoring requirements；不要在 envelope generator 重新手写一份 heading inventory。
4. fetch guidance 保持 Markdown-owned。若当前多个 role 重复或互相漂移，提取一个 canonical shared page-fetch guidance，并删除 role 内重复/过期 chain；generated task直接指向该 shared guidance。
5. 清理被触碰 surface 上的 Python fetch fallback。项目与 accepted `subagent-node-contract` 已要求 JS/Node-first；不得让新交付链把过期 Python 指令重新送给 actor。
6. 不新增 persisted role-content hash、role snapshot、contract registry/plugin system 或第二个 submit path；如设计认为必须新增持久 marker，必须先通过 complexity burden of proof。

### 5.6 BUG-098 fact correction required before propose

`BUG-098-wave1-output-contract-mismatch.md` 当前把 Engine 的四个 required sections 写成旧的 `Answered Questions / Partially Answered Questions / Open Questions / Emergent Questions`。这与当前 v0.38 code 和 accepted spec 不符。

Propose 前先把 bug 改成准确根因：

- Engine 和 canonical role template 已对齐；
- production actor 最初写了另一套 headings；
- task/spawn delivery 没给 actor 可执行的 authoring contract；
- 后续 Phase repair 追加 required sections，不证明首次 actor output 合格。

不把这项 backlog fact correction伪装成 framework fix。

### 5.7 Verification direction

- `unit`：closed role_key 到 canonical role guidance ref 的纯映射；unknown/mismatched role fail closed；direct authoring projection来自现有 contract owner。
- `integration`：真实 claim/envelope 生成的 task/spawn prompt包含准确 role ref、required direct authoring semantics 和 fetch guidance ref；不存在 duplicated independent validator。
- `agent_flow_e2e`：真实 Wave1 actor只读生成 task 所指示的 surfaces，首次写出可通过 direct contract 的 paired outputs；不由 Phase Agent在 `work_done` 后追加 headings冒充 actor compliance。
- `agent_flow_e2e` fetch branch：在 native fetch blocked、approved fallback可用的真实环境中，actor自行执行 fallback并留下真实 cache/source/receipt evidence；外部能力不可用时 `NOT_RUN`，不造假。

### 5.8 Completion boundary

Change 2 archive 且真实/确定性 evidence 满足各自 proof boundary 后：

- 关闭 BUG-098。
- 结合 Change 1 的 HITL1 closure，关闭 BUG-096。
- 更新 active/fixed bugs indexes 和 `_done/README.md`。

## 6. BUG-097 独立处理

BUG-097 不属于上述两个 Change 的完成条件，也不因它们 archive 而关闭。

当前事实是：

- accepted `silent-wave-execution` 已明确 gate pass 不授权 surfacing；
- Gate continuation 已输出 `do_not_initiate + consume_check_next`；
- `enter-phase` / status continuation 已输出 `do_not_initiate + execute_loaded_node`；
- autonomous injected header 已禁止 progress、acknowledgement 和 continuation request；
- production Agent仍然在 Wave0→Wave1 handoff 主动总结并问是否继续，且未记录 `surfacing_intent`。

下一步只做独立诊断：建立或复用真实 `agent_flow_e2e` handoff canary，保留 Subject transcript，验证 Agent 在完整 cue 可见时是否仍系统性 surfacing。fixture 只能证明 cue 可见，不能证明 Agent silence。

在诊断发现新的 direct delivery gap 前，明确拒绝：

- 新增 `do_not_summarize` 或类似重复 interaction字段；
- 让 Engine inspect chat state；
- 新建第三个 HITL、pause/ack 状态或 user-message controller；
- 用一条 deterministic fixture PASS 宣称真实 Agent 已不会 surfacing。

若真实 canary 揭示具体且可局部修复的 decision-point gap，再单独 propose；它不回填到本 plan 的两个 Change 中。

## 7. 执行次序与 Git/OpenSpec 边界

严格按以下顺序：

1. 修正 backlog facts：BUG-098 当前 Engine section names、`_backlog/bugs/README.md` 补 BUG-098，并把 next ID 调整为 BUG-099。
2. `/opsx:propose allow-bounded-hitl1-fetch-surface-fallback`。
3. Explore/review 至 apply-ready；重点审查 one-fallback bound、现有 schema 复用、用户最小边界和真实验证设计。
4. commit Change 1 proposal artifacts。
5. `/opsx:apply allow-bounded-hitl1-fetch-surface-fallback`，逐项更新 tasks，验证后 archive + commit。
6. 只在 Change 1 archive 后，`/opsx:propose deliver-work-unit-role-contracts-to-actors`。
7. Explore/review 至 apply-ready；重点审查单一 contract owner、role ref derivation、projection非 authority、无重复 validator。
8. commit Change 2 proposal artifacts。
9. `/opsx:apply deliver-work-unit-role-contracts-to-actors`，逐项更新 tasks，验证后 archive + commit。
10. 两个 Change 均 archive 后关闭 BUG-096；Change 2 单独关闭 BUG-098。BUG-097 保持 open，直到其独立真实-Agent诊断得出可验证结论。
11. 本路线全部完成后，将本 plan 移入 `_backlog/_done/_closed_plans/`，关闭依据必须列出两个 archived Change；不能只完成一个就关闭 plan。

不并行 apply 两个 Change。Change 1 修改 HITL1 probe semantics，Change 2 修改 delegated actor contract delivery；顺序完成可以让每轮 production/agent-flow observation 的失败归因保持单一。

## 8. Apply-ready admission checks

每个 Change 在进入 apply 前分别回答：

### Simple Reliable Control

1. 最短合法闭环和 direct Source of Record 是什么？
2. 删除、合并或避免了哪份复杂度？
3. 是否产生第二个 validator、derived state、fallback tree 或 success authority？若是，拒绝 apply-ready。
4. failure 是否只返回一个最近动作并回到同一 checkpoint？

### Helper-Oriented Agent

1. 哪个决定真的需要用户？
2. 哪些 fallback、写入、dry-submit、repair、rerun 和 Gate mechanics 应由 Agent执行？
3. 用户完成 host permission/external action 后，执行责任是否立即回到 Agent？
4. 是否把 human-directed 错当成 permission、override 或缺失 capability？若是，拒绝 apply-ready。

## 9. 非目标

- 不把三个 bug 按同一次 production run 打包成一个大 Change。
- 不新增通用 fetch service、capability registry、web proxy、retry daemon 或 browser abstraction。
- 不新增 output-linter CLI、dynamic contract plugin、semantic LLM judge 或 fuzzy blocking parser。
- 不改变 evidence/provenance/receipt/ledger/gate authority。
- 不用 mock 或手写 external success 证明 WebFetch/Codex web surface/`curl`/真实 Sub-agent behavior。
- 不承诺 Engine 能确定性阻止 Coding Agent 发送 chat output。

## 10. Plan done condition

本 plan 只有在以下条件全部满足时才能移入 DONE：

- `allow-bounded-hitl1-fetch-surface-fallback` 已 propose → apply → archive，并有诚实的 deterministic + real-Agent proof boundary记录；
- `deliver-work-unit-role-contracts-to-actors` 已 propose → apply → archive，并证明 actor task delivery 与现有 direct evaluator同源；
- BUG-096 已按 main + delegated 两条路径关闭；
- BUG-098 已按准确的 v0.38 contract事实关闭；
- BUG-097 的状态被明确保留或由独立后续工作处理，没有被这两个 Change误报关闭；
- requirement governance、verification routing、version bump（若各 proposal声明需要）和 archive checks 全部通过。
