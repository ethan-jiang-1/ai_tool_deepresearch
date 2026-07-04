# Tasks

## 1. 治理：登记 requirement

- [ ] 1.1 在 `openspec/governance/req-registry.yaml` 的 `subagent-directory-contract` 组内、SDC-002 之后新增 `SDC-003: "subagent-directory-contract — Relay staging places logical wave N slots in _subagents/wave_{NN}/ (0-based, matching canonical convention + gate wave field); stageSubagentSlots accepts optional explicitWaveIndex, drive-relay-slot passes --wave"`（实现 SDC-003）

## 2. 框架代码修复

- [ ] 2.1 `DPT_FRAMEWORK/engine/subagent-relay-stage.mjs`：`stageSubagentSlots(state, baseDir, customDispatchMap, explicitWaveIndex)` 第 385 行改为 `const waveIndex = explicitWaveIndex ?? nextWaveIndex(state);`（实现 SDC-003）
- [ ] 2.2 `DPT_FRAMEWORK/cli/drive-relay-slot.mjs`：`handleStage` full-mode（第 172 行）改为 `stageSubagentSlots(state, bundleDir, undefined, waveIndex);`（传显式 waveIndex；实现 SDC-003）
- [ ] 2.3 `DPT_FRAMEWORK/cli/drive-relay-slot.mjs`：`inferWaveFromBundle` 第 88 行 `let maxWave = 0;` 改为 `let maxWave = -1;`（fresh bundle → 推断 0 → wave_00；实现 SDC-003）

## 3. Version bump v0.2 → v0.3

- [ ] 3.1 `DPT_FRAMEWORK/CHANGELOG.md`：新增 v0.3 条目（"fix: drive-relay-slot wave0 staging now lands in _subagents/wave_00/ (0-based, matching canonical convention + wave0-complete gate); was wave_01. stageSubagentSlots gains optional explicitWaveIndex param. inferWaveFromBundle fresh-bundle → 0."）
- [ ] 3.2 `DPT_FRAMEWORK/RUN.md`：版本横幅 v0.2 → v0.3（与 CHANGELOG 最新条目一致）

## 4. 验证

- [ ] 4.1 跑全量回归 `node --test tests/` 必须 PASS（legacy 直调 + 单测不受影响）
- [ ] 4.2 验证 `drive-relay-slot stage --wave 0` 落 `wave_00`：创建 fresh disposable bundle，stage，grep `_subagents/wave_00/dispatch.json` 存在（而非 wave_01）
- [ ] 4.3 验证 wave0 gate `subagent_slot_presence` 可满足：在 wave_00 commit 一个 slot + 写 wave0_completion → wave0-complete gate 的 `Subagent wave directory missing: _subagents/wave_00/` inspect 消失（slot_presence 规则通过；其它 blocker 留给 Change B）

## 5. 收尾检查（归档前硬性 done condition）

- [ ] 5.1 运行 `node openspec/governance/check-project-reqs.mjs` 必须 PASS（0 duplicate / 0 orphan / 0 unregistered / 0 reusedRetired）
- [ ] 5.2 运行 `node openspec/governance/check-project-specs.mjs` 必须 PASS（0 deltaHeaderInMain / 0 missingPurpose / 0 missingRequirements / 0 missingReqHeader）

> 本 change 修改 `DPT_FRAMEWORK/` 行为（wave0 staging 目录），proposal 声明 version bump v0.2→v0.3，tasks 3.1/3.2 为 CHANGELOG + RUN.md 横幅更新（按治理 rules.tasks 要求）。
