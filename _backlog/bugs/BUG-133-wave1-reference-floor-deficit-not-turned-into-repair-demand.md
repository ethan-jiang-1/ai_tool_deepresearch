---
bug_id: BUG-133
title: "Wave1 per-topic reference-floor deficits are discovered only at inspect and are not converted into repair demand"
severity: P2
discovered: 2026-07-27
bundle: dpt_rb_openspec-derivative-frameworks
phase: wave1
node: phases/phase-wave1.md
gate: wave1-complete
status: active
---

# BUG-133: Wave1 reference floor 不足没有转成补充需求

## 现象

发现时的 run snapshot 使用 `exploratory_map` profile，`rb_profile.yaml` 明确要求：

```yaml
wave1_per_topic_ref_floor: 8
topic_unique_ratio: 0.4
```

Wave1 已完成四个 topic 的初轮 deepening，但在修复一个 reference UID 拼写错误后重新运行 inspect，仍得到以下真实结果：

```text
Count floor not met for reference/*01_openspec-architecture-and-evolution*.md: 6 countable references (threshold: 8)
Count floor not met for reference/*02_direct-derivatives-and-compatible-implementations*.md: 5 countable references (threshold: 8)
Count floor not met for reference/*03_explicitly-openspec-inspired-frameworks*.md: 5 countable references (threshold: 8)
Count floor not met for reference/*04_adjacent-convergent-ai-coding-workflows*.md: 6 countable references (threshold: 8)
```

同时，现有队列只为 topic 02 形成了一个 supplementary work unit；topic 01、03、04 没有对应的补充需求。因而 Wave1 在 source/depth 方面看似已经推进，但最终 rich-reference floor 仍然无法闭合。

## 影响

1. Agent 需要在完整 inspect 之后人工判断哪些 topic 需要补充、补多少来源；profile 中的 floor 没有在执行阶段形成可执行的 repair coordinate。
2. 多个 topic 可以同时停留在“submitted deepening 已完成、Gate 仍失败”的半完成状态，造成用户难以判断当前到底是研究不足还是单纯 projection 不足。
3. 如果直接复制旧来源或手写 reference projection 来凑数量，会违反 Wave1 “one source one reference”及 submitted-backed reference 约束；如果不补，又无法进入 Wave2。
4. 缺陷会放大 Wave0 seed backfill 过薄的问题：Wave1 缺少足够的 topic-specific references 时，用户更难从 seed/reference 导航到具体发现。

## 根因假设

Wave1 的两个数量约束分散在不同层：

- `wave1_per_topic_ref_floor` 由 Gate 的 `count_floor` 检查 rich reference 文件总数；
- `topic_unique_ratio` 只派生 depth review 的 new-source floor（当前为 `ceil(8 × 0.4) = 4`）；
- topic deepening 的 queue demand/`depth-review.yaml` 主要围绕 new-source floor 和机制/趋势/限制维度收敛。

因此，一个 topic 可以合法满足 depth review 的 4 个新来源，却仍只有 5–6 个最终 reference；inspect 能发现差额，却没有把“缺 2/3 个 topic-specific backed references”自动转成相应的 supplementary `wave1_topic_deepening` work unit。当前的执行合同没有把 reference-floor deficit 作为队列需求的闭环事实。

## 证据路径

- Bundle: `dpt_rb_openspec-derivative-frameworks/`
- Profile: `dpt_rb_openspec-derivative-frameworks/rb_profile.yaml`
- Wave1 outputs: `dpt_rb_openspec-derivative-frameworks/artifacts/wave1/*/`
- Current references: `dpt_rb_openspec-derivative-frameworks/reference/`
- Queue: `dpt_rb_openspec-derivative-frameworks/rb_queue.json`
- Reproduction:

  ```bash
  node DPT_FRAMEWORK/cli/inspect-wave1-output.mjs \
    --bundle dpt_rb_openspec-derivative-frameworks
  ```

## 建议方向

1. 把 per-topic reference floor 纳入 Wave1 supplementary-demand convergence：每个 topic 都应计算 `required - countable_backed_references`，并把 deficit 转成有界的补充工作单。
2. 明确区分两种 repair：已有 submitted source 的 projection/materialization 修复，以及确实需要新一手来源的 `wave1_topic_deepening`；禁止用重复 URL 或旧来源复制来满足 floor。
3. 让 queue/inspect advice 给出 topic、缺口数量、合法 writes-to 和来源新颖性要求，而不是只给通用的 `write_to: reference/`。
4. 增加 deterministic regression：四个 topic 分别返回 6/5/5/6 时，系统必须形成 2/3/3/2 的 repair demand，或明确证明已有 submitted backing 可 materialize 到 8。

## 当前 run 的处理边界

这不是 reference 数据凭空消失，也不是通过手工改 ledger 可以解决的问题。当前 bundle 的 Wave1 source claims/cache 仍可追溯；本 bug 记录的是 profile floor、队列补充需求和最终 reference projection 之间缺少闭环。当前 run 继续通过合法 supplementary work-unit 和 submitted-backed materialization 收敛，不用手工伪造 authority 来掩盖 Gate 失败。

## 接手信息

### 已确认的红灯与断点

下列命令是发现时已跑出的 historical red loop：

```bash
node DPT_FRAMEWORK/cli/inspect-wave1-output.mjs \\
  --bundle dpt_rb_openspec-derivative-frameworks
```

它稳定报出四个 topic 的 `6/5/5/6` 对 `8` 的 count-floor deficit。断点在
Wave1 的两套收敛条件没有相连：`phase-wave1.md` 只在 depth review 记录
`decision: supplement_required` 时 enqueue supplementary demand；而
`per_topic_ref_md_count_floor` 是 evaluator 对最终 materialized reference 的
独立观察，当前没有将 `required - observed` 转成 demand 的 owner。

本卡补全时对同一个 mutable bundle 的活态复核已见到后续 materialization：四个
topic 的 flat reference 文件数是 `9/8/8/9`，上述 inspect 命令也已通过。因此不要把
这个现有 bundle 当作永久 red fixture，也不要因其变绿关闭本 bug；需要一个受控的
`6/5/5/6` disposable fixture，才能锁住“floor deficit 没有进入 repair demand”的
语义缺口。

### 先分流、再决定是否搜索

每个 deficit 必须先区分以下两种情况，不能一律重搜：

1. 已有 submitted source claim/cache/backing，只缺合法的 Phase-owned reference
   projection 或 `_INDEX.md` 行：应走 materialization repair。
2. 没有足够的 submitted、countable、topic-bound source：才创建有界的
   `wave1_topic_deepening` supplementary demand，并保持 novelty/backing rules。

这一区分是本 bug 的核心；单纯把 queue item 数量补到 floor，或复制既有 URL/文件，
都不构成修复。

### 真实 owner、关联与完成判据

- Owner chain: Wave1 count-floor evaluator → depth-review/queue demand admission →
  `phase-wave1.md` supplementary closeout。
- [BUG-137](BUG-137-reference-topic-filenames-omit-full-topic-slug.md) 和
  [BUG-136](BUG-136-reference-index-not-refreshed-after-wave-materialization.md)
  是另一 bundle 的 filename/index materialization defect；先排除这些 projection
  故障后，BUG-133 的 `6/5/5/6` 才是本 bundle 的真实 source/reference deficit。
- Regression fixture 应精确给出 `6/5/5/6`、floor `8`、ratio `0.4`，验证产生
  `2/3/3/2` 的可解释 repair demand；当已有 submitted backing 可 materialize 时，
  验证产生 projection repair 而非新搜索。
- Gate/inspect advice 必须暴露 topic、缺口、repair class 和合法路径，不能只指向
  泛化的 `reference/` 目录。
