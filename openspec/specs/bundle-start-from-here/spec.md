# bundle-start-from-here Specification
> req: BUS-001

## Purpose
Bundle 启动入口 START_FROM_HERE.md: 告知 Agent 框架位置、控制文件清单、数据目录映射与停止授权规则。
## Requirements
### Requirement: START_FROM_HERE.md is the first file an agent reads
The boot entry SHALL provide: framework location (`../DPT_FRAMEWORK/`), control file list with `rb_` prefixed names, data directory map, and stop authorization rules.

#### Scenario: Agent reads boot entry on first entry
- **WHEN** an agent opens a bundle directory for the first time
- **THEN** `START_FROM_HERE.md` tells it to load `rb_plan.md`, `rb_profile.yaml`, `rb_status.json`, `rb_queue.json`, `rb_trace.jsonl`

#### Scenario: Boot entry declares framework as read-only
- **WHEN** an agent reads `START_FROM_HERE.md`
- **THEN** it knows `../DPT_FRAMEWORK/` is shared and must not be modified

### Requirement: Boot entry documents stop authorization
`START_FROM_HERE.md` SHALL state: only `final_delivery`, `decision_blocker`, or `empty_queue_after_refill` authorize user-visible output.

#### Scenario: Agent follows stop authorization from boot entry
- **WHEN** an agent considers stopping mid-wave
- **THEN** `START_FROM_HERE.md` tells it to continue unless one of three authorized states is reached

