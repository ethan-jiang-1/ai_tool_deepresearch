# Plan: BUG-069～075 的 OpenSpec Change 切割

**性质:** bug 聚类 / OpenSpec 立项前设计计划

**状态:** 已完成 3 个 OpenSpec Change 的 proposal / specs / design / tasks，待依次 `/opsx:apply`（2026-07-10）

**范围:** `_backlog/bugs/BUG-069`、`071`、`072`、`073`、`074`、`075`

**设计原则:** [`guidelines/simple-reliable-control.md`](../../guidelines/simple-reliable-control.md)
**建议:** 核心只立 3 个 Change；不按“一 bug 一 Change”拆，也不把低优先级清理硬塞进主修复

**已创建:** [`simplify-and-reuse-wave-contract-checks`](../../openspec/changes/simplify-and-reuse-wave-contract-checks/)（`v0.17`） · [`fail-fast-on-missing-research-access`](../../openspec/changes/fail-fast-on-missing-research-access/)（`v0.18`） · [`put-continuation-cues-at-decision-points`](../../openspec/changes/put-continuation-cues-at-decision-points/)（`v0.19`）

---

## 0. 结论

这 6 个 bug 实际聚成 3 个主要 failure mode：

| 组 | Bug | 本质 | 建议 Change |
|----|-----|------|-------------|
| A | BUG-069 / 073 / 075 | Wave artifact 的质量控制过碎、Agent-facing preflight 不完整、下游失败级联成 contract wall | `simplify-and-reuse-wave-contract-checks` |
| B | BUG-071 主问题 | 框架假设 search/fetch 可用，却不在合法交互点提前确认 | `fail-fast-on-missing-research-access` |
| C | BUG-072 / 074 | `stop:no` 规则虽然存在，但没有在 Agent 做决定的 checkpoint 给出足够短、足够近的继续动作 | `put-continuation-cues-at-decision-points` |

BUG-071 §4.1 的 bootstrap `current_gate` 语义不一致是真问题，但与 search capability 不同源；本 plan 建议先不混入上述 3 个 Change。它有现行 workaround、已有测试把兼容特例固定住，贸然一起改会扩大 lifecycle 风险。见 §6。

---

## 1. 这次修复的总原则

### 1.1 MD controller 的失败模型不同于传统程序

传统程序可以承受较长的精确逻辑链，只要每一层都被完整测试。MD controller / LLM Agent 的主要风险不同：

- 前置语义越多，越容易在长上下文中丢失；
- 同一契约散落在多个 surface，Agent 越难知道当前该信哪一个；
- 一次返回几十条依赖性 failure，Agent 很难区分根因与症状；
- 质量控制越复杂，Engine 越可能自己制造误判和假阻塞；
- Agent 能修简单、直接、可见的问题，不需要 Engine 把所有修复策略自动化。

默认闭环应保持为：

```text
直接 runtime fact
  -> 一个确定性 check
  -> 最小根因 inspect
  -> 一个明确 next action
  -> Agent 修复后重跑同一个 check
```

### 1.2 本计划的复杂度刹车

以下任一情况出现，Change 应停下缩 scope：

- 新增通用 controller / watcher / daemon；
- 为一个问题新增多份近似 validator；
- 自动修复链超过“一个确定性 normalization + 明确记录”；
- 为表现层格式引入新的 blocking schema；
- 一个前置错误继续产生大量下游 failure；
- 需要 Engine 猜 Agent 的语义意图或拦截 chat 输出；
- 需要 mock WebSearch/WebFetch 或手写假结果证明机制有效。

---

## 2. 当前事实复核

### 2.1 BUG-069：大部分已修，不应再做“大一统契约生成”

当前已有：

- emitted `result.schema.json` 按 output contract 收窄字段；
- `dry-submit` 复用正式 submit validator；
- output role、source claims、尾斜杠等主要矛盾已修；
- Wave0/Wave1 的 work-unit envelope 已比发现时自洽很多。

剩余问题主要在 **Phase-owned artifact**：Wave1 的 Markdown/depth-review、Wave2 finding-index/ledger 等不属于 work-unit result submit 的完整检查面。

本 plan 不建议：

- 引入 `zod-to-json-schema` 或新的 schema 生成依赖；
- 建一套“所有 MD / JSON / YAML 都从同一模型生成”的大系统；
- 给所有 harmless 偏差继续加 auto-normalize。

这些方向链路长、维护面大，当前收益不如精简并复用现有 gate check。

### 2.2 BUG-073：是 BUG-069 的 Wave2 实例，不单独立 Change

当前 `phase-wave2.md` 已列出 15 个 finding 字段；`shared-schemas.md` 的表也实际列了 15 个，但文字仍写“11 个”，属于可见文档漂移。

更重要的问题不是“再写一份更长模板”，而是：

- Agent 在正式 gate 前拿不到与 gate 同源的完整检查；
- missing field 会继续触发 enum、eligibility、handoff、backing 等级联失败；
- 最终表现为几十条 failure，而不是一个最小根因集。

因此合入 Change A。

### 2.3 BUG-075：研究完成，但质量控制链把格式偏好放大成 19 条 blocker

Wave1 中应区分三类规则：

1. **必须 blocking**：required files、结构化 depth-review、submitted ledger/provenance、cache/source mapping、显式 profile floor。
2. **应宽容解析**：Markdown section、空格、编号、等价 header 写法。
3. **应 advisory**：纯展示格式偏好，不影响 provenance、结构化 authority 或用户可读性底线。

现行 `inspect-wave1-output.mjs` 又没有覆盖正式 gate 的完整规则，因此 Agent 在 gate 前看不到同源结果。

Change A 应先删减/短路脆弱检查，再把同一套检查暴露为 preflight；不能只把 19 条失败提前一轮返回。

### 2.4 BUG-072 / 074：不是“规则不存在”，而是规则离决策点太远

当前已经存在：

- `shared-silent-execution.md` 的绝对禁令；
- `surfacing_intent` 命令；
- workflow loader 注入的 autonomous header；
- phase 内 active poll / gate pass / gate fail 指令。

真实 run 仍然违反，说明继续扩写长文档的边际收益很低。Agent 在这些时刻最容易浮出：

- gate pass 后；
- gate fail/stall 后；
- work-unit claim/spawn 后暂时没有 notification；
- scope/context 压力出现时。

修复应把一个非常短的 continuation cue 放到这些命令输出的末端，而不是再加一层行为状态机。

### 2.5 BUG-071：能力缺失应在 HITL1 早失败，不应进入 silent wave 后自救

Search/fetch 是外部 Agent 能力，Engine 无法自己可靠调用或证明工具存在。当前最简单的可靠路径是：

- 在用户本来就在场的 HITL1 做一次真实、有限的 search + fetch probe；
- 将观察结果写入结构化 profile surface；
- HITL1 gate 只有在 `available` 时才允许进入 silent execution；
- `unavailable` 时直接告诉用户当前环境无法执行 evidence-backed research。

不进入 Wave0 后再构造 offline mode、silent blocker、自动素材注入或多级 fallback。

---

## 3. Change A — `simplify-and-reuse-wave-contract-checks`

### 3.1 覆盖

- BUG-069 残余 Phase-owned artifact contract 面
- BUG-073 Wave2 finding-index contract wall
- BUG-075 Wave1 provenance/format/floor wall

### 3.2 这个 Change 只回答一个问题

> 当前 Wave artifact 是否已经满足正式 gate 的直接、必要、可行动契约？

### 3.3 建议实现

1. 复审 Wave1/Wave2 blocking rules：
   - authority / provenance / required structured fields / explicit floors 保持 blocking；
   - Markdown 表现格式改成宽容 parsing 或 advisory；
   - 前置结构失败后短路依赖检查，避免级联 failure wall。
2. Wave gate CLI 增加 side-effect-free inspect mode：
   - 复用正式 gate 的同一 rule evaluator；
   - 不做 handoff preflight、routing、degraded pass、gate attempt、trace/checkpoint 写入；
   - 跳过纯 completion trace rule；
   - 返回与正式 gate 同源的 root-cause `inspect` / `advice`。
3. `inspect-wave0/1/2-output.mjs` 变成薄入口，blocking 结果来自上述同源检查。
4. Phase MD 在正式 completion event / gate 前调用对应 inspect。
5. 修正 `shared-schemas.md` “11 个字段”与实际 15 字段的可见漂移，但不再复制更多 validator prose。

### 3.4 明确不做

- 不新增通用 artifact validation framework。
- 不生成所有 Markdown/YAML contract。
- 不把 work-unit submit 扩成 phase artifact controller。
- 不自动修复 provenance、finding decision 或研究质量。
- 不保留两套 blocking validator。

### 3.5 Done condition

- 同一真实 bundle 状态下，inspect mode 与正式 gate 对 artifact/provenance rules 给出相同 root failure IDs；
- inspect mode 对 `rb_status.json`、trace、checkpoint、gate attempt 零写入；
- 一个 finding 缺 required field 时，不再级联成大量依赖性 symptom；
- Wave1 harmless Markdown 等价格式不再造成不必要 blocking；
- Agent 不读 Engine source 即可从一次 inspect 输出知道下一修复动作。

---

## 4. Change B — `fail-fast-on-missing-research-access`

### 4.1 覆盖

- BUG-071 主问题：search/fetch capability 未声明、未验证、缺失后静默卡死

### 4.2 这个 Change 只回答一个问题

> 当前 Agent 环境能否完成一次真实 search，并 fetch 到一份真实页面内容？

### 4.3 建议实现

1. HITL1 增加 bounded capability probe：
   - 只做一次小型真实 search + fetch；
   - probe 不是 evidence，不进入 reference/artifact/cache coverage；
   - 工具缺失、空结果、fetch 被策略拦截均记录为 unavailable。
2. 在 `rb_profile.yaml` 增加一个很小的 `research_access` observation：
   - `status: unprobed | available | unavailable`
   - `probed_at`
   - `search_tool`
   - `result_url`（available 时）
   - `fetch_outcome`
   - `reason`（unavailable 时）
3. Profile schema 只验证 observation 结构与直接一致性：
   - available -> URL 可解析且 fetch_outcome=success；
   - unavailable -> reason 非空。
4. HITL1 gate 要求 `research_access.status=available` 才能进入 Setup/Wave。
5. unavailable 时在 HITL1 直接给用户一个明确 blocker：换到有 search/fetch 的环境后重试。

### 4.4 明确不做

- 不实现 offline research mode。
- 不自动生成“无实时证据分析骨架”。
- 不实现用户素材 ingestion。
- 不用 curl/WebSearch/WebFetch 多层探针矩阵。
- 不新增 capability registry / generalized environment framework。
- 不让 JS 假装证明外部工具真实可用；JS 只校验 Agent 的结构化 observation。

### 4.5 Done condition

- 无 search 工具、search 空结果、fetch blocked 都在 HITL1 结束前明确失败；
- 不会进入 Wave0 后才发现整条 provenance 不可达；
- 用户收到一个直接 blocker，而不是 silent hold；
- controlled E2E 必须使用真实 Agent search/fetch，不能用 mock 或手写成功结果。

---

## 5. Change C — `put-continuation-cues-at-decision-points`

### 5.1 覆盖

- BUG-072 gate pass/fail/stall 后浮出
- BUG-074 clean pass 后 scope checkpoint
- BUG-072 的 spawn 后 idle/wait 倾向做最小补强

### 5.2 这个 Change 只回答一个问题

> 当前 checkpoint 是否允许对用户说话；如果不允许，立即下一动作是什么？

### 5.3 建议实现

不再扩写大段 silent prose。只在 Agent 正要做决定的命令输出末端追加极短 cue：

- stop:no gate pass -> `user_interaction: prohibited`, `next_action: consume check.next and continue`
- stop:no gate fail -> `user_interaction: prohibited`, `next_action: repair root cause and rerun same gate`
- stop:yes -> `user_interaction: required`
- work-unit claim/spawn handoff -> `next_action: inspect/poll claimed work units; do not wait for user or notification`

实现优先复用 node frontmatter `stop` 与当前直接 command outcome；不新增持久状态，不做 Agent 意图推断。

`surfacing_intent` 只作为 cue 中的一句可执行替代动作：想汇报时记录并取消消息；它不成为新状态或许可系统。

### 5.4 明确不做

- 不拦截或审查 chat 输出。
- 不建设 session manager。
- 不根据 token/context 估算自动路由。
- 不新增 stop state machine。
- 不声称 JS regression test 能证明 LLM 永不浮出。

### 5.5 Done condition

- gate pass/fail 的最后结构化输出都含直接 interaction/next-action cue；
- status sync 后最后输出再次指向已加载 node 的 stop contract；
- work-unit claim 后直接提示 poll，不提示 wait；
- 静态测试证明 cue 可达且取值正确；
- bug 关闭前至少做一次真实 disposable Agent run 或后续真实 run 观察，不能用模拟 LLM 行为冒充通过。

---

## 6. 暂缓项：bootstrap `current_gate` 语义统一

BUG-071 §4.1 指出的 bootstrap 特例成立：instantiation、HITL1、setup 的 status window 与后续 source-gate 语义不完全统一，现行实现依赖 `BOOTSTRAP_TARGET_NODES` compatibility exception。

本 plan 不建议把它塞进 Change B 或 C：

- 它不是 search capability 问题；
- 它不是 stop:no 行为问题；
- 它会触及模板初值、三枚 pre-research gate、handoff helper、transition tests 和历史 bundle compatibility；
- 当前有明确 workaround，优先级低于三个 P1 主 failure mode。

若上述 3 个 Change 完成后仍需清理，再单独做小 Change：`normalize-bootstrap-gate-window`。

目标只保留一个初始 root exception，其余 phase 全部使用统一链：

```text
source gate pass -> enter target phase -> advance-status --to source gate -> target gate
```

不要在核心 3 Change 中顺手重写 bootstrap lifecycle。

---

## 7. 实施顺序

### 0. 清理 active change surface（已完成）

`add-audited-late-accept-for-timed-out-work-units` 已归档到 `openspec/changes/archive/2026-07-10-add-audited-late-accept-for-timed-out-work-units/`，不再占用 active change surface。

### 1. Change A

先处理 gate contract wall。它直接降低 Wave1/Wave2 修复成本，也能让后续真实 run 更容易验证 B/C。

### 2. Change B

再把“不具备研究能力的环境”挡在 HITL1，避免无意义进入长 wave。

### 3. Change C

最后补 decision-point cue。它是行为可靠性增强，静态机制容易验证，但 LLM 实际遵守仍需真实 run 观察。

每个 Change 独立 propose/apply/archive，不并行实现，不做一个 mega change。

---

## 8. OpenSpec 边界建议

### Change A 主要修改 capability

- `cli-inspect-output-conventions`
- `research-wave-gate-implementation`
- `research-wave-phase-content`
- `check-inspect-feedback`

### Change B 主要修改 capability

- `pre-research-phase-content`
- `pre-research-gate-implementation`
- `schema-core` / profile contract

### Change C 主要修改 capability

- `silent-wave-execution`
- `cli-phase-transition`
- `delegated-work-units`（仅 claim 后 cue）

优先修改现有 capability requirement；不要为了主题分类创建“bug-hardening”之类人造 capability。

---

## 9. 验证策略

### Regression（`tests/`）

- Change A：真实临时 bundle + 同一 gate rules；验证 inspect-only 零副作用、root-cause short-circuit、正式 gate 结果一致。
- Change B：验证 profile schema 与 HITL1 gate 对 available/unavailable observation 的确定性行为；不伪造外部搜索成功来声称 E2E。
- Change C：验证 gate/status/claim 输出中的 cue 与 node `stop` 一致；不声称这等于 LLM 行为保证。

### Controlled E2E（`experiments_playbook/`）

- Change B 必须由真实 Agent 做 search/fetch probe。
- Change C 必须由真实 Agent 走至少一个 stop:no gate transition；是否浮出属于 Agent 行为观察，不能用脚本生成“未浮出”结论。

### 不接受的验证

- 手写 probe success；
- mock WebSearch/WebFetch；
- 手写 trace/receipt/gate result；
- 用 console 文案代替 trace/structured output；
- 用规则数量增加证明质量提高。

---

## 10. Bug 关闭映射

| Bug | 关闭条件 |
|-----|----------|
| BUG-069 | Change A 完成；Phase-owned Wave1/Wave2 contract 可通过同源 inspect 预检，且不再要求读 Engine source |
| BUG-073 | 随 Change A 关闭；修正文档字段数漂移并由 Wave2 同源 inspect 返回最小根因 |
| BUG-075 | 随 Change A 关闭；19-rule wall 被削减为必要 blocker + 最小根因，Wave1 preflight 可达 |
| BUG-071 | Change B 完成主问题；§4.1 bootstrap 子问题另记 deferred，不能假装一起修完 |
| BUG-072 | Change C 机制完成后进入观察；真实 run 不再在 gate pass/fail 浮出后再关闭 |
| BUG-074 | 与 BUG-072 同步观察；clean pass 后 continuation cue 可达且真实 run 未再 scope checkpoint |

`_backlog/bugs/README.md` 当前未列 BUG-073，后续做 bug bookkeeping 时一并修正索引。

---

## 11. 下一步

三个 Change 均已通过 strict OpenSpec validation，artifact 状态为 4/4 complete。下一步：

1. `/opsx:apply simplify-and-reuse-wave-contract-checks`，完成并验证后 archive。
2. `/opsx:apply fail-fast-on-missing-research-access`，真实 capability probe 不得用 mock 冒充。
3. `/opsx:apply put-continuation-cues-at-decision-points`，静态输出验证与真实 Agent 行为观察分开裁决。
4. 三个 Change 不并行实现；每次 apply 只按对应 `tasks.md` 修改 target code。

一句话：**先删掉脆弱质量规则，再复用同一检查；能力缺失在 HITL1 直接挡住；静默续跑只在决策点给一句短指令。**
