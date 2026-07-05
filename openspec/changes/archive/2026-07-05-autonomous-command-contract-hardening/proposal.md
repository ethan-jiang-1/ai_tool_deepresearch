## Why

`harden-phase-handoff-witnessing` 已经把 BUG-020 的 phase handoff laundering seam 做成 trace-backed fail-closed 机制；但同一轮思考暴露出更上游的认知缝隙：framework command surface 仍把 Agent-facing 命令、人类触发、HITL 边界、exit code 语义和 phase-boundary terminology 分散在多个文件里，部分 wording 还暗示 pipeline 中途有 operator/用户在场。

本 change 的原始需求来自以下 active-plan paths（Apply closure 后会按 `_backlog/plans/README.md` 移入 `_backlog/_done/_closed_plans/`，closed-plan index 保留 provenance）：
- `_backlog/plans/agent-persistence-and-exit-codes.md`
- `_backlog/plans/autonomous-silent-execution-terminology.md`
- `_backlog/plans/cli-exit-code-contract.md`
- `_backlog/plans/no-implicit-human-interaction.md`
- `_backlog/learning/2026-07-05-handoff-witnessing-apply-retro.md`

核心目标是按 handoff apply retro 的方法，把这些点作为同一类 contract drift 处理：spec、Agent-facing docs、terminology canon、validator/regression、backlog closure 一次性对齐，而不是再做单点文案补丁。

## What Changes

- 新增 `agent-command-surface` capability：显性规定 shipped command surfaces 是 Agent-facing；HITL1/HITL2 是仅有的 interactive in-run checkpoints；Final 是 terminal non-interactive delivery；post-final feedback 通过 HITL2 repair/rerun 重入；drag-trigger 是一次性把控制权交给 Agent 的入口，不表示 pipeline 中途有人跑命令、被问、或收进度汇报。
- 新增 `cli-exit-code-conventions` capability：显性定义 framework CLI exit-code canonical interpretation / target convention、structured stdout 决策责任、已知例外/漂移，以及 exit code 不承载 encouragement/morale/progress signal；当前 non-gate utility 例外继续如实记录，不在本 change 内静默规范化；持续力和修复方向走 `advice[]` / Agent-readable prose。
- 增加 existing-capability bridge deltas：在 `cli-phase-transition`、`workflow-node-contract`、`gate-skeleton`、`silent-wave-execution`、`run-entry`、`workflow-directory-contract`、`cmd-bundle-instantiation`、`cli-inspect-output-conventions`、`logging-conventions`、`runtime-reentry-debuggability`、`content-delivery-phase-content`、`research-styles`、`shared-node-content`、`research-wave-gate-implementation` 中补充小而明确的 requirements。Archive 后 main specs 会统一 phase-boundary 术语、Agent-facing command audience、HITL1/HITL2-only interactive in-run boundary、bundle naming、non-gate CLI exception 语义，以及 Final terminal non-interactive delivery / post-final HITL2 feedback routing 边界，而不是只靠新 capability 或 apply 时自由发挥。
- 更新 Agent-facing docs：`DPT_FRAMEWORK/COMMANDS.md` 顶层增加 audience 与 exit-code contract；`DPT_FRAMEWORK/cli/README.md` 与顶层 contract 对齐；`DPT_FRAMEWORK/RUN.md`、`DPT_FRAMEWORK/README.md`、`DPT_FRAMEWORK/command_playbook/*` 消除未解释的 `Agent/operator`、模糊“一句话确认”、`用户提供 bundle 名称` 等 mid-pipeline human-presence fiction。
- 更新 terminology canon / glossary：让 `phase transition`、`phase handoff`、`work completion`、`witnessing`、`autonomous continuation` 的概念层定义可发现；机器层事件名、CLI 名、schema 字段名保持稳定，不做批量 rename。
- 增加静态 validator / regression tests：锁定 command audience、HITL-only interaction boundary、exit-code contract discoverability、已知 exception inventory 和 terminology callouts，防止以后 wording drift。
- 完成后按 `_backlog/plans/README.md` 流程关闭四份 active plan，并保留它们作为本 change 的 rationale 来源。
- 明确拒绝以下范围：
  - 不改现有 CLI flags、exit code 数值、trace schema、status schema、gate result JSON shape；
  - 不实现 shared exit helper 或统一所有 binary utility CLI；
  - 不修 `validate-workflow-package.mjs` header/code drift，除非 apply 阶段发现它会破坏本 change 的静态 contract；
  - 不引入 JS lifecycle walker、chat interceptor、环境变量配置或新 npm dependency；
  - 不把 guidance prose 当作新的 runtime Source of Record。
- **Version bump**：需要。目标版本 `v0.5`。本 change 修改 Agent-facing framework behavior/discoverability；Apply 阶段需更新 repo-root `CHANGELOG.md` 和 `DPT_FRAMEWORK/RUN.md` 版本横幅。

## Capabilities

### New Capabilities

- `agent-command-surface`: Agent-facing command surface audience, HITL-only human interaction boundary, one-time trigger framing, and phase-boundary terminology discoverability.
- `cli-exit-code-conventions`: Framework CLI exit-code convention, structured stdout responsibility, documented exceptions, and no-morale-signal boundary.

### Modified Capabilities

- `cli-phase-transition`: 明确 phase transition / phase handoff / work completion / witnessing 的边界，避免 `advance-status` 被读成进入下一 phase。
- `workflow-node-contract`: 锁定 lifecycle phase Markdown 的 gate-pass wording 顺序，要求 `enter-phase` 只证明 entry、`advance-status` 只同步 source-gate status。
- `gate-skeleton`: 把 gate CLI 的 `0/1/2`、structured stdout、high-friction advice 与新 exit-code convention 对齐。
- `silent-wave-execution`: 明确 non-terminal `stop: no` 阶段没有 implicit human or operator co-runner，并把 silent degradation wording 改为不授权 handoff/status sync/work completion。
- `run-entry`: 把 `RUN.md` drag/paste trigger 定义为一次性 pre-pipeline entry selection that transfers control into Agent-run execution，并将 version banner requirement 从旧固定版本收敛为与 repo-root `CHANGELOG.md` 一致。
- `workflow-directory-contract`: 修改 anti-mixing wording 并把 `command_playbook/` 的 audience 改为 Agent-facing command instructions，operator 只允许 out-of-band diagnostic/review 语境。
- `cmd-bundle-instantiation`: bundle name 是 Agent-derived 或 already-supplied input，不是 autonomous execution 中的用户依赖。
- `cli-inspect-output-conventions`: 把 inspect-wave CLIs 登记为 non-gate structured-output commands，code 2 为 invocation/caller error。
- `logging-conventions`: 把 `log-event.mjs` always-0 作为 documented exception，而不是隐藏行为。
- `runtime-reentry-debuggability`: 把 `check-reentry.mjs` 的 code 2 语义纳入 caller/config error convention。
- `content-delivery-phase-content`: 明确 HITL1/HITL2 是仅有的 interactive in-run checkpoints；Final 是 terminal non-interactive delivery，不是第三个交互 checkpoint 或 Final-owned repair loop；post-final feedback 保持通过 HITL2 repair/rerun 路径重入。
- `research-styles`: 把 no-progress / silent degradation wording 从 broad "phase transition" 收敛为不授权 handoff 或 status synchronization。
- `shared-node-content`: 把 shared node anti-hidden-phase wording 收敛为不指示 handoff、status sync、target work completion。
- `research-wave-gate-implementation`: 把 wave gate boundary wording 收敛为 gate pass authorizes accepted handoff path, not direct next-phase loading or target work completion。

这些 bridge deltas 不重开 `harden-phase-handoff-witnessing` 的硬机制，也不修改现有 runtime behavior；它们让后续 archive 同步 main specs 时拥有明确落点。

## Apply Readiness Note

This change is conditionally apply-ready only after the planning artifacts, requirement registry, main-spec deltas, and governance checks agree immediately before `/opsx:apply`. This polish pass is limited to files under `openspec/changes/autonomous-command-contract-hardening/`; any registry, main-spec, framework, test, backlog, or guidance edits named below are future apply/archive work, not explore/polish work.

If `openspec validate autonomous-command-contract-hardening --strict`, `node openspec/governance/check-project-reqs.mjs`, or `node openspec/governance/check-project-specs.mjs` fails because an outside-the-change surface needs adjustment, record that as apply/archive preflight work rather than editing outside this change during polish.

## Impact

- Affected framework surfaces:
  - `DPT_FRAMEWORK/COMMANDS.md`
  - `DPT_FRAMEWORK/cli/README.md`
  - `DPT_FRAMEWORK/RUN.md`
  - `DPT_FRAMEWORK/README.md`
  - `DPT_FRAMEWORK/command_playbook/`
- Affected version surface:
  - `CHANGELOG.md`
- Affected guidance surfaces:
  - `guidelines/agentic-execution-model.md`
  - `guidelines/README.md`
  - possibly `guidelines/agentic-workflow-mechanism.md` if Tier-1 phase-boundary terminology needs a narrower home
- Affected OpenSpec/governance surfaces (active deltas now; main-spec sync targets at archive):
  - `openspec/governance/req-registry.yaml`
  - `openspec/specs/agent-command-surface/spec.md`
  - `openspec/specs/cli-exit-code-conventions/spec.md`
  - `openspec/specs/cli-phase-transition/spec.md`
  - `openspec/specs/workflow-node-contract/spec.md`
  - `openspec/specs/gate-skeleton/spec.md`
  - `openspec/specs/silent-wave-execution/spec.md`
  - `openspec/specs/run-entry/spec.md`
  - `openspec/specs/workflow-directory-contract/spec.md`
  - `openspec/specs/cmd-bundle-instantiation/spec.md`
  - `openspec/specs/cli-inspect-output-conventions/spec.md`
  - `openspec/specs/logging-conventions/spec.md`
  - `openspec/specs/runtime-reentry-debuggability/spec.md`
  - `openspec/specs/content-delivery-phase-content/spec.md`
  - `openspec/specs/research-styles/spec.md`
  - `openspec/specs/shared-node-content/spec.md`
  - `openspec/specs/research-wave-gate-implementation/spec.md`
- Affected tests:
  - `tests/` static documentation/contract regression tests
  - focused CLI contract regression tests where current behavior can be checked without changing behavior
- Dependency on active change:
  - `harden-phase-handoff-witnessing` has been archived under `openspec/changes/archive/2026-07-05-harden-phase-handoff-witnessing/`. This change builds on its accepted handoff semantics (`enter-phase`, route-bound `load_complete`, source-gate `advance-status`) and does not duplicate that hard mechanism.
- No new npm dependencies.
