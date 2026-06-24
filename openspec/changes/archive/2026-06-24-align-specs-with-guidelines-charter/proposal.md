## Why

`guidelines/` 已经把项目宪章术语重新收敛为清晰的角色/控制面模型，但 `openspec/specs/` 和 `DPT_FRAMEWORK/` 的活跃说明仍残留旧称呼和少量事实漂移。若不对齐，后续 Coding Agent 会在 accepted specs、framework docs、phase Markdown 之间读到互相冲突的概念。

本 change 的目的不是引入新能力，而是用 OpenSpec 留痕管控一次谨慎的文档/说明对齐：`guidelines/` 作为解释层，不能直接覆盖 accepted specs 或 executable contracts。

## What Changes

- 对齐活跃 `openspec/specs/` 中的概念 prose：
  - 用 `Phase Agent` 表示执行 phase-level Markdown、claim/complete、gate/repair/relay 判断的运行时角色。
  - 用 `Sub-agent` / `sub-agent` 表示 relay slot 内执行 bounded task Markdown 的角色；保留 schema/wire value `sub-agent`。
  - 用 `Agent actor` 泛指 LLM/human 执行主体；避免把 `main-agent` 当概念角色名。
  - 保留当前 wire/API 示例和值：`targets.controller: "main-agent"`、`--actor main-agent`、`delegates.to: "sub-agent"`、`rb_queue.json`。
  - 对 `agentic-queue` 中重复出现的同名 requirements 先做定位和归并策略说明，再编辑对应段落。已知重复包括 `Queue state and item schema are structured`、`Producer rule source_intake_fan_in`、`Producer rule seed_topic_materialize`。Apply 后同一 accepted behavior 不应同时保留新旧两套活跃 prose。
- 修复已验证的 runtime fact drift：
  - 当前 active queue state file 是 `rb_queue.json`，不引入 alternate queue state file。
  - 当前 gate transition-table contract 是 `DPT_FRAMEWORK/schema/contracts/gate.mjs`；这不是 `gate-definition.mjs` 的重命名，也不是 gate definition JSON 的 Zod schema，而是退休 stale accepted prose 中不存在的 gate-definition contract 要求。Gate definition JSON runtime surface 仍在 `schema/gate_definitions/`。
- 对齐 `DPT_FRAMEWORK/` 中明确 Agent-facing 的 README / CLI README / workflow Markdown / narrowly confusing engine comments。Runtime metadata terms such as `parentRuntimeAgentId` and trace actor values are not conceptual role prose and are not migrated in this change.
- 对齐活跃 `experiments_playbook/` 中会被 Agent 执行者读取的实验 prose，并从 retired prototype 说明中移除旧 queue filename 噪声。
- 不修改 archives、`_backlog/`、schema enum、CLI flag、engine behavior、wire value 或 runtime 文件名 contract。

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `agentic-queue`: align TargetSpec / producer-rule prose with Phase Agent and Sub-agent terminology while preserving wire examples.
- `workflow-directory-contract`: retire stale `gate-definition.mjs` accepted prose and align gate runtime-surface wording to current `gate.mjs` transition-table contract plus gate definition JSON layout.
- `schema-core`: align queue contract prose from legacy `target` wording to current `targets` field.
- `wave1-intake`: align Phase Agent / Sub-agent role prose while preserving `targets` wire values.
- `subagent-collect`: align collection responsibility prose to Phase Agent / Sub-agent roles.
- `subagent-dispatch`: align collect-as-return prose to Phase Agent / Sub-agent roles.
- `research-wave-phase-content`: align wave0 queue task prose from legacy `target` wording to current `targets` field and role terms.
- `seed-topic-materialization`: align direct Phase Agent execution prose while preserving `main-agent` wire value.

## Impact

- Affected documentation/source-of-truth surfaces:
  - `openspec/specs/`
  - `DPT_FRAMEWORK/README.md`
  - `DPT_FRAMEWORK/cli/README.md`
  - selected `DPT_FRAMEWORK/engine/*.mjs` comments
  - selected `DPT_FRAMEWORK/workflows/nodes/**/*.md` Agent-facing phase text
  - selected `experiments_playbook/` Agent-readable playbook prose
  - retired prototype documentation note where it could otherwise look like current queue guidance
- Excluded surfaces unless separately approved:
  - runtime metadata / trace values such as `actor: "parent"` and `parentRuntimeAgentId`
  - executable schema enum values, CLI flags, engine behavior, fixtures, and generated agent role templates
  - archives, `_backlog/`, and accepted specs outside the explicitly listed modified capabilities
- No public API, schema, CLI, dependency, or engine behavior changes.
- Future migration of wire values such as `"main-agent"` to another executable string requires a separate OpenSpec change with schema, CLI, fixtures, playbooks, and tests.
