## Why

Wave0 already permits `wave0_source_intake` to submit a real shared rich
reference, and the gate counts that submitted output. But the
`shared_ref_count_floor` repair feedback still tells the Phase Agent to write
directly under `reference/`, while the task card presents the legal output as
optional. This contradiction steers repair toward an unbacked orphan instead of
the existing delegated producer.

## What Changes

- Change the definition-owned Wave0 missing-shared-reference feedback so it
  names the existing `wave0_source_intake` delegated submit path rather than a
  direct Phase write to `reference/`.
- Make the Wave0 producer guidance require its legal shared-reference output
  when that producer is used to meet the shared-reference floor, without
  changing required `source.yaml` output or adding a work-unit kind.
- Repair the focused deterministic fixture for submitted shared-reference
  counting under canonical seed admission, and cover the legal submitted path,
  the direct-orphan rejection, and the repair coordinate.
- This is a backward-compatible framework behavior change; apply SHALL bump
  the framework to `v0.52` and update root `CHANGELOG.md` plus the
  `DPT_FRAMEWORK/RUN.md` release banner.

This change SHALL NOT alter `wave0_shared_ref_total`, the Wave0 degradation
policy, queue operations, work-unit kinds, persistent state, retry control, or
Wave1/Wave2 ownership behavior. It SHALL NOT add deterministic E2E or
Agent-flow E2E automation.

语义层反思：本 change 不引入新的 state、projection、command 或 reader-facing
view。它让 Phase Agent 对一个已有的有界问题得到准确答案：缺少 shared
reference 时，哪一个现有 producer 能合法建立可计数证据。它保留“直接
Phase 文件”和“已提交 delegated output”的 provenance 区别，反馈的正常推理
停止点是已有 `operate-work-unit` submit/checkpoint，而不是让读者重建 ledger
规则。submitted output ledger 仍是 evidence authority，gate definition 只拥有
feedback coordinate。

最短合法闭环是 Agent 从 Wave0 guidance 选择既有 `wave0_source_intake`，actor
将带 `source_url` 的 shared reference 声明为 output 并 formal submit，Engine
从 submitted ledger 计数，再 rerun Wave0 gate。这样修正一个错误的 direct
write hint，并把一个 discretionary 词改为有条件的既有生产义务；避免了新
kind、queue command、second ledger、health state、retry controller 和长链
automation。Agent 负责现有合法命令和内容生产，Engine 负责 submit/count/gate
verdict；用户只在后续 shared-reference floor 政策需要新产品决定时介入，不能
以 human-directed 方式把 orphan 写入变成 submitted evidence。

## Capabilities

### New Capabilities

- None.

### Modified Capabilities

- `research-wave-phase-content`: Wave0 guidance SHALL make the existing
  delegated shared-reference producer explicit when repairing the shared floor.
- `research-wave-gate-implementation`: Wave0 shared-reference-floor feedback
  SHALL identify the legal delegated repair surface instead of direct orphan
  file creation.

No new requirement ID is allocated: this change narrows the existing
`RWP-001` producer guidance and `RWG-004` definition-driven gate-feedback
contract. The requirement registry remains unchanged.

## Impact

- `DPT_FRAMEWORK/schema/gate_definitions/gate-wave0-complete.definition.json`
  and `DPT_FRAMEWORK/workflows/nodes/phases/phase-wave0.md`.
- Focused root `tests/` fixtures/tests for reference counting and Wave0 gate
  feedback; no dependency additions or runtime schema migration.
- Root `CHANGELOG.md` and `DPT_FRAMEWORK/RUN.md` at apply time.
