# exp_evidence-extraction — Suite Contract

> 编号段：case-161 至 case-169（预留 9 个 case）。与 `exp_engine-boundary`（case-401–409）和 `exp_file-observability`（case-310–319）共享机制族但不属于其 continuation。

## 为什么不是 engine-boundary 或 file-observability 的延续

- **engine-boundary**（40x 段）验证 Agent↔Engine 的正向/拒绝/去重边界——关注的是"Engine 接受或拒绝 Agent 产出的那条线"。evidence-extraction 关注的是"产出被接受后，Engine 如何对产出做 quality filtering + provenance mapping"——这是边界之后的下游处理。
- **file-observability**（31x 段）验证 bundle 目录审计和 orphan detection——关注的是"文件在不在、是否声明"。evidence-extraction 关注的是"声明了之后，文件是否可计数、cache 是否可溯源"——这是 ledger 消费端的 quality gate，不是目录审计端的 presence gate。
- **机制独立性**：`isCountable()` / `countReferences()`（EEX-001, EEX-002）是新的 Engine 质量判定层；`cache_coverage` gate rule（CRC-006）是新的 gate check 类型，不属于已有 `count_floor` / `content_dedup` / `ledger_coverage` 的语义范畴。

## 编号约定

| Case | Weight | 被测机制 |
|------|--------|---------|
| case-161 | light | cache_trails 验证 → delegated complete → ledger（fixture-backed） |
| case-162 | standard | gate count_floor + cache_coverage + file observability cache_gap + check-reentry（disposable bundle） |
| case-163 | heavy | 真实 Agent/Sub-agent rerun action:add 全链路 canary（要求真实外部调用） |

## 与已实现代码的关系

本 suite 的 case 将在 tasks §2–§7 实现后变为可执行。当前（tasks 未完成时）playbook 中的步骤引用的是预期代码路径——runner 执行时会因缺失的 helper/CLI 改动而 FAIL，FAIL 信息即为待实现功能的活文档。

## 执行规则

与其他 playbook 相同：Read → Step 1 → Step 2 → … → Verdict → Post-Execution Health → Cleanup（仅 PASS+CLEAN）。

对于 case-163（heavy），如果当前环境无真实 Agent actor surface（无 LLM API 可用），runner SHALL 记录 NOT RUN 并保留 bundle，不得从 fixture 标记 PASS。
