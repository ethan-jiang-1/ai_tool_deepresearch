# BUG-037: sub-agent 写入路径漂移——文件泄露到项目根目录而非 active bundle

## 严重程度
P1 — sub-agent 将 `artifacts/`、`_work_units/`、`_cache/` 等运行时目录写到了项目根目录 (`/Users/bowhead/ai_tool_deepresearch/`) 而非 active bundle (`dpt_rb_aidlc-investigation/`)。污染项目根目录，且文件对 gate 不可见。

## 复现

在本次 aidlc-investigation run 中：

1. Phase Agent 通过 `operate-work-unit claim` 拿到 work unit（如 `wu-w0-b000-src-i0003`），其 `work_unit_dir` 为 `_work_units/wave0/wu-w0-b000-src-i0003`（bundle-relative）
2. Phase Agent spawn `dpt-source-intake` sub-agent，在 prompt 中传递了 `task_ref`、`beacon_ref`、`result_schema_ref` 等路径
3. Sub-agent 执行 WebSearch + WebFetch 后，将 `result.json`、`runtime-receipt.jsonl` 写入 **项目根目录** 的 `_work_units/wave0/wu-w0-b000-src-i0003/` 而非 bundle 内的对应路径

## 实际泄漏目录

```
/Users/bowhead/ai_tool_deepresearch/artifacts/         ← 不应存在
/Users/bowhead/ai_tool_deepresearch/_work_units/        ← 不应存在
/Users/bowhead/ai_tool_deepresearch/_cache/             ← 不应存在
/Users/bowhead/ai_tool_deepresearch/--help              ← Sub-agent 运行 operate-queue --help 的输出泄漏
```

这些目录应该在 `dpt_rb_aidlc-investigation/` 内。

## 根因分析

Sub-agent 接收到的 prompt 中包含 bundle-relative 路径（如 `_work_units/wave0/wu-w0-b000-src-i0003/result.json`），但 sub-agent 的 working directory 是项目根目录而非 bundle 目录。Sub-agent 没有从 `_beacon.json` 中读取 `bundle_dir` 字段来解析绝对路径。

`_beacon.json` 中已有 `bundle_dir` 字段：
```json
{
  "bundle_dir": "/Users/bowhead/ai_tool_deepresearch/dpt_rb_aidlc-investigation",
  "work_unit_dir": "_work_units/wave0/wu-w0-b000-src-i0003"
}
```

但 sub-agent 未消费此信息。

## 建议修复

1. **Phase Agent 侧**：在 spawn sub-agent 的 prompt 中显式传递 bundle 绝对路径，要求 sub-agent 将所有输出路径拼接为 `<bundle_dir>/<relative_path>`
2. **Sub-agent 侧**：要求 sub-agent 在写入任何文件前必须先读 `_beacon.json`，从中获取 `bundle_dir`，所有输出路径 MUST 以 `bundle_dir` 为前缀
3. **Work unit task.md**：`task.md` 中的路径引用应使用绝对路径或明确标注 base directory

## 发现时间
2026-07-07，aidlc-investigation run，wave0 phase
