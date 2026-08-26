## Why

work-unit dry-submit 的两类确定性 violation 反馈缺少 Agent 一次性修复所需的实际值，导致真实
run 中反复人工往返：

- **BUG-242**：`accepted source claim cache trail maps to a different URL`（missing_cache）与
  `accepted_source_urls[] entry has no matching accepted source_claims[] entry`（invalid_result）
  只给出 claim 侧 url 与 cache leaf 路径，**不给出 cache leaf `meta.json` 实际记录的 url**
  （通常差异是查询参数 `?cref=cj`、domain 变体、final_url vs url）。Agent 必须手动读
  `_cache/.../<leaf>/meta.json` 才能发现差异。
- **BUG-243**：runtime-receipt 无效 `ts`（如 `"2026-08-26T01:25:25.3NZ"`）的反馈只报
  `Runtime receipt line 1 fails receipt schema: ts: Invalid datetime`，`write_to` 只指向
  `#line=1`（而实际全部行都是 `.3NZ`），既不给出字段原始值，也不说明合法 ISO 8601 格式。

两者都只是**诊断信息不足**（非阻塞、不改判定），但已多次真实发生并消耗大量修复轮次。

## What Changes

（本 change 只改 dry-submit 的**反馈内容**——把校验时已经拿到的实际值带进诊断；不改任何
校验判定、schema、normalization 或正式 submit 行为。）

- **BUG-242**：cache trail URL 比对失败时，诊断消息与 `details`/`missing_fact` 附上 cache leaf
  `meta.json` 实际记录的 url 列表（`url`/`source_url`/`final_url`/`fetched_url` 的归一化值，
  即 `cacheLeafMapping(meta).urls`），并点明差异维度（查询参数 / domain / trailing slash /
  scheme），使 Agent 能一次性决定改 claim url 还是补 cache_trails。
- **BUG-243**：runtime-receipt schema 失败时，诊断附上：(a) 非法字段的**原始字符串值**（如
  `Invalid datetime: "2026-08-26T01:25:25.3NZ"`）；(b) **全部受影响行号**（而非只报首个失败
  行）；(c) 合法格式预期（ISO 8601 UTC，如 `2026-08-26T01:25:25.300Z`）。
- 现有单元/集成回归更新为断言新诊断字段存在；不改判定语义。

## Capabilities

### New Capabilities

（无：不引入新 capability / requirement ID / prefix。）

### Modified Capabilities

- `agent/delegated-work-units`: 新增一条规范 requirement，钉住 dry-submit 修复诊断的
  **实际值携带**要求——cache-URL mismatch 与 runtime-receipt 无效 ts 的反馈必须携带校验时
  已取得的记录值（cache leaf 实际 url / 非法字段原始值 / 全部受影响行号 / 合法格式预期），
  作为 DEW-013「structured enough for Agent repair」的精化。

## Capability Discovery

| Candidate path | Evidence read | Decision | Reason |
| --- | --- | --- | --- |
| `agent/delegated-work-units` | `openspec/specs/agent/delegated-work-units/spec.md`（DEW-013 dry-submit preflight，line 1164-1172；DEW-023 bounded preflight） | Modify | dry-submit 反馈契约的 owner；新增诊断值携带 requirement |
| `bundle/cache-raw-web-content` | `openspec/specs/bundle/cache-raw-web-content/spec.md`（cache leaf 结构 owner） | Verify-only | 只读取 cache leaf meta 字段，不改 cache 布局契约 |
| `engine/check-inspect-feedback` | 本 change 上下文 | Excluded | 不新增 feedback vocabulary，只在该 surface 现有字段内补值 |
| `engine/cli-inspect-output-conventions` | 本 change 上下文 | Excluded | 不新增 inspect 输出约定，只携带实际值 |
| `agent/work-unit-provenance-gate` | — | Excluded | 不触碰 gate 判定 |

## Impact

- 直接源码：`DEEP_RESEARCH_HARNESS/engine/work-unit-validation.mjs`
  （cache-URL mismatch 诊断 line ~812-816；runtime-receipt schema 失败诊断 line ~384），
  及其依赖的 `cacheLeafMapping`（`DEEP_RESEARCH_HARNESS/engine/helpers/cache-leaf-contract.mjs`，
  只读使用，不改）。
- 回归测试：`tests/engine/work-unit-submit.test.mjs` / `tests/engine/helpers/` 中相关
  cache-trail 与 runtime-receipt 校验断言，新增诊断字段存在性断言。
- 依赖/系统：无新依赖；Node >=20 ESM、zod/yaml 不变。
- 非目标：不改任何判定 / schema / normalization / 正式 submit；不为真实 bundle 手改
  result / cache / receipt。
