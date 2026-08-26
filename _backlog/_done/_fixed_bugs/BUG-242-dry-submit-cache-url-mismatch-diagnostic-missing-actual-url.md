# BUG-242: work-unit dry-submit 的 cache-URL mismatch 诊断缺少 cache 实际 url，多次导致人工往返修复

- **Severity**: low（可用性/诊断信息不足；非阻塞，但多次真实发生并浪费大量修复时间）
- **Phase**: work-unit dry-submit（wave0_source_intake / wave1_topic_deepening）
- **报告日期**: 2026-08-26
- **Bundle**: `dpt_rb_chinese-ai-inference-chips-vs-nvidia`
- **报告者**: Phase Agent（真实 Deep Research run，首轮 + 2 轮 rerun）

## 摘要

`operate-work-unit.mjs dry-submit` 对 `accepted source claim cache trail maps to a different URL`（missing_cache）和
`accepted_source_urls[] entry has no matching accepted source_claims[] entry`（invalid_result）的 violation，
只给出 claim 侧的 url 与 cache leaf 路径，**不给出 cache leaf meta.json 中实际记录的 url**。
Agent 必须手动去读 `_cache/.../<leaf>/meta.json` 才能发现差异（通常是查询参数 `?cref=cj`、
domain 变体 `sina.com.cn` vs `sina.cn`、final_url vs url），然后手工改 claim url 或 accepted_source_urls。
本次 run 中至少 4 个 work unit 触发（wu-w0-b000-src-i0008、wu-w1-b000-deep-i0007、wu-w1-b000-deep-i0022 等），
每次都消耗数轮往返。

## 复现步骤

1. sub-agent 提交 result.json：`source_claims[i].url = "https://finance.sina.com.cn/..."`，
   而对应 cache leaf `meta.json#/url = "https://finance.sina.com.cn/...?cref=cj"`（带查询参数或 domain 变体）。
2. Phase Agent 运行 `operate-work-unit dry-submit`。
3. 输出 violation：`accepted source claim cache trail maps to a different URL for <claim.url>: <cache_leaf>`，
   `write_to` 指向 `result.json#/source_claims/<i>/url`，但**不包含 cache leaf meta.json 实际记录的 url**。
4. Agent 无法直接从 feedback 知道应改成什么值，必须 `cat` meta.json 才发现 `?cref=cj` 差异。

## 根因

cache-leaf 校验器（`gate-helpers-checks.mjs` / `cache-leaf-contract.mjs`）在比对 claim url 与 cache meta url 时，
错误消息只拼接了 claim url 和 leaf 路径，未把 leaf 的 `meta.json#/url`（或 source_url/final_url）实测值带进 `missing_fact` / `reason`。

## 期望行为

dry-submit 的 missing_cache/invalid_result 反馈应包含 cache leaf 实际记录的 url（meta.json 的 url/source_url/final_url 之一），
并明确指出差异维度（查询参数 / domain / trailing slash / scheme），使 Agent 能一次性修复，无需手动读 meta.json。

## 相关源码

- `DEEP_RESEARCH_HARNESS/engine/helpers/gate-helpers-checks.mjs`（cache trail 校验与 URL 比对）
- `DEEP_RESEARCH_HARNESS/engine/helpers/cache-leaf-contract.mjs`（cacheLeafMapping / normalizeCacheMappingUrl）
