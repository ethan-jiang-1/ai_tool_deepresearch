# Plan: 断点恢复的三条持久化义务（Breakpoint-Recovery Persistence Model）

**性质:** 复盘 + 能力立项前设计计划（pre-OpenSpec）
**状态:** 草案，待切成 OpenSpec change（2026-07-11）
**触发:** `dpt_rb_ai-era-bpm-process-disruption` 的 post-final addendum 在 Molex 采证半途机器死掉；人工恢复现场（seed 06–11 建立、Molex 补齐、06/07 综合补齐）后复盘"为什么有的恢复得干净、有的只能靠 chat 记忆重建"。
**范围:** DPT_FRAMEWORK 的崩溃/中断恢复语义——数据落盘、状态落盘、用户输入落盘。**不含** BUG-078 的 reopen 机制本身（另案），本 plan 只解决"中断后还能不能知道从哪续"。
**设计原则:** [`guidelines/simple-reliable-control.md`](../../guidelines/simple-reliable-control.md)、[`guidelines/project-charter.md`](../../guidelines/project-charter.md)
**相关:** [BUG-078](../bugs/BUG-078-post-final-hitl2-rerun-reentry-blocked.md)（rerun 无 CLI 可达）、[BUG-077](../bugs/BUG-077-subagent-api-402-and-cache-trail-schema-opaque.md)（work-unit 路径）、[`delegated-attempt-timeout-and-redo-postmortem`](delegated-attempt-timeout-and-redo-postmortem.md)（in-flight attempt 存活）

---

## 0. 结论

**可恢复性 = 中断那一刻已经落盘的东西的函数。** 这次恢复里，凡是**有数据过手且落了盘**的部分（Molex 的 cache/证据卡、其余 3 家 dossier、初次管道 wave2 台账）都恢复得干净、有据可查；凡是**只活在 run.log 一行 Decisions + chat 记忆**里的部分（topic 06/07 的定义、4 家公司的 seed）都得靠人**逆向**从产出物重建意图。

关键澄清（用户复盘点）：**06/07 恢复成 "not started" 本身没错——它们确实没做**。真正的缺陷是：**中断时磁盘上没有任何东西声明 06/07 应当存在**，所以无法把"该做但丢了"和"本就没做/没打算做"区分开——这个区分只能靠 chat 记忆补，而 chat 记忆一旦没了，现场就"不知道从哪开始"。

由此，框架必须履行**三条持久化义务**：

| # | 义务 | 这次暴露的缺口（冒烟证据） | 要求 | 候选 change |
|---|------|--------------------------|------|-------------|
| P1 | **数据过手即存**（crash-safe + 即时） | `reference/addendum-molex-itbrief.md.tmp.50374.…` —— 原子写的 `rename` 没跑完，一张**内容完整**的证据卡看起来像垃圾残留 | 任何过手数据 crash-safe 落盘；崩溃后能 sweep 孤儿 tmp 并 finalize-or-discard | `crash-safe-artifact-writes` |
| P2 | **状态即意图要存** | `rb_status.json` 冻在终态 `readiness_passed/phase-final`，对整批 addendum 工作**零感知**；4 家无 seed、06/07 不在 registry | topic 意图 + 每 (topic×wave) 进度是一等状态面，handoff 时更新；能区分 never/in-progress/done | `first-class-topic-progress-state` |
| P3 | **重要用户输入要存** | rerun 请求（加 6 个 topic、各自定义）只在 run.log Decisions 一行 + chat；06/07 的 must_answer 只能从 dossier 逆推 | HITL/post-final 输入在**请求当刻**物化成结构化 artifact（seed/registry），独立于任何下游产出 | `materialize-user-intent-on-input` |

**贯穿三条的根因（§3）:** 框架现在是 **work-first、persist-as-side-effect**；应改为 **materialize-before-work**——先把意图/状态/数据的持久表示写下来，再（或原子地同时）干活。

---

## 1. 案例：这次恢复暴露了什么

中断现场的实际状态（按恢复难度排序）：

**A. 恢复得干净（有数据过手且落盘）**
- 3 家 dossier（`final/addendum/{08,10,11}`）+ 各自证据卡 + `_cache/addendum/{allianz,brex,barclays}` 完整 → 直接可读，无歧义。
- Molex 的 5 个源已 `curl` 抓入 `_cache/addendum/molex/`（含 scmspectrum 112KB、themachinemaker 204KB）→ 数据在手，补卡不用重新联网。
- 初次管道 `artifacts/wave2/finding-index.yaml`（W2F-001..010）→ 顶层综合有据可折回。

**B. 半截但可判定（数据在、终态没落定）**
- Molex `itbrief` 证据卡卡在 `.tmp`（P1 冒烟点）：内容从 frontmatter 到 "Risks And Limitations" **完整**，只差原子写最后一步 `rename`。恢复靠"发现孤儿 `.tmp`"这一人肉信号——框架没有任何机制把它标为"待 finalize"。
- Molex 另 2 源（scmspectrum/themachinemaker）已抓未成卡 → 从 `_cache/` 可判定"抓了没写卡"。

**C. 只能逆向重建（无数据落盘）**
- 4 家公司**没有 seed_topics**、不在 `rb_plan.md` topic_registry → 证据卡的 `related_topic: 08_…` 悬空指向不存在的 topic。
- **06/07 零痕迹**：无卡、无 cache、无 final、run.log 无提及，只有 `rb_plan.md` Decisions 里"新增 6 个 topic"一行。它们的定义、must_answer、依赖关系（synthesis-only、depends_on 08–11）全靠人读 Decisions + 看 addendum 编号缺口 + chat 记忆重建。

**结论**：A/B 之所以能恢复，是因为**数据过了手就在盘上**；C 之所以要逆向，是因为**意图和状态从未落盘**。恢复质量与"中断时落了多少盘"严格正相关。

---

## 2. 三条持久化义务（详）

### P1 — 数据过手即存：crash-safe + 即时
**冒烟证据:** `addendum-molex-itbrief.md.tmp.50374.4f2cc5828548`。原子写 = 写 `.tmp` → `rename`；崩溃卡在两步之间，留下**内容完整却无名分**的孤儿。
**缺口:**
- 无崩溃安全的 finalize：孤儿 `.tmp` 既不被识别为"完整待改名"，也不被清理。
- 无 in-flight 写入 journal：无法区分"写了一半（该弃）"vs"写完没改名（该留）"。
**要求 / 验收:**
- 所有过手 artifact（fetched page、证据卡、dossier）走统一的 crash-safe write（临时名 + fsync + 原子 rename），且临时名带**可判定的 sidecar/journal**（目标路径 + 内容 hash + 完成标志）。
- 提供 `sweep`：启动/恢复时扫孤儿临时文件，凭 sidecar **finalize-or-discard**，并记 run.log。
- 验收：注入"写完未 rename"崩溃 → sweep 后目标文件到位、无孤儿、run.log 有一条 finalize 记录。

### P2 — 状态即意图要存：一等进度面
**冒烟证据:** `rb_status.json` = `{current_gate: readiness_passed, current_node: phase-final, state: not_started}`——对 14:22 之后整批 addendum **完全无感知**；`rb_queue.json` health `blocked/empty`。现场"当前在哪"无法从状态文件回答。
**缺口:**
- out-of-gate 工作没有状态面：addendum 的 topic/wave 进度不进 `rb_status`/`rb_queue`/registry。
- 无 (topic × wave) 粒度的进度台账：无法回答"09 的 wave0 做完没？wave1 呢？"。
**要求 / 验收:**
- topic 意图（seed_topics + registry）与 per-(topic,wave) 进度是**一等状态面**，在每次 handoff / 每张卡 / 每篇 dossier 落盘时同步更新（哪怕是 out-of-gate addendum，也要有一个显式的 addendum 进度台账）。
- 状态必须能区分 `never_started` / `in_progress` / `delivered`，并对 synthesis-only topic 记 `depends_on`。
- 验收：任意中断点，只读状态文件即可列出每个 topic 每个 wave 的 done/pending，且与磁盘实际产出一致（可加一个 `audit-recovery` 只读校验器）。

### P3 — 重要用户输入要存：请求当刻物化
**冒烟证据:** rerun 的全部意图（6 个 topic、各自角色）只在 `rb_plan.md` Decisions 一行；06/07 的 must_answer 只能从已交付 dossier **逆推**。若无 chat 记忆，06/07 意图近乎不可恢复。
**缺口:**
- HITL/post-final 输入未被结构化落盘：HITL2 decision 作为 event 记了，但**内容**（要加哪些 topic、每个答什么）没在请求当刻物化成 seed。
- 依赖"先干活、产出物即记录"——对没有产出物的 topic（06/07）等于没记录。
**要求 / 验收:**
- 重要人类输入（HITL1 方向/topics、HITL2 decision、post-final rerun scope）在**接收当刻**物化成结构化 artifact（seed_topics 骨架 + registry 条目 + must_answer），**先于**任何采证/综合工作。
- 输入 artifact 独立于下游：即便该 topic 一个字都没做，其意图也在盘上。
- 验收：录入一个"加 topic X"的 rerun 请求后立即崩溃 → 恢复时 X 的 seed + registry 条目已在，状态为 `never_started`，意图完整。

---

## 3. 贯穿原则：materialize-before-work

三条义务是同一根因的三个面：**框架当前 work-first、persist-as-side-effect**——先干活，产出物顺带当记录；状态/意图只在成功走完 gate 后才落。于是：
- 崩在原子写中间 → 数据成孤儿（P1）。
- 崩在 gate 之外 → 状态无感知（P2）。
- 崩在干活之前 → 意图没记录（P3）。

改为 **materialize-before-work**：接到意图先落 seed/registry（P3）→ 开工前登记 (topic,wave) 状态（P2）→ 数据 crash-safe 落盘并即时 finalize（P1）→ 干活 → 更新状态。这次人工恢复恰恰是**反着做**（从 dossier 逆推 seed）才成功的，正说明正向缺失。呼应 charter 的"证据可追溯"与 run.log"append-only、即时落盘"原则。

---

## 4. 恢复契约：中断后必须只凭磁盘可回答

框架应保证——**不依赖 chat 记忆**——恢复时能回答：
1. 计划做哪些 topic？（registry：全部意图，含 never_started 的）
2. 每个 topic 每个 wave 到哪一步？（进度台账：never/in-progress/delivered）
3. 有没有过手但没落定的数据？（sweep：孤儿 tmp finalize-or-discard）
4. 用户最近的重要输入是什么、要求了什么？（结构化 input artifact）
5. 下一个动作是什么？（由 1–4 推出，无歧义）

这次这 5 问里，只有 (1) 部分、(3) 靠人肉、(2)(4) 基本靠 chat。目标是把 5 问全部变成"读盘即答"。

---

## 5. OpenSpec change 切割建议

不按"一义务一 change"硬拆；按 failure mode 与落地风险聚 **3 个 change**（与 BUG-069~075 的切割思路一致）：

| Change | 覆盖 | 落地风险 | 备注 |
|--------|------|----------|------|
| `crash-safe-artifact-writes` (P1) | 统一 crash-safe write + sidecar + `sweep` | 中，触及所有写 artifact 的路径 | 先做，独立可测，收益立竿见影（消灭孤儿 tmp） |
| `first-class-topic-progress-state` (P2) | (topic×wave) 进度台账 + `audit-recovery` 只读校验 | 中高，触及 status/queue/registry 语义 | 需与 BUG-078 reopen 语义对齐，别双写状态 |
| `materialize-user-intent-on-input` (P3) | HITL/rerun 输入当刻物化 seed+registry | 高，触及 HITL1/HITL2/post-final 流 | 依赖 P2 的状态面；建议最后做 |

顺序：P1 → P2 → P3（后者依赖前者的状态面）。每个 change 走完整 propose/explore/apply。

---

## 6. 关系与边界

- **与 BUG-078:** 互补而非重叠。BUG-078 解决"post-final 能不能**回到** HITL2 rerun"（reopen 机制）；本 plan 解决"中断后还能不能**知道从哪续**"。即便 BUG-078 修好、rerun 走 gated 路径，P1–P3 仍是崩溃安全的前提。
- **与 BUG-077 / delegated-timeout plan:** work-unit 提交路径与 in-flight attempt 存活是 P1/P2 在 delegated 场景的特例；本 plan 覆盖更广（含 out-of-gate addendum 的裸写路径）。
- **Phase gate 边界:** 本 plan 只写 `_backlog/plans/`，**不动 DPT_FRAMEWORK 代码**。实现只在各 change `/opsx:apply` 时按批准 task 落地（CLAUDE.md 硬规则）。
- **本次恢复的产物** 是"反向恢复"的活样本，可作为 P2/P3 验收的 golden fixture（现场已一致：seed 11 个、registry 11 条、addendum 06–11 全交付、run.log START→RESUME→wave2 三行轨迹）。

## 7. 未决问题

- out-of-gate addendum 是否值得一个**正式的 addendum 状态面**，还是应等 BUG-078 让它走回 gated 状态？（若后者，P2 的 addendum 台账只是过渡。）
- P3 物化 seed 的**粒度**：请求当刻只落骨架（title+must_answer），还是连 search_guardrails/evidence_route 一起？（骨架足够可恢复，但越全越好续。）
- sweep 的 finalize-or-discard 判据：仅凭 sidecar 完成标志，还是加内容 hash 校验？崩在 fsync 前的半截内容如何稳妥判弃。
- 进度台账与 `rb_trace.jsonl` 是否会双写/冲突？需与 [`trace-unification-assessment`](../_done/_closed_plans/trace-unification-assessment.md) 对齐。
