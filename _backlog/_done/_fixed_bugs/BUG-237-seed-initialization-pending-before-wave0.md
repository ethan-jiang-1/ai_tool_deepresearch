# BUG-237 — Seed Topic 初始化正文在 Wave0 前仍为 pending，无法进行用户早期反馈

**状态**：活跃，待分诊  
**发现日期**：2026-08-24  
**来源**：真实 run `dpt_rb_ai-coding-evolution`（Codex，HITL1 → Seed Topics → Wave0）  
**严重性**：P2（研究体验/流程可见性；不直接破坏 Engine authority）  
**阶段**：Seed Topics / Wave0 closeout  

## 用户症状

HITL1 接受 Topic map 后，`seed_topics/*.md` 的 frontmatter 已有
`hypothesis`、`in_scope`、`out_of_scope`、`search_guardrails` 和
`evidence_route`，但 marker 内面向读者的初始化正文仍保留：

```text
pending — seed-topics Agent must enrich this section.
```

因此用户在 Wave0 之前无法看到每个 Topic 的初始假设、缺口、why now、交付价值和下游位置，也无法对研究方向提供有意义的早期反馈。

## 最小复现

当前 run bundle：

```text
/Users/bowhead/ai_tool_deepresearch/dpt_rb_ai-coding-evolution
```

复现命令：

```bash
node DEEP_RESEARCH_HARNESS/cli/inspect-wave0-output.mjs \
  --bundle /Users/bowhead/ai_tool_deepresearch/dpt_rb_ai-coding-evolution
```

当前确定性结果：

- `rb_status.json`：`current_node=phases/phase-wave0.md`，窗口为
  `seed_topics_ready -> wave0_complete`。
- `inspect-wave0-output`：`passed=false`。
- 五个 Seed Topic 均报告 `seed_projection_token`，且其初始化正文仍含
  `pending`。
- Wave0 的五个 source array 当前数量为 `3/4/4/2/3`，profile floor 为 `12`；因此 Wave0 本身也尚未通过。

## 预期行为

Seed Topics gate 通过并进入 Wave0 前，每个 Topic 至少应有一份可读的、非空的初始化正文，覆盖：

- 主题定位；
- 初始假设/缺口/张力；
- why now；
- 对最终交付物的重要性；
- 下游位置（或明确的 pending gap）。

机器字段与可读正文应由同一合法 enrichment 流程或同一 gate 共同约束，避免“frontmatter 已 enriched、正文仍 pending”的半完成状态被当作可进入下一阶段的有效体验。

## 初步归因

本次 run 暴露了两层问题，需分开确认：

1. **本次 Agent 执行遗漏**：`operate-topic-state apply --context seed_topics` 只完成了结构化 frontmatter enrichment，没有完成模板 marker 内的 Agent-owned Markdown body。
2. **潜在 Harness DX/contract 缺口**：`seed-topics-ready` gate 允许这一半完成状态通过；正文 `pending` 直到 Wave0 projection token 检查才暴露，反馈时机过晚。

本卡不预先断言必须修改 Engine；应先检查 seed-topics gate 是否应直接校验初始化正文，或是否已有明确的 Phase Agent repair contract 被遗漏执行。

## 相关 authority / non-goal

- 不得手改 `__BACKFILL_WAVE0_EVIDENCE__`；该 token 属于 Wave0 projection writer 的合法回填路径。
- 本卡不要求降低 Wave0 source floor，也不把 Wave0 未通过归因于 Seed 正文问题。
- 本卡不改变 canonical topic identity、evidence authority、queue/ledger/status writer 或 Gate routing。

## 建议分诊

- 复核 `phase-seed-topics.md` 的 queue completion contract 与 seed topic template：是否明确要求在 `seed-initialization:start/end` 内写入完整正文。
- 为“frontmatter enriched + body pending”建立确定性 red test；若属于合法 Agent action 漏步，则改善 gate hint/closeout guidance；若 gate 当前错误地允许该状态，则提出 bounded OpenSpec change。
- 验收应同时覆盖：五个 Topic 的正文可读性、`seed-topics-ready` gate 行为，以及 Wave0 projection token 仍由 Wave0 writer 负责。

## 证据边界

本卡只记录当前 bundle 的真实文件、Engine inspect 输出和状态事实；不声称已修复，也不把本次 Agent 的遗漏自动升级为已确认的框架缺陷。
