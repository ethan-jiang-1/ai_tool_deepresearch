# Plan: COMMANDS.md CLI Surface Coverage & Copyable Contracts

> 创建：2026-08-28 · 性质：活跃 plan（文件名即标识，完成移入 `../_done/_closed_plans/`）。
> 触发：真实 Agent 跑完 `dpt_rb_chinese-ai-inference-chips-vs-nvidia` 的 r6 evidence-expanding rerun（instantiation → wave0/1/2 → hitl2 → readiness → final，全链 CLI 实操）后，对 `DEEP_RESEARCH_HARNESS/COMMANDS.md` 做的一次「Agent 实际操作视角」复盘。
> 归属：本仓库 Agent 只做 plan/诊断，**不直接改 `DEEP_RESEARCH_HARNESS/`**；落地由 Harness 侧 change 走 OpenSpec propose→apply→archive。
> 前提：COMMANDS.md 的定位（交互契约 + 精确调用形态，非 flag 手册）是**对的**；本 plan 只补「覆盖率空洞 + 缺失的可复制模板」，不改引擎裁决行为、不新增命令。

## 结论一句话

COMMANDS.md 作为「想做某事就来查命令」的索引，**覆盖率有一个明显空洞**：Agent 实际最频繁使用的 `operate-queue.mjs` 生命周期（`enqueue`/`claim`/`check`/`complete`）几乎没进表，且若干「对不齐就报错」的 schema/模板（queue result、投影包、Evidence Map 列头）全部要靠读引擎源码或抄旧报告才能凑对。这些都属于「Engine 已严格校验、但 Agent 只能试错发现」的 contract，应提前写出来。

## Gap 清单（按「浪费 Agent 时间」排序，均带真实踩坑证据）

### G1. `operate-queue.mjs` 生命周期缺文档（最高优先）

- **现状**：COMMANDS.md 只提 `repair`（L96）和 `fail`（L110）；`enqueue`/`claim`/`check`/`complete` 全缺席。
- **踩坑**：`complete` 吃的是 **result.json 而非 enqueue task card**。第一次把 task card 喂进去 → `unrecognized_keys`，最后读 `engine/queue-manager-lifecycle.mjs:303` 才挖出 `QueueResultSchema`。
- **建议修复**：加一张 `operate-queue.mjs` 全生命周期行（`enqueue`/`claim`/`check`/`drain`/`complete`），并明确写出 `complete` 的最小 result schema：
  ```json
  { "queue_item_id": "<id>", "status": "done", "receipt": "<receipt|omit>", "summary": "<text>", "writes": ["<rel-path>"] }
  ```
  并显式标注「注意：这是 result 而非 enqueue 用的 demand/task card」。

### G2. 缺失三套 copyable schema/模板

Agent 反复踩的「形状不对就报错」contract，应落成可复制样板，而非靠读源码/抄旧报告：

1. **queue result**（归 G1）：`queue_item_id/status/receipt/summary/writes`。
2. **投影包**（`operate-topic-state apply --context wave_projection`）：wave0/wave1 用 `source_identity:{kind:"submitted_work",work_id}`；wave2 用 `{kind:"finding",finding_id}` 且 `entry_id === finding_id`（正则 `W2F-\d{3,}`）。**当前 `schema --context wave_projection` 只给 wave0 模板，wave2 的 conditional_forms 返回空 `[]`**，等于没帮到。
3. **Evidence Map 三列头**：`| Finding ID | Declared Key Finding | Submitted Backing |`；backing 必须指向已提交 `reference/*.md` 或 `artifacts/wave1/*/evidence-summary.md`（相对路径）。`publish-final-report` 报 `evidence_map_columns_invalid`「exactly one finding id column」时，唯一能查到的现成正确格式是抄旧报告。

- **建议修复**：在 `operate-topic-state` 行和 `Artifact Persistence` 行各加一段「copyable 模板」小节；或集中为 COMMANDS.md 尾部一个「Copyable Contract Templates」附录，三套模板各给一个最小正例 + 一个最小反例。

### G3. `projection_entry_concrete_ref_missing` 规则未前置

- **踩坑**：evidence-bearing 投影条目要么指具体 `reference/*.md`，要么用 defers 处置（`relationship:"defers", refs:["none"], status:"deferred"`）；否则报 `projection_entry_concrete_ref_missing`。最终把 8 个 r6 finding 全翻成 `defers` 才过。
- **建议修复**：在 `operate-topic-state` 行补一句「evidence-bearing entry 需 concrete ref 或 defers 处置」的 one-liner。

### G4. 队列 id 唯一后缀约定（`-rN`）未文档化

- **踩坑**：裸 `wave2-synthesis` 报「appears in both active_window and terminal_history」，需手改 `wave2-synthesis-r6`。
- **建议修复**：一行约定——「queue item id 需在 active_window + terminal_history 集合内唯一，历史已有同名时加 `-rN` 后缀」。

### G5. 大 stdout 需落盘（EAGAIN）未提示

- **踩坑**：大 JSON 输出时 CLI 抛 `errno -35`（EAGAIN），必须 `> file` 重定向再读。
- **建议修复**：Exit-Code Convention 节或 invocation 契约处补一句「大输出请 `> file` 落盘读取」。

### G6. gate 命令的 `--current-node` 必带参数未进表

- **踩坑**：`check-gate-wave2-complete.mjs --bundle <b> --current-node phases/phase-wave2.md` 的 `--current-node` 是必带参数，试错发现。
- **建议修复**：Phase Handoff 节补 gate `--current-node <file-ref>` 说明，并可一行列出六大 gate（wave0/1/2-complete、hitl1/hitl2-recorded、readiness-passed）的 `check.next` 推进链。

### G7. `persist-final-report` 不自动建目录

- **踩坑**：目标 `final/final_v7/<f>.md` 的父目录不存在时报 `target_parent_missing`，需先 `mkdir -p`。
- **建议修复**：Artifact Persistence 节补一句「目标父目录需预先存在」。

## 优先级建议

| 优先级 | Gap | 性质 | 涉及引擎改动 |
|---|---|---|---|
| P1 | G1（queue 生命周期 + result schema） | 纯文档补全 | 无 |
| P1 | G2（三套 copyable 模板） | 纯文档补全 | 无 |
| P2 | G3 / G4 / G5 / G6 / G7（gotcha one-liner） | 纯文档补全 | 无 |

**全部七项都是「提前把已经由 Engine 校验、但 Agent 靠试错才发现的 contract 写进 COMMANDS.md」**，零引擎裁决行为改动，落地成本低；可合为一个 OpenSpec change 一次归档，也可拆 document-only 的多次小 change。

## 边界（本 plan 不做）

- 不新增命令、不改 exit code 语义、不引入新 schema 字段。
- 不把手写对照表当第二真相源（`--to` 的 kebab↔snake 已明确由 manifest + enums.mjs 单一真相源，见 L73，保持现状）。
- 不把 COMMANDS.md 改成「end-to-end 流水线 walkthrough」——node 是控制面、COMMANDS 是索引，两个定位不混；本 plan 只补索引空洞，不引入第二份 walkthrough 叙事。

## 关联既有 plan

- `gate-schema-progressive-gate-schema-queue-remediation`（gate/queue 契约）与本 plan 的 G6 有交叠，落地时对齐 gate 契约的单一表述。
- `machine-checks-catalog.md`（`plans/` 参照资料，C3 触发时取用）——本 plan 的 G2「copyable 模板」若影响 checked-in 检查，可与该目录对齐。
