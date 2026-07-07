# BUG-039: dpt-source-intake sub-agent 不写入声明的输出文件——研究数据仅返回在对话文本中

## 严重程度
P1 — sub-agent 完成了真实的 WebSearch + WebFetch（35+ tool uses, 4+ minutes），找到真实来源，但**不写入任何声明的输出文件**。`source.yaml`、cache 文件、`result.json`、`runtime-receipt.jsonl` 全部由 Phase Agent 事后手动创建。

## 复现

在本次 aidlc-investigation run 的 wave0 phase 中，5 个 `dpt-source-intake` sub-agent 均表现出此行为：

1. Phase Agent 通过 `operate-work-unit claim` 获取 work unit
2. Phase Agent spawn `dpt-source-intake` sub-agent，在 prompt 中传递了：
   - `task_ref`: 包含完整的输出契约（output contract, cache policy）
   - `beacon_ref`: 包含 `work_id`, `queue_item_id`, `receipt_nonce`, `bundle_dir`
   - `result_schema_ref`: 包含 result.json 的 JSON Schema
3. Sub-agent 执行搜索，在对话文本中返回详细的研究发现
4. 但 sub-agent **不写入任何文件**到文件系统

验证：work unit 目录下的 `runtime-receipt.jsonl` 为空（0 bytes），无 `result.json`，`source.yaml` 不存在。

## 根因分析

两种可能：

**假说 A**: `dpt-source-intake` agent type 的工具列表中不包含文件写入能力。需要检查 agent definition 中的 `tools` 配置。

**假说 B**: Sub-agent prompt 中的路径是 bundle-relative 的，sub-agent 不知道 bundle 的绝对路径，尝试写入失败后静默跳过（没有报错返回）。

**假说 C** (最可能): Sub-agent 将"返回研究结果文本"视为任务完成，没有理解"写入文件"是任务的一部分。Sub-agent 的 system prompt 或许没有强调文件写入是强制要求。

## 实际影响

Phase Agent 必须在每个 sub-agent 返回后手动：
1. 从对话文本中提取研究发现
2. 创建目录结构
3. 写入 `source.yaml`
4. 写入 cache 文件（`websearch.json`, `page.md`, `meta.json`）
5. 写入 `runtime-receipt.jsonl`
6. 写入 `result.json`
7. 运行 `operate-work-unit submit`

这完全破坏了 work-unit 的 delegated execution 模型——sub-agent 应自主完成整个 work unit，Phase Agent 不应成为文件写入的 bottleneck。

## 建议修复

1. **验证 dpt-source-intake agent 的工具列表**是否包含 Write/Edit/Bash（文件写入能力）
2. **在 sub-agent prompt 中显式声明**："You MUST write the following files to disk before returning. Failure to write files = work unit failure."
3. **在 task.md 中使用绝对路径**，从 `_beacon.json` 的 `bundle_dir` 拼接
4. **添加 write verification step**：sub-agent 在返回前应验证每个 `writes_to` 文件存在且非空

## 发现时间
2026-07-07，aidlc-investigation run，wave0 phase（5/5 sub-agents 均有此问题）
