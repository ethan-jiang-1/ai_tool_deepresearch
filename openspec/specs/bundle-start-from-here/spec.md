# bundle-start-from-here Specification
> req: BUS-001, BUS-002

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

