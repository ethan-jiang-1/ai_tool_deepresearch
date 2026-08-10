# Semantic Fact Closure 设计理解与可靠性评估

> 日期：2026-08-09  
> 性质：学习记录与设计评估，不是 accepted spec、runtime authority、Gate verdict 或 implementation permission  
> 主题：`semantic-fact-families.yaml`、change-local `semantic-closure.yaml` 与 producer/consumer semantic drift 防护

## 1. 结论先行

这条设计路线总体合理且对症，但其可靠性来自一个**受限组合**：有界 fact family、实际共享的 resolver、真实 consumer wiring、change-scoped review 与已执行的回归测试。YAML 和 structural checker 本身不构成 semantic closure 的自动证明。

历史问题表面上经常表现为“JS、schema、Markdown prompt、生成产物和最终 reader/getter 对不上”，但根因通常不只是 schema shape 漂移，而是同一个 outcome-changing deterministic conclusion 被多个 consumer 各自从较窄的 raw record 重新推导。只盯 schema 能保证字段形状，却不能保证 submit、Gate、inspect、prompt projection 和 downstream reader 对同一组历史、provenance、authorization 或 lineage facts 得出同一个结论。

Semantic Fact Closure 把问题提升到了更合适的语义层：

```text
raw records / history / lineage / assignment facts
                         |
                         v
              one semantic resolver
                         |
                         v
              one resolved conclusion
                 /               \
                v                 v
   Agent-facing projections      verdict consumers
   task/prompt/schema/starter     submit/inspect/Gate/get
                 \               /
                  v             v
            truth-table + cross-surface proof
```

因此，值得保留的核心不是 YAML 形式本身，而是以下工程纪律：

1. 一个能独立改变 Submit、Gate、handoff 或 Final admission 的 deterministic fact family，应有一个可供所有 verdict consumer 复用的 semantic decision interface；这不要求把所有底层事实塞进一个 mega-function。
2. raw reader 可以提供输入或诊断，但不能在另一个 consumer 中偷偷升级为第二套 verdict authority。
3. 与该 fact 直接相关的 prompt、task、schema、starter 应从同一 resolved contract 投影，而不是分别手写一份近似规则；但 change-local record 不因此成为全项目 projection inventory。
4. submit、inspect、Gate 和 downstream reader 应消费同一个 resolver conclusion，而不是各自重算。
5. focused truth table 与 cross-surface regression 只有在被真实执行且覆盖声明路径时，才分别为 resolver 边界和 consumer wiring 提供证据；测试仍不能证明未枚举 consumer 不存在。

综合判断：

- 作为架构思想：强，但“one resolver”是本项目在有界 family 定义下的工程选择，不是外部文献直接推出的普遍定律。
- 作为正常 OpenSpec 路径中的 review/governance 护栏：中等偏强，前提是 plan/closeout review 真实执行。
- 作为自动证明所有 producer/consumer 永远对齐的机器保证：目前偏弱。
- 对已纳入 shared resolver 与真实 regression 的 BUG-212/213/214 路径：当前防复发证据强；对未来未枚举路径，不能量化或承诺“显著降低”。

当前真正可靠的部分是已经落地的 single-resolver、single-contract projection 和跨 consumer regression。`semantic-closure.yaml` 是强制暴露 change-scoped 关系的 review scaffold 和 lifecycle tripwire；它既不是 current topology Source of Record，也不是完整、自动、始终新鲜的 semantic dependency graph。

## 2. 本次阅读与证据边界

本次评估读取了以下权威或相关 surface：

- `guidelines/project-charter.md`
- `CONTEXT.md`
- `guidelines/evolution-abstraction-semantic-precision.md`
- `guidelines/evolution-simple-reliable-control.md`
- `guidelines/evolution-helper-oriented-agent.md`
- `guidelines/framework-runtime-boundary.md` 的 Agent-Engine Communication 部分
- `openspec/governance/semantic-fact-families.yaml`
- `openspec/specs/governance/semantic-fact-closure/spec.md`
- `openspec/governance/semantic-fact-closure-contract.mjs`
- `openspec/governance/check-semantic-closure.mjs`
- `guidelines/change-feedback-loop.md`
- `openspec/governance/finalize-change-archive.mjs`
- apply/archive entry skills 中的 semantic-closure 接线
- archived bootstrap change `establish-semantic-fact-closure-governance`
- archived dogfood change `close-work-unit-semantic-contract-drift`
- dogfood change 对应的 resolver、projection、submit、Gate/reader implementation 与 selected tests

此外，二次调查读取了 Dijkstra、Parnas 的原始论文、W3C PROV-DM、IETF RFC 3986、Bazel 官方 dependency/hermeticity 文档与 Node.js 官方 test-runner 文档。它们只用于校准设计原则和能力边界；本项目当前行为仍由 accepted specs、实际 source 与 tests 决定。三份 `evolution-*` guideline 在本文中同样只作为历史设计倾向与 review lens，不作为 behavior authority。

没有直接读取 proposal 引用的 `_backlog/bugs/BUG-212`、`BUG-213`、`BUG-214` 原始文件；下面对这三项故障的描述来自已归档 proposal/design/spec，而不是对原始 bug 记录的独立复核。

当前 repository 没有 active OpenSpec change。Semantic closure 机制只有两份已归档 record：

1. bootstrap change 的 `not_applicable` 自举记录；
2. `close-work-unit-semantic-contract-drift` 的一次真实 `affected` dogfood。

因此，当前有清楚的设计、一次真实 affected dogfood 和当前 selected deterministic tests 的通过证据，但还没有足够的长期样本证明它在多轮、多人、多 family 演进中持续有效。下文凡是从外部原则或单次 dogfood 推到未来可靠性的内容，都标为项目推论而不是已证明事实。

## 3. 这套机制真正要解决的故障类型

### 3.1 不是普通 schema drift

Schema 主要拥有：

- 数据 shape；
- required/optional fields；
- enum；
- 局部 cross-field invariant；
- 明确可编码的结构约束。

但以下结论通常不是单个 schema 能独立拥有的：

- 当前 attempt 的 assignment 是否要求 output declaration；
- 一个 `source_ref` 是否由当前 output 或合法 prior submitted output 授权；
- 一个 ledger row 是 current、historical、hash-drifted 还是 raw-only bypass candidate；
- 多个 submitted rows、queue binding、manifest、receipt 和 lineage 是否共同构成合法 provenance；
- downstream reader 是否应把某个 artifact 当作 admitted backing。

这些结论依赖历史、多记录关系、授权、版本或 provenance。若每个 consumer 都从自己能看到的 raw subset 重算，结构可以全部 schema-valid，结论仍然互相矛盾。

### 3.2 三个 dogfood bug 的共同模式

已归档 change 将三个不同 defect 归为同一失效模式：

| Bug | 已有 semantic conclusion | 漂移 consumer 的较窄重算 | 结果 |
| --- | --- | --- | --- |
| BUG-214 | assignment resolver 已得出 supplementary Wave1 无 current direct-output obligation | submit 继承通用 `output_files.required` | task 说不需要，submit 却拒绝空列表 |
| BUG-213 | formal submit 已允许一个 hash-valid、same-Topic、role-authorized prior submitted output | depth review 只查当前 row 的 `output_files[]` | submit 接受，review 拒绝同一 `source_ref` |
| BUG-212 | normalized ledger 已把合法 superseded predecessor 归为 historical | bypass scanner 比较 raw rows 和 current rows | historical predecessor 被误报为 handwritten bypass |

这说明共同根因不是“少加一个 validator”，而是“已经存在的 semantic conclusion 没有成为所有 verdict consumer 的唯一输入”。

## 4. Catalog 与 change-local closure 的职责拆分

### 4.1 Global catalog 做得很薄是合理的

`openspec/governance/semantic-fact-families.yaml` 只保存：

- stable dotted family ID；
- bounded question。

它不保存 current resolver、writer、consumer 或 test coordinates。这个选择有明显好处：

- catalog 只回答“我们在谈哪一类 outcome-changing fact”；
- 不把 global YAML 变成容易腐烂的全项目 code dependency graph；
- 不创建第二套 runtime schema registry；
- 不让 governance catalog 成为 runtime verdict authority；
- family 可以跨具体模块重构保持稳定，只要 bounded question 未变。

这符合 abstraction-as-semantic-precision：family 不是字段、文件、helper 或 validator，而是一个明确读者可以询问的有界问题。

### 4.2 Change-local record 承载变化中的关系

`openspec/changes/<change>/semantic-closure.yaml` 的 `affected` entry 当前要求：

- `family`
- 本次 change 具体影响的 `fact`
- `authority.resolver`
- `established_by`
- `consumers`
- `overlap`
- `verification.truth_table`
- `verification.cross_surface`

这种拆分的设计意图正确：resolver/consumer topology 是 change-scoped claim，不被伪装成永久全局真相。Plan review 对 planned surfaces 做语义判断，closeout review 再对 actual diff 重做一次判断。

### 4.3 `not_applicable` 与 `affected` 的 closed branch 是好设计

优点包括：

- 不允许省略 applicability 判断；
- `not_applicable` 必须给非空理由；
- `affected` 必须至少有一个 family；
- 不允许用 `other` 或 free-form family 绕过 catalog；
- 新 family 必须在同一 change 中声明，并在依赖它的第一个 target edit 前进入 global catalog；
- plan/assets 两个时间点分别验证“尚未写入”和“已经写入”，避免把同一时间条件错误复用。

这类严格性保护的是治理结构，不是 presentation preference，作为 blocking rule 是合理的。

### 4.4 现有角色拆分基本够用，但必须按 family conclusion 解读

当前 schema 的四个位置分别回答不同问题：

- `authority.resolver`：由哪个 Engine interface 得出该 family 的 deterministic conclusion；
- `established_by`：哪些合法 surface 建立或改变 resolver 所需的权威事实；
- `consumers`：哪些 surface 用该 conclusion 作授权、拒绝、pass/fail 或 blocking verdict；
- `overlap`：哪些 legacy/raw/projection surface 与该 conclusion 有关系，以及它相对该 conclusion 是 `authoritative`、`derived` 或 `retired`。

这个拆分与 W3C PROV-DM 对 generation、usage、derivation 的区分方向一致，但不是 PROV-DM 对本项目 schema 的背书。尤其要注意：普通“producer”可能指 authority writer，也可能指 task/schema/Markdown projection generator；二者不能因同名而塞进同一角色。

因此，global catalog + change-local record + current source/spec 三者的职责拆分是合理的：catalog 只稳定命名问题，change record 记录本次变化声明，current source/spec 决定当前实现真相。Change-local record 归档后是历史证据，不应被当作永远最新的 topology map。

## 5. 为什么实际 runtime 收敛是可靠的

### 5.1 Assignment output obligation 已形成一条同源链

当前 assignment 路径的关键形状是：

```text
queue snapshot + Topic binding + assignment version + base kind contract
                              |
                              v
resolveWorkUnitAssignmentContract(...)
                              |
                              v
WorkUnitOutputContractSchema.parse(...)
                              |
                              v
manifest.output_contract
       |                  |                         |
       v                  v                         v
result.schema.json      task.md / starter       dry/formal submit
```

具体可靠性来自：

- `resolveWorkUnitAssignmentContract` 同时计算 `required_outputs[]` 和 `output_files.required`；
- 返回值经过 `WorkUnitOutputContractSchema` 校验；
- manifest 保存 immutable、version-selected resolved contract；
- result schema 的 required roles、contains constraints 和 defaults 从 `manifest.output_contract` 生成；
- task Markdown 的 required outputs 和 Result JSON Starter 从同一 manifest/schema 生成；
- spawn prompt 不复制一套 output 规则，只让 Agent 打开 task 的 Completion Contract；
- submit 重新从 hash-bound queue snapshot 和 assignment version 解析 expected contract，并与 manifest contract 比对；
- `validateOutputFiles` 读取同一个 output contract，而不是再保留 generic requiredness override。

这一点比“在多个 MD/JS 文件里写同一句规则”可靠得多，因为规则在 code path 上真正同源。

### 5.2 Version v3 避免历史 attempt 被重解释

Dogfood change 没有原地改变 v1/v2 assignment interpretation，而是：

- 新 claim 使用 `work-unit.assignment.v3`；
- v1/v2 保留 bound contract；
- 已 claim 的 v2 supplementary attempt 不被静默改写；
- 新 successor 才获得 v3 semantics。

这保护了 immutable attempt contract，也避免“修复当前规则”反向改变 in-flight/history 的含义。这个兼容策略是成熟且必要的。

### 5.3 Source-ref authorization 变为 shared resolver

`resolveAcceptedSourceRefAuthorization` 统一判断：

- current declared output；
- one exact eligible prior submitted output；
- unsafe path；
- missing authority；
- ambiguity；
- Topic、wave、kind、role mismatch。

Formal submit 和 Wave1 reviewed backing 都消费这个 resolver。Reviewed backing 在授权之后仍保留自身应拥有的 current cache/degraded binding 和 physical projection availability 检查，但不再重建 current-only authorization。

这个拆分保留了两个不同问题：

1. `source_ref` 是否有合法 provenance；
2. downstream reference projection 所需的物理 backing 当前是否可用。

二者不会因为共享 resolver 而被错误合并。

### 5.4 Supersession consumer 使用 normalized current/historical conclusion

`evaluateNormalizedSubmittedWorkUnitLedger` 返回 current facts 与 historical predecessors。Bypass scanner 保留 raw declaration observation，但 current/historical verdict 来自 normalized evaluation；只有 exact `hash_valid_historical` relation 才能排除 bypass suspicion。

这是合适的“raw reader 仍可存在，但不拥有 semantic conclusion”模式。

## 6. 机制值得肯定的设计点

### 6.1 已 dogfood 的三个 family 抽象层选得合理

机制没有把每个字段、hash、helper 或 schema 文件注册成 family，而把 family 定义为能独立改变 legal outcome 的有界 conclusion。这比 field registry 更稳定，也更接近三个已知故障边界。当前证据足以支持 dogfood 使用的三个 family；不能仅凭 catalog 文案进一步断言其余十个 family 已经全部选对粒度。

### 6.2 明确区分 structural validity 与 semantic completeness

Accepted spec、design、guideline 和 apply/archive entry 都反复声明：checker PASS 只证明 record/catalog/coordinate/verification asset 的结构与引用有效，不证明 consumer inventory 完整，也不证明 implementation 真正使用 resolver。

这种克制是正确的。尝试用一个 generic JS scanner 自动理解任意代码是否在“建立 verdict”，会制造高误报、第二套 interpretation engine 和更复杂的治理故障。

### 6.3 Plan 与 closeout 的时机合理

- target edit 前跑 plan mode，避免 archive 时才第一次发现 family/closure 缺失；
- closeout review 对 actual diff 重新判断，避免 planned map 与实现漂移；
- archive finalizer 在 verification-routing assets 后、native archive 前跑 semantic assets check；
- failure 返回 `family`、`missing_fact`、`owner`、`write_to` 和 same-mode rerun。

这符合 shortest correct control loop：record -> one checker -> smallest root -> repair -> rerun same checker。

### 6.4 没有扩大 runtime authority

机制没有新增：

- runtime Gate；
- runtime state；
- receipt；
- retry tree；
- Agent controller；
- automatic repair；
- global runtime resolver registry。

它只约束 OpenSpec change lifecycle，不介入 research run。这个边界与 Project Charter 一致。

### 6.5 两层 verification declaration 有价值，但不是 proof receipt

每个 affected family 必须声明：

- focused truth-table test；
- distinct cross-surface test。

这迫使 change 计划不只覆盖 helper 自己，还覆盖至少一个真实 CLI/Gate/reader consumer。真正的证据仍来自这些 assets 的 native execution；两个路径被声明、存在且不同，只证明 proof plan 形状，不证明测试已经运行或覆盖声明语义。对于 outcome-changing deterministic facts，要求两个互补 proof boundary 仍是合理的 review burden。

## 7. 当前最重要的可靠性缺口

### 7.1 Checker 无法发现漏写的 consumer

这是设计明确接受的边界，也是最大 false-negative 来源。

以下情况都可能 structural PASS：

- change 实际改了一个 verdict consumer，但 closure 没列它；
- change 错误选择了 `not_applicable`；
- record 只列出一个已知 consumer，遗漏另一个较远的 Gate/inspect/getter；
- 新 consumer 直接读 raw record，reviewer 没意识到它在建立同一 family 的 verdict；
- selected tests 存在但没有覆盖真正遗漏的 consumer。

因此，机制的 semantic completeness 仍依赖 plan/closeout Agent review 的质量。

### 7.2 首个 affected record 已出现 human-facing fragment 的 false precision

这是实际存在的导航质量问题，但不是 checker 违反 accepted contract。Founding design 明确把 `#fragment` 定义为 optional human-facing fragment，并明确只验证 file path，不验证 code-token semantics。

`close-work-unit-semantic-contract-drift/semantic-closure.yaml` 有 6 处 fragment occurrence、5 个不同的不精确 fragment 值：

| Record fragment | 归档 commit `ea02a29af` 中的实际 symbol |
| --- | --- |
| `work-unit-lifecycle.mjs#claimWorkUnit` | `claimWorkUnits` |
| `work-unit-envelope.mjs#buildWorkUnitEnvelope`（出现两次） | `writeWorkUnitEnvelope` |
| `work-unit-submit.mjs#evaluateCandidate` | 无该 symbol；相关 submit preparation 是其他 private functions |
| `direct-output-contract.mjs#evaluateDirectOutput` | `evaluateDirectOutputTarget` |
| `work-unit-supersession.mjs#supersedeWorkUnit` | `supersedeWorkUnitAttempt` |

这些名字在归档 commit 中已经不精确，不能称为后来 rename 导致的 `stale`。更准确的结论是：file coordinate 的 referential validity 通过了，但 fragment 造成了未经机器验证的精确外观。它不否定 runtime fix，因为 production resolver wiring 与 selected tests 是另一条证据链；它会降低 archived record 的人工导航价值。

这里不应直接推出 generic identifier validator。对任意 `.mjs` 做 exact-token 搜索既会被 comment/callsite 假阳性，也无法证明该 symbol 扮演声明角色。优先做法是：author/closeout review 使用实际 symbol；无法稳定命名时使用 bare file path，把解释放进 `detail`；若未来反复出现同类导航故障，再评估非 blocking advisory 或明确定义的 fragment grammar。

### 7.3 Dogfood record 的 projection 角色使用不一致，但尚不足以扩 schema

Accepted schema 已把 verdict `consumers` 与 projection/legacy `overlap` 分开；后者可以用 `relation: derived` 表达 Agent-facing task/schema/prompt projection。首个 dogfood record 的确使用不一致：assignment family 把 `work-unit-envelope` 放进 `consumers`，source-claim family 又把同一 file 作为 derived overlap。这是 record/review 质量信号，不等于 schema 缺少表达能力。

当前 runtime 的 stronger evidence 是 `writeWorkUnitEnvelope` 从 `manifest.output_contract` 生成 result schema、task completion contract 与 starter，`spawnPromptForWorkUnit` 又指向该 completion contract。也就是说，projection parity 已由实际 data flow 和 tests 建立，而不是由 record 角色命名建立。

因此，立即增加 `agent_facing_projections` 一等字段会扩大每个 affected record 的 blocking surface，却还没有第二次真实 failure 证明 `overlap: derived` 不够。更符合 simple reliable control 的顺序是：先在 review 中按现有角色纠正分类；若多次 change 仍发生同类歧义，再用真实样本决定是改字段名、增加 relation，还是单独引入 projection role。

### 7.4 Declared verification asset 存在，不等于 native execution evidence

Semantic checker 只确认：

- truth-table 与 cross-surface 是不同路径；
- 它们被 verification plan 选中；
- assets mode 时文件存在且在 repo 内。

它不会：

- 执行测试；
- 确认测试当前 PASS；
- 确认测试内容真的覆盖该 family；
- 确认两个测试使用同一 truth table；
- 确认 cross-surface test 穿过声明的 consumer；
- 确认测试没有只验证 fixture 自己。

Finalizer 同样按 accepted `change-feedback-loop` contract 被禁止成为 test runner。当前 test success 来自真实 `node --test` exit，而不是 tasks checkbox、verification plan 或 semantic checker PASS。这与设计边界一致；缺口若要补，应由 verification/change-feedback lifecycle 设计 durable native execution evidence，而不是把 result/receipt 塞进 `semantic-closure.yaml`。

### 7.5 CI/direct-edit bypass 是组织边界，不是当前 checker 的承诺

Founding design 明确把 CI integration 排除在 scope 外。正常 supported apply/archive entry 已有较强接线，但：

- 直接修改 target code 不会自动触发 plan check；
- 不走 governed archive 的普通 commit 不会被 semantic finalizer 阻断；
- 非受支持工具或人工操作可以绕过流程；
- repo hard rules 主要约束遵守这些 instructions 的 Agent，而不是所有 filesystem mutation。

因此，这套机制的覆盖率依赖“OpenSpec 是唯一工程变更主干”这一组织纪律真正成立。这是已知 trust boundary；在没有 bypass incident 或明确 CI requirement 前，不能据此把 CI integration 升为 semantic-closure P0。若未来要扩大 enforcement，应该先决定所有受支持 mutation entry，而不是给当前 checker 加一个无法拦截 filesystem write 的假开关。

### 7.6 Global catalog 不是当前 topology 查询面，而且不应被误用为该查询面

Global catalog 故意不保存 resolver/consumer coordinates，这是避免 stale global graph 的正确选择。但副作用是：未来 change author 只读 catalog 时，只知道 family ID/question，不知道当前 resolver 和所有 consumers。

Change-local records 归档后成为历史证据，但不是 current Source of Record。随着多个 change 先后触碰同一 family：

- 不同 archive record 可能列出不同 consumer set；
- 不存在一个 authoritative “latest map”；
- future author 仍需从 main spec、current code、tests 和历史 records 重新构建 topology；
- 只搜索 family ID 可能找到多个互相过时的候选。

这是刻意的 authority split，不是 staleness bug：global catalog 拥有 current family vocabulary，archived closure record 拥有历史 change declaration，current spec/code/tests 拥有当前 behavior/topology。它确实留下导航成本，但目前只有一份 affected record；尚不足以证明需要另一个 inspect projection。

### 7.7 Catalog 的部分 initial family 可能过宽

只按 bounded question、尚未逐一审查实现时，可以看到一些需要在首次真实使用前重新验证粒度的 family：

- `research.scope-and-rerun-intent` 同时包含 scope、canonical Topic、rerun intent；
- `work-unit.attempt-identity-and-actor` 同时包含 identity、queue/assignment binding、actor、nonce、runtime receipt；
- `wave.submitted-reference-convergence` 同时包含 submitted backing、reference materialization、convergence；
- `wave2.finding-and-target-authority` 同时包含 findings、carried targets、synthesis、cross-reference；
- `lifecycle.gate-status-trace-handoff` 同时包含 Gate、status、trace、handoff receipt。

Family schema 又要求一个 affected family 在 record 中只出现一次，并声明一个 semantic resolver。若上述问题实际由多个独立 authority/resolver 决定，就会出现两种坏结果：

1. 强行制造一个 mega-resolver；
2. 用一个模糊 `fact` 和不完整 consumer list 假装闭合。

正确做法不是立即重分全部 13 families，而是在某个 family 第一次被真实 change 使用时做“一 resolver 测试”：如果一个 bounded question 无法由一个 coherent resolver conclusion 回答，就应在该 change 中拆 family，而不是扩大 resolver。

### 7.8 `overlap.relation` 的语义仍可能含混

Real record 将 raw output declaration reader 标为 `relation: authoritative`，同时 detail 又说明 current-versus-historical conclusion 只有 normalized resolver 才 authoritative。

这可能表达的是“raw reader 对 raw ledger evidence authoritative，但对 family conclusion 不 authoritative”。如果 relation 没有明确说明它相对于哪一层 authority，future reviewer 可能误读。

`overlap` 的关系最好始终相对于 family bounded conclusion 定义；若一个 surface 只是 authoritative input，应使用明确的 input/observation 角色，而不是让 `authoritative` 同时表示 raw evidence authority 和 semantic conclusion authority。

### 7.9 Catalog vocabulary 有一份重复的 exact test oracle

`semantic-fact-closure-contract.mjs` 导出 `INITIAL_SEMANTIC_FACT_FAMILIES`，硬编码了与 YAML 相同的 13 个 ID/question pairs。Unit test 将 YAML catalog 与这个数组做 exact deep equality，并要求 length 仍为 13。

这不是第二个 runtime/current catalog authority：production parser 不消费该 constant。它是重复的 exact bootstrap oracle，并带来两个潜在维护问题：

- “YAML 是唯一 vocabulary”在实践中变成 YAML + JS baseline 两份需要同步的文本；
- accepted spec 又声明 catalog 可扩展，未来合法增加第 14 个 family 时必须同步修改 JS constant/test，否则测试失败。

这不是 runtime correctness 缺陷；在 catalog 仍为初始 13 项时，exact oracle 也确实保护 bootstrap 内容。只有第 14 个 family 合法加入时，这个 latent extensibility tripwire 才成为实际摩擦。届时可把 constant 改名为 historical bootstrap baseline、改成 required-subset assertion，或在同一 catalog-growth change 中显式更新；现在不值得单独重构。

### 7.10 双测试要求也可能退化成形式主义

要求 truth-table 和 cross-surface 两个 distinct files 总体合理，但机器目前只看路径不同。未来可能出现：

- 两个文件复制同一 shallow assertion；
- truth table 没有邻近 negative cases；
- integration test 绕过真实 producer；
- 为满足两条路径而拆出没有独立价值的测试；
- test fixture 自己硬编码预期 conclusion，未经过 production resolver。

因此，review 应关注 proof claim，而不是“有两个文件”本身。

## 8. 当前机制能防什么、不能防什么

| Failure mode | 当前防护 | 判断 |
| --- | --- | --- |
| 缺少 `semantic-closure.yaml` | Apply/Archive entry hard stop | 强 |
| YAML branch/schema malformed | Zod strict parse | 强 |
| unknown family 或 free-form `other` | Catalog membership/addition rules | 强 |
| same-change catalog addition 未按时间写入 | plan/assets time-scoped checks | 强 |
| declared file missing、非 regular file、symlink escape | assets check | 强 |
| verification path 未被 plan 选中 | shared verification-routing parser | 强 |
| human-facing fragment 不精确 | 只检查 base file，fragment 由 review 负责 | 结构 contract 按设计通过；导航质量已出现真实问题 |
| record 漏写实际 consumer | Agent semantic review | 中等偏弱 |
| `not_applicable` 理由不真实 | Agent semantic review | 中等偏弱 |
| prompt/task/schema projection 独立漂移 | `overlap: derived` + 实际同源 data flow + cross-surface tests | 对已声明/已测路径中等偏强；无全局 inventory |
| consumer 又从 raw record 重算 | shared resolver design + review + cross-surface test | 对已声明 consumer 中等偏强；对漏项弱 |
| selected tests 只被声明、未执行 | checker/finalizer 明确不拥有 execution；需 native verdict | 不在 semantic checker 证明范围 |
| archived record 被当作 current topology | authority boundary 明确禁止 | 用法错误；不是应补的 freshness feature |
| direct code edit 绕过 OpenSpec | 无 CI/direct mutation guard，依赖 project workflow discipline | 已知外部边界 |
| 已修复三个 dogfood paths 的当前 regression | 本轮 200 个 selected deterministic tests 的 native PASS | 强，但仅限当前 revision/selected boundary |

## 9. 建议的强化顺序

以下建议以最小、可验证、不会把治理机制扩成第二套 runtime controller 为原则。二次调查后，原来的两个 P0 code/schema 建议均降级：目前没有证据支持立即新增 projection 字段或 generic fragment blocker。

### P0：保持 v1 边界，先消除使用层的 false precision

当前优先动作不是再加 checker，而是把已有 contract 用准：

- 每次 affected change 的 plan/closeout review 都相对于 family conclusion 区分 resolver、authority-establishing surface、verdict consumer 与 `overlap: derived|retired|authoritative`；
- Agent-facing task/schema/prompt 若只是 projection，先用现有 `overlap: derived`，不要塞进 verdict `consumers`；
- `#fragment` 只有在 reviewer 能指向实际 symbol 时才写；否则使用 bare file path，并在已有的相邻 prose surface（如 `fact`、适用时的 `overlap[].detail`，或 design/closeout review）说明；
- 不追改 archived history 来制造“从未出错”的外观；本文明确记录首个 affected record 的 5 个错误 fragment 值；
- closeout 报告真实 `node --test` command、exit 与 revision/diff boundary，不把 checked task 或 checker PASS 当 test evidence。

Done condition 是：下一份 affected record 不重复首个 record 的角色混用与虚假 fragment 精度，并且 selected native tests 有可审查的真实执行结果。它不需要 semantic-closure/v2。

### P1：让同一 scenario matrix 穿过 resolver、projection 与 consumer

优先采用 test-design 纪律，而不是新增通用 controller：

```text
one scenario matrix
  -> resolver result
  -> generated manifest/task/schema/starter projection
  -> dry-submit/formal submit
  -> downstream Gate/inspect/getter
```

每个 case 至少保留：

- positive legal case；
- adjacent negative cases；
- legacy/version compatibility；
- raw-only/filesystem-only 不得成为 authority；
- projection 与 verdict 必须对同一 fact 给出一致结论；
- downstream consumer 自己拥有的独立检查不得因共享 resolver 被删除。

Dogfood change 已经接近这个形状，后续应把它明确作为 family proof 习惯。

### P1：每个 family 首次使用时做 granularity admission

使用一个简单判据：

> 能否为这个 bounded question 指出一个 coherent semantic resolver，以及一张不混合多个独立 verdict 的 truth table？

若不能，则拆 family。不要为保住初始 catalog 名称制造 mega-resolver，也不要一次性重写全部 catalog。

### 条件性 P1：若需要跨 session/archive 的 test execution 证明，交给 verification capability

in-toto 的 layout/link 区分和 Node 的 native exit 语义支持“计划不是执行”这一原则，但它们不推出本 repo 现在必须新增 receipt。只有出现以下任一明确需求时，才启动独立 verification/change-feedback change：

- archive 必须机器验证某一 revision 的 selected deterministic tests 已执行；
- 发生 checked task 与实际未运行/失败相矛盾的 incident；
- CI 成为正式 supported lifecycle authority。

该 change 应复用 `verification-routing` 的 native verdict authority，绑定 command、exit 与 revision/diff，且不得让 semantic checker/finalizer 编排任意 tests。没有上述 trigger 时，保留 Agent 执行与 closeout review，避免新增 persistent receipt/state。

### P2：第一次合法 catalog growth 时处理 exact bootstrap oracle

不要现在单独删除 `INITIAL_SEMANTIC_FACT_FAMILIES`。当第 14 个 family 的 change 真正出现时，在同一 change 中选择并验证一种兼容处理：改名为 historical bootstrap baseline、改成 required-subset assertion，或显式更新 exact baseline。依赖是“已有一个通过 granularity admission 的新 family”，不是抽象的去重偏好。

### P2：记录积累后再考虑只读 family inspect projection

未来同一 family 有多份 archived closure records 后，可以考虑一个明确非权威的只读 view：

```text
inspect-semantic-family <family-id>
  -> catalog bounded question
  -> relevant accepted spec
  -> archived closure claims ordered by change
  -> current file/fragment existence diagnostics
  -> explicit "review required; not current authority" boundary
```

它只能降低导航成本，不能把“最新 archive record”升级为 current topology authority，也不能替代 current code/spec review。现在只有一次 dogfood，立即新增 CLI 可能过早；先观察真实使用摩擦。

### 可转化为 rollout plan 的阶段与依赖

| 阶段 | 工作 | 依赖/trigger | 可观察完成条件 |
| --- | --- | --- | --- |
| Baseline / P0 | 保持 v1 schema/checker；校准角色、fragment 与 proof wording；保留本轮 200-test baseline | 无 | 学习记录不再夸大 checker；下一 change 的 reviewer 有明确使用规则 |
| Next affected change / P1 | 对实际触碰的 family 做 granularity admission；用一个 scenario matrix 贯穿 resolver、相关 projection 和真实 verdict consumer | 有真实 affected change | focused + cross-surface native tests 对同一 cases PASS，record 与实际 diff 一致 |
| Verification evidence / conditional P1 | 设计 revision-bound native execution evidence | 明确 durable-proof requirement、incident 或 CI authority | 由 verification capability 验证 command/exit/revision；semantic closure 不新增 runner |
| Governance ergonomics / P2 | fragment advisory、projection schema 或 family inspect view | 至少两次同类真实摩擦，且现有 review/`overlap` 不足 | focused OpenSpec change 删除或替代一份现有歧义/手工负担 |
| Catalog growth / P2 | 处理 exact bootstrap oracle | 第 14 family 通过 admission | catalog growth 不被名为 `INITIAL_*` 的 exact oracle 意外阻塞 |

## 10. 不建议采取的过度修正

### 10.1 不要建立 global runtime resolver registry

把每个 current resolver/consumer 固化进 global catalog 会制造第二套 runtime authority和持续 stale graph。Global catalog 保持 ID/question-only 的基本方向应继续保留。

### 10.2 不要做 generic arbitrary-JS semantic linter

机器无法仅靠调用图稳定判断一个 raw reader use 是 display、diagnostic 还是 outcome-changing verdict。强行推断会引入高误报和第二套 semantic engine。

### 10.3 不要把 exact-token fragment 搜索做成 blocking proof

RFC 3986 只规定 fragment 的通用语法，fragment 语义取决于 representation/media type；本 repo 的 `.mjs#symbol` 又只是 human-facing convention。Token search 会把 comment、import 或 callsite 当 declaration，也不能证明 consumer relationship。优先消除 false precision；反复出现真实摩擦后最多先做 advisory。

### 10.4 不要新增 runtime Gate、state 或 receipt 来证明 change governance

Semantic closure 是 project change governance，不是 research-run runtime fact。不要把它写进 run bundle 或 Gate lifecycle。

### 10.5 不要为了 family 形式统一重构全部 Harness

应在 future change 触碰某个 surface 时局部收敛：复用 resolver、删除 duplicate predicate、补 projection parity。不要做没有真实故障边界和 regression proof 的全系统 rewrite。

### 10.6 不要把 checker PASS 改名成 semantic completeness PASS

Structural checker 的诚实边界是优点。只能在有明确、可判定且由该 checker 拥有的 direct fact 时增强；不能用更强命名、fragment token 或 test-path presence 掩盖仍需 Agent judgment/native execution 的部分。

### 10.7 不要在没有复发证据时新增 projection 字段

现有 `overlap: derived` 已能表达 projection。先修正首个 record 的角色使用并观察后续 affected changes；只有重复样本证明这个表达会稳定误导 reviewer，才值得承担 schema migration 与额外 blocking surface。

## 11. 对 13 个 initial families 的初步看法

这里只依据 catalog bounded question 与已读 dogfood，不是对未读实现的最终 verdict。

### 已有实际 closure 与 runtime proof 的 family

- `work-unit.assignment-output-obligation`
- `work-unit.source-claim-provenance`
- `work-unit.submission-ledger-and-supersession`

当前只有这三个 family 经过 affected record、实现收敛与 selected tests 的完整 dogfood。它们的粒度有实际证据支持。

### 从 bounded question 看较容易形成 truth table，但尚未 dogfood

- `work-unit.wave0-source-output`
- `work-unit.wave1-evidence-summary-output`
- `work-unit.wave1-question-list-output`
- `final.submitted-backing-admission`

这里只能说问题表述较窄，不能说 current resolver/consumer topology 已被本次调查证明闭合。

### 首次使用前需要特别检查是否过宽

- `research.scope-and-rerun-intent`
- `queue.demand-lifecycle`
- `work-unit.attempt-identity-and-actor`
- `wave.submitted-reference-convergence`
- `wave2.finding-and-target-authority`
- `lifecycle.gate-status-trace-handoff`

“可能过宽”不等于现在错误。Catalog 自己明确是可增长而非完整 inventory；最合理策略是在真实 change 中用一 resolver/bounded-answer test 做局部拆分判断。

## 12. 如何准确描述这套机制的承诺

不应承诺：

> Semantic closure 会自动保证所有 JS、schema、prompt、MD、producer 和 consumer 永远一致。

更准确的承诺是：

> 每个正常 OpenSpec change 都必须显式判断其是否影响 outcome-changing deterministic fact family；若影响，必须在 target edit 前声明一个 semantic resolver、authority establishment、相关 projections/consumers、overlap 与 proof plan，并在 closeout 时用实际 surfaces 重新审查。Node checker 对声明结构和引用 fail closed，Agent 对 consumer completeness 和语义真实性负责。

当 selected native tests 在明确 revision/diff boundary 上真实运行后，可以对该次执行进一步承诺：

> 已执行的 selected tests 在其 deterministic proof boundary 内通过；这不证明未声明 surface 不存在，不证明 fragment 语义有效，也不证明未来 revision 仍通过。

这比“semantic completeness PASS”弱，但与当前 accepted contract 和真实证据一致。

## 13. 本次实际验证

本轮重新执行了完整 10-file selected deterministic set：

```text
node --test \
  tests/governance/semantic-fact-closure-contract.test.mjs \
  tests/integration/governance/check-semantic-closure.test.mjs \
  tests/governance/change-feedback-finalizer.test.mjs \
  tests/integration/governance/change-feedback-finalizer.test.mjs \
  tests/engine/work-unit-assignment-contract.test.mjs \
  tests/engine/work-unit-submit.test.mjs \
  tests/engine/helpers/gate-helpers-provenance.test.mjs \
  tests/integration/cli/operate-work-unit.test.mjs \
  tests/integration/cli/wave1-reference-convergence.test.mjs \
  tests/integration/cli/check-gate-wave1-complete.test.mjs
```

结果：

```text
tests:     200
suites:     13
pass:      200
fail:        0
duration: 69144.036833 ms（本机约 69 秒）
```

另外用 `git grep` 对归档 commit `ea02a29af` 复核了 closure fragments 与当时 source symbols，确认第 7.2 节列出的不精确 fragment 不是后续 rename。

这些结果证明当前 governance mechanics 和三个 dogfood runtime paths 在本轮 selected deterministic boundary 下通过。它们不证明 future consumer inventory 自动完整，不证明测试充分性，也不构成长期可靠性统计。

本次评估没有修改 framework、tests、OpenSpec accepted artifacts 或 runtime state。

## 14. 最终判断

Semantic Fact Closure 不是多余的流程负担，它抓住了这个项目真实、反复出现的故障根因：schema-valid 不等于 semantic-consistent，raw reader 不等于 resolver，projection 不等于 authority，不同 consumer 不能各自发明一套结论。

它目前最成功的地方，是促成了实际 runtime 结构从“多处近似 predicate”收敛到“one resolver -> one resolved contract -> multiple projections/consumers”。这部分会直接减少长期反复修补。

它目前最不可靠的地方，是治理 record 自身仍依赖 Agent 枚举完整性，而且第一次 dogfood 已出现 human-facing function fragment 的 false precision 与 projection role 使用不一致。这个事实说明不能把 YAML 完整或 checker PASS 当成 semantic closure 已完成；但它也不构成立即扩 schema/checker 的充分证据。

所以总体态度应当是：

- 保留并继续使用；
- 不降级为普通 checklist；
- 不夸大成自动 semantic proof；
- P0 保持 v1 contract，先在 author/review 层把现有角色和 fragment 用准；
- P1 在下一次真实 affected change 中做 granularity admission，并让同一 scenario matrix 穿过 resolver、相关 projection 和最终 consumer；
- durable test execution evidence 只有在明确需求/incident 下进入独立 verification change；
- projection 新字段、fragment advisory、inspect CLI 和 exact-oracle cleanup 均等待各自 trigger；
- 暂不建设 global runtime registry 或通用 semantic linter。

主结论是：设计合理，runtime convergence 有当前证据，governance completeness 仍是 review-bounded。最可靠的下一步不是增加更多 blocking machinery，而是在下一次真实 change 中按上述顺序继续 dogfood，并用复发数据决定是否升级机制。

具体阶段、owner、checkbox、Gate 与 trigger 见 [Semantic Fact Closure 渐进落地与追踪计划](semantic-fact-closure-progressive-rollout-plan-2026-08-09.md)。

## 15. 二次调查 / 外部一手资料校准

### 15.1 哪些结论获得支持，哪些必须减弱

| 外部原则 | Repository evidence | 本项目推论与边界 |
| --- | --- | --- |
| Dijkstra 的 abstraction 目标是创造可精确推理的新 semantic level；Parnas 建议围绕需要隐藏、可能变化的 design decision 划分模块。 | Catalog 以 bounded question 而非 field/file 命名；三个 dogfood family 各有一个 shared resolver boundary。 | 支持 outcome-changing bounded family 与 stable resolver interface；不证明 13 个初始 family 全部粒度正确，也不要求 one family = one file/function。 |
| XACML 把 attribute source、policy administration、decision evaluation 与 enforcement 分开，由 PDP 作 decision、PEP 请求并执行。 | `authority.resolver` 与 submit/Gate/reader consumers 的分离，正好修复了三个 consumer-side reinterpretation。 | 有力支持“一个逻辑 decision contract，多 consumer 复用”；“一个”是语义角色，不是 singleton process，也不能制造 mega-resolver。 |
| RFC 8126 把 global registry 的名称/政策与每个 RFC 的具体 registry action 分开。 | Global catalog 只保存 ID/question；change-local record 保存本次 resolver/consumer/verification claim。 | 支持 catalog/local split 的治理形状；current code/spec 仍是行为真相，archive record 不是 current topology registry。 |
| PROV-DM 区分 generation、usage 与 derivation，并明确 usage + generation 对 derivation 只是必要而非充分。 | `established_by`、`consumers`、`overlap: derived` 是不同角色；checker 只能验证声明 coordinate/file 存在。 | 支持角色分离，也直接提醒“有 producer 和 consumer 路径”不等于语义 derivation 已成立；semantic review/test 仍必要。 |
| Bazel 官方 dependency 文档要求 declared graph overapproximate actual graph，同时明确 missing-dependency checking 不可能在所有情况 complete。 | Closure checker 只检查 declared families/coordinates；accepted spec 明确把 consumer completeness 留给 review。 | 支持 checker 的诚实边界：它能对声明闭合，不能自动发现所有未声明 consumer。增加 arbitrary-JS linter 也只能近似，不能命名为 completeness proof。 |
| RFC 3986 规定 fragment 语义依赖 representation/media type；无可解释 representation 时语义 unknown。 | Contract 把 `#fragment` 定义为 human-facing，并只验证 base file；首个 affected record 有 5 个不精确 fragment 值。 | 支持取消“generic exact-fragment blocker”这一原 P0；先用 bare path 或实际 symbol 消除 false precision。RFC 本身不定义 `.mjs#symbol` convention。 |
| Node test runner 只有在真实执行时才以 process exit 表达 failure；in-toto 也区分 expected layout 与实际执行 link metadata。 | Verification plan/closure checker 只声明并检查 assets；本轮真实 `node --test` 得到 200/200 PASS；finalizer 按 accepted spec 不运行 tests。 | 支持 plan-versus-execution 区分；不推出 semantic closure 现在必须新增 receipt。Durable revision-bound evidence 是条件性、独立 verification work。 |
| RFC 9111 的 freshness/validation 需要明确 age/lifetime 或 origin validation。 | Archived closure record 不绑定 current topology freshness，也不声称如此；global catalog 每次由当前 YAML parse。 | 支持“存在不等于新鲜”的一般边界，但本项目正确处理是保持 archive 历史定位，而不是给 closure record 添加伪 current 状态。 |

### 15.2 Sources

以下均为外部一手资料；项目内 accepted specs/source/tests 仍决定当前行为。

1. Edsger W. Dijkstra, [*The Humble Programmer* (EWD 340)](https://www.cs.utexas.edu/~EWD/transcriptions/EWD03xx/EWD340.html), ACM Turing Lecture, 1972, Argument Four（abstraction/semantic level）；Argument Three（testing 的证明边界）。
2. David Lorge Parnas, [*On the Criteria To Be Used in Decomposing Systems into Modules*](https://doi.org/10.1145/361598.361623), *Communications of the ACM* 15(12), 1972, pp. 1053-1058，尤其 pp. 1056-1058 的 information-hiding decomposition 与 conclusion；[可访问作者论文副本](https://www.cs.umd.edu/class/spring2003/cmsc838p/Design/criteria.pdf)。
3. Erik Rissanen（编）, OASIS, [*eXtensible Access Control Markup Language (XACML) Version 3.0*](https://docs.oasis-open.org/xacml/3.0/xacml-3.0-core-spec-os-en.html#_Toc325047089), OASIS Standard, 2013, §3.1 Data-flow model（PAP/PDP/PEP/PIP）。
4. Michelle Cotton, Brian Leiba, Thomas Narten, IETF, [*Guidelines for Writing an IANA Considerations Section in RFCs*](https://www.rfc-editor.org/rfc/rfc8126.html#section-2), RFC 8126 / BCP 26, 2017, §§1.1, 2, 2.2（registry 与每次 registration action）。
5. Luc Moreau, Paolo Missier（编）, W3C, [*PROV-DM: The PROV Data Model*](https://www.w3.org/TR/2013/REC-prov-dm-20130430/#section-entity-activity), W3C Recommendation, 2013, §§2.1.1, 2.1.2、§5.1.8（entity/activity、generation、usage、derivation、invalidation）。
6. Bazel Project, [*Dependencies*](https://bazel.build/concepts/dependencies#actual-and-declared-dependencies), 官方文档，`Actual and declared dependencies`（actual graph 必须是 declared graph 子图；missing-dependency checking 不可能始终 complete）；[*Hermeticity*](https://bazel.build/basics/hermeticity#overview), `Overview`（source identity/input boundary）。
7. Tim Berners-Lee, Roy Fielding, Larry Masinter, IETF, [*Uniform Resource Identifier (URI): Generic Syntax*](https://www.rfc-editor.org/rfc/rfc3986.html#section-3.5), RFC 3986 / STD 66, 2005, §3.5 Fragment。
8. Node.js Project, [*Test runner*](https://nodejs.org/api/test.html#test-runner), 官方 API 文档（真实 test failure 将 process exit code 设为 1；TODO/skip/filter 的边界）。
9. in-toto Project, [*in-toto Specification v1.0*](https://github.com/in-toto/specification/blob/master/in-toto-spec.md#311-supply-chain-layout), 2023, §§3.1.1-3.1.2（layout 规定预期步骤，link metadata 陈述步骤实际执行）。
10. Roy T. Fielding, Mark Nottingham, Julian Reschke, IETF, [*HTTP Caching*](https://www.rfc-editor.org/rfc/rfc9111.html#section-4.2), RFC 9111, 2022, §§4.2-4.3（freshness calculation 与 validation）。

## 16. 2026-08-10 当前状态澄清

第 2 节所述“只有两份归档 record”是本学习记录当时的时间快照，不能再用来描述当前仓库。2026-08-10 复核时共有八份归档 `semantic-closure.yaml`：一份 `affected`（`close-work-unit-semantic-contract-drift`，覆盖 `work-unit.assignment-output-obligation`、`work-unit.source-claim-provenance`、`work-unit.submission-ledger-and-supersession` 三个 family）和七份有具体理由的 `not_applicable` record。因而，真实 affected dogfood 的样本数仍是一份，不应把 record 总数误写成八次 runtime closure 证据。

在原评估后归档的 `tighten-semantic-closure-review-honesty` 已把第 7.2/7.3 节的使用层问题写入 accepted contract 和 apply/archive guidance：`#fragment` 必须是作者能识别的真实 symbol/document anchor，否则使用 bare path；`consumers` 只列 verdict consumer，单纯展示 resolved contract 的 Agent-facing projection 使用 `overlap: derived`。这降低了首个 dogfood 所暴露的 false precision 和角色混用再次发生的风险，但还没有第二份 affected runtime record 来证明该新指导在实际 semantic change 中被正确执行。

因此，结论需要按 mechanism role 区分：catalog 的 `id + bounded_question` 信息对于其唯一声称的“可增长、有界 family vocabulary”是充分且刻意最小的；它不应被要求承担 current resolver/consumer topology 或 semantic-completeness proof。`semantic-closure/v1` 对原始 concern 已形成足够的正常生命周期护栏：每个 change 必须作 applicability 声明，affected record 必须声明 resolver、authority-establishing surface、verdict consumers、overlap 和两个 selected verification assets，Apply plan check 与 archive assets check 都 fail closed。它仍不是自动 closure 证明：applicability 的诚实性、consumer inventory、fragment/role 的语义正确性和测试是否真正覆盖/执行仍由 plan/closeout review 与 native verification 承担；直接绕过 governed lifecycle 的 mutation 也不在 checker 的拦截能力内。

更新后的信心判断是：对 catalog 的声明角色为高；对 v1 作为原始 producer/consumer drift concern 的变更治理机制为中等偏高；对它自动发现所有漏列 consumer 或证明全 Harness 已闭合为低，且这不是 v1 的承诺。其余十个尚未进入 affected record 的 initial family 仍须在首次真实使用时通过“一 resolver / 一张 coherent truth table”粒度审查，而不是预先扩大 catalog 或 checker。
