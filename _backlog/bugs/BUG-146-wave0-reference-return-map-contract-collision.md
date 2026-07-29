---
bug_id: BUG-146
title: "Wave0 shared reference format conflicts with unconditional return-map inspection"
severity: P2
discovered: 2026-07-29
bundle: dpt_rb_openspec-evolution-popularity-user-demands
phase: wave0
node: phases/phase-wave0.md
category: reference-return-map-contract
status: resolved
resolved: 2026-07-30
resolved_by: openspec/changes/archive/2026-07-30-converge-artifact-contract-evaluators
verification: openspec/changes/archive/2026-07-30-converge-artifact-contract-evaluators/apply-evidence.md
---

# BUG-146: Wave0 shared reference format conflicts with unconditional return-map inspection

## C1 Disposition (2026-07-30)

Resolved by OpenSpec change `converge-artifact-contract-evaluators` (v0.61).
Wave0 inspect now sends only declared Seed Topic projection slots to the
return-map evaluator; submitted rich references retain their format and backing
consumers. The recorded real bundle passed `inspect-wave0-output` with 31
checks, no failed rule IDs, and no return-map root. Deterministic verification
coordinates are retained in the change's `apply-evidence.md`.

The same real-bundle run still emits non-blocking reference filename advice.
That presentation guidance is neither a return-map failure nor a submitted
backing failure and is outside C1's evaluator-scope repair.

## 现象

Wave0 的 delegated source-intake actor 已按当前 shared reference template 产出并正式
提交 `reference/00-shared-agent-responsiveness.md` 与
`reference/00-shared-checkpoints-and-recovery.md`。两份文件都包含完整的 reference
metadata 和五个 required semantic sections，但不包含 Seed Topic return-map entry
字段。随后 Wave0 inspect 把它们作为 return-map 文档检查，并报告：

```text
[return_map_missing_fields] reference/00-shared-agent-responsiveness.md:
missing evidence_meaning, relationship, refs, status, next_hop.
[return_map_missing_fields] reference/00-shared-checkpoints-and-recovery.md:
missing evidence_meaning, relationship, refs, status, next_hop.
```

这使一个依照正式 reference producer contract 生成的 shared reference 仍然让
`inspect-wave0-output` 失败；在其它 queue/work-unit 根因修复后，它会继续阻断 Wave0
closeout。

## Red loop（已运行）

当前真实 bundle 在 `i0004` formal submit 和合法 Seed Topic projection apply 后运行：

```bash
node DPT_FRAMEWORK/cli/inspect-wave0-output.mjs \
  --bundle /Users/bowhead/ai_tool_deepresearch/dpt_rb_openspec-evolution-popularity-user-demands
```

输出的 `failed_rule_ids` 包含 `return_map_missing_fields`，并逐一列出上述两个已提交
shared reference。为隔离这个 direct root，直接调用同一个 public helper 的 reference
扫描：

```bash
node --input-type=module -e "import { inspectReferenceReturnMaps } from './DPT_FRAMEWORK/engine/helpers/return-map.mjs'; const r=inspectReferenceReturnMaps('/Users/bowhead/ai_tool_deepresearch/dpt_rb_openspec-evolution-popularity-user-demands'); console.log(JSON.stringify({passed:r.passed, inspect:r.inspect.filter(x=>x.includes('00-shared-agent-responsiveness')||x.includes('00-shared-checkpoints-and-recovery'))}, null, 2));"
```

稳定结果为 `passed: false`，并只针对这两份 shared reference 返回缺失五个
return-map 字段的错误。此 repro 不依赖网络、actor availability 或 source.yaml 内容。

## 规范与实现冲突

当前 `shared-reference-template.md` 的 reference contract 明确规定 reference 由
metadata block 和五个 semantic sections 构成；其 required metadata/sections 列表没有
return-map 字段。Wave0 的 `operate-topic-state` projection packet 则把
`evidence_meaning`、`relationship`、`refs`、`status`、`next_hop` 定义为 Seed Topic
`wave0_evidence` entry 的字段。

但 `DPT_FRAMEWORK/engine/helpers/return-map.mjs` 的
`inspectReferenceReturnMaps()`（约 1104–1123 行）对 `reference/` 下每个非索引 Markdown
直接调用 `validateReturnMapContent()`；后者默认要求五个 return-map 字段（约 345–372
行）。因此 reference file contract 和 return-map entry contract 被错误地当成同一个
文档 contract。

## 预期行为

1. Wave0 shared reference 应由 reference-format evaluator 检查 metadata、五个 semantic
   sections、source URL 与 submitted work-unit backing。
2. Seed Topic 的 `wave0_evidence` section 应由 return-map evaluator 检查五个 entry-local
   fields 和 concrete reference navigation。
3. 一个合法 shared reference 缺少 return-map entry fields 时，不应让
   `inspect-wave0-output` 失败；如果保留 reference-map diagnostic，应将其限定为只检查
   实际声明/承载 return-map entries 的文档，或标为不影响 Wave0 closeout 的 advisory。
4. 修复反馈应清楚指出 direct contract owner，不应要求 actor 向 rich reference 文件
   填入并非其 producer contract 的 Seed Topic fields。

## 实际行为与证据边界

- i0004 的 `result.json` 已通过 dry-submit 和 formal submit，submitted ledger 覆盖两个
  reference output；这证明不是 filesystem-only reference 绕过 provenance 的问题。
- 两份 shared reference 的 metadata、Key Facts、Core Content Capture、Relevance To
  This Research、Quotable Terms / Concepts、Risks And Limitations 均存在。
- `return_map_missing_fields` 的错误文本本身说明它只在“counted into check.passed=false”
  时阻断，但当前 `inspect-wave0-output` 将 reference map 的失败分类合并为 blocking，
  所以实际 checkpoint 仍返回 `check.passed: false`。
- 本卡不把当前 inspect 中其它尚未完成的四个 work unit、缺失的其它 topic source.yaml、
  shared reference 数量 floor 或 `_INDEX.md` 问题归因于此 bug；它只记录 shared reference
  与 return-map parser 的独立 contract collision。

## 诊断结论

直接根因是 `inspectReferenceReturnMaps()` 无条件扫描并以 return-map grammar 解析所有
`reference/*.md`，而 reference template/flat-format contract 将 rich reference 和 Seed
Topic return-map entry 设计为两个不同的消费面。该错误会把合法、已提交的 Wave0
foundation reference 转化为 closeout blocker，属于 current-head framework contract
bug，不是用户内容质量问题。

## 建议方向（需走 OpenSpec propose/explore/apply）

- 明确 reference-format 与 Seed Topic return-map 的 evaluator 边界；让 Wave0 inspect
  对 shared references 使用已有 reference-format/backing evaluator，避免把整个
  `reference/` 目录送进 return-map entry validator。
- 保持 Seed Topic `wave0_evidence` 的五字段与 concrete reference navigation 检查不变；
  不要为了让 parser 通过而把 return-map fields伪装进每个 rich reference。
- 增加 focused regression：完整 shared reference 无 return-map fields 时，
  `inspectReferenceReturnMaps`/Wave0 inspect 不应产生 blocking missing-field finding；
  缺失 fields 的 Seed Topic projection 仍应被检测。
- 继续保留 submitted backing、reference format、index 与 return-map navigation 的
  各自 authority，不引入第二套 evidence ledger 或宽松的 filesystem bypass。

## Non-goals

- 不手工向当前已提交 actor-owned reference 追加不属于其 contract 的字段来掩盖问题。
- 不降低 shared-reference 数量 floor，不把 filesystem-only reference 算作 submitted
  evidence，不绕过 work-unit submit 或 Wave0 gate。
- 不修改 `operate-topic-state` projection packet 的 entry schema，也不取消 Seed Topic
  的 concrete reference navigation 要求。

## 接手信息

- Active bundle: `dpt_rb_openspec-evolution-popularity-user-demands`
- Red surface: `node DPT_FRAMEWORK/cli/inspect-wave0-output.mjs --bundle <bundle>`
- Isolated helper repro: `inspectReferenceReturnMaps(<bundle>)`
- Owner boundary: `DPT_FRAMEWORK/engine/helpers/return-map.mjs` reference scan + Wave0
  inspect composition, with reference-format/template contract as the comparison surface
- Current workaround: 暂不把该 defect 伪装成 reference content；继续提交其它合法 work
  units、应用 exact Seed Topic projection packets，并在后续对真实 direct root 重新检查。

## 模型与归因备注（2026-07-29）

- 本次主 Coding Agent：Codex；运行时可见模型族为 GPT-5，精确 deployment/model ID
  未暴露。该 finding 不依赖模型选择，属于确定性的 evaluator contract collision。
- 不应把 rich reference 缺字段归因给弱模型，也不应引导 Agent 向 reference 填入
  Seed Topic 的 return-map fields；那会把内容数据改坏来迎合错误 parser。
- 调整方向：对弱模型的有效 guidance 是明确“两种文档、两种 contract、两种 consumer”，
  但真正的修复责任仍在 framework evaluator scope，不是补数据。
