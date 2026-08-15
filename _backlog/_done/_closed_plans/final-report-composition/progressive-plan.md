# Final Report Composition - Progressive Plan

> 状态：已关闭。`final-report-composition` 和后续的
> `fast-final-composition-evidence` 均已 governed-archived；后者的一次授权运行以
> `agent_timeout` 收口为 no-evidence，不等待重试或真实 Agent 语义行为成功。
>
> Tracking owner：本文件。每完成一项立即更新 checkbox、Current Checkpoint 和
> 证据链接。OpenSpec [`tasks.md`](../../../../openspec/changes/archive/2026-08-15-final-report-composition/tasks.md)
> 是本 Change 的已归档执行账本，不是另一个 Change。

## Current Checkpoint

| Item | Current value |
|---|---|
| Archive | `2026-08-15-final-report-composition`；`2026-08-15-fast-final-composition-evidence` |
| Current task | 无。两个 Change 均已通过 governed finalizer 归档。 |
| Completion boundary | schema、HITL2/Readiness Gate、restore/migration、Final guidance、deterministic E2E、case-131/132 fixture-backed proof，以及 case-137 一次 no-evidence quarantine 与两个 governed archive |
| Explicitly excluded | real-Agent recommendation、自然语言交互质量、跨 view 报告语义质量，以及所有 Sub-agent production path |
| Slow-case rule | 任一 native run 超过 120 秒，立即移入 `experiments_playbook/exp_extrem_slow/`，退出 active manifest 和 Change completion；不在本 Change 重试 |
| Future evidence | 无 active work。只有在重新定义不同的有界路径并获准新建 Change 后，才可尝试新的真实 Agent observation。 |

## Follow-on Evidence Initiative (Completed)

> `fast-final-composition-evidence` 已按独立 initiative 执行并归档。唯一授权运行以
> `agent_timeout` 结束，保留为 no-evidence diagnostic；没有 CDE-003 Agent-behavior
> PASS claim，也没有重试。

- [x] N0.1 创建并归档范围受限的 `fast-final-composition-evidence` Change。
- [x] N0.2 定义单场景、单次运行的 30/45/5-second process bounds、60-second
  retained-evidence threshold，以及 timeout 的停止、记录和隔离路径。
- [x] N0.3 将验证结论限定为实际观察：本次无 native PASS，fixture/static contract
  没有被表述为报告语义质量或 Agent-behavior evidence。
- [x] N0.4 `case-135`、`case-136` 与本次的 `case-137` 均保持在
  `exp_extrem_slow/`；不纳入 active manifest，也不作为 completion evidence。

出口：已达成。`2026-08-15-fast-final-composition-evidence` 的一次运行记录为
`duration_ms: 45177`、native `null`、lifecycle `ERROR`、health `null`；case-137 已
quarantine，未来若有新路径必须新建 Change，不能重开本 initiative。

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

本计划已收口：deterministic contract 由 `final-report-composition` 归档；后续的一次
60-second-bounded real-Agent observation 由 `fast-final-composition-evidence` 独立归档为
no-evidence。真实 Agent 行为既不由 fixture/static tests 冒充，也不由超时实验阻塞；新证据
只能来自未来获准的不同 Change。
