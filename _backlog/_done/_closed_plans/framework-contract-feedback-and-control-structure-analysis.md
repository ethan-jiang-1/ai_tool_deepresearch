---
title: Framework Contract, Feedback, and Control-Shape Analysis
status: closed__analysis_consumed_by_cls_042__bug175_policy_remains_active
created: 2026-07-29
closed: 2026-07-31
closed_as: CLS-043
closure_basis: framework_contract_remediation_openspec_sequence_cls_042__c1_to_c5_archived__bug170_checkpoint_alignment_archived
successor: framework-contract-remediation-openspec-sequence__CLS-042
source_bugs:
  - BUG-143
  - BUG-146
  - BUG-148
  - BUG-150
  - BUG-151
  - BUG-152
  - BUG-153
  - BUG-154
  - BUG-155
  - BUG-156
  - BUG-157
  - BUG-158
  - BUG-159
  - BUG-160
  - BUG-162
  - BUG-170
  - BUG-171
  - BUG-172
  - BUG-173
  - BUG-174
  - BUG-175
  - BUG-176
  - BUG-177
  - BUG-178
  - BUG-179
  - BUG-180
  - BUG-181
  - BUG-182
  - BUG-183
  - BUG-184
  - BUG-185
  - BUG-186
---

# Framework Contract, Feedback, and Control-Shape Analysis

> **关闭记录（2026-07-31，CLS-043）：** 本文的系统性诊断已由后继
> `framework-contract-remediation-openspec-sequence`（CLS-042）拆解并完成 C1--C5、独立的
> lifecycle feedback-loop，以及 BUG-170 的 actor/Gate checkpoint alignment。其覆盖的 31 张
> 确定性/合同修复卡已归入 `_fixed_bugs/`。BUG-175 仍在活跃 bug 中等待用户质量政策决定；它是
> 独立的 policy boundary，不是本 analysis 文档尚未完成的执行项。C5 available claim 与真实
> Actor completion 继续保持 `NOT_RUN`，未被归档改写为成功。

## 1. 这份分析的结论

这批票据不是三十二个彼此无关的边角缺陷，也不能统一归因为“模型不够好”或“还差几条
prompt”。它们暴露的是同一个累积过程：系统为每一次真实事故增加了一个局部状态、检查器、
投影、模板、CLI 约束或恢复设想，但这些新增物没有先成为一个可独立、精确推理的语义层。
于是同一事实被多个位置以略有不同的方式解释，Agent 又拿不到 Engine 已经掌握的静态契约
谱系，只能从失败文本、长 Markdown 和源码中猜测。

结果同时出现了两种完全不同的失败：

1. Engine 把本来不同的对象当成同一种对象，或在写入后破坏了自己的不变量。这些是确定性
   缺陷，Agent 再聪明、再听提示也不能把错误 parser、错误 writer、错误时间边界变正确。
2. Agent 以概率写错 Markdown、JSON、文件名或操作顺序。这个是 agentic 系统的正常性质，
   不应该被假装成传统程序的零错误前提；但它只有在 Engine 能给出直接事实、合法写入面和
   同一 checkpoint 的重跑方向时，才是一个可被 Agent 有效吸收的错误。

后者不是“把报错写得好看一点”的体验问题。Engine 已经静态知道 schema、文档类型、
gate 依赖、当前 lifecycle 允许的 writer 和 checkpoint；Agent 只看得到自己写出的
Markdown 与一段拒绝文本。让 Agent 反向阅读源码猜静态契约，是把信息拥有方的责任转嫁给
概率性执行者。

与此同时，少数票据不是上述两类中的任何一种：它们要求先决定恢复、重做、质量门槛或宿主
能力究竟应具有什么语义。对这些问题，仓促添加一个 retry、sync、override 或宽松 parser，
会把未决定的语义伪装成实现细节，继续制造下一批 bug。

本文件只诊断系统形状和待决边界，不提出 OpenSpec change、具体命令、字段、状态转移或
实现方案。

## 2. 判断框架：错误产生与错误反馈是两件事

项目 Charter 的分工仍然是正确的：Agent 做研究和内容判断，Markdown 是其控制面，Engine
裁决确定性事实。问题在于，当前一些 Engine surface 没有完成“裁决后把可行动的事实送回
控制面”的后半段。

对一个实际错误，先要问的不是“怎么让它通过”，而是下面五个问题：

| 问题 | 若答案为是 | 若答案为否 |
|---|---|---|
| 失败是否只取决于可重现的 Engine 输入和代码？ | 它是 Engine/契约问题，必须由确定性路径负责。 | 继续判断 Agent、宿主或外部事实。 |
| 当前检查的对象语义是否正确？ | 可把它当成真实 checkpoint。 | 不可要求 Agent 为错误 evaluator 污染正确产物。 |
| Engine 是否已知最早的直接失败事实？ | 它应返回该事实，而非一串派生症状。 | 需要补观察或承认未知，不能编造诊断。 |
| 当前 Agent 是否有合法且已授权的写入/恢复路径？ | 反馈应说明写到哪里、随后重跑什么。 | 反馈必须诚实地给出 owner、terminal 或 missing-contract 边界。 |
| 修复是否需要新的语义、风险决定或外部能力？ | 这是人/host/新的 contract 决策，不是普通 Agent repair。 | Agent 应执行已知的机械动作，而不是把流水线交给用户。 |

因此，概率性 Markdown 产物的正确闭环不是“提高一次生成的命中率”，而是：

```text
Agent 生成候选产物
        -> Engine 以正确的对象契约检查直接事实
        -> 返回最早 root、合法 surface、同一 checkpoint
        -> Agent 理解并修正候选产物
        -> 重新运行同一个 Engine checkpoint
```

这不要求 Engine 代替 Agent 写研究内容，也不允许 Agent 手工伪造 ledger、receipt、hash 或
状态。它只是让各方做自己已经有能力做的事。若第一步中的“正确对象契约”不存在，或者第四步
没有 legal path，上图就不能成立；此时不应把 failure 文本优化误当成修复。

## 3. 三条演进指导给出的诊断顺序

这批问题恰好证明三个 evolution guide 必须按其规定顺序使用，而不能把其中任一条单独当成
“加更多控制”的理由。

### 3.1 Abstraction as Semantic Precision：缺少的不是名词，而是可精确推理的对象

当前代码中 `reference`、`return map`、`projection`、`submitted`、`current`、`repair` 等词
经常同时承载多种问题：文件格式、证据 authority、导航视图、生命周期 ownership、历史
snapshot、以及 Gate 的 blocking 资格。一个路径或一个宽泛名词被当成对象类型，导致 consumer
无法区分它正在读的是哪一种东西。

最明显的例子是 `return-map.mjs`：Seed Topic 的 entry-local projection、rich reference
以及 Wave1 的 evidence/question artifact 并没有同一个 producer contract，却被同一个
return-map grammar 扫描。BUG-146 与 BUG-162 不是两个“字段漏填”事件，而是一个语义分类
缺失：目录中是 Markdown，不等于它是 return-map 文档。

一个值得存在的抽象至少应让读者能精确回答一个问题。例如一个文档要被某个 evaluator
消费时，读者应能判断：它的文档角色是什么、谁写它、哪个 authority 支撑它、它是当前
projection 还是提交时 snapshot、哪个 consumer 能读它、失败后谁能合法改变它。当前这些
区别分散在模板、Zod union、路径前缀、gate helper、回写器和 phase prose 中；没有在调用
处形成一个清楚的语义对象。

### 3.2 Simple Reliable Control：同一事实有太多互相独立的真相路径

`inspect-wave*`、Gate、`check-reentry`、template validator、topic-state writer 和 work-unit
transaction 都各自保存了部分相近逻辑。它们并非都是必要的交叉验证；有的在判断同一事实时
采用了不同分类或不同时间点：

```text
producer contract / submitted backing
        |                         |
normal Wave evaluator       reentry evaluator
        |                         |
phase-owned projection      every reference must be ledger output

current source.yaml -----------------> historical candidate projection
```

前一行产生 BUG-178，后一行产生 BUG-151。BUG-146/162 则是 parser 在多个路径中把“存在于某
目录”误作“属于同一 grammar”。这是 one truth path 失效，而不是检查数量不够。

一旦 parent fact 已经错误，当前控制面还会继续产生一墙派生症状：一次 projection 拼接会把
blocker 从 24 放大到 92；一个错误的 return-map scope 在 Wave1 closeout 后仍给出 78 个
blocker；一个 reference authority 分类差异能在 reentry 中放大为 55 条 ledger 误报。这样的
输出增加的不是安全性，而是 Agent 从中找根因的搜索空间。

### 3.3 Helper-Oriented Agent：Engine 保留地图，Agent 被要求凭猜测行动

`operate-topic-state` 的 public CLI 只有 `inspect | apply | recover` 三个词，而 `apply` 内部
靠 `context` 分发多个互不相同的 Zod packet；`operate-work-unit claim` 还要求 outcome/source
相关的 reason-code tuple。Engine 已有这些静态知识，但 `--help`、schema discovery、完整
validation lineage 与一致的 invocation feedback 不存在或不充分。于是 BUG-153、158、160、171
不是“Agent 没认真读”的证明，而是 public interface 没有把自己的 interface 交给主要调用者。

Helper 也不能用来掩盖不存在的 capability。BUG-143 中 Node `fetch`/`curl` 只说明 fetch
能力，不能凭空成为合格 search surface；BUG-179--186 中 hand edit 后的哈希/ledger 失败也
不能用“用户已经同意”或“Agent 想修”创造提交后的 mutation authority。正确的 helper 姿态
是让 Agent 在已有合法路径内执行，并在路径不存在时明确说明这个事实。

## 4. 系统为何会持续长出新 bug

### 4.1 以路径、文件扩展名和 context 字符串代替文档/状态的语义类型

当前系统常用 `reference/*.md`、`00-shared-*`、`wave1`、`context` 等位置或字符串来推断
对象角色。这样的推断在对象数量少时似乎省事，但一旦同一目录同时存在 delegated evidence、
phase-owned navigation projection、shared rich reference、index 和普通 artifact，它就无法
表达 consumer 的差异。

可观察的代码事实包括：

- Wave0 inspect 对 `00-shared-*` reference 调用 `inspectReferenceReturnMaps()`；这个 helper
  对相应 reference Markdown 一律运行 return-map validation。
- Wave1 inspect 对 `evidence-summary.md`、`question-list.md` 调用 return-map validation，
  又对每个 topic prefix 的 reference 做同类扫描。
- `canonical-topic-state` 将 topic lifecycle、Seed rendering、projection parse/render、
  transaction recovery 与 lifecycle authorization 集中在约 1,497 行的 module；public `apply`
  再以一个 context/action union 选择协议。

这不是“大文件天然错误”。问题是 module 的 interface 没有封装一个稳定的单一问题，调用者
仍必须知道文档类型、context、slot、阶段、文件命名、前置实体是否已经存在等内部区别；这是
一个实现很重、但对 Agent 仍然很浅的 interface。

### 4.2 writer 的成功定义比 reader 的成功定义弱

BUG-152 是最干净的反例。projection upsert 用 raw Markdown block 边界替换已有条目，返回
`committed` 后却把相邻 entry 粘在一行。writer 的 postcondition 只确认当前 packet 中的 entry
存在，而不确认整个 slot 仍可由同一 reader 独立解析。

这揭示了一个更普遍的结构风险：生产者、writer、reader、inspect 和 gate 各自有局部的“成功”，
却没有一个恰当的 shared semantic postcondition。BUG-154 的 template body 重复、BUG-157 的
topic registry 更新后 style 参数过期、BUG-176 的 projection ref 在 writer 处就要求当前文件
存在，也都显示写入时的对象范围与消费时的对象范围没有被明确区分。

对于概率性 Agent 编辑，writer/reader 不一致尤其危险：Agent 可能已根据反馈提交了完全合法的
packet，Engine 却在成功响应后把文档变得不可解析。这种失败不能归类为 Agent generation error。

### 4.3 时间与 provenance 没有被当作对象语义的一部分

Wave0 candidate projection 从当前 live `source.yaml` 的数组长度重新计算每个历史 submitted
work unit 的 candidate ordinal；代码本身把该 ordinal 说明为“current projection coordinate，
不是 result_hash 的永久 snapshot”。这正是 BUG-151 中 supplementary append 改写历史
projection 含义的原因。

同一种时间混淆也出现在恢复和 ledger 讨论中。submitted result 的 hash、ledger row、index
record、queue terminal history、transaction record 都有不同的时间含义，但 incident 发生后很
容易把它们都当成“同一份可以同步的当前数据”。这会诱导手工修改 Engine authority，随后合理地
触发 BUG-179 所见 hash cascade。时间是一个需要回答的语义问题：某一检查到底关心提交当时的
事实、当前可消费的投影，还是一次显式新 attempt 的事实？没有先回答它，任何“sync”都会变成
悄悄改写历史。

### 4.4 检查器之间的分类漂移比缺少检查更危险

normal Wave Gate 已知 Wave1 topic reference 可以是 `phase_owned_projection`，并验证其 submitted
source/cache/body backing；`check-reentry` 却另行遍历 `reference/*.md`，只问它是否直接出现在
ledger declarations。BUG-178 因而不是 reference 真的失去 provenance，而是 recovery surface
重新创造了一套较旧、较窄的 authority 解释。

这类错位说明“多重防御”缺少分类共用。独立 audit 可以存在，但它若验证同一 deterministic
fact，就必须复用同一 authority interpretation 或清楚地声明它在验证一个不同问题。否则它的
blocking 结论会和主 Gate 相互矛盾，Agent 只能选择相信哪一个。

### 4.5 Agent-facing interface 不是一等契约

BUG-150、153、155、158、160、171 展示了同一种 interface 断裂：`--help` 被当 bundle path，
CLI 不提供 usage/schema，phase prose 引用不存在的 CLI，或 validation 把复杂 union 收缩成
没有足够分辨率的 `Invalid input`。BUG-159 展示了隐藏的状态顺序；BUG-172、173、183 展示了
格式与 cache mapping 事实被埋在长任务文本里；BUG-177 只给结论、不说明为何得到这个结论。

这些不要求 Engine 替 Agent 做内容工作。它们要求 Engine 和 Markdown 把静态、可确定的
contract lineage 在决定点交给 Agent。当前 Agent 的替代路径是阅读 `DPT_FRAMEWORK` 源码；这
既扩大上下文，也使行为依赖实现细节而不是 public interface。

### 4.6 信息加载把参考资料和当前动作混成同一种上下文

`enter-phase` 将 dependency closure 中每个 Markdown 的全文拼到 stdout，最后才写 continuation
cue。已测得 closure 大小约为：HITL1 36,569 bytes / 473 lines，Wave0 111,358 bytes / 1,409
lines，Wave1 120,745 bytes / 1,504 lines；delegated source-intake guidance closure 约 64,164
bytes / 777 lines。BUG-156 记录了 cue 被持久化输出截断的直接结果。

BUG-170 的 sub-agent 未完成是真实观测，但“长任务 Markdown 就是死锁根因”尚未得到因果证明。
模型/host 是否继续、是否调用工具、是否耗尽上下文，需要 real Agent observation 才能断言。
不过，当前 information shape 已经是确定的风险：必须立即执行的动作、产物 checklist、legal
checkpoint 与背景契约混在同一个大段文本中，说明系统没有把 action surface 和 reference
surface 区分开。这会增加概率性错误，却不能单独证明某一次停止的充分原因。

### 4.7 work-unit 的并发 owner、submitted finality 与恢复语义尚未收敛

`work-unit-submit.mjs` 约 2,103 行，在一次 submit 中协调 ledger、index、queue、receipt、
status、trace、rollback 与 cache normalization；lock acquisition 是裸 `mkdirSync(lockPath)`。这
解释了 BUG-148 为什么会泄露原始 `EEXIST`，也表明 transaction 的 public operability 不应由
调用者从异常字符串推断。

更深的问题是 BUG-174：Phase Agent 为避免 delegate 超时而写入并提交，同一个 delegate 随后
继续写同一 result path。这里缺的不是“多一个等待提示”，而是同一 work item 在何时由谁拥有
可写 attempt、submitted 之后“改正”“补充”“替代”分别意味着什么的语义。没有这个答案，
BUG-180/181 所提出的 replace/reactivate 也不能被直接采纳；它们会改变 receipt、历史证据、
queue identity 和 Gate 对 submitted 的含义。

BUG-182 的残留 transaction、BUG-185 的双重 hash 存储、BUG-186 的 dry-submit 期待则应在
这个语义边界下审视。它们可能揭示 recovery/cleanup 缺口，但不能推出“所有 future Gate
结果都应在单个 work-unit submit 前预测”。work-unit submission integrity 与 phase-level
content/Gate 结论是不同 tier；把两者合并会重新制造一条派生 truth path。

### 4.8 host capability 与 Agent ability 不能从工具名称或一次结果反推

BUG-143 的 direct finding 是 HITL1 把 Claude 的工具名称当作隐含 capability discovery，而
不是一个真正的 search/fetch semantic contract。它也同时证明不能过度泛化：Node `fetch` 或
`curl` 可以满足已获得 URL 的 page fetch，却不能仅凭存在就证明具有 search capability。

同理，BUG-170 不能因为一次 Agent 没有结束就变成 DPT 的 deterministic liveness failure。
框架能够拥有的是：给已接入能力提供正确契约、保存真实 observation、在 capability 缺失时
honest fail-closed；它不能靠 Markdown 或状态机承诺 host 会启动下一 turn、外部 provider 会
允许请求，或子 Agent 一定完成。

## 5. 票据分类账

下表给出每张卡的主要性质，不否认一张卡可有次要问题。分类的作用是防止下一轮把所有事项都
交给同一种“修复”手段。

| 票据 | 主要分类 | 这张票真正暴露的结构信号 | 当前不应误做的事 |
|---|---|---|---|
| BUG-143 | host capability / integration boundary | 工具名称被误作能力；fetch 与 search 是不同语义 | 以 `curl`、launcher preflight 或模型记忆伪造 research access |
| BUG-146 | 确定性 evaluator scope defect | rich shared reference 被当作 Seed return-map | 要 Agent 向正确 reference 填不属于它的字段 |
| BUG-148 | 确定性并发 operability defect | lock contention 从 public interface 泄露为原始文件系统异常 | 把并发失败归为 Agent 不会排队 |
| BUG-150 | 确定性 CLI invocation defect | `--help` 被解析成 bundle 路径 | 用文档暗记来替代基本 invocation contract |
| BUG-151 | 确定性时间/provenance defect | current live source array 重解释历史 submitted projection | 把补充工作伪装成原 attempt 的历史内容 |
| BUG-152 | 确定性 writer serialization defect | `committed` 后相邻 projection entry 失去可解析性 | 让 Agent 通过补字段掩盖 writer 造成的损坏 |
| BUG-153 | Agent feedback / schema lineage defect | union validation 无足够 field/contract 导航 | 要 Agent 去读实现源码才能修合法 packet |
| BUG-154 | template-edit geometry defect | 可编辑 body 与 appendix skeleton 重叠，留下 ghost content | 只靠 Agent 小心编辑而不承认模板语义不清 |
| BUG-155 | contract delivery defect | phase Markdown 指向不存在的 executable surface | 把手写绕过说成正常流程 |
| BUG-156 | information-shape defect | 当前动作 cue 被完整依赖闭包淹没 | 从一次截断推断 host/model 一定会停止 |
| BUG-157 | hidden temporal precondition | topic 变更与 derived style 的 freshness 依赖单个 follow-up 字符串 | 把易漏的提醒当作 durable dependency |
| BUG-158 | public interface / semantic collapse | 一个 `apply` 命令承载多个不可发现协议 | 继续用更多 context 字符串掩盖协议差异 |
| BUG-159 | handoff feedback/order defect | status window 是 Gate 前置条件，却只以过场动作呈现 | 将所有 phase handoff 强行合并而不先判断各自 authority |
| BUG-160 | CLI discoverability defect | primary Agent caller 无 usage/option/operation surface | 把 trial-and-error 当成正常 Agent workflow |
| BUG-162 | 确定性 evaluator scope defect | Wave1 artifact 被错误地按 return-map grammar 检查 | 给 evidence/question artifact 注入 synthetic projection 字段 |
| BUG-170 | 外部 actor observation，因果未证实 | sub-agent 未完成；信息过载是风险，不是已证实的唯一根因 | 用 fixture 或缩短文档声称已证明 actor liveness |
| BUG-171 | Agent feedback / tuple discoverability defect | legal actor reason tuple 藏在低层输出 | 把合法 enum 猜错归因给 Agent 不理解任务 |
| BUG-172 | document grammar/presentation policy mismatch | template cognition、frontmatter convention 与 parser 规则未对齐 | 未决定语义前，既默认全部放宽也默认责怪 Agent |
| BUG-173 | task information-shape defect | cache leaf contract 存在但不在动作入口 | 再加一段长 prose，期待 Agent 自行找到它 |
| BUG-174 | work-unit ownership/finality question | Phase Agent 与 delegate 可并发覆盖一个 attempt | 在未定义 correction semantics 前开放任意 submitted replace |
| BUG-175 | quality policy question | count floor 是否是必要 authority，还是理想展示/coverage proxy | 因为操作痛苦就直接把 Gate 放宽或填充伪来源 |
| BUG-176 | writer/check sequencing question | projection ref 在写入时与后续 reference validation 耦合 | 不分清 forward reference 是否合法就删去 integrity check |
| BUG-177 | diagnostic explanation defect | recommendation 缺少决定它的事实与因果路径 | 因不同输出就断言算法一定错误 |
| BUG-178 | 确定性 duplicate evaluator defect | reentry 与 Wave Gate 对同一 reference authority 分类不同 | 向 immutable delegated ledger 添加 synthetic row |
| BUG-179 | authority-integrity response；触发来自手工修改 | hash cascade 正在正确拒绝被篡改的 Engine-owned row | 把重新计算 hash 当作普通 Agent repair |
| BUG-180 | submitted correction/rework semantics question | 已提交 attempt 损坏后没有已定义合法路径 | 从“当前无路径”推出可直接改 ledger/receipt |
| BUG-181 | queue reactivation semantics question | terminal queue 与新 attempt 的 identity/trace 关系未定义 | 把 terminal history 当可随时回收的普通队列项 |
| BUG-182 | transaction recovery/cleanup question | failed submit 的 transaction artifact 与后续 Gate 的关系不清 | 手删 transaction 后把得到的状态当可信 closure |
| BUG-183 | Agent feedback / mapping visibility defect | reference output 与 cache trail binding 是隐含静态事实 | 靠失败后逐项手工补齐来维持长期流程 |
| BUG-184 | coverage policy + feedback batching question | 所有 candidate 是否都需要 entry 是语义决策；遗漏信息又被逐条噪声化 | 因提示太多就忽略 provenance/coverage 问题 |
| BUG-185 | duplicated authority representation question | ledger/index 都持有 hash，owner 与同步方向不清 | 假定任一文件可无审计地覆盖另一文件 |
| BUG-186 | checkpoint tier/scope question | submit-level preflight 与 full phase Gate 被混为一个期待 | 把未来 Gate 的所有内容判定塞进 submit transaction |

## 6. 需要特别避免的错误归因

### 6.1 不要用“LLM 有概率”掩盖确定性错位

BUG-146、148、150、151、152、155、162、178 的关键事实不依赖模型选型。换一个强模型只能
让它更可能找到 workaround，不能让错误 parser 不再扫描、错误 writer 不再拼接、live array
不再重写历史坐标、或者 reentry 自动采用主 Gate 的 authority 分类。让模型适应这些错误，反而
会把错误 contract 固化为“熟练用户知识”。

### 6.2 不要用“Engine 必须严格”掩盖反馈责任

BUG-153、158、160、171、173、177、183 中的根因并不要求降低 schema、receipt 或 provenance
严格性。严格检查完全可以且应当告诉 Agent：实际值是什么、它违反了哪个直接 contract、是否有
合法 writer、修完后跑哪个同一 checkpoint。否则 `repair_kind: agent_action` 只是一个没有信息
的标签。

### 6.3 不要把手工 authority mutation 产生的级联，当成要放宽 integrity 的证据

BUG-179、180、181、182、185、186 的共同背景是已提交数据、ledger、index、queue 或 transaction
被直接删除、修改或在错误状态下恢复。hash cascade 与 fail-closed 本身主要是在保护正确性，
不能因为它造成痛苦就改成“Agent 可以同步一切”。真正尚未回答的是：当一个 accepted attempt
确实损坏时，合法的 correction/rework 是否需要存在、它会新建还是改变哪一种 authority、以及
它如何留下审计痕迹。这个问题比“给一个 sync 命令”窄得多，也更重要。

### 6.4 不要把 context overload 误作已证实的 actor liveness 原因

长 Markdown、被埋的 checklist 和截断输出是当前可测的 control-surface 缺陷。BUG-170 的
sub-agent stalled 也是事实；但它还可能受 host scheduler、工具 permission、模型策略、外部
网络或 deadline 影响。下一轮需要把 deterministic input-shape 改善与真实 actor observation
分开验证，不能以 mock 或静态 task 文本声称“Agent 已不会卡住”。

## 7. 在讨论解法之前必须先回答的设计问题

这些不是 implementation checklist，而是防止再次以补丁替代设计的决策门。每个未来 change
都应先限定自己回答其中哪一个问题，不能跨越后直接开始写 command。

1. **Artifact taxonomy**：哪些 Markdown 是 rich reference、Seed projection entry、Wave artifact、
   phase-owned navigation projection、index 或 task instruction？每一类由谁写、谁读、哪一种
   grammar 可阻断？路径前缀是否只是定位，还是类型？
2. **Temporal authority**：某个 submitted result、live source file、candidate coordinate、
   projection 与 supplement 分别代表哪个时间点的事实？什么可以派生，什么必须保持为历史？
3. **One truth path**：normal Gate、inspect、reentry、preflight 和 writer postcondition 中，哪些
   在判断同一事实？它们应共享哪一个 evaluator/authority classification，哪些确实是在判断另一个
   问题？
4. **Agent feedback contract**：对于每一种可修复 rejection，Engine 已知的最早 direct fact、
   schema/owner、合法 writable surface、same-check rerun 是什么？对不可修复 rejection，怎样
   诚实地表明 terminal 或 missing-contract，而不制造虚假 repair？
5. **Work-unit finality and correction**：submitted 到底冻结哪些对象？当 Phase Agent、delegate、
   queue 与 ledger 发生冲突时，谁拥有当前 attempt，什么才是新 attempt、补充、替代、重做或
   终止？
6. **Quality policy versus authority**：count floor、full candidate disposition、frontmatter grammar
   和 forward reference 分别保护何种不可替代的证据/结构事实？哪些只是当前内容表达的偏好？
7. **Host capability boundary**：search、fetch、sub-agent execution、permission、turn liveness 分别
   需要什么真实 observation 才能声称 available？DPT 能保存和检查什么，host 又必须自己拥有
   什么？

## 8. 下一轮设计应采用的证据纪律

这份分类不是把所有问题推迟，而是要求下一轮不要再次在错误层面“修好”。具体而言：

- 对 parser、writer、state transition、lock、hash、authority classification 这类确定性问题，
  用真实 Engine 输入/输出和 focused negative regression 证明；不能用“Agent 这次写对了”代替。
- 对 Agent 产物和 task information shape，观察真实 Agent 在真实 bundle 中是否能读到反馈并完成
  同一合法 checkpoint；静态 fixture 只能证明 Engine contract，不能证明 agent behavior。
- 对 host search/fetch、sub-agent completion 和 liveness，记录 host、permission、provider、
  action 与真实 observation；不要把配置检查、文本总结或模型自述升级为 runtime authority。
- 对历史 authority 被直接修改后的 incident，保留它作为恢复语义的证据，同时与“当前
  fail-closed 是否正确”分开判断；不能把临时手工数据修理当成正常路径的验证。

## 9. 收束判断

系统的核心问题不是“不够严格”，也不是“模型会出错”本身。它是在若干层同时失去了精确边界：

```text
不同 artifact 被同一 grammar 处理
不同时间的事实被同一 projection 处理
同一 authority 被多套 evaluator 处理
不同 protocol 被同一 opaque CLI 处理
不同责任被同一 Agent/Phase/worker 写入面处理
```

这就是为什么每跑一次真实框架都会长出看似新颖、实则相关的 bug：一个局部补丁通常只让一个
consumer 记住了新区别，其他 consumer、writer、reentry audit、task card 和 Agent feedback
surface 仍在使用旧的粗粒度概念。

下一步不应从“先修哪张卡”开始，而应从上述七个设计问题中选定一个有界语义对象，先证明它让
reader 能精确判断什么；再确定最短正确 control loop；最后才分配 Engine、Agent、用户与 host
各自的合法动作。这样才能让概率性 Agent 错误回到可反馈、可重试的正常范围，同时把真正的
确定性 contract bug 留给 Engine 彻底负责。
