# Workflow Directory Contract (delta)

> req: WDC-004, WDC-009

注：WDC-009 为 delta 新增 ID，内容嵌入 WDC-004 的 MODIFIED body 中（`reference/` 扁平结构 + `artifacts/wave0/`），不设独立 `### Requirement:` 块。参见 `openspec/governance/req-registry.yaml` 中对应 pending 条目。

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
- `reference/` — 扁平本地 evidence 目录（`00-shared-*.md` / `00-cross-*.md` / `0N-*.md` rich MD + `_INDEX.md` + `README.md`），无子目录
- `artifacts/` — 阶段产物，含 `wave0/`（thin YAML source 列表）、`wave1/`（topic 深挖合成）、`wave2/`（cross-topic 合成）
- `final/` — 最终报告

Cache directory:
- `_cache/` — 可重建 cache/projection，NOT runtime truth

#### Scenario: reference/ is flat, not nested

- **WHEN** bundle 的 `reference/` 目录被检查
- **THEN** 不存在 `reference/<topic>/` 或 `reference/00_shared/` 子目录
- **AND** 所有 `.md` 文件平铺在同一层级

#### Scenario: artifacts/ includes wave0 directory

- **WHEN** bundle 的 `artifacts/` 目录被检查
- **THEN** `artifacts/wave0/`、`artifacts/wave1/`、`artifacts/wave2/` 均存在

#### Scenario: Runtime truth is in bundle not chat memory

- **WHEN** agent 需要恢复当前 run 状态
- **THEN** agent MUST 从 active `dpt_rb_*` 的 control files reload，MUST NOT 依赖 chat memory 或 console summary 作为 state

#### Scenario: Cache is not authority

- **WHEN** `_cache/` 内容与 canonical control files 冲突
- **THEN** canonical control files 的值为 authoritative truth
