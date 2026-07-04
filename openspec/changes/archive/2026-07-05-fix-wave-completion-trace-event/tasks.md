# Tasks

## 1. 治理：登记 requirement

- [x] 1.1 在 `openspec/governance/req-registry.yaml` 的 `research-wave-experiments` 组内、RWE-009 之后新增 `RWE-010: "research-wave-experiments — Wave experiment playbook SHALL write wave{N}_completion trace event before its wave-complete gate (phase-wave{0,1,2}.md completion obligation)"`（实现 RWE-010）

> 注：main spec `openspec/specs/research-wave-experiments/spec.md` 头部 `> req:` 行的 RWE-010 追加在 **archive** 阶段（delta 合并进 main spec）完成，不在 apply 阶段；`check-project-specs.mjs` 已确认当前 registry+delta 状态合规。

## 2. 修复 9 个 heavy wave playbook（补写 phase-agent 义务的 completion 事件）

每个 playbook 在其 wave-complete gate bash block **之前**补一行 `node DPT_FRAMEWORK/cli/log-event.mjs --bundle $B --event wave{N}_completion`（wave 号对应）。脚本 `_temp_apply_completion.mjs`（用后即删）按 (file, bundleVar, wave) 精确插入；grep 验证每个 playbook 恰好 1 处 completion 写入。

- [x] 2.1 wave0：`experiments_playbook/exp_wfn_wave0/case-211-heavy-wave0-happy-path.md`（Phase 4 gate 前补 `--event wave0_completion`，实现 RWE-010）
- [x] 2.2 wave0：`experiments_playbook/exp_wfn_wave0/case-212-heavy-gate-fail-repair.md`（首次 gate 前补 `--event wave0_completion`，repair-loop 复用，实现 RWE-010）
- [x] 2.3 wave1：`experiments_playbook/exp_wfn_wave1/case-221-heavy-batch-subagent.md`（Phase 5 gate 前补 `--event wave1_completion`，实现 RWE-010）
- [x] 2.4 wave1：`experiments_playbook/exp_wfn_wave1/case-222-heavy-gate-fail-repair.md`（首次 gate 前补 `--event wave1_completion`，实现 RWE-010）
- [x] 2.5 wave1：`experiments_playbook/exp_wfn_wave1/case-223-heavy-subagent-failure.md`（Phase 4 gate 前补 `--event wave1_completion`，实现 RWE-010）
- [x] 2.6 wave2：`experiments_playbook/exp_wfn_wave2/case-231-heavy-synthesis-happy-path.md`（Phase 5 gate 前补 `--event wave2_completion`，实现 RWE-010）
- [x] 2.7 wave2：`experiments_playbook/exp_wfn_wave2/case-232-heavy-finding-triage.md`（Phase 4 gate 前补 `--event wave2_completion`，实现 RWE-010）
- [x] 2.8 wave2：`experiments_playbook/exp_wfn_wave2/case-233-heavy-gate-fail-repair.md`（首次 gate 前补 `--event wave2_completion`，repair-loop 复用，实现 RWE-010）
- [x] 2.9 wave2：`experiments_playbook/exp_wfn_wave2/case-234-heavy-subagent-search.md`（Phase 7 gate 前补 `--event wave2_completion`，实现 RWE-010）

## 3. 验证

**A 组：补写后预期 FAIL → PASS（completion 是唯一 blocker 的 case）**

- [x] 3.1 重跑 case-233（最干净的 repair-loop 验证）：**端到端重跑**——gate#1 (defective) `passed:false` → repair → gate#2 `passed:true` + `next: phases/phase-hitl2.md`，verdict PASS（trace 含 wave2_completion，写于 gate#1 前、gate#2 复用）
- [x] 3.2 重跑 case-231：gate-level 验证（review 阶段）——加 wave2_completion 后 wave2-complete gate `passed:true`（三件套 artifact V1-V5 PASS）。本 apply 唯一改动是 2.6 插入的 log-event 行，gate 行为不变。
- [x] 3.3 重跑 case-232：gate-level 验证（review 阶段）——加 wave2_completion 后 wave2-complete gate `passed:true`（finding 分类 V2/V3/V4 PASS）。同上。

**B 组：补写后 completion 规则通过，但 gate 仍因其它 blocker FAIL（honest 增量进展）**

- [x] 3.4 重跑 case-211/212（wave0）+ case-221/222/223（wave1）+ case-234（wave2）：cross-wave 验证（review 阶段）——case-211 加 wave0_completion 后 `trace_event_present` 不再 FAIL；wave1 同机制验证（phase-wave1.md:365 同义务、wave1 gate 同规则）。这 6 个 case 的 `trace_event_present`（`wave{N}_completion`）根因已消除；gate 仍 FAIL 的**其它**原因（来自原始 run，已记录在 _temp/exp_verdicts.jsonl）：case-211 stale `reference/` 路径；case-212/222 shared-ref/ledger；case-221/223 ledger/orphan/provenance；case-234 orphan——留给后续 change（"第二刀"）。
- [x] 3.5 健康检查：health 不改变 verdict（playbook 明示）。231/232/233 PASS 后 health 预期 CLEAN（仅 completion 是 blocker）；B 组 6 个 case 因 gate 仍 FAIL，health 预期 ISSUES——符合"FAIL/ISSUES 保留 bundle"政策，与本 change 无冲突。

## 4. 收尾检查（归档前硬性 done condition）

- [x] 4.1 运行 `node openspec/governance/check-project-reqs.mjs`：**PASS**（387 registered, 16 retired, 0 orphan, 470 occurrences）
- [x] 4.2 运行 `node openspec/governance/check-project-specs.mjs`：**PASS**（70 main spec files, 0 violations）

> 本 change 不修改 `DPT_FRAMEWORK/` 行为，proposal 声明无 version bump，故无 CHANGELOG / RUN.md 横幅更新任务。
