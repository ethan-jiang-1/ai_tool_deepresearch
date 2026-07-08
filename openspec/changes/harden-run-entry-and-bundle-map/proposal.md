## Why

FOSE run 之后的 bug triage 显示两个入口/导航问题还没有真正闭合：repo-root 行为文件没有抑制内置 research shortcut，新的 session 仍可能优先调用通用 `deep-research`；同时 bundle 根目录的 `START_FROM_HERE.md` 名字和内容都把被动地图误导成动作入口。这个 change 来自 `_backlog/plans/fose-run-bugfix-batch-plan.md` 的 Change 3，并直接覆盖 `_backlog/bugs/BUG-045-deep-research-skill-overrides-framework.md` 与 `_backlog/bugs/BUG-061-start-from-here-misleading-name-and-positioning.md`。

## What Changes

- 将 research shortcut 抑制规则提升到 repo-root `CLAUDE.md` 和 `AGENTS.md`：当用户表达 research/deep-research 意图且本 repo 的 `DPT_FRAMEWORK/` 是选定或相关入口时，不调用内置 `deep-research` 或等价一次性 research shortcut，改用 `DPT_FRAMEWORK/RUN.md` 和框架 workflow。
- 保持 root、`DPT_FRAMEWORK/CLAUDE.md`、`DPT_FRAMEWORK/AGENTS.md`、`DPT_FRAMEWORK/README.md`、`DPT_FRAMEWORK/RUN.md` 的入口路由措辞一致，避免旧 change 只保护读到 `RUN.md` 之后的路径。
- **BREAKING for new bundle shape**: 新实例化 bundle 使用 `BUNDLE_MAP.md`，不再生成 `START_FROM_HERE.md` 作为 primary bundle root file。
- 新增 `bundle-map` capability：`BUNDLE_MAP.md` 是被动知识/运行时地图，说明研究内容、控制文件、诊断面、reentry 指针；它不是 phase node、不是命令 playbook、不是续跑控制器。
- 迁移旧 `bundle-start-from-here` capability：旧 `START_FROM_HERE.md` primary-entry 语义废弃；legacy bundle 可以被 inspect/reentry 读懂并收到 deprecation advice，但新 bundle/gate/template contract 以 `BUNDLE_MAP.md` 为准。
- 更新实例化、instantiation gate、phase-instantiation expected artifacts、inspect/reentry/file-observability/docs/tests 中的 root bundle file contract。
- 更新 CHANGELOG 与 `DPT_FRAMEWORK/RUN.md` 版本横幅到 `v0.11`。

不产出：

- 不增加平台级 skill 禁用 hook 或 agent tool permission 配置；这里只强化 repo/framework 的 Agent-facing routing contract。
- 不把 `BUNDLE_MAP.md` 变成新的 deterministic authority；runtime truth 仍来自 active bundle root 的 `rb_status.json`、`rb_queue.json`、`rb_trace.jsonl`、ledger、artifacts 和 Engine checks。
- 不让 legacy `START_FROM_HERE.md` 永久作为新 bundle 的等价 primary 文件；兼容只用于旧 bundle 可读性和迁移诊断。
- 不修改研究、搜索、synthesis、gate provenance 或 work-unit submit 语义。

## Capabilities

### New Capabilities

- `bundle-map`: 新 bundle 根目录的 `BUNDLE_MAP.md` 被动地图 contract，覆盖研究内容地图、runtime control map、diagnostics map、reentry pointers、legacy `START_FROM_HERE.md` deprecation policy。

### Modified Capabilities

- `run-entry`: repo-root `CLAUDE.md` / `AGENTS.md` 也必须承载 research shortcut 抑制规则；DPT_FRAMEWORK 入口规则不只存在于 `RUN.md` 和 `DPT_FRAMEWORK/*` 行为文件中。
- `bundle-start-from-here`: 旧 `START_FROM_HERE.md` primary boot-entry requirement 废弃，迁移到 `bundle-map`。
- `cmd-bundle-instantiation`: 新 bundle templates、instantiate CLI 输出、inspect required surface 从 `START_FROM_HERE.md` 迁移到 `BUNDLE_MAP.md`，并定义 legacy advice。
- `pre-research-phase-content`: instantiation phase 的 expected artifacts 迁移到 `BUNDLE_MAP.md`。
- `pre-research-gate-implementation`: instantiation-complete gate 迁移到检查 `BUNDLE_MAP.md`，不再要求新 bundle 有 `START_FROM_HERE.md`。
- `workflow-directory-contract`: canonical bundle-root runtime surfaces 使用 `BUNDLE_MAP.md`，legacy `START_FROM_HERE.md` 仅作为旧 bundle map alias/deprecated surface。
- `agent-command-surface`: reentry guidance 从 “read START_FROM_HERE” 改为 “read BUNDLE_MAP, with legacy START_FROM_HERE diagnostic fallback”。
- `runtime-reentry-debuggability`: reentry advice 和 diagnostics 使用 `BUNDLE_MAP.md`，并对 legacy `START_FROM_HERE.md` 给出迁移/弃用提示。
- `file-observability`: root-control-file expected set 使用 `BUNDLE_MAP.md`；legacy `START_FROM_HERE.md` 不应被误判为 authoritative new-bundle control file。

## Versioning

- Version bump required: yes
- Target version: `v0.11`
- Reason: 修改了 DPT_FRAMEWORK Agent-facing routing behavior、新 bundle root file contract、instantiation gate/template behavior，以及 docs/tests 对 bundle root map 的 accepted contract。

## Impact

- Affected framework/docs:
  - repo-root `CLAUDE.md`
  - repo-root `AGENTS.md`
  - `DPT_FRAMEWORK/RUN.md`
  - `DPT_FRAMEWORK/CLAUDE.md`
  - `DPT_FRAMEWORK/AGENTS.md`
  - `DPT_FRAMEWORK/README.md`
  - `DPT_FRAMEWORK/COMMANDS.md`
  - `DPT_FRAMEWORK/command_playbook/start-research.md`
  - `DPT_FRAMEWORK/workflows/nodes/phases/phase-instantiation.md`
- Affected framework code/contracts:
  - `DPT_FRAMEWORK/rb_templates/START_FROM_HERE.md.tmpl` -> `DPT_FRAMEWORK/rb_templates/BUNDLE_MAP.md.tmpl`
  - `DPT_FRAMEWORK/cli/instantiate-run-bundle.mjs`
  - `DPT_FRAMEWORK/cli/inspect-bundle.mjs`
  - `DPT_FRAMEWORK/cli/check-reentry.mjs`
  - `DPT_FRAMEWORK/schema/gate_definitions/gate-instantiation-complete.definition.json`
  - `DPT_FRAMEWORK/engine/helpers/file-observability.mjs`
- Affected tests:
  - `tests/integration/cli/instantiate-run-bundle.test.mjs`
  - `tests/integration/cli/inspect-bundle.test.mjs`
  - `tests/integration/cli/check-reentry.test.mjs` if present or new targeted coverage
  - `tests/integration/cli/validate-bundle.test.mjs`
  - `tests/engine/command-contract-docs.test.mjs`
  - `tests/engine/static-regression.test.mjs` if it owns root entry doc scanning
  - `tests/engine/helpers/file-observability.test.mjs`
- Affected governance/spec surfaces:
  - add `bundle-map` requirement IDs to `openspec/governance/req-registry.yaml`
  - deprecate old `BUS-*` entries in place rather than reusing IDs
  - update accepted specs during archive/sync after implementation
- Dependencies: no new npm dependencies; Node.js ESM only.
