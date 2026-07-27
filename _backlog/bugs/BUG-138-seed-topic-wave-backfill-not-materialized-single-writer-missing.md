---
bug_id: BUG-138
title: "Wave completion does not materialize correct seed-topic backfill and has no single visible writer"
severity: P2
discovered: 2026-07-27
bundle: dpt_rb_openspec-influence-landscape
phases: wave0, wave1, wave2
nodes: phases/phase-wave0.md, phases/phase-wave1.md, phases/phase-wave2.md
status: active
---

# BUG-138: Wave 回填没有形成正确的 seed-topic projection

## 结论

本次运行的 `seed_topics/` 没有把各 Wave 的研究结果回填成可导航的
return-map。问题不只是 Agent 少写了内容，而是当前框架没有一个真正的、可见的、
唯一的回填 writer：骨架由一个地方生成，字段契约由另一个 Markdown 说明，实际
内容由 Phase Agent 手工从不同 authority 拼接，队列 receipt 和 Wave completion
又没有把“回填正确”作为不可降级的完成条件。

## 本 bundle 的直接证据

Canonical topic registry 中的 8 个 topic 都存在下列问题：

| Projection | 实际内容 |
| --- | --- |
| Wave0 `## 本轮新增证据` | 仍是 `__BACKFILL_WAVE0_EVIDENCE__`，8/8 未消费 |
| Wave1 `## 本轮新增机制理解` | 只有 `Wave1 submitted. See artifacts/wave1/...`，没有五字段 return-map |
| Wave1 `## 本轮新增趋势与难点` | 只有通用摘要，没有五字段 return-map |
| Wave1 `## 待验证问题` | 只有指向 `{topic}` 的通用 prose，没有当前轮次 entries |
| Wave2 `## 当前判断` | 只有 `Wave2 submitted...`，没有 W2F/五字段 projection |

另有一个 `09_sdd-friction-reduction-tools.md` 不在本次 8-topic registry 中，仍
保留 Wave0、Wave1、Wave2 和 pending 的全部 placeholder token；它还暴露出
历史/当前 bundle 边界没有被回填流程清楚处理。

本次运行的 trace 却已经记录：

```text
wave0_completion: total_sources = 96
wave1_completion: topic_count = 8
wave2_completion: finding_count = 15
```

因此 completion evidence 与 seed projection truth 发生了分裂：研究阶段看起来
完成，用户从 seed topic 却无法看到本轮发现、机制理解、趋势难点、当前判断或待验证
问题。

## 可复现检查

运行：

```bash
node DPT_FRAMEWORK/cli/inspect-wave1-output.mjs \\
  --bundle dpt_rb_openspec-influence-landscape
```

当前 inspect 对 8 个 canonical seed topic 报告
`return_map_missing_fields`，缺失：

```text
evidence_meaning, relationship, refs, status, next_hop
```

同一 bundle 的 Wave0 inspect 仍可观察到 `__BACKFILL_WAVE0_EVIDENCE__` 残留；其
结果把 return-map classification 显示为 `diagnostic-only`，没有把这一结构缺口
作为 Wave0 的 blocking root。Wave0 最终还通过了只降级
`shared_ref_count_floor` 的路径。Wave1 最终也以只降级
`per_topic_ref_md_count_floor` 的路径通过过 gate，而没有建立“seed projection
已经正确物化”的 completion invariant。

## 历史契约对照

历史 BUG-093 已经指出：

- 研究轮次追加区定义分散；
- section 名称不携带明确 Wave 语义；
- token 机制与实际 Agent 写法容易脱节；
- 没有一个人和 Agent 都能直接使用的完整 template。

归档 change `2026-07-20-centralize-seed-topic-authoring-contracts` 做了重要的
guidance 集中化，当前可见的 shared contract 是：

```text
DPT_FRAMEWORK/workflows/nodes/shared/shared-seed-topic-authoring.md
DPT_FRAMEWORK/workflows/nodes/shared/shared-return-map-authoring.md
```

但该 change 的明确 non-goal 是不创建 template engine、自动 repair 或历史 bundle
迁移。它解决了“应该怎么写”的文档分散问题，没有解决“谁以什么结构化输入真正写入、
何时确认写对”的执行闭环。本 bundle 是该缺口的 fresh reproduction。

## 当前责任分裂

| Surface | 当前职责 | 缺口 |
| --- | --- | --- |
| `canonical-topic-state.mjs` `renderNewSeedBody()` | 生成追加区、heading 和 token | 只生成 placeholder，不生成回填 |
| `shared-seed-topic-authoring.md` | 展示骨架、section owner、token | guidance-only，不能承接一次实际回填 |
| `shared-return-map-authoring.md` | 定义五字段、refs 和 Wave owner | guidance-only，Agent 仍需手工拼 projection |
| `phase-wave*.md` | 告诉 Phase Agent 从 submitted output/ledger/index 回填 | 没有单一结构化输入/写入入口 |
| `return-map.mjs` | 解析和验证 return-map | 没有 materializer/writer |
| queue completion receipt | 证明 `seed_topics/<slug>.md` 被写入 | 不证明 token 已消费、entry 绑定正确或内容可导航 |
| Wave Gate | 检查各自 artifacts/provenance，部分 inspect 检查 projection | 回填缺失可被 gate 的降级/历史路径绕过，completion trace 仍可产生 |

## 影响

1. 研究证据、Wave artifact 和 seed topic 之间失去用户可读的导航链；后续 Agent
     必须重新扫描 artifact、cache 和 ledger，容易遗漏或重复研究。
2. `Wave1 submitted` / `Wave2 submitted` 这类 prose 会制造“已经回填”的假象，
   但不是可校验的 evidence projection。
3. 人无法判断回填内容来自哪个脚本、哪个模板或哪一份 authority；每次修复都可能
   产生新的格式漂移。
4. Gate/trace 的完成事实与 seed projection 的实际事实不一致，导致质量问题被
   延迟到最终阅读或下一轮才暴露。
5. 该问题覆盖 Wave0、Wave1、Wave2，不是某一个 topic 的内容质量问题。

## 根因假设

1. 回填被设计成 Agent 手工执行的 prose edit，而不是“Agent 提交语义字段 + Engine
   用唯一 renderer 写 projection”的边界。
2. `seed_topic_materialize` 的 receipt 只绑定文件存在/写入，不绑定本轮 projection
   的 section、entry identity、source authority 和 concrete refs。
3. Wave0/1/2 的 inspect 接入方式和降级策略不完全一致；当前 Wave0 的 residual
   token 没有形成 blocking root，Wave completion 也没有统一的 seed projection
   readiness invariant。
4. v0.36 集中的是 guidance，但 Phase Agent 仍需跨 shared contract、phase prose、
   submitted result、reference/index、ledger/index 多处手工推理，context 中很容易
   把“submitted”误写成“backfilled”。

## 目标模型：Seed Topic 是带槽位 schema 的研究导航文档

### 现有“两份 shared contract”为什么仍然不对

历史 BUG-093 的收口确实解决了 renderer 与 guidance 的一部分漂移，却为了减少每个
phase 的加载上下文，把一个跨全生命周期的 Seed Topic Document 拆成了：

- `shared-seed-topic-authoring.md`：initial skeleton / direction；仅 seed-topics 和
  rerun phase 直接加载；
- `shared-return-map-authoring.md`：entry grammar / Wave ownership；仅 seed-topics 与
  Wave0/1/2 直接加载；
- `canonical-topic-state.mjs`：真正生成文件的 renderer。

这在“每份 guidance 只服务一个 focused concern”的局部原则下有道理，却在人的操作面
失败了：真正执行回填的 Wave Agent 看不到完整 seed template；人也无法说“seed topic
的规范就是这个文件”。反馈只能在两个 Markdown、phase prose 和 JS 之间猜 owner。
**这不是使用者没有找对，而是当前 source-of-reference 不可发现。**

因此，BUG-138 应明确推翻“对人保留两份完整 seed authoring contract”的选择：Seed
Topic 是一个跨 setup、rerun、Wave0、Wave1、Wave2 持续演进的 document，应该有一份
单文件的、人/Agent 可见的 Template。保留的不是第二份 template，而是把当前两份
内容合并、替换为一个真正的单一入口。

| 方案 | 优点 | 致命问题 / 结论 |
| --- | --- | --- |
| 维持两份 shared 文档 | 单个 phase 少读一点无关 guidance | 人和 Wave Agent 无法从一个地方理解/反馈整个 document；拒绝 |
| 新增一个 index，只链接两份旧文档 | 文件名好找 | 操作时仍需跳转，entry/slot ownership 仍可能漂移；拒绝 |
| **一个完整 template + 一个唯一 writer** | 一个可读入口、一套 slot、一个反馈地图；所有 phase 对同一对象操作 | 多加载少量稳定 context；这是可接受成本，**推荐** |

### 建议的单文件 Template

当前 OpenSpec change 在 apply 时应创建（或把现有 seed authoring contract 迁移/改名为）明确的：

```text
DPT_FRAMEWORK/workflows/nodes/shared/shared-seed-topic-template.md
```

它应成为 **唯一完整的人/Agent-facing Seed Topic Template**，内容必须一次性包含：

1. 完整的 seed document skeleton（frontmatter ownership、initial body、appendix）；
2. Appendix Slot Map（heading、token、Wave owner、first-write/merge rule）；
3. canonical five-field Projection Entry 示例和 concrete-first refs 规则；
4. Projection Packet 的最小输入、唯一 writer、幂等/recovery 行为；
5. 每种失败该反馈给谁的 repair map；
6. rerun direction fragment 与 legacy/read compatibility boundary。

`phase-seed-topics`、`phase-rerun`、`phase-wave0`、`phase-wave1`、`phase-wave2` 都应
在实际 `requires` 链直接加载这个文件；phase body 只保留本 phase 的 authority、命令
顺序和 check point，不能再维护局部 template。旧
`shared-return-map-authoring.md` 最多保留为短的 compatibility pointer，或在完成迁移后
删除；它绝不能继续含有第二份完整 entry/ownership template。角色/生成 task 仍只保留
自包含的最短五字段 cue，不必加载完整文档。

这不是让 JS runtime 解析 Markdown。可读 template 是人的 interface；一个小型
executable manifest 仍是机器的 structural source，并由 parity test 保证两者同形。
不要创建 bundle 内复制品、通用 template engine，或第二个 `*.json` runtime schema。

本 bug 缺的还包括 template 没有成为一个可操作对象的 interface：初始化、Wave0、
Wave1、Wave2 各自知道一点 shape，却没有一个操作把 Agent 写下的语义安全地放进唯一
正确的 slot。因此 single template 必须与下文的唯一 writer 一起交付；只合并文档而不
收敛写入仍会失败。

这里的“有 schema”是指一个稳定、可读、可验证的 document contract；不是把研究
判断搬进 Engine，也不是让 Markdown 变成 evidence authority。

### 统一术语（proposal 必须沿用）

| 术语 | 精确定义 | 不是 |
| --- | --- | --- |
| **Seed Topic Document** | 一个 `seed_topics/{slug}.md`：registry-bound 身份、Agent 研究意图、固定研究轮次 appendix 和可导航 projection 的组合 | 独立 evidence source、随意的章节草稿 |
| **Appendix Slot** | appendix 中由 stable `slot_id`、canonical heading、允许 producer、首写 token 和 merge rule 定义的位置 | Agent 按 prose 猜出的 heading 或文件偏移 |
| **Projection Packet** | Agent 从已提交 work/finding authority 归纳出的结构化输入；含 source identity 与 return-map 语义字段 | 新的 evidence/receipt authority，或 raw Markdown patch |
| **Seed Topic State Module** | `operate-topic-state` 背后的现有 atomic writer seam；它定位/合并/持久化 Seed Topic Document | 研究者、搜索器、第二个 Gate controller |
| **Projection Entry** | 一个稳定身份绑定到一个 slot 的可读 return-map entry | “WaveN submitted” 这类无 identity 的状态 prose |

Document 的四层应明确分开：

| 层 | owner / source of truth | 可否被 Wave writer 改写 |
| --- | --- | --- |
| registry envelope（UID、slug、title、must-answer、scope） | `rb_plan.md#/topic_registry` | 否；现有 topic-state 复制/校验 |
| initial research brief（enrichment frontmatter + 初始化 body） | Agent judgment，经 `enrich_seed` | 仅 seed-topics/rerun 的现有合法路径 |
| appendix slot layout（boundary、heading、token、slot ownership） | 一个很小的 executable slot manifest；shared Markdown 是可读 mirror | 只能由 renderer 演进，不能被单个 Wave 临时改名 |
| projection entries | Agent-authored packet，必须绑定 submitted work 或 finding authority | 仅相应 Wave 的 projection operation |

### Appendix Slot Map：位置不能再由 Agent 猜

proposal 应把以下表做成 renderer、writer、inspector 共享的静态 manifest（可用纯 JS
常量；不必创建第二个 runtime schema 文件），并与
`shared-seed-topic-template.md` 做 static parity。`slot_id` 是写入 interface；中文
heading 只由 renderer 使用。

| `slot_id` | 可见 heading | 首次占位 | 合法 producer / identity | merge 规则 |
| --- | --- | --- | --- | --- |
| `wave0_evidence` | `## 本轮新增证据` | `__BACKFILL_WAVE0_EVIDENCE__` | Wave0；`<work_id>/<ordinal>`，未来 BUG-132 再补 candidate identity | 首次消费 token；之后按 entry identity upsert/append |
| `wave1_mechanisms` | `## 本轮新增机制理解` | `__BACKFILL_WAVE1_MECHANISMS__` | Wave1；`<work_id>/<ordinal>` | 同上 |
| `wave1_trends` | `## 本轮新增趋势与难点` | `__BACKFILL_WAVE1_TRENDS__` | Wave1；`<work_id>/<ordinal>` | 同上 |
| `pending_questions` | `## 待验证问题` | `__BACKFILL_PENDING_QUESTIONS__` | Wave1 首次/追加使用 submitted work identity；Wave2 只追加 exact `W2F-*` finding identity | Wave1 消费唯一 token；Wave2 只能追加/更新自己的 finding entry，绝不能覆盖 Wave1 条目 |
| `wave2_judgment` | `## 当前判断` | `__BACKFILL_WAVE2_JUDGMENT__` | Wave2；exact `W2F-*` finding identity | 首次消费 token；之后按 finding identity upsert/append |

`## 历史摘要` 是保留的 document/history area，不是任何 Wave 的 return-map target。
Wave0 也不得因为“每轮都可能有问题”而写入 `pending_questions`；除非未来 accepted
contract 明确增加该 slot owner。这个显式规则能消除当前 prose 中“每轮 pending
status”与“Wave1 token、Wave2 W2F append”之间的歧义。

### 小而深的 writer interface

不要新增一个 `backfill-seed` CLI，也不要让每个 phase 实现一段 token replacement。
现有 `operate-topic-state { inspect, apply, recover }` 应继续是外部 seam；proposal 可
在其 `apply` input 中增加一个语义 operation（以下 `apply_seed_projection` 是设计名，
具体 wire name 由 proposal 固化）。一个 packet 一次只处理 **一个 topic + 一个 Wave**，
但可原子更新该 Wave 拥有的多个 slots：

```yaml
context: wave_projection
action: apply_seed_projection
topic_uid: tp_...
wave: wave1
updates:
  - slot_id: wave1_mechanisms
    entries:
      - source_identity: { kind: submitted_work, work_id: wu-w1-b001-... }
        entry_id: wu-w1-b001-.../1
        evidence_meaning: "..."
        relationship: supports
        refs: [reference/01_topic-source.md, artifacts/wave1/01_topic/evidence-summary.md]
        status: supported
        next_hop: "..."
  - slot_id: pending_questions
    entries: []
```

这个 input 的关键限制是：它没有 `path`、heading 文本、token 文本、line number、
`append` 指令或 raw Markdown blob。Agent 只声明“哪个已验证 identity 的什么含义要
进入哪个 slot”；Module 负责把 `slot_id` 映射到正确 section。Wave2 packet 使用
`source_identity: { kind: finding, finding_id: W2F-... }`。现有 parser 的
`<work_id>/<ordinal>` 和 exact W2F ref 仍是 rendered document 的兼容 identity；不应
为了本 change 无理由再发明第三种 entry identity。

Writer 的 implementation 可以抽出纯 `SeedTopicDocument` helper，但那是内部 seam；
外部 caller 只学习上述 `inspect/apply/recover` interface。其 implementation 必须隐藏：

1. route-bound lifecycle / canonical UID binding 的验证；
2. wave → allowed `slot_id` 的验证，以及 current submitted row 或 current/legacy W2F
   identity 的存在性验证；
3. 一次性 token 的精确消费、已消费后的 idempotent merge、按 identity 的 update；
4. entry five-field/rendered metadata 的 canonical Markdown serialization；
5. 同一 seed 文件的一次 atomic write、crash recovery 和 post-write parse/inspect
   precondition。

它**不**负责挑选证据、撰写 `evidence_meaning`、判断 relationship，或用 packet 创造
submitted coverage。没有 materializable consumer reference 时，Agent 仍提交合法的
`defers/deferred` disposition；writer 只验证其 shape/binding。

### 生产时即正确的闭环

```text
canonical registry
       │  (existing atomic renderer)
       ▼
complete Seed Topic Document skeleton ── seed-topics gate verifies layout/binding
       │
accepted Wave submit / Wave2 finding-index
       │  (authority; never copied into a new source of truth)
       ▼
Agent forms one Projection Packet ──► Seed Topic State Module.apply
   semantic judgment                         │
                                            ▼
                           exact slot merge + atomic persistence
                                            │
                                            ▼
                              existing Wave inspect / exact root
                                            │
                                            ▼
                          completion trace and Gate only after pass
```

因此 phase 的正常 closeout 要从“submit 后手工 grep/append”改成固定循环：

1. 从 current submitted rows 或 finding-index 得到可投影 identity；
2. Agent 形成 packet（必要时提交 explicit deferred disposition）；
3. 调用唯一 writer；
4. 运行该 Wave 的现有 inspect；
5. 只有 inspect 的 projection root 已通过，才记录/刷新 wave completion 并进入 Gate。

如果第 2 或第 3 步没有合法 contract，反馈必须是明确的 `missing_contract`/writer
root，而不是让 Agent 直接 edit Markdown、让用户接手，或以 count-floor degradation
掩盖它。这样“回填”不再是收尾时可忘记的 prose checklist，而是每个 producer 的
正常 materialization action。

### Template、manifest、authority 与反馈入口的唯一性

最终应只有下列三种、各司其职的 surface，而不是多份互相抄写的模板：

| Surface | 唯一职责 | 不能承担 |
| --- | --- | --- |
| `shared-seed-topic-template.md` | 人/Agent 的唯一完整入口：document skeleton、slot 表、entry shape、operation loop 和 repair map | runtime parser、evidence authority |
| existing topic-state renderer/小型 slot manifest | canonical headings/tokens 的 executable structural source；render/locate/merge 的唯一实现 | Agent 的研究语义 |
| submitted rows、source claims、finding-index/ledger | projection entry 可以引用的事实 authority | seed 文档版式或 next-hop prose |

静态 parity 应同时覆盖单文件 template、manifest、renderer 和 locator；任何 heading、
token、slot owner 或 slot order 的漂移都要在 test 中失败。运行时不能解析 guidance
Markdown 来“发现”模板，也不能把 template prose 再复制到每个 phase。

该 template 顶部必须有一个简短的 **Feedback / Repair Map**，使人不再猜“该向哪里
反馈”：

| 看到的问题 | 直接 owner | 不能做的事 |
| --- | --- | --- |
| skeleton、heading、token、slot owner 不合理 | template + slot-manifest 的 OpenSpec change | 在某个 bundle/phase prose 私自改 heading |
| entry 写进了错 section、重复或丢失 | Seed Topic State Module writer / Wave inspect | 手工 grep、删除 token 或复制 prose |
| entry 没有正确 submitted/W2F backing | 对应 work-unit/finding authority | 用 seed entry 补造 evidence authority |
| entry 的 meaning/relationship/next-hop 不好 | Agent 重新提交 Projection Packet | 要 Engine 自动撰写研究结论 |

### 必须先用例子压测的边界

| Scenario | 正确结果 |
| --- | --- |
| 新 topic / rerun `add_topic` | registry 与完整 skeleton 在同一 topic-state transaction 出现；每个 slot/token 恰好一次 |
| Wave0 packet 指向 `wave1_mechanisms` | writer 在写入前拒绝；不存在“写了但位置不对”的状态 |
| Wave1 同时有 mechanisms、trends、questions | 三个 owned slots 一次原子更新；任何一个无效，三个都不部分提交 |
| Wave2 追加 W2F 到 pending questions | 保留 Wave1 question entries；只按 W2F identity upsert，不能消费/重置 Wave1 token |
| rerun 重放同一 packet | unchanged/idempotent；不重复 entry、不重新注入 token |
| 同一 source identity 得到更正后的语义 | 仅更新该 identity 的 entry，保留其他 entries 与历史 section |
| non-current work id / 不存在 W2F | writer/inspect 给出 exact identity root，不把它写成 generic prose |
| 无 consumer reference | 只允许有 source identity 的 explicit deferred disposition；不伪造 `reference/*.md` |
| writer crash | existing atomic workspace/recover 保证没有“token 消失但 entry 未写完”的半状态 |
| registry 外的历史 seed | 不能被 current Wave packet 选中；历史读取兼容不等于 current projection target |

BUG-132 仍另行决定 Wave0 的 candidate-level `source_identity`/coverage：BUG-138 的
writer 保证“正确 entry 写在正确 slot”，不应偷换成“一个 work-id 代表全部 candidate”。

## 修复边界（应作为一个 OpenSpec change 设计，而不是直接补当前 bundle）

1. 保留 LLM 对 `evidence_meaning`、`relationship`、`status`、`next_hop` 的语义
   判断；但定义一个唯一、外部可见的 seed backfill contract，明确每个 Wave 的
   authority、目标 section、最小 entry shape、refs 优先级和 no-projection disposition。
2. 为回填提供一个唯一合法 writer/materializer：它接收 Agent-authored 的结构化
   entries，自动处理 section 定位、entry identity、Wave-specific refs、token
   replacement/append 和格式渲染；不要让 Phase Agent 手工改同一段 Markdown。
3. 新的 `shared-seed-topic-template.md` 保持唯一外部可见的完整 template；renderer/
   writer 使用同一个小型 executable slot manifest，并以 static parity 防止两者漂移。
   不得在 runtime 解析 guidance Markdown，也不得再造 bundle 内隐形模板。所有 seed/
   Wave phase、inspect advice 和 repair coordinate 都应指向这一套 contract。
4. 将回填 closeout 放入每个成功 submit 的可见 checklist，并把 writer result + Wave
   inspect 作为 completion 前提；仅有 `file:seed_topics/...` 不足以宣告 backfill
   完成。proposal 再按既有 trace/receipt contract 决定是否需要额外 durable binding，
   不在本 bug 中凭空创造第二个 receipt authority。
5. Wave0/1/2 统一检查：本轮有 current submitted/finding demand 时，placeholder、
   通用 `submitted` prose、缺字段 entry 或缺 current-round identity 都必须 blocking；
   不能被 shared-reference/count-floor 的 degraded pass 覆盖。
6. 增加 deterministic regression：分别覆盖 untouched token、generic prose、
   valid entries、invalid refs、missing current-round row/finding、legacy topic
   不在 current registry，以及三 Wave 的正常连续回填。

## 当前处理边界

本次只登记 bug，未修改 bundle 的 seed topic，也未修改 `DPT_FRAMEWORK/`。当前
bundle 的合法修复不能靠把几句 prose 填进去或手工删除 token 伪装完成；必须从
submitted Wave0/Wave1 authority、Wave2 finding/ledger/index 和 concrete reference
surface 重新生成可审计 projection。

## 接手信息

### 建议的设计顺序

先以本 bundle 的 seed projection scan 和 `inspect-wave1-output` 重现，再读以下
六个 surface，不要从当前 generic prose 猜语义：

1. 当前 `shared-seed-topic-authoring.md`：initial skeleton/direction fragment；
2. 当前 `shared-return-map-authoring.md`：entry grammar/ownership；先确认二者正是
   为什么人找不到一个完整 template 的 split baseline；
3. `shared-reference-template.md`：作为新 single-file seed template 的可发现性/完整
   示例基准，而不是把 reference schema 复制进 seed；
4. `canonical-topic-state.mjs` 的 `TopicApplyPlanSchema`、`renderNewSeedBody()`、
   `buildMutation()`、`applyCanonicalTopicState()`：现有唯一 atomic seed writer 的
   input、renderer、transaction/recover seam；
5. `seed-topic-authoring-evaluator.mjs`：目前只验证 registry/frontmatter binding，
   因而是 extension boundary，不应另建平行 parser；
6. `return-map.mjs#inspectSeedTopicReturnMaps`：当前 projection verifier 与
   current-row/finding demand。

随后先走 OpenSpec propose/explore。这里需要决定的是“结构化 Agent-authored entry
输入如何到达一个唯一 renderer”，不是让 Engine 自动编造研究意义或把 Markdown
模板 runtime-parse 成新的 authority。

### 不可违反的设计约束

- submitted work-unit rows、source claims、finding-index/ledger 仍是 evidence
  authority；backfill 永远只是可读 projection。
- LLM 保留 `evidence_meaning`、`relationship`、`status`、`next_hop` 的判断；
  renderer 只负责定位 section、稳定 identity、token replace/append、格式和
  authoritative refs 的机械约束。
- 把当前两个 `shared-*authoring.md` 合并/迁移成一个明确命名的
  `shared-seed-topic-template.md`；它是唯一外部可见的完整 contract。若 renderer
  需要稳定 manifest，应与该 template 做 static parity，而非新建第二份完整模板或在
  运行时解析 guidance Markdown。
- current bundle 不能靠手工删除 token、复制 prose 或伪造 receipt 结案。

### 与其他卡的关系

- BUG-138 是 baseline 交接/写入闭环；[BUG-132](BUG-132-wave0-seed-backfill-thin-candidate-projection.md)
  在它之上进一步要求 Wave0 candidate-level coverage。
- [BUG-134](BUG-134-wave2-inspect-misclassifies-synthesis-ledger-as-return-map.md)
  必须同时保留 seed section 的严格检查；不要因为修复 synthesis/ledger false-positive
  而让 BUG-138 的 seed omissions 消失。
- BUG-136/137 是 reference materialization/index identity；正确 backfill 必须使用
  它们修复后的 concrete reference refs，但不能等待这些卡才定义 seed writer。

### 最小验收矩阵

| Case | Required verdict |
| --- | --- |
| current submitted Wave0 row + untouched Wave0 token | blocking, exact seed section coordinate |
| Wave1/Wave2 generic `submitted` prose | blocking, not a valid return-map substitute |
| valid Agent-authored entry + submitted/current authority | renderer writes one parseable projection and inspect passes |
| missing current work-row/W2F identity | blocking omission without unrelated cascade |
| no materializable evidence | valid explicit deferred disposition, no fabricated reference |
| rerun | append/dedup by stable identity; do not re-inject a consumed token |

完成时必须有 Wave0、Wave1、Wave2 的 deterministic regression，且任何
degraded-pass policy 都不能把上述 structural projection failure 降级为可前进事实。

## 设计审计结论（2026-07-27）

本卡的设计现已按项目三条 evolution direction 收敛，并沉淀为
[`seed-topic-projection-materialization.md`](../plans/seed-topic-projection-materialization.md)。
它不是实现授权；对应的
[`fix-seed-topic-projection-materialization`](../../openspec/changes/fix-seed-topic-projection-materialization/)
已完成 propose，仍须经 `/opsx:apply` 才能修改 framework 或 tests。

1. **Abstraction as Semantic Precision**：`Seed Topic Document` 的有界读者问题是
   “这个 current topic 的哪些 authoritative Wave 结果已经进入哪个可导航 slot，下一步
   去哪里”。`Appendix Slot`、`Projection Packet` 与 `Projection Entry` 保留 current vs
   historical、Wave owner、identity、first-write vs rerun、deferred vs omission 等会改变
   这个答案的区别。它不宣称自己是 evidence authority，也不评价研究结论。
2. **Simple Reliable Control**：最短闭环是现有 authority -> Agent packet -> 既有
   `operate-topic-state apply` -> 同一个 Wave inspect -> formal gate。slot map 是一个
   small executable fact，writer 与 inspect/gate 共用 pure readiness result；它取代两个
   complete template、phase-local manual token replacement 和重复检查，而不是增加 CLI、
   controller、watcher、second receipt 或 runtime Markdown parser。缺 registry/authority
   parent 时先报那个 root，structural projection root 不得 degraded-pass。
3. **Helper-Oriented Agent**：Agent 保留 evidence meaning、relationship、status、next
   hop 的判断，并在已有合法 writer window 内执行 packet/apply/same-check repair；Engine
   只裁决 route、identity、slot、serialization 和 readiness。用户只处理新的研究语义、
   风险或权限决定，不能被要求手改 seed、删 token、补 receipt 或选择未定义的 recovery。

因此本 bug 的正确修复不是把 prose 再写得更详细，也不是把 Agent 的研究判断挪进
Engine，而是给 Agent 一个可发现的完整对象界面与一条已经存在的、唯一的原子写入路径，
再让 deterministic checkpoint 对真实的 projection/authority binding 负责。
