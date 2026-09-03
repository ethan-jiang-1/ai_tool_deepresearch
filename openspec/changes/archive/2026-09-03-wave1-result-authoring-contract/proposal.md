# Proposal: Wave1 Result-Authoring Contract — Generated Value-Domain Guidance And Dry-Submit Diagnostics

## Why

Wave1 真实重跑（bundle `dpt_rb_glm-5-3-deepseek-v4-domestic-chips`，2026-09-03）中，多个 delegated
dpt-evidence-extractor agent 首次提交的 `result.json` 被 dry-submit 拒绝。不是研究质量问题，而是
**结果书写合约的值域边界没有在生成的任务指引/校验诊断里说清**，导致同类错误反复（G1–G5）：
`cache_trail_refs`/`degraded_capture_ref` 写成 `<leaf>/page.md` 文件路径（应为 cache **leaf 目录**）、
`source_ref` 写成 leaf slug（应为当前 output_files 路径或已授权 prior output）、同一 URL 的 claim
被复制多份且 `accepted_source_urls[]` 与 claims 脱节、claim.url 与 leaf meta.json url 有 query/域名
差异。dry-submit 是事实上的唯一校验点，但它的诊断没有把这些规则一次性讲清。
来源：`_backlog/bugs/wave1-submit-result-authoring-gotchas.md`。

## What Changes

- **生成的 task.md「Cache And Source Facts」指引收紧值域**：当 assignment 的 output contract 允许
  `source_claims` 时，生成的 Completion Contract SHALL 明示
  (a) `cache_trail_refs[]`/`degraded_capture_ref` 的合法值 = 声明过的 cache **leaf 目录**集合
  （`cache_trails[]`），禁止写 `<leaf>/page.md` 文件路径；(b) `source_ref` 的合法值 = 本 WU
  output_files 路径或已授权 prior output（当前 envelope :480-481 已有半句，改为显式合法集合陈述，
  附一行正例/反例）；(c) claim.url 与 cache leaf meta.json 记录的 URL 应一致（差异时以 leaf 为准同步）。
- **dry-submit `invalid_result`/`missing_cache` 诊断补充可操作计数**：当 dry-submit/submit 已因 accepted-URL
  或 cache/degraded root 拒绝结果、且 accepted claims 中同一 URL 出现多份（重复 claim）时，结构化诊断
  SHALL 报告该 URL 的重复 claim 份数与 JSON-pointer 范围（纯 enrichment：重复 claim 本身 schema-legal，
  不得单独把通过的结果判失败，接受/拒绝 verdict 语义不变；G3）。
- **task.md Completion Contract 加入正例片段**：在「Cache And Source Facts」下提供一段已接受 submit 的
  正例 result.json 片段（含 1 accepted claim + 1 degraded claim 两种写法），一次覆盖 G1–G4 的取值直觉
  （engine 生成，随 kind/contract 条件化；非硬编码通用文案）。

**非目标（Excluded）**：不改 result schema 允许字段集（G 类错误全是取值错误而非 schema 缺失）；不改
提交资格/claim floor 行为（WAI-013 已存在）；不改 cache-leaf 占位判定（CRC-009 已存在）；不改已接受
submit 的正例语义，仅作指引；不修改 run bundle 现状。

## Capabilities

### New Capabilities

- 无。

### Modified Capabilities

- `agent/delegated-work-units`（DEW）：ADDED requirements —— (1) 当 output contract 允许 source claims
  时，生成的 task/Completion Contract 指引 SHALL 约束 `cache_trail_refs[]`/`degraded_capture_ref`/
  `source_ref`/claim.url 的取值域并提供 accepted+degraded 正例；(2) dry-submit 在 accepted claims 出现
  重复 URL 时 SHALL 在 `invalid_result` 诊断中报告重复份数（镜像 DEW-028/DEW-029 的「一次可修」诊断风格）。

## Impact

- **代码**：`DEEP_RESEARCH_HARNESS/engine/work-unit-envelope.mjs`（生成 task.md「Cache And Source
  Facts」/Completion Contract 的值域指引 + 正例片段；当前 :472-483 区域）、
  `DEEP_RESEARCH_HARNESS/engine/work-unit-validation.mjs`（`validateSourceClaims` 重复 claim URL 计数，
  当前 :735-841 区域）。
- **测试**：`tests/engine/`（envelope 生成文本断言、validateSourceClaims 重复 claim 计数）、
  `tests/integration/cli/operate-work-unit.test.mjs`（dry-submit 对重复 claim URL 报份数）。
- **不涉及**：无新依赖；无 schema 破坏；不改 dry-submit/submit 的接受/拒绝 verdict 语义（DEW-028 声明
  "verdict SHALL NOT change" 的同一原则延续到本 change）。

## Capability Discovery

| Candidate path | Evidence read | Decision | Reason |
| --- | --- | --- | --- |
| `agent/delegated-work-units` | `work-unit-envelope.mjs` task.md 生成（:472-483 值域半句）、`work-unit-validation.mjs` `validateSourceClaims`（:735-841 无重复计数）、DEW-013/DEW-028/DEW-029 诊断先例 | Modify | 生成指引 + dry-submit 诊断都属 DEW 管辖；value-domain guidance 由 engine 生成、随 contract 条件化 |
| `agent/agent-output-declaration` | AGO spec 只声明 result 的 output_files/cache_trails 声明与 ledger 写入（AGO-001..007），不含 source claim 取值指引 | Verify-only | 无 AGO requirement 行为变化；cache_trails 声明语义不变 |
| `research/wave1-intake` | WAI-013 claim floor（:538）已有；G 类错误是取值错误而非空 claims | Verify-only | claim floor 行为不变 |
| `workflow/shared-node-content` | shared-subagent-protocol.md 是 shared node 内容（§6 描述 cache/output 声明） | Excluded | 正例放入 engine 生成的 task.md Completion Contract（随 assignment 条件化），不改 shared node markdown 权威文本 |
| `bundle/cache-raw-web-content` | CRC-009 占位判定已存在；G1/G4 是 ref 指向错误而非 leaf 内容问题 | Excluded | cache leaf 内容判定不变 |

<!-- Source of authority: _backlog/bugs/wave1-submit-result-authoring-gotchas.md (G1-G5). -->
