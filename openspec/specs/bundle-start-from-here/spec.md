# bundle-start-from-here Specification
> req: BUS-001, BUS-002, BUS-003

## Purpose
Bundle 启动入口 START_FROM_HERE.md: 告知 Agent 框架位置、控制文件清单、数据目录映射与停止授权规则。
## Requirements
### Requirement: START_FROM_HERE.md is the first file an agent reads
The boot entry SHALL provide: framework location (`../DPT_FRAMEWORK/`), control file list with `rb_` prefixed names, data directory map, and stop authorization rules. The data directory map SHALL document:

- `reference/` — flat evidence directory (`00-shared-*.md` / `00-cross-*.md` / `0N-*.md`, `_INDEX.md` as canonical inventory), no subdirectories
- `artifacts/` — phase output organized by wave (`wave0/` thin YAML, `wave1/` topic synthesis, `wave2/` cross-topic synthesis)
- `seed_topics/` — seed topic files
- `final/` — final report

#### Scenario: Agent reads boot entry on first entry
- **WHEN** an agent opens a bundle directory for the first time
- **THEN** `START_FROM_HERE.md` tells it to load `rb_plan.md`, `rb_profile.yaml`, `rb_status.json`, `rb_queue.json`, `rb_trace.jsonl`

#### Scenario: Boot entry declares framework as read-only
- **WHEN** an agent reads `START_FROM_HERE.md`
- **THEN** it knows `../DPT_FRAMEWORK/` is shared and must not be modified

#### Scenario: Agent reads updated boot entry data directory map
- **WHEN** an agent opens a bundle directory for the first time
- **THEN** `START_FROM_HERE.md` tells it `reference/` is a flat directory with `_INDEX.md` as canonical inventory
- **AND** tells it `artifacts/wave0/` exists alongside `artifacts/wave1/` and `artifacts/wave2/`

#### Scenario: Boot entry no longer references nested reference directories
- **WHEN** an agent reads `START_FROM_HERE.md`
- **THEN** it SHALL NOT see references to `reference/<topic>/` subdirectories or `reference/00_shared/source.yaml`

### Requirement: Boot entry documents stop authorization
`START_FROM_HERE.md` SHALL state: only `final_delivery`, `decision_blocker`, or `empty_queue_after_refill` authorize user-visible output.

#### Scenario: Agent follows stop authorization from boot entry
- **WHEN** an agent considers stopping mid-wave
- **THEN** `START_FROM_HERE.md` tells it to continue unless one of three authorized states is reached

### Requirement: START_FROM_HERE.md SHALL document current_node as the resume phase coordinate

The bundle boot entry SHALL explain that non-null `rb_status.json.current_node`, when present, identifies the lifecycle phase Markdown node the Agent should resume from. The boot entry SHALL preserve the existing instruction to read `rb_status.json`, `rb_queue.json`, and `rb_trace.jsonl`; it SHALL clarify that `current_gate` / `next_gate` are gate-window fields, while `current_node` is the active loaded control surface. If `current_node` is `null` or absent, the Agent SHALL fall back to existing trace/reentry checks instead of guessing from `current_gate` alone.

#### Scenario: Agent sees current node resume guidance

- **WHEN** an Agent reads `START_FROM_HERE.md`
- **THEN** it SHALL learn that non-null `rb_status.json.current_node` is the preferred current phase node coordinate when present
- **AND** it SHALL still read queue and trace before continuing work

