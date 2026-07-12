## Traceability Note

第 1 节创建指导与路径迁移 surface，只为 modified contracts 提供设计上下文，不直接实现 capability requirement。第 2-4 节明确标注其实现或验证的 requirements。不得把 guideline 修改当作 ACS/CDP/CDG/SCO/SHC/CDE runtime behavior 已改变的证据。

## 1. 建立两条 Evolution Directions

- [x] 1.1 创建两份 canonical charter-companion 文件：把完整 simplicity guidance 迁移到 `guidelines/evolution-simple-reliable-control.md` 并保留 `guideline_id: simple-reliable-control`；新建 `guidelines/evolution-helper-oriented-agent.md`，使用 `guideline_id: helper-oriented-agent`。两者使用共同的 `Evolution Direction:` title prefix、现有 frontmatter vocabulary、显式 Charter precedence、normative disciplines、Gradual Convergence、focused review 与清楚 Boundary。Done condition：simplicity 只拥有 system/control shape，helper 只拥有 action responsibility；两者都不定义 runtime behavior，也不新增 `family`/`axis` metadata 或 helper subsystem。
- [x] 1.2 更新 `guidelines/project-charter.md` 与 `guidelines/README.md`，使两个 canonical 文件成为 Charter 之下同一层的 `Evolution Directions`。Charter 保留 authority/layer checks，把 complexity 与 agency 问题分别路由到两个 focused review，并为新 design/recovery/helper work 定义 paired-loading route。
- [x] 1.3 执行 active path migration manifest：更新 7 个 active mechanism/support guidelines 和两个 active source plans 的 canonical `evolution-*` links；两个 source plans 都必须同时引用两条 direction。将 `guidelines/simple-reliable-control.md` 替换为无 frontmatter 的 compatibility notice。不得修改 closed plan 或 archived OpenSpec changes。
- [x] 1.4 审计 human-override plan、breakpoint-recovery plan、BUG-079 与 future-only helper TODO 的 coverage。Done condition：authority context、helper responsibility、`materialize-before-work`、`canonical-or-blocked` 与 staged runtime obligations 都进入正确 guideline/spec/future change，且没有任何来源被宣称为 runtime-fixed。

## 2. 收敛当前契约

- [x] 2.1 实现 ACS-001 与 ACS-003：修改 `DPT_FRAMEWORK/COMMANDS.md` 和 `tests/engine/command-contract-docs.test.mjs`，加入 Agent-owned ordinary execution/repair、human-directed 只描述 decision source 而不转移 command-runner 或创造 permission/capability、HITL 与 out-of-band/mutation-capability 的区分。因本 change 触碰 `phase-hitl2.md`、`shared-profile.md`、`shared-gate-rules.md`，把它们加入现有 scan surface，但只应用既有 drift phrase classes。顶层 `COMMANDS.md` 只新增三组稳定 helper markers；不得新增 validator、phrase class、prose classifier，或为 ACS-001 每句话增加 exact marker。
- [x] 2.2 收敛 CDP-001：修正 `phase-hitl2.md` 的 stale restart-from-instantiation 与不存在的 blocking `trace_event_present` wording。保持五个 recorded decisions、`repair` 回同一 HITL2 repair、`rerun` deterministic handoff 到 `phase-rerun`，以及 `hitl2_recorded` 仅作为 diagnostic evidence 而非 gate authority。
- [x] 2.3 收敛 CDG-001 与 CDG-003：以现有 gate definition/CLI 为 anchor，不修改 runtime logic。扩展 `tests/integration/cli/check-gate-hitl2-recorded.test.mjs`，证明 `repair` pass 且 `routing.kind: no_transition` / `check.next: null`，`not_started` 被 gate enum 拒绝，只有 `proceed_to_readiness`/`rerun` 产生 fixed handoff。
- [x] 2.4 收敛 SCO-001 与 SCO-007 的测试描述：保持 `DPT_FRAMEWORK/schema/enums.mjs` 不变，修正 `tests/schema/enums.test.mjs`，覆盖当前 11 个 `CurrentGate` values 与全部 6 个 `HITL2UserDecision` schema values，并明确区分 `not_started` sentinel 和 5 个 recorded actions。
- [x] 2.5 收敛 SHC-001 与 SHC-002：按完整当前 `ProfileSchema` 对齐 `shared-profile.md`，包括 `research_access`、`research_style_params`、`rerun_count`、`rationale`，删除不存在的 nested HITL1/user-feedback fields；按当前 definition、shared handoff preflight、five-action boundary 与 CLI-authored `gate_attempt` 对齐 `shared-gate-rules.md`。两份 shared files 必须保持 non-authoritative projection。
- [x] 2.6 实现 CDE-001 至 CDE-005：更新 G13 `case-131` 至 `case-135`。CDE 只拥有 delivery scenarios 与 tested-gate assertions，通用实验机制复用 accepted AGT/PLR/command-experiment contracts。Cases 必须使用 real tested gate output、legal direct predecessor facts、same-check repair、当前 readiness/final semantics 和真实 `rerun -> phase-rerun` handoff；不得手写被测 gate result 或证明已退役的 Agent-level restart route。
- [x] 2.7 应用 PLR-003 的 net simplification：删除 current G14 `case-140` 至 `case-142`，从 active runner table 移除，并在 `RUN_EXPS.md` 加入指向 G13/G24 replacements 的简短 migration map。不得留下 runnable-looking tombstone cases；archived references 作为历史记录，通过 case IDs/git history 仍可追溯。
- [x] 2.8 收敛 AGT-010 canonical standard consumers G5 `case-51`/`case-52`：消费 real gate output、route-bound `enter-phase`、source-gate `advance-status`、terminal/no-transition results 和真实 fail-repair-rerun evidence。不得预写 target gate 已通过，也不得把 `check.next` 非空当作所有 gate success 的统一定义。
- [x] 2.9 按既有 REI/CPT/WNC contracts 审查 G24 `case-301` 至 `case-306`。只修改 tested HITL2/rerun gate 或 handoff fixture 已 stale 的 cases（预期为 `case-301` 至 `case-304`）；pure chain checks 保持轻量；`case-305` 仅在 chain truth 不同时修改；`case-306` 必须明确只证明 Agent/filesystem behavior，不 overclaim gate proof。不得手写被测 gate attempt。
- [x] 2.10 更新 `experiments_playbook/RUN_EXPS.md` 中 G5/G13/G24 的 current descriptions 与 G14 migration map。Active manifest 只能列 current runnable files，并明确 `case-306` 的 proof boundary。
- [x] 2.11 更新 `openspec/governance/req-registry.yaml` 中 ACS-001、ACS-003、CDP-001、CDG-001、CDG-003、SCO-007、SHC-001、SHC-002、CDE-001 至 CDE-005 的稳定描述。不得新增、退役或复用 requirement ID。

## 3. Version Management

- [x] 3.1 应用 VEM-002、VEM-003、VEM-004：在 `CHANGELOG.md` 增加简洁 `v0.21` 条目，并同步 `DPT_FRAMEWORK/RUN.md` version banner/current release。描述 Evolution Directions、Agent-owned helper execution 和 HITL2 spec/projection/proof reconciliation，不得声称 override、reentry、persistence 或 BUG-079 runtime 已完成。

## 4. Verification And Apply-Readiness

- [x] 4.1 运行 ACS/CDP/CDG/SCO/SHC focused regression：`node --test tests/engine/command-contract-docs.test.mjs tests/schema/enums.test.mjs tests/schema/profile.test.mjs tests/engine/transition-chain.test.mjs tests/integration/cli/check-gate-hitl2-recorded.test.mjs tests/integration/md/no-phase-bypass-advice.test.mjs`。确认 11-value gate coverage、6 schema/5 action boundary、`repair -> no_transition`、`rerun -> phase-rerun`，以及 gate 不依赖 phase-authored `hitl2_recorded` event。
- [x] 4.2 按 `guidelines/command-experiments.md` 逐 step 执行 G13 `case-131` 至 `case-135`。每个 case 必须从自己的真实 bundle/trace 得出 PASS，失败时保留现场，只在 PASS 后 cleanup。
- [x] 4.3 逐 step 执行 G5 `case-51`/`case-52` 与全部 current G24 `case-301` 至 `case-306`。确认 G5 保持 canonical standard handoff proof，G24 保持 mechanism-focused，negative cases 按预期 fail closed，且没有已删除的 G14 case 仍可运行。
- [x] 4.4 运行 version 与 OpenSpec validation：`node --test tests/engine/version-management.test.mjs` 和 `openspec validate align-recovery-with-simple-helper-posture --strict` 必须 PASS。
- [x] 4.5 运行 governance validation：`node openspec/governance/check-project-reqs.mjs` 与 `node openspec/governance/check-project-specs.mjs` 必须 0 violations；核对 13 个 modified requirement descriptions 且没有新 ID。
- [x] 4.6 审计 scope 与 paths。Implementation diff 只能包含 guidance/path migration surfaces、4 个 Agent-facing projection files、3 个 focused regression files、G5/G13/affected G24 cases、G14 case 删除、`RUN_EXPS.md`、registry、`CHANGELOG.md`、`DPT_FRAMEWORK/RUN.md` 与本 change。使用 `rg --pcre2 '(?<!evolution-)simple-reliable-control\.md'` 核对 old-path exceptions；确认 closed plans、OpenSpec archives、Engine/schema/gate/transition runtime、capability IDs、两个 source plans 的 open status 与 BUG-079 status 均未改变。
- [x] 4.7 做最终一致性审计：逐项核对 proposal Source Coverage、design ownership matrix/retirement map/dependency bands、13 个 delta requirements、tasks、runner manifest 与 deferred runtime capabilities。运行 `git diff --check`；确认没有 duplicate experiment owner、guidance-as-runtime claim、invented state/condition/controller，并确认至少完成一个 net simplification：删除 G14，且未新增 validator/runner/runtime mechanism。
