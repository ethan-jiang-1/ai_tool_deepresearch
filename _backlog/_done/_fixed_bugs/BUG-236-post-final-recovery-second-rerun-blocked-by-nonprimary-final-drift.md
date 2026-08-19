# BUG-236: post-final-recovery 无法链式发起第二次 rerun——rerun 完成并发布新 final 后，若 non-primary final 文件（final/topics/*.md）被修改，`proveNewerFinalAppend` 失败 → `accepted_lineage_drift` 永久阻塞

> 状态: 活跃 | 优先级: P1 | 严重度: P2 | 更新: 2026-08-19 | source: 真实 run 执行（dpt_rb_enterprise-ai-transformation-six-cases，第一次 org-roles rerun 完成、第二次 strategy/story rerun 被拒）

## Why（完整上下文）

Deep Research 支持多次打磨：Final 交付后，用户可通过 `operate-post-final-recovery.mjs`（C5/post_final_reentry）发起 evidence-expanding rerun。rerun 走完整 pipeline（wave0→wave1→wave2→hitl2→readiness→final），在 final 阶段可**修改 non-primary final 文件**（如 `final/topics/<slug>.md` 追加 org-roles 节）并 `publish-final-report` 发布新的 primary 版本。

但当用户想**紧接着再发第二次 rerun** 时，`operate-post-final-recovery inspect` 返回：

```text
{"verdict":"blocked","reason_code":"accepted_lineage_drift",
 "reason":"newer Final inventory is neither the accepted prior inventory nor a proven immutable canonical append"}
```

根因链（`DEEP_RESEARCH_HARNESS/engine/helpers/handoff-helpers.mjs`）：

1. `inspectPostFinalHandoffStage` 找到最后一次 `post_final_reentry` 事件（rerun 1 的 apply）。
2. 检测到该事件有 normal descendant 发布了 newer final（final_v2）→ 进入 `inspectNewerFinalStage`。
3. 该函数要求 `proveNewerFinalAppend(inventory, edge.previousFinal.final_inventory_sha256)` 成立（当前 inventory 去掉最新 revision 后哈希 == rerun-1 apply 时刻的 prior inventory sha）。
4. `proveNewerFinalAppend` 只移除 primary series 的 revision 条目（final_v2），**不处理 non-primary final 文件的内容漂移**。
5. rerun 1 期间 `final/topics/*.md` 被 in-place 修改（追加 org-roles 节），其内容 hash 已变；当前 inventory（final.md + final_v1 + 修改后 topic 文件 + final_v2）去掉 final_v2 后 = final.md + final_v1 + 修改后 topic 文件，**与 prior sha（记录原始 topic 文件）不一致** → append proof 失败 → `newer_final_inventory_drift` → `accepted_lineage_drift` 阻塞。

## 复现

1. Final 交付（含 `final/topics/` 非 primary 文件 + primary series）。
2. `operate-post-final-recovery apply`（rerun 1）→ 走完 pipeline → 在 final 阶段**修改 `final/topics/*.md`**（追加内容）→ `publish-final-report` 发布 final_v2。
3. 再次 `operate-post-final-recovery inspect` → `blocked / accepted_lineage_drift`。
4. 任何后续 rerun 请求都被阻塞；`apply` 同样被拒。无合法恢复路径。

## 影响（本 run 实账）

- 用户想看第二遍研究（strategy/story rerun），但框架拒绝发起。Deep Research「多次打磨」承诺在多轮 rerun 场景下断裂。
- 阻塞点精确：non-primary final 文件在 rerun 中被修改 → prior inventory sha 不可恢复 → `proveNewerFinalAppend` 永假。
- 若 rerun 的 final 阶段只发布 primary 版本、不碰 non-primary 文件，则能通过——本 bug 是"rerun 同时更新 topic 展开文件"这一常见场景的回归。

## 为什么是框架缺陷（不是 Agent 执行错误）

- 修改 `final/topics/*.md` 是 Final 阶段对 non-primary final 文件的合法呈现更新（用户明确要求的九话题展开 + org-roles 补充）。
- `proveNewerFinalAppend` 只对 primary series 做 append 证明，没有把 non-primary final 文件的内容变更纳入 lineage 计算——它假设 non-primary final 文件在 rerun 间不可变。
- 多轮 rerun（第二次+）是产品核心场景，框架应支持，而非在 inspect 处 fail-closed 且无恢复路径。

## Owner / 最小修复方向

`inspectNewerFinalStage` / `proveNewerFinalAppend`（`DEEP_RESEARCH_HARNESS/engine/helpers/handoff-helpers.mjs`）：

1. 让 lineage/append 证明**排除或纳入 non-primary final 文件**：若 non-primary final 文件（`final/topics/*`、非 primary series）在 newer-final 阶段被合法修改，应视为 lineage 演进而非 drift——例如把 `final_inventory_sha256` 只基于 primary series（final/final*.md），或把 non-primary final 文件的修改记录为可验证的 canonical update。
2. 或给 `retired_by_newer_final` 一个显式的非-primary 文件基线：`previous_final` 的 sha 应可被"当前 non-primary final 文件集合"重新计算，而不是冻结在 apply 时刻。
3. 增加确定性测试：两次连续 post-final rerun，第二次在 final 阶段修改 `final/topics/*.md` 并发布新 primary，断言第二次 `inspect` 返回可发起而非 `accepted_lineage_drift`。

## 关联

- 前置已修：[BUG-235](../bugs/BUG-235-post-final-reentry-enter-phase-rejects-phase-rerun.md)（post_final_reentry 进入 phase-rerun 的 handoff 问题，用户已归档）——本 bug 是同一 C5/post-final 路径上更靠后的断点。
- `DEEP_RESEARCH_HARNESS/engine/helpers/handoff-helpers.mjs`：`inspectNewerFinalStage`（~428）、`proveNewerFinalAppend`（~407）
- `DEEP_RESEARCH_HARNESS/cli/operate-post-final-recovery.mjs`
- 本 run 实账：`dpt_rb_enterprise-ai-transformation-six-cases`（rerun 1 完成 + final_v2 发布后，rerun 2 inspect 被拒）
