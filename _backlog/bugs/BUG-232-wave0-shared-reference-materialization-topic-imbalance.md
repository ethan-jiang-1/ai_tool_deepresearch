# BUG-232: Wave0 共享 reference 物化收敛按 topic_slug 排序逐一物化，导致 topic 间覆盖严重失衡（排序靠前的 topic 吃满 floor，靠后的 0 覆盖）

> 状态: 活跃 | 优先级: P1 | 严重度: P2 | 更新: 2026-08-18 | source: 真实 run 执行（dpt_rb_enterprise-ai-transformation-six-cases，wave0 closeout）

## Why（完整上下文）

`wave0_submitted_reference_materialization` 收敛规则（
`DEEP_RESEARCH_HARNESS/engine/helpers/wave0-reference-convergence.mjs`）的职责是把
已提交的 Wave0 来源按 `<work_id>/<ordinal>` 逐个物化为 Phase-owned
`reference/00-shared-*.md` 消费投影，直到 `wave0_shared_ref_total`（本 run = 24）的
计数 floor 达成。

候选选择逻辑是：`orderedCandidates` 先按 `topic_slug` 字典序、再按 `source_ordinal`
排序（`wave0-reference-convergence.mjs:77-83`），然后 `evaluateWave0ReferenceConvergence`
每次取 `unprojected[0]`（第 184-210 行）让 Agent 物化一个。**没有任何 per-topic
平衡、per-topic 上限或「每个 topic 至少 N 个」的约束**。当 floor 达成时收敛停止，
结果就是字典序靠前的 topic 把整个 floor 吃满，靠后的 topic 一个共享 reference 都没有。

这导致共享 reference 投影层在 topic 间严重失衡——即使每个 topic 的 submitted
backing 都很充足、count floor 本身也达成（gate 通过），消费端（报告引用、后续 wave
导航）的覆盖分布却是畸形的。

## 复现

1. 一个多 topic 的 Wave0（本 run 9 个 topic），`wave0_shared_ref_total` 为一个 floor F。
2. 每个 topic 都有已提交的 source contribution（各 12+ 候选）。
3. 运行 `inspect-wave0-output.mjs` 的 submitted-reference 收敛：`orderedCandidates`
   按 `topic_slug` 排序（`01_kavak…` < `02_block…` < `03_cloudflare…` < … <
   `09_cross-case-individual…`）。
4. 收敛逐一物化排序靠前的候选，直到计数达 F。字典序靠后的 topic 的候选从未被选中。

本次实测：floor=24，收敛物化了 block（i0016/2..12，11 个）+ cloudflare（i0018/3..12，
10 个）+ jabil（i0019/2..4，3 个）即达 24。结果共享 reference 分布：
**kavak 1、block 11、cloudflare 10、jabil 3、jpmorgan 0、cargill 0、business 0、
org 0、individual 0** —— 5 个 topic 零物化覆盖，尽管它们的 submitted 候选各 12+ 条。

## 影响（本 run 实账）

- 共享 reference 层 topic 覆盖失衡：5/9 topic 无物化 reference，报告/后续 wave 无法
  从 reference/ 平等导航到这些 topic 的来源。
- 用户将失衡判定为缺陷（「主要是 block 和 cloudflare，还有少量 jabil、一个 kavak；
  6 个公司 9 个话题你都应该跑」「应该是平衡的，为什么有的多有的少」）。
- 缓解成本：Phase Agent 只能绕过收敛规则手动物化 ~53 个额外 reference 才把分布拉到
  ~8/topic（77 个总数）。该规则本身永远无法产出这个分布。
- 另一个关联发现（本 run）：`00-shared-kavak-public-software-organization.md` 的
  `acceptance_status: "accepted :warning:"` 被 `countReferences` 判为
  `acceptance_status_not_accepted`（不计入 floor），`observed` 与磁盘文件数因此差 1——
  属同一规则的计数口径问题，可并入本 bug 的修复考量。

## 为什么是框架缺陷（不是 Agent 执行错误）

- 收敛规则的目标是「达成共享 reference floor」，但 floor 是**计数**不是**分布**。
  `topic_slug` 字典序是任意的排序键，与「每个 topic 都有消费导航」的覆盖目标无关。
- 规则对「哪些 topic 得到物化」没有任何控制：排序靠前的 topic 可独占 floor，靠后的
  topic 在候选充足时也得不到任何物化。这是系统性引导缺失，不是单次执行错误。
- 同一收敛逻辑若在 Wave1/Wave2 复用（`wave1-reference-convergence.mjs` 等），会扩散
  同样的按排序倾斜问题。

## Owner / 最小修复方向

`evaluateWave0ReferenceConvergence` 的候选选择策略（`wave0-reference-convergence.mjs`）：

1. 把「取 `unprojected[0]`」改为**跨 topic 轮转**：优先选取当前物化数最少的 topic 的
   下一个候选（round-robin），保证 floor 内每个有 submitted 候选的 topic 都获得覆盖。
2. 或加 **per-topic 上限/下限**：floor 达成前每个 topic 至少物化 `min(1, 候选数)` 个，
   且单 topic 不超过 `ceil(F/topicCount)`（允许剩余 floor 分布到候选更多/更相关的 topic）。
3. 对 `accepted :warning:` 的计数口径：明确该状态是否应计入 floor（本 run 中 `:warning:`
   是一个诚实性标记，被计数规则排除导致 observed≠磁盘数）；若不应计入，文档化；
   若应计入，修 `isCountable`。

建议加一个确定性测试：构造多 topic submitted 候选集，断言 floor 达成后每个 topic 的
物化 reference 数 > 0（或分布方差有界）。

## 关联

- `DEEP_RESEARCH_HARNESS/engine/helpers/wave0-reference-convergence.mjs`（候选排序与选择）
- `DEEP_RESEARCH_HARNESS/engine/helpers/ref-count.mjs`（`countReferences` / `isCountable` 计数口径）
- 本 run 修复前分布实测：reference/ 目录 46 个共享文件，5/9 topic 为 0。
