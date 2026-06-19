## Why

Workflow Foundation 需要 14 个 phase/shared node、8 个 gate definition JSON、8 个 gate CLI wrapper、1 个 phase manifest——共 ~31 个文件。如果 content change（`wff_content-setup` 等）直接创建这些文件，每个 change 会在创建不同 phase 的 node 时重复争论 metadata shape、gate 命名、CLI 形态。结果就是同样的 metadata contract 被 4 个 change 各自解释一遍，不一致风险高。

这个 change 做一件事：一次性创建所有骨架文件——正确的 metadata、正确的命名、正确的目录落点、最小的 body。后续 content change 只做一件事：往已有文件里填内容，不再争论结构。

## What Changes

- 创建 `DPT_FRAMEWORK/workflows/manifest.json` — phase manifest / lifecycle map
- 创建 9 个 phase node 骨架（`phase-instantiation.md` → `phase-final.md`），每个含完整 frontmatter metadata 和最小 body
- 创建 5 个 shared node 骨架（`shared-profile.md`、`shared-gate-rules.md`、`shared-schemas.md`、`shared-repair-guidance.md`、`shared-anti-cheating-rules.md`）
- 创建 8 个 Gate definition JSON 骨架（`gate-instantiation-complete.definition.json` → `gate-readiness-passed.definition.json`），含 gate/rules 占位结构
- 创建 8 个 Gate CLI 骨架（`check-gate-instantiation-complete.mjs` → `check-gate-readiness-passed.mjs`），含 `--bundle` flag 和 check/inspect/advice 输出 shape
- 建立 Agent 执行 behavior 的最低约定（spec 层规则，不是 experiment playbook 文件）：load current node → load `requires` → do minimum action → run gate → read feedback → repair/advance

## Capabilities

### New Capabilities

- `workflow-node-contract`: Phase node 和 shared node 的 metadata contract（`node_type`、`id`、`phase`/`gate`/`next`/`stop`、`requires`、`suggested_context`、`shared_scope`、`authority`），phase manifest 的 lifecycle navigation，14 个 node 骨架文件，final node 的 terminal 语义（`gate: none`、`next: none`）。
- `gate-skeleton`: 8 个 Gate definition JSON 骨架（含 `gate`、`description`、`rules` 占位结构），8 个 Gate CLI 骨架（含 `--bundle` flag、check/inspect/advice 输出 shape），one gate per CLI 的外部形态。

### Modified Capabilities

（无——本 change 在 `wff-directory-contract` 建立的目录约定内创建新文件，不修改已有 capability 的 requirement）

## Impact

- **新文件 ~31 个**：`DPT_FRAMEWORK/workflows/`（14 个 node MD + 1 个 manifest JSON）、`DPT_FRAMEWORK/schema/gate_definitions/`（8 个 JSON）、`DPT_FRAMEWORK/cli/gates/`（8 个 .mjs）
- **依赖**：`wff-directory-contract`（目录约定已就位，`phases/`、`shared/`、`gate_definitions/`、`cli/gates/` 已创建）
- **约束后续 change**：`wff_content-setup`、`wff_content-waves`、`wff_content-delivery` 只修改这些文件的 body 和 gate rules，不创建新文件、不改变 metadata 结构
- **不负责**：node body 的完整内容、gate 的最终 rule set、CLI 的完整实现——这些留给 content changes
