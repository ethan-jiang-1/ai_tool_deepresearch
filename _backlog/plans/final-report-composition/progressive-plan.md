# Final Report Composition - Progressive Plan

> 状态：已归档。当前 Change 已收口 deterministic contract；不等待真实 Agent
> 语义行为实验。
>
> Tracking owner：本文件。每完成一项立即更新 checkbox、Current Checkpoint 和
> 证据链接。OpenSpec [`tasks.md`](../../../openspec/changes/archive/2026-08-15-final-report-composition/tasks.md)
> 是本 Change 的已归档执行账本，不是另一个 Change。

## Current Checkpoint

| Item | Current value |
|---|---|
| Archive | `2026-08-15-final-report-composition` |
| Current task | 无。Change 已通过 governed finalizer 归档。 |
| Completion boundary | schema、HITL2/Readiness Gate、restore/migration、Final guidance、deterministic E2E、case-131/132 fixture-backed proof 与 governed archive |
| Explicitly excluded | real-Agent recommendation、自然语言交互质量、跨 view 报告语义质量，以及所有 Sub-agent production path |
| Slow-case rule | 任一 native run 超过 120 秒，立即移入 `experiments_playbook/exp_extrem_slow/`，退出 active manifest 和 Change completion；不在本 Change 重试 |
| Future evidence | 若要补真实 Agent behavior，另开 Change，并先把单次运行 hard cap 设计为 60 秒以内 |

## Next Recommended Work

> 当前没有 active work。以下是新 initiative 的建议入口，不是对已归档 Change
> 的续写任务；在获准创建新 Change 前，不需要执行任何实验或代码修改。

- [ ] N0.1 **AWAITING APPROVAL**：创建一个范围受限的 OpenSpec Change，建议名为
  `fast-final-composition-evidence`，目标仅为取得一条真实 Agent 的 Final composition
  行为证据。
- [ ] N0.2 该 Change 的第一个 planning task：设计一个单场景、单次运行 hard cap 不超过
  60 秒的 real-Agent experiment，并预先定义 timeout 时的停止、记录和隔离路径。
- [ ] N0.3 验证结论只覆盖该场景中实际观察到的 Agent 行为；fixture、static check 和
  deterministic contract 不能被表述为报告语义质量证明。
- [ ] N0.4 `case-135`、`case-136` 保持在 `exp_extrem_slow/` 作为诊断参考，不重启、
  不纳入 active manifest，也不作为新 Change 的 completion evidence。

出口：新 Change 获准且其 proposal/design 明确了 60 秒实验、可观测完成条件和
timeout quarantine；否则本 initiative 保持关闭状态。

## How To Advance

1. Change 处于 active 状态时，只执行唯一被标记为当前的任务。
2. 先读取该任务链接的 OpenSpec task 和直接相关的 verification asset；不重开历史设计分支。
3. 达到 done condition 后立即改为 `[x]`，再将下一项设为当前任务。
4. 若发现新工作，不回写本已归档 Change；为它创建新 Change，并在其 task ledger 中记录 owner、最小修复和可观测完成条件。
5. 快实验失败可诊断；超时不是继续重试的理由，按 slow-case rule 隔离并继续确定性收口。

## Direction Lock

- [x] P0.1 Final 是唯一 terminal delivery node；`gate: null`，无 outgoing transition。
- [x] P0.2 Final Phase Agent 直接执行五步 Composition Pass。
- [x] P0.3 HITL2 是交付前最后一个用户交互 owner；Readiness 和 Final 不提问。
- [x] P0.4 不使用 Formal Composer、ad-hoc Sub-agent、第三个 HITL 或 Final Gate。
- [x] P0.5 Engine 只判断 schema、state、receipt、Gate 和 persistence，不判断报告语义质量。

出口：executor、交互位置、Source of Record 与 deterministic/semantic 边界不再是当前 Change 的开放问题。

## Contract And Implementation

- [x] P1.1 定义 profile-owned、strict、versioned、rerun-bound `composition_handoff` schema。
- [x] P1.2 定义 HITL2 -> Readiness receipt projection、fingerprint 和 shared evaluator。
- [x] P1.3 实现 HITL2 conditional admission、Readiness consistency、receipt-bound restore 与 legacy migration。
- [x] P1.4 更新 profile template/shared docs、HITL2 brief/phase、Readiness 和 Final guidance。
- [x] P1.5 Final 按 accepted handoff 和 verified state 执行 Reground、Answer Inventory、coverage/materiality、spine/placement、draft/self-check。
- [x] P1.6 保持 `persist-final-report` 为唯一 Final Markdown admission path；Final 无 question、wait、feedback loop、Gate、transition、receipt fallback 或 delegated production actor。

出口：不完整、过期或 drifted handoff 不能进入 Final；纯 projection drift 可机械 restore 并回到同一 Readiness checkpoint。

## Verification And Compatibility

- [x] P4.1 Schema、helper、HITL2 Gate、Readiness Gate、Markdown contract 与 rerun deterministic E2E 均通过；它们只证明 deterministic contract。
- [x] P4.2 `case-132-standard-hitl2-decision.md` 已取得有效 native PASS，作为 fixture-backed HITL2 Gate proof。
- [x] P4.3 `case-135` 与 `case-136` 均已移至 `exp_extrem_slow/`，从 active manifest 和 verification plan 移除；保留 timeout/FAIL 报告仅作诊断。
- [x] P4.4 case-132 retained PASS 仍符合当前 manifest；case-131 native Supervisor batch `97fbf949-cb51-40b4-943f-bd0680654084` 在 53781 ms 内 `PASS` 且 health `CLEAN`，三项 fixture-backed deterministic-contract checks 全部通过。
- [x] P4.5 已同步 CDE delta/main spec；accepted CDE 无 active real-Agent composition requirement，case-135/136 quarantine 与 JS-led replacement route 一致。
- [x] P4.6 strict OpenSpec、requirement/spec checks、verification-routing assets、semantic-closure assets 与 `git diff --check` 均通过；closeout review 无 actionable finding。
- [x] P4.7 finalizer preflight 所需的 Capability Discovery header 和 concrete candidate path 已修正；checker 与重复 closeout review 均通过。

出口：活跃验证资产没有超时 playbook，任何 completion claim 都能回溯到确定性 test、fixture-backed trace 或明确隔离的诊断边界。

## Archive

- [x] P5.1 所有 ordinary OpenSpec tasks 为 `[x]`，没有未关闭的 feedback finding。
- [x] P5.2 使用 `node openspec/governance/finalize-change-archive.mjs --change final-report-composition` 完成唯一受支持的 archive transition；归档为 `2026-08-15-final-report-composition`。
- [x] P5.3 已更新本文件的状态、最终证据与 archive 引用。

出口：已达成。accepted specs、Harness、tests、active playbooks 与本 tracking 计划一致。

## Test Asset Map

| Contract | Active proof | Non-blocking diagnostics |
|---|---|---|
| schema / normalization / receipt | schema + helper unit tests | none |
| HITL2 admission / Readiness / restore / migration | CLI integration + rerun deterministic E2E | case-135 quarantine |
| terminal delivery chain | case-131 fixture playbook + deterministic E2E | none unless it breaches 120 seconds |
| HITL2 decision matrix | case-132 fixture playbook | retained earlier failed batches |
| real-Agent interaction / report quality | deliberately unselected in this Change | case-136 quarantine; future sub-minute Change only |

## Definition Of Done

本 Change 已以可审计的 deterministic contract 收口，而不是“跑出了看起来不错的报告”。真实 Agent 行为证据既不由 fixture/static tests 冒充，也不由超时实验阻塞；它被明确记录为后续、带 60 秒 hard cap 的独立决策。
