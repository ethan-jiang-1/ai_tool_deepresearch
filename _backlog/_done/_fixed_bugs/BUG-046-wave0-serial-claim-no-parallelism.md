# BUG-046: Wave0 source intake 串行执行，无法并行加速

## 严重程度
P2 — 吞吐量限制。Wave0 的 5 个 topic source intake 完全独立（搜索不同关键词、写不同文件、无共享状态），但当前 claim 策略一次只取一个 work unit，上一个 submit 完成才 claim 下一个，导致 5 个 topic 串行排队，research 总耗时 = 5×单个 sub-agent 耗时。

## 复现

在 `engelberg-tech-retreat-2026` run 中：

1. Wave0 入队 5 个 `wave0_source_intake` item（topics 01-05）
2. Main agent 调用 `operate-work-unit claim --count 1`，只 claim 了 topic 01
3. Topic 01 的 sub-agent 跑了 ~6 分钟完成搜索/抓取
4. Topic 01 submit 成功后，才轮到 topic 02（但被 BUG-044 卡死了）
5. Topic 02-05 全程在 `active_window` 中 idle，纯浪费等待时间

理想情况：5 个 topic 应可并行 claim 和运行——它们是独立的搜索任务，无数据依赖，不冲突。

## 根因分析 / 为什么会发生

不是框架硬限制——`claimWorkUnits` 已支持 `--count N`（`work-unit-core.mjs:1460`），`for` 循环可一次 claim 多个（line 1489），`delegated_in_flight` 是一个 map 可容纳多个 in-flight item（`queue.mjs:118`）。

限制来自**上层 Agent 的调用策略**：main agent 在 `phase-wave0.md` 的驱动下，每次只调用 `claim --count 1`，然后等 submit 完成才 claim 下一个。这是保守的 "safe sequential" 策略——最初是为了降低复杂度、确保 queue 状态可预测。

但 wave0 source intake 的 item 之间无依赖关系，并行执行不会产生冲突：
- 每个 topic 写不同的 `artifacts/wave0/<topic>/source.yaml`
- 每个 topic 写不同的 `_cache/wave0/primary/<topic>/` 路径
- 每个 topic 写不同的 reference 文件
- `submitWorkUnit` 的 transaction 按 work_id 独立操作，`delegated_in_flight` map 支持多 key

## 建议修复

1. **短期**：修改 `phase-wave0.md` 的执行策略——在入队全部 5 个 item 后，一次性 `claim --count 5`（或 claim 全部 active_window 长度）。`claimWorkUnits` 已支持此操作，无需改框架代码。main agent 一次性拿到 5 个 task.md，分派给 5 个 sub-agent 并行执行。

2. **短期**：将 claim 的 `--count` 默认值从 1 改为 `active_window.length`（或至少对 wave0 增加并行度上限参数）。可通过 `rb_profile.yaml` 的 `research_style_params` 增加 `wave0_parallelism` 字段控制。

3. **中期**：增加 "claim-as-ready" 模式——main agent 不需要等前一个 submit 完成就能 claim 下一个。当前这已经是支持的（`delegated_in_flight` 可以有多个 entry），只是 Agent 调用策略没利用。

4. **注意**：Wave1（per-topic deepening）的 item 也是按 topic 独立的，同样可受益于并行。但 wave2（cross-topic synthesis）必须等 wave1 全部完成，不能并行。

## 最新观测 (2026-07-08, fose-europe-engelberg-2026 run)

从 `rb_trace.jsonl` 提取的 Wave0 claim/submit 时序：

```
00:52:42  claim topic-01 (fose-retreat)           ← solo，孤零零
01:03:24  submit topic-01 ✅                       ← 10分42秒后才完

01:04:23  claim topic-02 (deer-valley)    ┐
01:04:50  claim topic-03 (engelberg)      │ 4 个在一分钟内
01:05:09  claim topic-04 (technical)      │ 快速发出
01:05:25  claim topic-05 (industry)       ┘

01:11:50  submit topic-04 ✅（后 claim 的先完成 — 并行特征）
01:13:38  submit topic-05 ✅
01:14:12  submit topic-03 ✅
01:16:15  submit topic-02 ✅
```

**状态：半并行，bug 未完全消除。**

改善的地方：
- topic 02-05 在 **sub-agent 层面并行执行**了——submit 时间交错，04 比 03 晚 claim 却先完成，证明子 agent 同时在跑

仍然存在的问题：
1. **Agent 不用 `claim --count N`**：每次 `requested_count: 1`，一个一个发 claim 命令，而不是一次 `claim --count 5`
2. **首轮串行浪费**：topic-01 孤零零跑了 10 分钟才轮到 02-05。如果一开始就 5 个一起 claim，总耗时可以砍到 ~7 分钟（最长那个 sub-agent 的耗时），而不是 23 分钟（01 的 10min + 02-05 的 13min）
3. **这仍然是 Phase Agent 调用策略问题**，不是框架能力问题——`claim --count N`、`delegated_in_flight` 多 entry 都已经支持

## 发现时间
2026-07-07，engelberg-tech-retreat-2026 run，Wave0 阶段观察到 topic 02-05 在队列中 idle 等待
