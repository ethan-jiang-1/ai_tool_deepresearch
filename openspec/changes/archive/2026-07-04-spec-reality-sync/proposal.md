## Why

`openspec/specs/` 是 SSOT，但上一轮 `subagent-execution-logging` archive sync 后，审计发现 **15 处 spec 与框架现状失配**（8 处 HIGH）：wave0 产物路径仍写已废弃的 `reference/<topic>/source.yaml`、cache 布局仍写 `_cache/search-results/` 与 `_cache/waveN/slot_MM/`、gate 规则清单与 gate definition JSON 严重不完整、wave1/wave2 phase spec 仍描述前驱动时代的 spawn/complete 模型。此外，5 个新建/修改 spec 带入了 delta 语气噪声（"In this change"、"不再是 dead code"），会让未来 coding agent 误读 normative 边界。

若不同步，后续 change 会以错误 spec 为起点继续叠加——这正是 subagent 痼疾反复出现的根因之一。本 change 以 **框架代码 / gate JSON / phase MD / CLI 实际行为** 为客观基准，把 spec 拉回与现状一致，并补齐唯一一处 spec 正确但代码缺位的 `trace_event_present` gate 规则。

**Apply-ready 状态（2026-07-04）**：18 个 capability delta 已修稿（req ID、MODIFIED 标题对齐、wave2 三层同步）；`check-project-reqs.mjs` PASS。Apply 阶段执行 §1 代码（gate JSON rule + gate CLI dispatcher）+ §2 merge + §4 grep + §5 验证。

## What Changes

- **A. 措辞去噪（零语义变化）**：`relay-provenance-gate`、`subagent-runtime-logging`、`subagent-directory-contract`、`subagent-relay-driver`、`subagent-node-contract` 的 Purpose/Requirement 中 "In this change / 本 change / dead code 叙事" 改为无时态 accepted 措辞。
- **B. Wave0 路径同步**：`research-wave-gate-implementation` RWG-001 等、`agentic-queue` AGQ-007、`research-wave-phase-content`、`subagent-collect` 示例路径 — 统一为 `artifacts/wave0/{topic}/source.yaml` + `reference/_INDEX.md`（基准：`gate-wave0-complete.definition.json`、`phase-wave0.md`）。
- **C. Cache 布局同步**：`agentic-queue` AGQ shared-subagent-protocol 描述、`wave2-synthesis` — 统一为 `_cache/{wave}/{batch}/{scope}/sNN_{slug}/`（基准：`shared-subagent-protocol.md` §2）。
- **D. Gate 规则清单补齐**：`research-wave-gate-implementation` wave1/wave2 规则列表对齐 gate JSON 实际规则（provenance/quality/conditional cross-ref/rerun）。
- **E. Wave1/Wave2 协作契约同步**：`wave1-intake`、`wave2-synthesis`、`research-wave-phase-content`、`cache-raw-web-content` — 接上 `drive-relay-slot` 驱动模型；wave2 单轮 synthesis + §3.3.2 补料循环对齐 `phase-wave2.md`；`AGQ-015` cross_topic_synthesis 同步。
- **F. 杂项对齐**：`subagent-slots` SUS-001 补 `_beacon.json`；`subagent-relay-driver` 补 `stage --cache-dir/--platform` 等实际 flag；`agentic-queue` AGQ-008 playbook 三场景保留 + 路径修正。
- **G. 代码补齐（用户已裁决）**：三个 gate definition JSON 各补 `trace_event_present` 规则 + 三个 wave gate CLI 各补 `trace_event_present` check type dispatcher（`readTraceEvents` reader 已存在，但 CLI rule dispatcher 无 case 分支）（apply §1）。
- **H. 跨 capability 路径同步（grep 扩展）**：`shared-node-content`、`content-delivery-gate-implementation`、`content-delivery-phase-content`、`research-wave-experiments`、`experiment-ref-integrity`。

**Grep allowlist（历史/对比 prose，不修改）**：`reference-flat-format`（显式对比旧路径）、`wave0-artifacts-directory` Purpose（迁移说明）、`bundle-start-from-here`（禁止旧路径的负向表述）。

**不产出**：不重新设计 relay/logging 架构；不改 gate pass/fail 语义（除新增 trace 规则外）；不碰 experiments_playbook 执行逻辑（仅 spec 中引用路径/文件名修正）。

## Capabilities

### New Capabilities

（无 — 全部为既有 capability 的 MODIFIED delta）

### Modified Capabilities

- `relay-provenance-gate`: RPG-007..013 措辞去噪
- `subagent-runtime-logging`: SRL-004 去噪
- `subagent-directory-contract`: Purpose 去 delta 叙事 + SDC-001
- `subagent-relay-driver`: Purpose/SRD 去噪；SRD-001 补 CLI flag
- `subagent-node-contract`: Purpose 去噪 + SNC-001
- `subagent-slots`: SUS-001 body 补 `_beacon.json`
- `subagent-collect`: SUC-002 路径 `artifacts/wave0/`
- `agentic-queue`: AGQ-007/008/013/015 + shared-subagent-protocol cache 布局
- `research-wave-gate-implementation`: RWG-001/002/003 对齐 gate JSON
- `research-wave-phase-content`: RWP-001/002/003/006 relay + 路径 + wave2 单轮模型
- `wave1-intake`: WAI-001/002 + sub-agent 写边界/cache/driver
- `wave2-synthesis`: WTS-002/003/006 单轮 + 补料 + cache + driver
- `cache-raw-web-content`: CRC-002 driver staging
- `shared-node-content`: SHC-003 wave0 路径
- `content-delivery-gate-implementation`: CDG-002 `reference/_INDEX.md`
- `content-delivery-phase-content`: CDP-002 `reference/_INDEX.md`
- `research-wave-experiments`: RWE-001 wave0 路径 + playbook 文件名
- `experiment-ref-integrity`: EXR-003 `drive-relay-slot commit` 叙事

## Impact

- **openspec/specs/**：18 个 capability 经 delta MODIFIED 后 sync 进 main specs（archive 时）
- **DPT_FRAMEWORK/schema/gate_definitions/**：`gate-wave{0,1,2}-complete.definition.json` 各 +1 `trace_event_present` rule（apply §1）
- **DPT_FRAMEWORK/cli/gates/**：`check-gate-wave{0,1,2}-complete.mjs` 各 +1 `trace_event_present` check type dispatcher branch（apply §1）
- **tests/**：gate definition / transition-integrity 相关回归（apply §1.5）
- **Version bump**：否 — 补齐 gate trace 规则是闭合 spec↔代码缺口
