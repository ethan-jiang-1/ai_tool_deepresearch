## Context

9 个 heavy wave playbook（`exp_wfn_wave0/1/2` 下的 case-211/212/221/222/223/231/232/233/234）在各自 wave-complete gate 上 FAIL。诊断定位到 `trace_event_present`（`wave{N}_completion`）规则：`phase-wave0.md`（第 227 行）、`phase-wave1.md`（第 365 行）、`phase-wave2.md`（第 324–326 行）把写 `wave{N}_completion` 事件定为 phase-agent 义务（用 `log-event.mjs --event wave{N}_completion`），但 9 个 playbook 的 bash block 全部漏写（grep 验证：每个 0 次）。

经验证：
- case-231/232/233（wave2）：补写 `wave2_completion` 后 wave2-complete gate PASS（三个 case 由 FAIL → PASS）。
- case-211（wave0）：补写 `wave0_completion` 后 `trace_event_present` 规则不再 FAIL。
- phase-wave1.md 同样文档化 `wave1_completion` 义务，wave1 gate 同规则——同根因、同修法。

事件不由 gate/engine 自动产生——它表示"phase 工作完成"，应在 gate 之前由 phase-agent（playbook runner）写入，符合项目"MD/Agent 编排多阶段流程、JS/Engine 只校验"的边界。

更广的 systemic 背景：另有 16 个 Light/Standard wave playbook（不同实验族）也运行 wave-complete gate 且同样漏写该事件。它们不在本 change 范围（见 Non-Goals），但根因相同，后续 change 按各自 capability 处理。

约束：不改 `DPT_FRAMEWORK/` 行为（CLAUDE.md OpenSpec phase gate + 本 change 声明无 version bump）。

## Goals / Non-Goals

**Goals:**
- 让 case-231/232/233 三个 wave2 heavy playbook 的 verdict 由 FAIL → PASS。
- 让 case-211/212/221/222/223/234 的 `trace_event_present` 规则不再 FAIL（这 6 个 case 仍因其它 blocker FAIL——见 Non-Goals——但 completion 这条根因消除）。
- 用最小改动（每个 playbook 加一行 log-event 调用）满足 RWE-010（覆盖全部 9 个 heavy wave playbook）。
- 不引入 framework 行为变化，不触发 version bump。

**Non-Goals:**
- 不修复 wave0/wave1 case 的**其它** blocker（211 的 stale `reference/` 路径、212/221/222/223 的 shared-ref/ledger/off-by-one 等）——这些是"第二刀"，留给后续 change。本 change 只负责 completion event 这一条根因。
- 不修 16 个 Light/Standard wave playbook（exp_wff_wave-gates / exp_wff_wave-chain / exp_engine-boundary / exp_evidence-extraction / exp_file-observability / exp_system-logging 下的同名缺陷）——不同实验族、不同 capability，留给后续 change。
- 不改 wave-complete gate 的任何规则或 engine 代码。
- 不把 completion 事件改为 gate 自动产生（见 Decisions 的替代方案讨论）。

## Decisions

**Decision 1: 修复点放在 playbook，不放在 gate/engine。**

- 选择：在 9 个 heavy wave playbook 的 wave-complete gate step 之前各补 `node DPT_FRAMEWORK/cli/log-event.mjs --bundle $B --event wave{N}_completion`（wave 对应）。
- 理由：phase-wave{N}.md 已把写 `wave{N}_completion` 明确定为 phase-agent 义务。事件语义是"phase 工作完成"，应在 gate 之前、由完成工作的 agent 写入——这正是 phase-agent（playbook runner）的职责，符合项目"MD/Agent 编排多阶段流程、JS/Engine 只校验"的边界。playbook 漏写是执行缺陷，应在 playbook 层修。
- 替代方案 A（否决）：让 `check-gate-wave{N}-complete.mjs` 在 pass 时自动 append `wave{N}_completion`。否决理由：① 改变 gate 语义——gate 只问不猜（context 明确"Gate 不持有路由、只校验"），让它写 phase-completion 事件违反职责边界；② `trace_event_present` 会变成"自己写自己查"的同义反复，规则失效；③ 触发 `DPT_FRAMEWORK/` 行为变化与本 change 的 no-version-bump 声明冲突。
- 替代方案 B（否决）：让 engine 在 wave relay merge 时自动写。否决理由：wave 多为 main-agent synthesis（非 delegated relay），不总是经过 relay merge；且同样越界。

**Decision 2: repair-loop / 多次 gate 的 playbook 只写一次。**

- 选择：在 case-212/222/233（gate-fail-repair 类）首次 gate 之前写一次对应 `wave{N}_completion`，后续 repair gate 复用同一事件。
- 理由：`trace_event_present` 只检查事件存在，不检查次数；phase 完成 semaphore 写一次即可。多写无害但冗余，保持最小改动。注意：首次 gate 是 EXPECTED-FAIL（测检测能力），写 completion 事件不影响其预期失败——失败由其它 defect 规则决定。

**Decision 3: 插入位置——紧邻 gate step 之前，独立 bash block。**

- 选择：在每个 playbook 的 "Run gate" bash block 之前新增一行（或一个小 block）调用 log-event.mjs。
- 理由：保持与 phase-wave{N}.md 文档化的"先完成 phase 工作 → 写 completion → 跑 gate"顺序一致；reviewer 一眼能看出补的就是文档化义务。

**Decision 4: 本 change 覆盖全部 9 个 heavy wave playbook，不只 wave2。**

- 选择：wave0（211/212）+ wave1（221/222/223）+ wave2（231/232/233/234）全修。
- 理由：`wave{N}_completion` 义务是 cross-wave 的（三处 phase 节点都文档化、三个 gate 都强制），9 个 heavy playbook 同根因。只修 wave2 是人为切分。RWE-010 作为通用 requirement，应在所声明的接受面（9 个 heavy wave playbook）内完全满足。wave0/wave1 case 修完这条后仍 FAIL（其它 blocker），但 completion 这条规则不再背锅——honest 的增量进展。

## Risks / Trade-offs

- [Risk] 仅修 9 个 heavy wave playbook，16 个 Light/Standard wave playbook 仍漏写 `wave{N}_completion`，RWE-010 对它们未满足。→ Mitigation：RWE-010 接受面明确限定为本 change 涉及的 9 个 heavy wave playbook（见 spec.md）；16 个 Light/Standard 在 proposal/design 显式列为 systemic gap，留给后续 change 按各自 capability 处理。
- [Risk] wave0/wave1 case（211/212/221/222/223/234）修完 completion 仍 FAIL，可能在 registry 留下"RWE-010 满足但 case 仍 FAIL"的混淆。→ Mitigation：RWE-010 只要求"写 completion 事件"（runner 接受面），不要求"gate 整体 PASS"（后者取决于其它 requirement，如 shared-ref/ledger，属其它根因）。tasks 的 verify step 会显式区分：completion 规则通过 ≠ gate 整体通过。
- [Risk] bundle 被外部进程清理（本会话发生过）导致 playbook 重跑时 trace 丢失。→ Mitigation：completion 事件在每次 playbook 运行时由该 playbook 自己重新写入（幂等），不依赖历史 bundle。
- [已知次要现象，非阻塞] case-232 的 fixture finding W2F-003 声明 `search_required: true` + `subagent_receipt_refs: [_subagents/wave_02/slot_01/runtime-receipt.jsonl]`，但该 fixture 不真正 spawn sub-agent、不创建该 receipt。wave2 gate 的 `detectRelayBypassSuspicion` 会因此在 inspect 中输出 `[relay_bypass_suspected]` 警告。经核对 `check-gate-wave2-complete.mjs` 第 368–382 行：该检查只 push 到 `inspect`、不置 `allPassed=false`——是 soft warning，不阻止 gate `passed:true`（已验证 case-232 加 wave2_completion 后 gate PASS）。本 change 不修这个 fixture 噪声（out of scope），留给后续清理 change。
- [Trade-off] playbook 各多一行 bash，略增长度。→ 可接受：换来 verdict 正确性与 phase 契约履行。

## Migration Plan

- 无数据迁移、无 API 变化、无 production run bundle 影响。
- Apply 步骤：编辑 9 个 playbook → 重跑 case-231/232/233 验证 FAIL→PASS，重跑 case-211/212/221/222/223/234 验证 completion 规则不再 FAIL → 更新 req-registry.yaml 加 RWE-010 → 跑 `check-project-reqs.mjs` + `check-project-specs.mjs`。
- 回滚：删除新增的 log-event 行即可恢复原状（playbook 回到原 FAIL，无副作用）。

## Open Questions

- 无。修复方向已由 case-231/232/233（PASS）+ case-211（completion 规则满足）+ 三处 phase 节点文档共同确认。
