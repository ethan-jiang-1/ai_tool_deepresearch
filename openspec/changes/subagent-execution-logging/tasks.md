# Tasks — subagent-execution-logging

> 实现顺序按依赖：先 engine beacon/nonce（其他都读它）→ driver（让 engine 函数有 runtime 调用者）→ role spec/task.md logging 强制 → gate forensic 诊断 → 受控 playbook 验证 S0–S5 信号（6-tier 矩阵）→ version + governance 收尾。
> 详细设计见 `design.md`；判决手册见 `_backlog/plans/subagent-logging-come-alive-plan.md` §10。

## 1. Engine: beacon 模式 + nonce 持久化 + trace 链 nonce-anchoring（SUD-004/005/006/007）

- [x] 1.1 实现 SUD-004：扩展 `createDispatchManifest`/`stageSubagentSlots`（`DPT_FRAMEWORK/engine/subagent-relay.mjs`），在每个 slot 目录写 `_beacon.json = { bundle_dir(abs), log_cli(abs), slot_key, receipt_nonce }`，nonce 取自 `createSlot()` 的 `randomUUID()`
- [x] 1.2 实现 SUD-005：`dispatch.json` 的每个 slot entry 增加 UUID `receipt_nonce`，与 `_beacon.json` 一致
- [x] 1.3 实现 SUD-006：重构 `buildSpawnPrompt`——spawn prompt 只内联 slot 目录绝对路径 + "先读 `_beacon.json`" 指令 + "lifecycle 事件带 nonce" 指令；不再把 bundle path 作为唯一通道内联
- [x] 1.4 回归测试 `tests/engine/subagent-relay.test.mjs`：staging 后 `_beacon.json` 存在且字段齐全、`dispatch.json` nonce = beacon nonce（UUID 形状）、spawn prompt 含 slot 目录 + beacon 指针
- [x] 1.5 实现 SUD-007：在 4 个 `traceEntry` 站点（`subagent-relay.mjs` L586 `slot_create` / L606 `dispatch_create` / L928 `agent_result_received` / L1015 `result_schema_validated`）的 detail 加 `receiptNonce`；回归测试断言四个事件都带 slot 的 nonce（staging→ingest→commit 链 nonce-anchored，可被 RPG-012 交叉校验）

## 2. Engine: relay driver CLI（SRD-001/002/003/004）

- [x] 2.1 实现 SRD-001（stage + replacement）：新增 `DPT_FRAMEWORK/cli/drive-relay-slot.mjs`，`stage` 子命令封装 `stageSubagentSlots`+`recordAgentSpawnRequested`，写 slot 目录/beacon/dispatch 并打印 spawn prompt；支持按 slotIndex replacement re-stage（SUD-003 补 dispatch，不 clobber 在飞 slot）
- [x] 2.2 实现 SRD-001（commit）：`commit` 子命令封装 `ingestAgentReceipt`+`commitSlotResult`（吃 `--result <json>`），写 result.json/_status.json/_agent.json 并 emit `relay_commit_done`
- [x] 2.3 实现 SRD-001（merge）：`merge` 子命令封装 `collectAndMergeSubagentResults`，合并 evidence 进 workflow state、返回 fork/repair 决策
- [x] 2.4 实现 SRD-002/003：driver 边界——只 stage/commit/merge + 输出 spawn prompt，不做 search/judgment/route；result 必须经 `commitSlotResult` 校验，禁止 driver 手写 slot 文件或静默 schema 失败
- [x] 2.5 回归测试 `tests/cli/drive-relay-slot.test.mjs`（SRD-004）：driver-driven slot 产生 `rb_trace.jsonl` 的 `relay_commit_done` + dispatch.json 的 UUID nonce + 匹配的 `_beacon.json`；replacement re-stage 不破坏在飞 slot；手糊 result 经校验失败时不写 result.json

## 3. Subagent role spec + task.md：lifecycle logging 强制契约 + 供需接线（SNC-001/002/003, SRL-001/002/003）

- [x] 3.1 实现 SNC-001/SRL-001/002/003：在 sub-agent role spec（`subagent-dpt-source-intake.md`、`subagent-dpt-evidence-extractor.md`、`subagent-dpt-topic-scout.md`）增加 always-loaded 强制段——读 `<slot>/_beacon.json` 取 bundle_dir/log_cli/nonce、经 `log-event.mjs` 发射 lifecycle 事件集（search_start/search_done/fetch_done/file_written/error/work_done）、事件带 nonce
- [x] 3.2 实现 SNC-002：`taskMarkdownForSlot`（`subagent-relay.mjs:474`）生成的 `task.md` 增加 lifecycle-logging 指令段（读 beacon、绝对路径调 log-event.mjs、带 nonce）
- [x] 3.3 回归测试/validator：role spec 与生成的 task.md 含 logging 指令；validator（`validate-phase-templates.mjs` 或对应）校验 sub-agent role spec 携带该契约
- [x] 3.4 实现 SNC-003（供需接线）：更新 `phase-wave0.md`/`phase-wave1.md` 的 relay 段 + Wave2 search delegation 段 + `shared-subagent-protocol.md`，指示 Phase Agent 用 `drive-relay-slot stage/commit/merge` 驱动 relay（**不**手编排 `stageSubagentSlots`/`commitSlotResult`、**不**手写 slot 文件）；validator 校验这些 phase node 的 relay 段指向 `drive-relay-slot`

## 4. Gate：forensic 诊断 + 判断指南（diagnostic-only）（RPG-007/008/009/010/011/012/013, SRL-004）

- [x] 4.1 实现 RPG-007：gate 增加 `provenance_nonce_mismatch` 诊断——slot nonce 非 UUID 或不在 `dispatch.json` 时，经既有 logging surface 写 trace event + run.log WARN（不改 pass/fail）
- [x] 4.2 实现 RPG-008：gate 增加 `relay_commit_missing` 诊断——evidence-producing slot 在 `rb_trace.jsonl` 无 `relay_commit_done` 时报告（advisory only）
- [x] 4.3 实现 RPG-009：gate 增加 `agent_timestamp_span_suspicious` 诊断——`_agent.json` 的 spawnedAt/completedAt 相等或 < 阈值（默认 1s）时报告（advisory only）
- [x] 4.4 实现 RPG-011：gate 增加 `lifecycle_events_missing` 诊断——evidence-producing slot 在 `_logs/run.log`/`rb_trace.jsonl` 无带 nonce 的 lifecycle 事件时报告（advisory only）；这是 SRL-004 的读取侧
- [x] 4.5 实现 RPG-010：创建 `DPT_FRAMEWORK/command_playbook/provenance-forensics-guide.md`，内容来自 plan §10——**S0–S5 信号**（含精确文件路径 + 抗手糊强度标注）+ **6-tier 判决矩阵**（真 relay / 真失败 / 观测缺口 / staged-not-committed / 懒手糊 / 不一致，各带 BUG-019 对策含义）+ 抗手糊频谱说明 + write-back 流程；明示"RPG-009 单独不足判伪造"、"认真手糊只被 RPG-012 抓"；validator 确认指南覆盖这些
- [x] 4.6 回归测试（RPG-007/008/009/011 + SRL-004）：注入手糊信号（非 UUID nonce / 无 commit trace / 同毫秒启停 / 无 lifecycle）→ 对应诊断 emit；注入真 relay run 信号 → 诊断 silent；断言本轮 pass/fail 不变（advisory only）
- [x] 4.7 实现 RPG-012：gate 跨文件/跨事件一致性检查——`result_schema_validated` 缺但 `agent_result_received` 在、`agent_result_ready` 在但 `agent_runtime_started` 缺、nonce 跨 trace/beacon/dispatch/lifecycle 不一致、slot 在 dispatch 但无 staging trace → emit `provenance_chain_inconsistency`（advisory only）；**显式避开 RPG-008 的"_status=done 无 commit"触发**（RPG-012 只引用、不重复）
- [x] 4.8 实现 RPG-013：所有诊断（RPG-007..012）event detail 带 `slotKey`+`wave`；wave 级条件（如 dispatch.json 整体缺席）按受影响 slot 各发一条
- [x] 4.9 回归测试（RPG-012 + RPG-013）：注入 4 种 RPG-012 触发 → 各 emit；一致链 → silent；每条诊断带 slotKey+wave

## 5. 受控 E2E playbook（接近真实环境）：`experiments_playbook/exp_system-logging/`

> 落在既有 `exp_system-logging`（非新建），扩其 subagent 例子（case-76 spawn-prompt-logging / case-77 subagent-logging）在接近真实环境确认 logging 正确。

- [x] 5.1 tier 1（真·sound）：用 `drive-relay-slot` 驱动真 sub-agent 跑一个 wave0 slot，按 `provenance-forensics-guide.md`（RPG-010）裁决 S0✓ S3✓ `status=done` → 所有诊断 silent
  - **注（§9.4）**：本节原 `[x]` 指 design intent；**真实 sub-agent E2E playbook 由 §9.1 `exp_subagent/case-65` 补齐**
- [x] 5.2 tier 2（真·失败）：整条 trace 链在但 `status=failed` → 诊断 silent，verdict 区分于 tier 1
- [x] 5.3 tier 3（观测缺口）：整条链在、`status=done`，但无 lifecycle 事件（S5✗）→ **只** RPG-011 emit
- [x] 5.4 tier 4（staged-not-committed）：staging trace + dispatch.json 在，但无 commit trace、`_status≠done` → **只** RPG-008 emit，**不** RPG-012（验证 carve-out）
- [x] 5.5 tier 5（懒手糊，仿 BUG-019）：无 dispatch.json + 非 UUID nonce → RPG-007 按 slot emit；按矩阵命中"懒手糊→driver gap"
- [x] 5.6 tier 6（认真手糊/不一致）：写齐 dispatch.json+UUID+commit trace 但**漏 `result_schema_validated`** → RPG-012 emit；子 case：`_agent.json` 跨度<1s 但链自洽 → **只** RPG-009（验证"RPG-009 单独不足判伪造"）

## 6. Version + governance 收尾

- [x] 6.1 实现 version bump（proposal 声明 v0.2）：更新根 `CHANGELOG.md`，新增 `v0.2` 条目（简洁格式：版本号 + 一两句说清 sub-agent logging 活过来 + forensic 诊断）
- [x] 6.2 同步 `DPT_FRAMEWORK/RUN.md` 版本横幅（现 `v0.1` → `v0.2`）与 CHANGELOG 最新条目一致
- [x] 6.3 收尾检查：运行 `node openspec/governance/check-project-reqs.mjs` 必须 PASS（0 duplicate / 0 orphan / 0 unregistered / 0 reusedRetired）
  - **状态（诚实记录）**：本 change **0 新增违规**（delta 引用的 SUD-004..007/SRD-001..004/SRL-001..004/RPG-007..013/SNC-001..003/SDC-001..002 全部已注册、无重复）。但 check-project-reqs 仍报 3 个 **pre-existing** fail，均由上一个 archive（`harden-relay-pipeline`，2026-07-03）引入、与本 change 无关：(1) `GSK-002` duplicate——`workflow-node-contract/spec.md` prose 交叉引用 `gate-skeleton` GSK-002 被检查器误判为 req 声明；(2) `WNC-009` duplicate——`gate-skeleton/spec.md` prose 交叉引用 `WNC-009` 同理；(3) `BUG-018` unregistered——`workflow-node-contract/spec.md` prose 提及 BUG-018（bug ID 非 req ID）。修复需改检查器（prose 交叉引用不应计为 req 声明）或改 main spec prose，属 governance tooling 范畴，超出本 change scope。建议作为独立 follow-up。
- [x] 6.4 收尾检查：运行 `node openspec/governance/check-project-specs.mjs` 必须 PASS（0 deltaHeaderInMain / 0 missingPurpose / 0 missingRequirements / 0 missingReqHeader）— **PASS**（67 main specs, 0 violations）

## 7. Inter-Agent Communication Directory Convention（SDC-001, SDC-002）

- [x] 7.1 实现 SDC-001/002：创建 delta spec `openspec/changes/subagent-execution-logging/specs/subagent-directory-contract/spec.md`，声明 `_subagents/` 为 sole inter-agent communication directory（experiment 与 production 使用同一 convention）+ 禁止外部 inter-agent communication 路径（`/tmp`、ad-hoc 名称如 `_fixtures/`/`_comm/`，所有 sub-agent artifact 必须在 `_subagents/wave_NN/slot_MM/` 下）
- [x] 7.2 注册 SDC-001, SDC-002 到 `openspec/governance/req-registry.yaml`（新 capability `subagent-directory-contract`，prefix SDC）
- [x] 7.3 修复 case-79：重写 `experiments_playbook/exp_system-logging/case-79-standard-provenance-forensics.md`，用 8 个 disposable bundle（每 tier 一个，经 `new-disposable-bundle.mjs` 创建）替代 `_fixtures/` 子目录；每个 bundle 使用标准 `_subagents/wave_00/slot_00/` 结构
- [x] 7.4 更新 `proposal.md`：在 What Changes / New Capabilities / Modified Capabilities / Impact 节增加 subagent-directory-contract 的描述
- [x] 7.5 更新 `design.md`：增加 Decision 8（`_subagents/` 为 sole inter-agent communication directory），说明为何选独立 subagent-* capability 而非并入 WDC、`_comm/` 从未存在
- [x] 7.6 收尾检查：运行 `node openspec/governance/check-project-reqs.mjs`（SDC-001/002 已注册、无重复）+ `node openspec/governance/check-project-specs.mjs` PASS；case-79 playbook 执行通过所有 8 tier checks

## 8. SDC spec 精度 + WDC-004 对齐 + 负向覆盖（explore 收尾）

> explore 发现 SDC-001「sole / all communication」与 `_cache/`/`reference/`/`artifacts/` 写入 scope 冲突；WDC-004 仍缺 `_subagents/` catalog；case-79 有 `SDC-001/012` 笔误；SDC-002 缺负向测试。

- [x] 8.1 收窄 `subagent-directory-contract` delta spec（SDC-001/002）：scope 限定为 **relay-managed slot artifacts**；Purpose 明确 `_cache/`/`reference/`/`artifacts/` 由 WDC / task contract 管辖；SDC-002 scenario 改为 forensics **invisibility**（非 active reject）
- [x] 8.2 同步 `design.md` Decision 8 + `proposal.md` What Changes / Capabilities 与收窄后的 SDC 措辞一致
- [x] 8.3 新增 `workflow-directory-contract` delta spec：MODIFIED WDC-004，在 canonical bundle structure 列出 `_subagents/`（relay slot 通信目录，详见 SDC-001）；更新 `req-registry.yaml` 中 WDC-004 摘要
- [x] 8.4 修复 case-79：`SDC-001/012` → `SDC-001/002`；增加 tier 9（SDC-002）：slot artifact 仅写在 `_fixtures/`，`_subagents/` 无 slot → forensics silent、canonical path 缺失
- [x] 8.5 回归测试 SDC-002：`tests/engine/helpers/provenance-forensics.test.mjs` 增加 external-path invisibility + `checkSubagentSlotPresence` 报 missing slot
- [x] 8.6 更新 `CHANGELOG.md` v0.2 条目：补充 SDC + WDC-004 `_subagents/` catalog
- [x] 8.7 收尾检查：`node openspec/governance/check-project-specs.mjs` PASS；运行 `node --test tests/engine/helpers/provenance-forensics.test.mjs`

## 9. exp_subagent E2E：relay 黑箱透明化（case-65 tier-1 金路径 + case-66 tier-4 负向对照）

> plan §10 一直缺「真实 sub-agent + drive-relay-slot + S0–S5 可判决痕迹」playbook；case-79 只覆盖 forensics 矩阵（无 sub-agent）。本节在 `exp_subagent/` 补齐。

- [x] 9.1 新建 `experiments_playbook/exp_subagent/case-65-heavy-drive-relay-provenance-sound.md`：`drive-relay-slot` stage→spawn→commit→merge + 真 native sub-agent（beacon + `log-event.mjs` lifecycle）+ S0–S5/tier-1 verifier
- [x] 9.2 新建 `experiments_playbook/exp_subagent/case-66-standard-drive-relay-staged-not-committed.md`：`drive-relay-slot stage` 真跑、故意不 commit → 仅 RPG-008（tier-4 carve-out）
- [x] 9.3 更新 `experiments_playbook/RUN_EXPS.md` G6：61–64 legacy path vs 65+ post-change path ladder
- [x] 9.4 修正 tasks §5.1 注释（见上）— 诚实记录原 `[x]` 为 intent，playbook 由 9.1 落地
- [x] 9.5 Agent 执行 case-65 + case-66 全 playbook PASS 后 mark §9 complete
