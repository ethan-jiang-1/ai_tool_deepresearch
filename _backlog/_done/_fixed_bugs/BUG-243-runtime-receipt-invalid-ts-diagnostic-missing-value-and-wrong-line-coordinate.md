# BUG-243: work-unit runtime-receipt 无效 ts 的诊断缺少字段实际值，且修复坐标只指向 line 1

- **Severity**: low（可用性/诊断信息不足；非阻塞，但导致定位修复耗时）
- **Phase**: work-unit dry-submit（runtime_receipt 校验）
- **报告日期**: 2026-08-26
- **Bundle**: `dpt_rb_chinese-ai-inference-chips-vs-nvidia`
- **报告者**: Phase Agent（真实 Deep Research run，rerun#2）

## 摘要

sub-agent 写入 `runtime-receipt.jsonl` 时若生成非法 ISO 时间戳（本次实测值形如 `"ts":"2026-08-26T01:25:25.3NZ"`，`.3NZ` 是非标准后缀），
`operate-work-unit dry-submit` 报 `Runtime receipt line 1 fails receipt schema: ts: Invalid datetime`，
`write_to` 为 `.../runtime-receipt.jsonl#line=1`。**反馈未给出：**
1. 具体非法字段的原始值（`"2026-08-26T01:25:25.3NZ"`）；
2. 是 receipt 中哪一行、哪个字段；
3. 合法的 ISO 8601 格式预期（`YYYY-MM-DDTHH:mm:ss.sssZ`）。

Agent 必须手动 `head` receipt 逐行找非法 ts，再推断正确格式。本次 run 中 wu-w0-b000-src-i0026 全部 10 行 ts 均为 `.3NZ`，逐一替换为 `.300Z` 后才通过。

## 复现步骤

1. sub-agent 生成 receipt：`{"...","ts":"2026-08-26T01:25:25.3NZ",...}`（毫秒后缀非标准）。
2. Phase Agent 运行 `operate-work-unit dry-submit`。
3. 输出 `missing_receipt` violation：`Runtime receipt line 1 fails receipt schema: ts: Invalid datetime`，
   `write_to` 指向 `runtime-receipt.jsonl#line=1`——但实际所有行都是 `.3NZ`，修复坐标只说 line 1 有误导性。
4. Agent 需手动扫描整个 receipt 找所有非法 ts，并自行确定正确格式。

## 根因

runtime-receipt 校验器的 zod 错误被折叠成一行 `ts: Invalid datetime`，没有携带字段原始值；
`write_to` 的 `#line=1` 是 zod 首个失败行的坐标，未指出真实分布（所有行）。

## 期望行为

dry-submit 的 receipt 校验反馈应给出：
- 非法 ts 的原始字符串（`Invalid datetime: "2026-08-26T01:25:25.3NZ"`）；
- 全部受影响行号（而非只 line 1）；
- 合法格式预期（如 ISO 8601 UTC，例 `2026-08-26T01:25:25.300Z`）。

## 相关源码

- `DEEP_RESEARCH_HARNESS/engine/`（runtime-receipt schema 校验，zod `ts: z.iso.datetime()` 类）
- `operate-work-unit.mjs` dry-submit 的 runtime_receipt 校验分支
