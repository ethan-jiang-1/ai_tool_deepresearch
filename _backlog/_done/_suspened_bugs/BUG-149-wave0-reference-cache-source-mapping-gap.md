---
bug_id: BUG-149
title: "Wave0 formal submit accepts a shared reference whose declared source URL has no valid cache mapping"
severity: P2
discovered: 2026-07-29
bundle: dpt_rb_openspec-evolution-popularity-user-demands
phase: wave0
node: phases/phase-wave0.md
category: reference-cache-provenance
---

# BUG-149: Wave0 reference output can pass submit without a valid source/cache mapping

## 现象

`wu-w0-b000-src-i0005` 的 actor result 声明了：

```json
{
  "path": "reference/00-shared-user-capability-boundaries.md",
  "role": "reference",
  "source_url": "https://openspec.dev/docs/concepts"
}
```

该 URL 的 cache leaf `s05_openspec-concepts` 是 HTTP 404 degraded capture；actor 的
`cache_trails[]` 还没有声明该 leaf。reference 同时写入了有效的 GitHub concepts source，
但其 primary `source_url` 仍包含这个无法作为 accepted backing 的 404 URL。结果通过了
dry-submit 和 formal submit，直到 Wave0 inspect 才发现 mapping 缺口并阻断 closeout。

## Red loop（已运行）

```bash
node DPT_FRAMEWORK/cli/inspect-wave0-output.mjs \
  --bundle /Users/bowhead/ai_tool_deepresearch/dpt_rb_openspec-evolution-popularity-user-demands
```

稳定 finding：

```text
[cache_coverage] FAIL: wu-w0-b000-src-i0005:
reference/00-shared-user-capability-boundaries.md
(source_url: https://openspec.dev/docs/concepts) not mapped to any valid cache trail.
```

对应的 `result.json` 的 `cache_trails[]` 列出了 `s01,s02,s03,s04,s06,s07,s09,s10,s11,s12,
s13,s14`，没有 `s05`（404 concepts）或 `s08`（404 commands）；正式 submit 仍返回
`status: submitted`。这不是 filesystem-only reference：reference 和 source.yaml 都在
同一已提交 work unit 的 `output_files[]` 中。

## 预期行为

1. Reference output 的每一个声明的 primary `source_url` 应能映射到一个 valid submitted
   cache trail，或明确记录 degraded/excluded 状态而不把它作为 accepted backing。
2. dry-submit/formal submit 与 Wave0 cache-coverage evaluator 对 reference source URL 的
   mapping 规则应一致；如果该检查只能在 Wave inspect 执行，应在 submit/task contract 中
   明确这是一个必经事实，而不是让 actor 误以为 submit 已完成 provenance。
3. 诊断应指出：缺失的 cache leaf、URL 的 HTTP 404/degraded 状态、reference primary URL
   和可用替代 backing（如 GitHub concepts URL）之间的修复边界。

## 诊断结论

直接缺口是 reference `source_url`、actor `cache_trails[]`、degraded-capture 语义与
Wave0 cache-coverage gate 没有在同一个 candidate checkpoint 上收敛。submit 只确认了
reference output shape/URL 存在，Wave inspect 才执行 mapping；因此“submitted”不能被
Phase Agent 直接理解为该 reference 已满足 Wave0 consumer/provenance coverage。

## 建议方向（需走 OpenSpec propose/explore/apply）

- 统一 reference output 的 source URL → cache/degraded trail mapping evaluator，或把
  缺失 mapping 映射为 dry-submit 的明确 repair root。
- 生成的 source-intake task 应要求 actor 对每个 reference primary URL 运行 URL/cache
  correspondence check；404 source 应改用真实 fetched backing 或显式排除。
- 保持 submitted ledger、cache authority 和 reference consumer projection 分离，不以
  `_INDEX.md` 或 filesystem presence 绕过 mapping。
- 增加 deterministic regression：reference output 声明 404/未列 cache URL 时 submit/gate
  产生同一个 direct root；valid GitHub fallback + matching cache 可通过。

## Non-goals

- 不手工修改已提交的 i0005 reference、cache 或 result，不通过追加假 cache 叶子消除错误。
- 不把 404 degraded page 当作 accepted evidence，不降低 shared-reference floor。
- 不与 BUG-146 的 rich-reference/return-map parser collision 合并。

## 接手信息

- Active bundle: `dpt_rb_openspec-evolution-popularity-user-demands`
- Red surface: Wave0 inspect `cache_coverage` for i0005 reference output
- Owner boundary: source-intake reference output contract + cache mapping evaluator
- Current workaround: 保留 direct mapping finding，按 actor/work-unit repair or supplementary
  source-intake path修复后重新 dry-submit/submit/inspect。

## Follow-up observation (2026-07-29)

本轮通过 `wu-w0-b000-src-i0006` 新增了一个有 raw GitHub cache backing 的 accepted
shared reference，并成功 submit；但原 `wu-w0-b000-src-i0005` 的
`reference/00-shared-user-capability-boundaries.md` 仍按 declaration-local
`cache_trails[]` 失败。新 work unit 的 cache 不能自动修复旧 declaration 的 mapping，
所以“supplementary source-intake path”只能补 floor，不能单独消除本卡的 direct root。
Wave0 当前仍保留该 finding；不要把新 supplement 当成旧 reference 已修复的证明。

## 模型与归因备注（2026-07-29）

- 本次主 Coding Agent：Codex；运行时可见模型族为 GPT-5，精确 deployment/model ID
  未暴露；delegated actor 的具体模型未持久化。
- 归因应标为“混合且 guidance 优先”：actor 把已知 404 的 `openspec.dev/docs/concepts`
  作为 primary reference source，确实像来源筛选/contract 阅读不足；但 submit 没有在同一
  checkpoint 验证 reference→valid cache mapping，导致一个可由更强任务提示避免的错误变成
  late Wave inspect blocker。
- 调整方向：任务必须逐个检查“reference primary URL、cache `meta.json` URL、三件套完整性”
  后才 dry-submit；404 只能作 degraded/排除，不能靠改已提交数据或追加假 cache 修复旧声明。

## Follow-up owner probe (2026-07-29)

对已提交的 `wu-w0-b000-src-i0005` 执行现有
`operate-work-unit recover-declaration`，结果为 `ok: true, changed: false, idempotent: true`；
它只能确认已有 declaration 可重放，不能为旧 result 增补 cache trail。随后同一 Wave0
inspect 仍只保留该 `cache_coverage` blocker。当前不再通过新增 supplement、伪造 cache
叶片或修改已提交 provenance 越过它。
