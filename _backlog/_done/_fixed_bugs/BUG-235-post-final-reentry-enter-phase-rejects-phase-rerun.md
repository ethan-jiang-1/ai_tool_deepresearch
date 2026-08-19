# BUG-235: post_final_reentry 之后 `enter-phase phase-rerun` 被确定性 handoff 检查拒绝，没有任何合法通道进入 rerun 节点

> 状态: 用户指示结案（未宣称实现修复） | 优先级: P1 | 严重度: P2 | 更新: 2026-08-19 | source: 真实 run 执行（dpt_rb_enterprise-ai-transformation-six-cases，Final 交付后用户发起 evidence-expanding rerun）

## Resolution (2026-08-19)

This card is archived at the user's direction as a closed residual record. The
current implementation did not produce a new deterministic fix for the
`enter-phase` exceptional post-final handoff; the observed ERROR boundary and
the smallest repair directions below remain the authoritative diagnostic
record. Do not interpret this archive move as a PASS or as proof that the bug
is fixed in code.

## Why（完整上下文）

用户看完已交付的 Final 报告后，要求 evidence-expanding rerun（补充 6 家公司组织多角色 AI 采用证据）。这是唯一被接受的 post-final reentry 语义（`operate-post-final-recovery.mjs` 只接受 closed `post_final_rerun` retained request）。

按 `command_playbook/post-final-recovery.md` §4，apply 成功后的消费顺序是：

```bash
node enter-phase --bundle <bundle> --node phases/phase-rerun.md
node advance-status --bundle <bundle> --to hitl2_recorded
node check-reentry --bundle <bundle> --at hitl2_recorded
```

实测（本次 run）：

1. `operate-post-final-recovery apply` 返回 `verdict: committed`，`next_action.kind: enter_phase`，`target_ref: phases/phase-rerun.md` —— 明确指示进入 phase-rerun。
2. 但 `enter-phase --node phases/phase-rerun.md` 返回 **error**：

```text
{"status":"error","reason":"requested node \"phases/phase-rerun.md\" is not authorized by
 latest deterministic handoff; latest target is \"phases/phase-final.md\" from readiness-passed",
 "advice":["Run enter-phase with the latest check.next: ... --node phases/phase-final.md"]}
```

3. 与此同时，`advance-status --to hitl2_recorded` 成功（`source_handoff_kind: post_final_reentry`，`idempotent: true`），`check-reentry --at hitl2_recorded` 通过，`rb_status.json#/current_node` 显示 `phases/phase-rerun.md`，`operate-topic-state inspect` 也确认 `context: rerun` 已激活。
4. 也就是说：**状态已经进入 rerun 上下文，但没有对应的 `load_complete` witness**，`enter-phase` 的确定性 handoff 检查始终拒绝 phase-rerun。Agent 只能依赖 status 位置绕过 enter-phase 继续（本次即如此），造成 witness 缺失 + 与官方 playbook §4 第一步直接矛盾。

## 复现

1. 一个已合法 Final 交付的 bundle（`readiness_passed`，`current_node: phases/phase-final.md`）。
2. `operate-post-final-recovery inspect` → `eligible`。
3. 保留 `post_final_rerun` request，`operate-post-final-recovery apply` → `committed`。
4. 执行 playbook §4 第一步 `enter-phase --node phases/phase-rerun.md` → 上述 error。
5. 任何后续合法操作都拿不到 phase-rerun 的 load_complete witness；只能靠 status 位置继续，或卡死。

## 影响（本 run 实账）

- 用户从 Final 发起 rerun 是 Deep Research「多次打磨」的核心场景（Final 后不满意 → rerun 补证据），但官方路径第一步就断：playbook 让你 enter-phase，enter-phase 拒绝。
- Agent 被迫绕过 enter-phase（直接依赖 advance-status/status 位置），导致 phase-rerun 没有 load_complete witness。后续 gate（`check-gate-rerun-ready`）在本 run 仍通过（`attempt 1 first`），但这是靠状态位置侥幸，不是 witness 正确性。
- 若某个 gate/check 严格要求 load_complete witness，这条路径会彻底卡死，用户必须手动干预。
- 影响面：所有 post-final rerun（C5）都会命中——这是 evidence-expanding 迭代的必经路径。

## 为什么是框架缺陷（不是 Agent 执行错误）

- `operate-post-final-recovery apply` 的返回 `next_action.kind: enter_phase / target_ref: phases/phase-rerun.md` 与 `enter-phase` 的实际行为矛盾：apply 声称可以 enter，enter-phase 拒绝。
- `enter-phase` 只认「latest deterministic handoff」（trace 里的 load_complete/gate_attempt witness），而 post_final_reentry 是 **exceptional handoff**，apply/advance-status 建立的 reentry 状态（`source_handoff_kind: post_final_reentry`、`current_node: phase-rerun`）没有被 enter-phase 的授权检查识别。
- playbook §4 把 `enter-phase phase-rerun` 列为第一步，但没有说明如何让 enter-phase 接受 exceptional handoff；文档与实现的握手缺失。
- 这不是 weak-model 执行问题：任何按 playbook 走的 Agent 都会命中。

## Owner / 最小修复方向

`enter-phase`（`DEEP_RESEARCH_HARNESS/cli/enter-phase.mjs` + `engine/helpers/handoff-helpers.mjs` 或对应 loader）与 `operate-post-final-recovery`（`cli/operate-post-final-recovery.mjs`）的握手：

1. 让 enter-phase 识别 `source_handoff_kind: post_final_reentry`（或 profile 里已记录的 HITL2 `user_decision: rerun` + apply 事件）作为进入 `phases/phase-rerun.md` 的合法授权来源，写 load_complete witness，而非只认 deterministic chain。
2. 或让 `operate-post-final-recovery apply` 直接产出 phase-rerun 的 load_complete witness（apply 已确认 reentry 合法），使 enter-phase 的 latest-handoff 检查能看到它。
3. 统一 playbook §4 与实现的顺序/前置：若 enter-phase 需要 rerun-ready gate 先过（如 `check-gate-rerun-ready`），则 playbook 应先说明，或在 apply 的 next_action 里给出正确顺序（本 run 实测 rerun-ready gate 在 status 已进入 rerun 上下文后可直接通过，说明 gate 不阻塞，是 enter-phase 的授权检查阻塞）。
4. 增加确定性测试：合法 Final → post_final_reentry apply → enter-phase phase-rerun 成功并写 load_complete witness 的完整链。

## 关联

- `DEEP_RESEARCH_HARNESS/command_playbook/post-final-recovery.md` §4（enter-phase 第一步）
- `DEEP_RESEARCH_HARNESS/cli/operate-post-final-recovery.mjs`（apply 返回 enter_phase next_action）
- `DEEP_RESEARCH_HARNESS/cli/enter-phase.mjs`（latest deterministic handoff 授权检查）
- 本 run 实账：`dpt_rb_enterprise-ai-transformation-six-cases`（post-final rerun，`d5f82ed5-74bc-4b6d-826f-a3156543073a`），trace 含 `post_final_reentry` 相关事件
- 既有相关：[BUG-233](../bugs/BUG-233-work-unit-two-orphan-transaction-deadlock.md)、[BUG-234](../bugs/BUG-234-work-unit-transaction-concurrent-write-false-positive.md)（同 run 的另外两个事务层缺陷）
