---
node_type: phase
id: phase-readiness
phase: readiness
gate: readiness-passed
stop: "no"
execution_contract:
  surface: phase-agent
  search_policy: no_search
requires:
  - shared/shared-silent-execution
suggested_context:
  - shared/shared-gate-rules
  - shared/shared-schemas
  - shared/shared-anti-cheating-rules
---

# Phase: Readiness — Final Deterministic Precheck

## 0. Execution Brief

- **Objective**: Run the final deterministic precheck before terminal delivery.
- **Start here**: Read trace, profile, status, required artifact paths, and prior gate history.
- **Path to pass**: Repair missing structural artifacts or audit evidence, then run the readiness gate.
- **Completion check**: `check-gate-readiness-passed.mjs` passes for `phases/phase-readiness.md`.
- **Failure posture**: Fix deterministic structure only; do not turn readiness into a content-quality review or bypass missing gate evidence.

## 1. Stage Goal

Final 交付前运行最后一个 deterministic checkpoint：验证所有 required artifacts 可达、所有 prior gate 通过状态可审计、profile/status/trace 无结构性矛盾。

**Readiness 只做 deterministic structural check。** 不做 content quality、writing quality、argument strength、synthesis completeness 等语义判断。语义质量由 HITL2 人类审查负责，Readiness 只确认"东西都在且格式合法"。

HITL2 已接受的 composition Source of Record 是
`rb_profile.yaml#/human_decision_checkpoints/hitl2/final_report_view` 与
`rb_profile.yaml#/human_decision_checkpoints/hitl2/composition_handoff`。Readiness
在这个既有 structural checkpoint 中，由 Engine 把当前 profile 与 exact selected
HITL2 handoff witness 比较；它不重建 reader/use/focus，不给 Final 提供 receipt
fallback，也不引入第二个 checkpoint。

## 2. Required Inputs

- Active `dpt_rb_*` run bundle（全部 prior phase + gate 完成，HITL2 decision 已 recorded）
- `rb_trace.jsonl`（完整 trace，含所有 prior gate 的 `gate_attempt` 事件）
- `rb_profile.yaml`（含 HITL2 decision）
- `rb_status.json`（当前 lifecycle 位置的 status 快照）
- Required artifact 集合：
  - `seed_topics/`（seed topic 物化目录）
  - `reference/_INDEX.md`（Wave0 evidence index）
  - `artifacts/wave2/synthesis.md`（Wave2 synthesis）
  - `artifacts/hitl2/decision-brief.md`（HITL2 decision brief）

## 3. Allowed Actions

- 检查所有 required artifact 文件和目录是否存在（`file_exists` / `dir_non_empty`）
- 检查 `rb_trace.jsonl` 中所有 prior gate 均有 `gate_attempt` 事件 `passed: true`（`trace_has_all_gates`——从 manifest 推导 prior gate 集合，无硬编码阈值）
- 检查 `rb_profile.yaml` 可解析为合法 YAML（`yaml_parse`）
- 检查 `rb_trace.jsonl` 每行都是合法 JSON（`jsonl_parse`）
- 检查 `rb_status.json` 中 gate 前 source-gate window：`current_gate: hitl2_recorded` / `next_gate: readiness_passed`
- 通过 existing route-bound handoff preflight 比较 current profile composition 与 selected HITL2 witness；normal v1 receipt 与 predecessor-bound legacy migration witness 使用同一 comparison owner
- 更新 `rb_status.json` 中 readiness 相关状态
- 记录 `readiness_check` trace event 到 `rb_trace.jsonl`

**Readiness gate CLI 执行以上全部检查。** Agent 角色是确认 gate pass 后 advance 到 final，或在 gate fail 后按 inspect/advice 修复。

### 3a. Composition Consistency At This Existing Checkpoint

只在 exact selected `hitl2-recorded -> phases/phase-readiness.md` handoff 已成立后，
`check-gate-readiness-passed.mjs` 才比较 current profile composition。`final_report_view`
仍使用既有 view vocabulary：`profile_default`、`executive_brief`、`evidence_map`、
`claim_judgment`、`technical_deep_dive` 或 `custom`；`custom` 的语义仍只来自 accepted
`composition_handoff`，不是 `custom_slug`。

- exact match：继续本 Gate 的原有 structural rules；Final 只读 current profile。
- `composition_projection_drift`：CLI hint 只会给出以下 bounded repair。Agent 执行它后重跑**同一个** Readiness Gate；该操作不问用户、不自动进入 Final。

  ```bash
  node DEEP_RESEARCH_HARNESS/cli/operate-composition-handoff.mjs restore --bundle <bundle> --current-node phases/phase-readiness.md
  ```

- non-composition profile drift 或 malformed witness：保持 failed，按 named owner/contract boundary 处理；不得用 restore 覆盖它。
- receipt-less pre-v1 predecessor：只有 current HITL2 interaction 已经取得一份 complete explicit accepted projection、bundle 仍处于合法 pre-Final boundary 且 operation 正常判定 eligible 时，Agent 才可执行一次 migration，然后重跑同一个 Gate：

  ```bash
  node DEEP_RESEARCH_HARNESS/cli/operate-composition-handoff.mjs migrate-legacy --bundle <bundle> --current-node phases/phase-readiness.md --input <accepted-projection.yaml>
  ```

  migration 不重写 historical Gate，不把旧 context 说成已比较，也不自动取得用户决定。Readiness 不提出 composition 问题、不自动 mutation；缺少 accepted input 或 eligibility 时，保持当前 failed boundary。

## 4. Expected Artifacts

- All required artifacts 存在且可访问（`seed_topics/`、`reference/_INDEX.md`、`artifacts/wave2/synthesis.md`、`artifacts/hitl2/decision-brief.md`）
- `rb_trace.jsonl` 中所有 prior gate 均有 `gate_attempt` 事件 `passed: true`
- `rb_profile.yaml` 可解析
- `rb_trace.jsonl` 每行合法 JSON
- Gate 前 status window 为 `current_gate: hitl2_recorded` / `next_gate: readiness_passed`。Readiness gate pass 后，§6 的 `advance-status --to readiness_passed` 才会写入 terminal status `current_gate: readiness_passed` / `next_gate: none`。
- HITL2 composition witness 与当前 profile match，或一个 eligible migration 已建立其 post-migration witness；receipt 只用于 this checkpoint consistency，不成为 Final 数据 owner。

## 5. Gate Command

```bash
node DEEP_RESEARCH_HARNESS/cli/gates/check-gate-readiness-passed.mjs --bundle <path> --current-node phases/phase-readiness.md
```

## 6. On Gate Pass

读取 gate CLI JSON output，确认 `check.passed === true`，然后读取 `check.next`（应为 `phases/phase-final.md`）。先消费 final handoff，再同步 source gate terminal status：

```bash
node DEEP_RESEARCH_HARNESS/cli/enter-phase.mjs --bundle <path> --node <check.next>
node DEEP_RESEARCH_HARNESS/cli/advance-status.mjs --bundle <path> --to readiness_passed
```

从 `enter-phase` 渲染出的 Final Markdown 继续执行 final delivery。Readiness pass 后 `next_gate: none`，但 final delivery 仍由 `phase-final.md` 控制。

## 7. On Gate Fail

先读取 CLI top-level `hints[]`；`inspect[]` / `advice[]` 只提供 compatible forensic detail，不是 action authority。反馈读取与互动放置的完整契约（`repair_kind` 只分配责任、当前 loaded node 的 `stop` 才决定 interaction placement、`stop: no` 不得主动发起提问/状态/approval/acknowledgement、current turn 回答不创建 checkpoint）见 `shared/shared-silent-execution.md` 与引擎注入的 AUTONOMOUS header。不得从旧表格、legacy prose、rule target、path shape 或源码补猜 repair kind、permission、字段、命令或 earlier-phase route。按每个 independent primary hint 执行：

1. `repair_kind: agent_action`：当 `write_to` 是已授权的 artifact/profile mutable surface 时，由 Agent 修复 exact file/field；不得把缺失 prior Gate authority伪装成 artifact repair。
2. `repair_kind: engine_operation`：由 Agent 执行 `write_to` 指向的 existing legal gate/status/handoff/recovery operation；不得要求用户运行普通命令，也不得直接编辑 `rb_status.json`、`rb_trace.jsonl`、ledger、index、receipt、hash 或 provenance authority。
3. `repair_kind: user_decision`：识别真实缺失的语义/风险决定。Readiness 是 `stop: no`，不得由 hint 创建新 HITL、earlier-phase route、repair controller 或 lifecycle；没有 accepted decision path 时保持当前 checkpoint failed。
4. `repair_kind: external_action`：识别不可代理的权限/环境前置条件；不主动请求 acknowledgement，满足后机械执行回到 Agent。
5. `repair_kind: missing_contract`：保留 exact unavailable capability/contract boundary，不提供手改 trace/status、用户等待、绕过 Gate 或 speculative fallback。

当 hint 是 `composition_projection_drift` 时，`write_to` 中唯一的 Engine operation 是 `operate-composition-handoff.mjs restore`；Agent 执行后重跑同一 `readiness-passed` Gate。不得在 Readiness 询问用户、创造 semantic score、自动运行 migration，或建立新的 composition checkpoint。

Hint 不创造 permission、controller、lifecycle 或 route。完成可执行动作后 Agent MUST 运行 hint 的 exact `rerun`，回到同一个 `readiness-passed` checkpoint。Failed result 若没有可用 structured hint，不得从 `inspect[]`/`advice[]` 猜 blocking repair；按 `missing_contract` 暴露最小边界。

Readiness fail 只有在 structured hint 命名已存在且当前可达的 legal operation 时，才可离开本地 artifact repair surface；hint 本身不得授权回跳 earlier phase。稳定重复的 `missing_contract` root 作为结构性 bug boundary 报告，不建设 retry tree。

## 8. Stop Behavior

`stop: no` — Agent 自主执行 readiness check，不等待人类，不发送 readiness progress 或 idle/no-work 汇报。本地 precheck 完成后必须运行 `readiness-passed` gate；final handoff 完成条件是 gate pass + `enter-phase --node <check.next>` 写入 final route-bound load witness + `advance-status --to readiness_passed`。

Readiness gate fail 后按 structured hint 修复并运行 exact `rerun`。若 legal operation 确实指向 existing earlier-phase/HITL2 repair boundary，仍要遵守该 owner 与 Gate boundary：不得把“本地检查完成”当成完成点，不得自行绕过 gate 加载 final。

## 9. Anti-Cheating Rules

- **Readiness 只能检查 deterministic readiness**——artifact 存在、gate evidence 可审计、状态一致、profile/trace 可解析
- **MUST NOT 做 content quality 或 writing quality 判断**——不能因为"synthesis 写得不够好"、"decision brief 不够详细"而 fail readiness
- **MUST NOT 做 semantic research quality 判断**——不能评估"evidence 够不够强"、"argument 够不够严密"
- **MUST NOT 检查 final report 的内容**——final report 在 readiness pass 之后才生成
- 缺 artifact、缺 trace、缺 gate evidence 时 **MUST fail**
- YAML/JSONL 不可解析时 **MUST fail**
- 参见 `shared-anti-cheating-rules.md` 的通用禁令

## Log

记录命令: `node DEEP_RESEARCH_HARNESS/cli/log-event.mjs --bundle <bundle> --level <LEVEL> --msg "<message>"`

| 时机 | 命令 |
|------|------|
| Phase 开始 | `node DEEP_RESEARCH_HARNESS/cli/log-event.mjs --bundle <bundle> --level info --msg "phase:readiness START"` |
| Phase 结束 | `node DEEP_RESEARCH_HARNESS/cli/log-event.mjs --bundle <bundle> --level info --msg "phase:readiness END — <summary>"` |
