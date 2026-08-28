## Why

`DEEP_RESEARCH_HARNESS/cli/README.md` 作为 Engine CLI surface 的入口文档，缺少 `operate-queue.mjs` 的索引覆盖：结构图只列了 6 个 CLI 工具而不含 `operate-queue`；exit-code inventory 和 Selected Public Operation Parsing 表也没有 `operate-queue` 的条目。这些都是与 `COMMANDS.md` 平行的缺口，在同一次操作复盘中发现（见 `_backlog/_done/_closed_plans/commands-md-cli-surface-coverage-and-copyable-contracts.md`）。

## What Changes

只改 `DEEP_RESEARCH_HARNESS/cli/README.md` 一个文件，纯文档补全，零引擎行为改动：

- Structure 节补 `operate-queue.mjs` 的说明行。
- Exit-code current-state inventory 补 `operate-queue.mjs` 的入口（生命周期动词集 + exit code 语义）。
- Selected Public Operation Parsing 表补 `operate-queue.mjs` 行（`check/enqueue/claim/complete/fail/preempt/count/render/project/repair` + `--task`/`--result`/`--failure`/`--actor` 等变体）。

## Capabilities

### New Capabilities

None.

### Modified Capabilities

None. This change fills CLI-surface coverage gaps under the already accepted `agent-command-surface` (ACS-003) completeness/copyability requirement. `skip_specs: true` — no observable behavior change.

## Capability Discovery

| Candidate path | Evidence read | Decision | Reason |
| --- | --- | --- | --- |
| `agent/agent-command-surface` | `openspec/specs/agent/agent-command-surface/spec.md` (ACS-003), `DEEP_RESEARCH_HARNESS/COMMANDS.md` | Verify-only | 已接受 spec 要求命令索引完整性与可复制性；本 change 补齐 CLI surface 文档的平行缺口。 |
| `engine/cli-exit-code-conventions` | `openspec/specs/engine/cli-exit-code-conventions/spec.md`, `DEEP_RESEARCH_HARNESS/cli/README.md` | Verify-only | 已有 exit-code 清单缺少 operate-queue 条目；补全即可。 |

## Impact

- 唯一目标文件：`DEEP_RESEARCH_HARNESS/cli/README.md`。
- 不改变 Engine 裁决行为、exit code 语义、CLI 名称或 schema 字段。