# Tasks — subagent-execution-logging

> 实现顺序按依赖：先 engine beacon/nonce（其他都读它）→ driver（让 engine 函数有 runtime 调用者）→ role spec/task.md logging 强制 → gate forensic 诊断 → 受控 playbook 验证 5 信号 → version + governance 收尾。
> 详细设计见 `design.md`；判决手册见 `_backlog/plans/subagent-logging-come-alive-plan.md` §10。

## 1. Engine: beacon 模式 + nonce 持久化（SUD-004/005/006）

- [ ] 1.1 实现 SUD-004：扩展 `createDispatchManifest`/`stageSubagentSlots`（`DPT_FRAMEWORK/engine/subagent-relay.mjs`），在每个 slot 目录写 `_beacon.json = { bundle_dir(abs), log_cli(abs), slot_key, receipt_nonce }`，nonce 取自 `createSlot()` 的 `randomUUID()`
- [ ] 1.2 实现 SUD-005：`dispatch.json` 的每个 slot entry 增加 UUID `receipt_nonce`，与 `_beacon.json` 一致
- [ ] 1.3 实现 SUD-006：重构 `buildSpawnPrompt`——spawn prompt 只内联 slot 目录绝对路径 + "先读 `_beacon.json`" 指令 + "lifecycle 事件带 nonce" 指令；不再把 bundle path 作为唯一通道内联
- [ ] 1.4 回归测试 `tests/engine/subagent-relay.test.mjs`：staging 后 `_beacon.json` 存在且字段齐全、`dispatch.json` nonce = beacon nonce（UUID 形状）、spawn prompt 含 slot 目录 + beacon 指针

## 2. Engine: relay driver CLI（SRD-001/002/003/004）

- [ ] 2.1 实现 SRD-001（stage + replacement）：新增 `DPT_FRAMEWORK/cli/drive-relay-slot.mjs`，`stage` 子命令封装 `stageSubagentSlots`+`recordAgentSpawnRequested`，写 slot 目录/beacon/dispatch 并打印 spawn prompt；支持按 slotIndex replacement re-stage（SUD-003 补 dispatch，不 clobber 在飞 slot）
- [ ] 2.2 实现 SRD-001（commit）：`commit` 子命令封装 `ingestAgentReceipt`+`commitSlotResult`（吃 `--result <json>`），写 result.json/_status.json/_agent.json 并 emit `relay_commit_done`
- [ ] 2.3 实现 SRD-001（merge）：`merge` 子命令封装 `collectAndMergeSubagentResults`，合并 evidence 进 workflow state、返回 fork/repair 决策
- [ ] 2.4 实现 SRD-002/003：driver 边界——只 stage/commit/merge + 输出 spawn prompt，不做 search/judgment/route；result 必须经 `commitSlotResult` 校验，禁止 driver 手写 slot 文件或静默 schema 失败
- [ ] 2.5 回归测试 `tests/cli/drive-relay-slot.test.mjs`（SRD-004）：driver-driven slot 产生 `rb_trace.jsonl` 的 `relay_commit_done` + dispatch.json 的 UUID nonce + 匹配的 `_beacon.json`；replacement re-stage 不破坏在飞 slot；手糊 result 经校验失败时不写 result.json

## 3. Workflow MD：lifecycle logging 强制契约 + 供需接线（WNC-010/011/012, SRL-001/002/003）

- [ ] 3.1 实现 WNC-010/SRL-001/002/003：在 sub-agent role spec（`subagent-dpt-source-intake.md`、`subagent-dpt-evidence-extractor.md`、`subagent-dpt-topic-scout.md`）增加 always-loaded 强制段——读 `<slot>/_beacon.json` 取 bundle_dir/log_cli/nonce、经 `log-event.mjs` 发射 lifecycle 事件集（search_start/search_done/fetch_done/file_written/error/work_done）、事件带 nonce
- [ ] 3.2 实现 WNC-011：`taskMarkdownForSlot`（`subagent-relay.mjs:474`）生成的 `task.md` 增加 lifecycle-logging 指令段（读 beacon、绝对路径调 log-event.mjs、带 nonce）
- [ ] 3.3 回归测试/validator：role spec 与生成的 task.md 含 logging 指令；validator（`validate-phase-templates.mjs` 或对应）校验 sub-agent role spec 携带该契约
- [ ] 3.4 实现 WNC-012（供需接线）：更新 `phase-wave0.md`/`phase-wave1.md` 的 relay 段 + Wave2 search delegation 段 + `shared-subagent-protocol.md`，指示 Phase Agent 用 `drive-relay-slot stage/commit/merge` 驱动 relay（**不**手编排 `stageSubagentSlots`/`commitSlotResult`、**不**手写 slot 文件）；validator 校验这些 phase node 的 relay 段指向 `drive-relay-slot`

## 4. Gate：forensic 诊断 + 判断指南（diagnostic-only）（RPG-007/008/009/010/011, SRL-004）

- [ ] 4.1 实现 RPG-007：gate 增加 `provenance_nonce_mismatch` 诊断——slot nonce 非 UUID 或不在 `dispatch.json` 时，经既有 logging surface 写 trace event + run.log WARN（不改 pass/fail）
- [ ] 4.2 实现 RPG-008：gate 增加 `relay_commit_missing` 诊断——evidence-producing slot 在 `rb_trace.jsonl` 无 `relay_commit_done` 时报告（advisory only）
- [ ] 4.3 实现 RPG-009：gate 增加 `agent_timestamp_span_suspicious` 诊断——`_agent.json` 的 spawnedAt/completedAt 相等或 < 阈值（默认 1s）时报告（advisory only）
- [ ] 4.4 实现 RPG-011：gate 增加 `lifecycle_events_missing` 诊断——evidence-producing slot 在 `_logs/run.log`/`rb_trace.jsonl` 无带 nonce 的 lifecycle 事件时报告（advisory only）；这是 SRL-004 的读取侧
- [ ] 4.5 实现 RPG-010：创建 `DPT_FRAMEWORK/command_playbook/provenance-forensics-guide.md`，内容来自 plan §10——5 信号 S1–S5（含精确文件路径）+ 判决矩阵（真 relay 行 + 手糊行，各带 BUG-019 对策含义）+ write-back 流程；validator 确认指南存在且覆盖三部分
- [ ] 4.6 回归测试（RPG-007/008/009/011 + SRL-004）：注入手糊信号（非 UUID nonce / 无 commit trace / 同毫秒启停 / 无 lifecycle）→ 诊断 emit；注入真 relay run 信号 → 诊断 silent；断言本轮 pass/fail 不变（advisory only）

## 5. 受控 E2E playbook（接近真实环境）：`experiments_playbook/exp_system-logging/`

> 落在既有 `exp_system-logging`（非新建），扩其 subagent 例子（case-76 spawn-prompt-logging / case-77 subagent-logging）在接近真实环境确认 logging 正确。

- [ ] 5.1 扩 `exp_system-logging` 的 subagent 例子：用 `drive-relay-slot` 驱动真 sub-agent 跑一个 wave0 slot，按 `DPT_FRAMEWORK/command_playbook/provenance-forensics-guide.md`（RPG-010）的 5 信号定义从 trace/run.log 裁决 S1(dispatch.json)✓ S2(nonce UUID ∈ dispatch)✓ S3(relay_commit_done)✓ S4(启停跨度>1s)✓ S5(lifecycle 事件带 nonce)✓
- [ ] 5.2 同 playbook 加 case：手糊一个 slot（仿 BUG-019：无 dispatch.json、非 UUID nonce、无 commit trace、同毫秒启停、无 lifecycle），裁决 RPG-007/008/009/011 诊断全 emit，且按 `provenance-forensics-guide.md` 矩阵命中"手糊→driver gap"行

## 6. Version + governance 收尾

- [ ] 6.1 实现 version bump（proposal 声明 v0.2）：更新根 `CHANGELOG.md`，新增 `v0.2` 条目（简洁格式：版本号 + 一两句说清 sub-agent logging 活过来 + forensic 诊断）
- [ ] 6.2 同步 `DPT_FRAMEWORK/RUN.md` 版本横幅（现 `v0.1` → `v0.2`）与 CHANGELOG 最新条目一致
- [ ] 6.3 收尾检查：运行 `node openspec/governance/check-project-reqs.mjs` 必须 PASS（0 duplicate / 0 orphan / 0 unregistered / 0 reusedRetired）
- [ ] 6.4 收尾检查：运行 `node openspec/governance/check-project-specs.mjs` 必须 PASS（0 deltaHeaderInMain / 0 missingPurpose / 0 missingRequirements / 0 missingReqHeader）
