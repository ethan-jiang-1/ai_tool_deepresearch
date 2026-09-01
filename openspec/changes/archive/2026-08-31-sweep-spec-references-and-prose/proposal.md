# Proposal: sweep-spec-references-and-prose

来源：`_backlog/plans/cleanup-wave2-carving-test-guards-and-ledger.md`（W5；AUD-4 §5 排名清单）。

## Why

AUD-4 发现 spec 层 13 处 CLASS-B 无谓实现引用、2 处 Purpose 计数过时、1 处 C2 引致的 owner 指针落后一跳、1 处幽灵 playbook 名。这些是未来漂移的温床。

## What Changes

- CLASS-B 批量：13 处 / 10 文件的实现引用改写为所有权指针（C3 模式）。
- 小修：schema-core Purpose 计数（10→14/6→10）、CHI-004 disposition owner 指针重指、`research-wave-experiments` Purpose 幽灵 playbook 名。
- **不含**：delta-synced 标记约定裁决（独立裁决）、场景墙表格化。

## Capabilities

### New Capabilities
（无。）
### Modified Capabilities
（无——`skip_specs: true`。）

## Impact

- 10 个 spec 文件的句级改写；零代码。

## Capability Discovery

Evidence read：AUD-4 全量三分类 + 10 文件逐处 spot-verify。

| Candidate path | Evidence read | Decision | Reason |
| --- | --- | --- | --- |
| `engine/gate-skeleton` | AUD-4 CLASS-B 清单 | Excluded | doc-only 句级改写，requirement 零变化 |
| `engine/cli-inspect-output-conventions` | AUD-4 CLASS-B 清单 | Excluded | 同上 |
| `agent/delegated-work-units` | AUD-4 CLASS-B 清单 | Excluded | 同上 |
