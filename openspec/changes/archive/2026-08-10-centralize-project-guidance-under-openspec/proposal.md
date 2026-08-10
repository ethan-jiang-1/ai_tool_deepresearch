## Why

项目的 accepted behavior、change lifecycle 与 deterministic governance 已由 `openspec/` 承载，但项目
指导仍位于根 `guidelines/`。这使读者必须在两个顶层控制面之间判断权威，并把宪法原则、概念模型
和 operation procedure 误当作同一类 peer。当前主干已修复此前 `change-feedback-loop` 的 hierarchy
test fixture mismatch（`c93189aca`，2026-08-10）；本 change 不把该已关闭问题表述为当前故障，而是
将其作为必须防止再次发生的角色边界风险。

原始需求与上游规划来自
`_backlog/plans/centralize-project-guidance-under-openspec.md` 及
`_backlog/plans/centralize-project-guidance-under-openspec-progressive-plan.md`。

## What Changes

- 将 current project guidance 迁移到 `openspec/constitution/`、`openspec/guidance/models/` 和
  `openspec/operations/`，使每个目录回答不同读者的有界问题并声明其 authority limit。
- 保留根 `AGENTS.md`、`CLAUDE.md`、`README.md` 与 `CONTEXT.md` 为薄 discovery adapter；它们仍按
  Charter -> Context 路由，但指向唯一的新 canonical path。
- **BREAKING (current path contract):** 移除根 `guidelines/` 作为 supported current source，并在同一
  Apply 中更新所有已识别的 current/live consumer。archive 与其他明确排除的历史材料保持原样，不提供
  永久 mirror、symlink 或双路径兼容层。
- 让 constitution hierarchy 只检查 constitution documents；models 与 operations 由各自的 role-aware
  navigation/operation contract 保护。尤其保留 operation guidance 对 accepted spec 和 governed finalizer
  的真实 defer route。
- 更新 root/Harness entry routes、OpenSpec config、accepted path contracts 和 focused regressions，使它们
  收敛到新路径。既有 Apply/Archive skill 与 command adapter 通过 `openspec instructions` 获取
  project-owned guidance；本 change 不改写这些既有 source assets 来承载项目路径。
- Change A 只做 topology、路径和必要的 role-coordinate repair。`openspec/README.md` 在此 change 中
  仅承担可用的 control map；mandatory context 瘦身、glossary 去重、文件重命名与新的 topology automation
  留给后续 `prune-and-automate-project-guidance` change。

本 change 不改变 Harness runtime behavior、schema、CLI、Gate、receipt、trace 或 research-entry selection，
也不要求 Harness version bump。

## Capability Discovery

| Candidate path | Evidence read | Decision | Reason |
| --- | --- | --- | --- |
| `governance/guidance-constitution` | `openspec/specs/README.md`; `openspec/specs/governance/guidance-constitution/spec.md`; current Charter, guidance index, and constitution regression | Modify | Its requirements currently define a flat `guidelines/` hierarchy, Charter-only `defers_to`, and same-suite navigation. The canonical constitution path and recursive role-aware hierarchy are observable guidance contracts. |
| `agent/agent-context-routing` | `openspec/specs/README.md`; `openspec/specs/agent/agent-context-routing/spec.md`; root/Harness entry documents, `CONTEXT.md`, and context-routing regression | Modify | Its required Charter -> Context routes and canonical terminology links currently name `guidelines/` paths. The route order remains unchanged, but its required canonical coordinates change. |
| `governance/change-feedback-loop` | `openspec/specs/README.md`; `openspec/specs/governance/change-feedback-loop/spec.md`; current feedback guidance, supported Apply/Archive adapters, and finalizer conformance regression | Modify | Supported lifecycle entries must obtain current central review guidance. Making `openspec/operations/change-feedback-loop.md` the sole current guidance coordinate changes that supported operation-path contract while preserving review and finalizer authority. |
| `verification/verification-routing` | `openspec/specs/README.md`; `openspec/specs/verification/verification-routing/spec.md`; focused knowledge-surface regression | Verify-only | Test-class taxonomy, proof permissions, and verdict boundaries do not change. Its focused regression is a selected verification asset, not a behavior delta. |
| `engine/logging-conventions` | `openspec/specs/README.md`; `openspec/specs/engine/logging-conventions/spec.md`; current logging guidance | Excluded | Change A relocates the operation document without changing logging envelope, CLI, exit, or trace behavior. Any content separation belongs to Change B. |
| `governance/semantic-fact-closure` | `openspec/specs/README.md`; `openspec/specs/governance/semantic-fact-closure/spec.md`; `openspec/governance/semantic-fact-families.yaml` | Excluded | Guidance topology changes no catalogued runtime deterministic fact family. The change will carry an honest `not_applicable` closure record rather than inventing a family. |

## Capabilities

### New Capabilities

- None.

### Modified Capabilities

- `governance/guidance-constitution`: define canonical constitutional hierarchy and role-aware navigation outside the retired flat `guidelines/` suite.
- `agent/agent-context-routing`: require the existing Charter -> Context entry route to use the new canonical Charter and terminology-model coordinates.
- `governance/change-feedback-loop`: require supported lifecycle entries to obtain the relocated canonical operation guidance without creating a second review authority.

## Impact

- Current guidance documents, their frontmatter, their internal links, and `openspec/README.md` control map.
- Root and Harness discovery/entry documents, root glossary links, and `openspec/config.yaml`; the eight
  supported lifecycle adapters remain stable consumers of configuration-delivered operation guidance.
- Focused `node:test` regressions for constitution hierarchy, context routing plus preserved research-entry selection, feedback finalization, verification knowledge surfaces, and experiment terminology.
- No dependencies added and no runtime bundle, Harness behavior, or archive content changed.
