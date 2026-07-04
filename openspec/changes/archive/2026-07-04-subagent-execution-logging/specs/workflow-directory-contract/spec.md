# Workflow Directory Contract (delta)

> req: WDC-004

## Purpose

Add `_subagents/` to the runtime bundle canonical structure catalog. WDC-004 previously listed control files
and data directories but omitted the relay slot tree that engine, gate, and protocol docs already depend on.
SDC-001 formalizes `_subagents/` as the sole relay slot artifact directory; this delta adds it to the bundle
skeleton so readers do not need to infer it from engine code alone.

## MODIFIED Requirements

### Requirement: Runtime bundle canonical structure

Active `dpt_rb_*` run bundle SHALL 包含以下 canonical control files 和 data directories：

Control files:
- `rb_plan.md` — 本 run 的 plan/topic registry
- `rb_profile.yaml` — HITL1/HITL2 用户输入、profile、decision、retry config
- `rb_status.json` — 当前 workflow/phase/gate 状态摘要
- `rb_queue.json` — runtime queue state
- `rb_trace.jsonl` — append-only runtime history/audit trail

Data directories:
- `seed_topics/` — initial topic / seed-topic data
- `reference/` — 本地 evidence
- `artifacts/` — 阶段产物（如 `wave1/`、`wave2/`）
- `final/` — 最终报告

Relay directory:
- `_subagents/` — relay-managed sub-agent slot tree (`wave_NN/slot_MM/` per SDC-001 / SUS-001); created on first relay staging, not necessarily present in the empty template

Cache directory:
- `_cache/` — 可重建 cache/projection，NOT runtime truth

#### Scenario: `_subagents/` is part of the bundle skeleton

- **WHEN** a bundle has executed relay staging for a wave
- **THEN** `_subagents/wave_NN/` SHALL exist with `dispatch.json` and per-slot directories under `slot_MM/`
- **AND** provenance forensics and slot presence checks SHALL scan only this tree for relay slot artifacts (SDC-002)

#### Scenario: Runtime truth is in bundle not chat memory

- **WHEN** agent 需要恢复当前 run 状态
- **THEN** agent MUST 从 active `dpt_rb_*` 的 control files reload，MUST NOT 依赖 chat memory 或 console summary 作为 state

#### Scenario: Cache is not authority

- **WHEN** `_cache/` 内容与 canonical control files 冲突
- **THEN** canonical control files 的值为 authoritative truth
