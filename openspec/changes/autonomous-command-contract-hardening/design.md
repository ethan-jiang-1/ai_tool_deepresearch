## Context

`harden-phase-handoff-witnessing` 解决的是 BUG-020 的硬机制：gate pass 后必须通过 `enter-phase` 消费 `check.next`，再由 source-gate `advance-status` 同步状态；没有 route-bound witness 就 fail closed。这个 change 解决的是硬机制周围的认知和发现性漂移：command docs、exit-code docs、terminology 和 HITL boundary 没有在同一个 Source of Record 下呈现，导致 Agent 容易把 framework 想象成“有人在场、可以问、exit code 可以表达士气”的系统。

Guidelines 约束本设计：

- `guidelines/project-charter.md`: 新行为必须走 OpenSpec；Markdown 控 Agent Flow，JS/CLI 控 deterministic checkpoint；Engine 不能造假。
- `guidelines/agentic-execution-model.md`: 新执行概念必须进入 terminology canon；Phase Agent + MD controller mode 是概念正典。
- `guidelines/agentic-workflow-mechanism.md`: Phase Agent 是 runtime driver；JS 不能成为 lifecycle walker。
- `guidelines/framework-runtime-boundary.md`: `DPT_FRAMEWORK/` 是 framework assets；runtime truth 在 bundle。
- `_backlog/learning/2026-07-05-handoff-witnessing-apply-retro.md`: 单点问题要当成 contract-class probe，横向扫 spec/docs/validator/tests，而不是窄修文案。

## Goals / Non-Goals

**Goals:**

- 让 command surface 的 Agent-facing audience、HITL1/HITL2-only interactive in-run boundary、terminal non-interactive Final delivery boundary 可发现、可测试、可回归。
- 让 framework CLI exit-code canonical interpretation / target convention 在顶层文档和 spec 中显性化，并如实记录当前 non-gate utility 例外/漂移，而不是静默规范化 runtime behavior。
- 让 phase boundary terminology 在 guidance canon 与 Agent-facing docs 中一致，避免把 state transition、Agent handoff、work completion 混成一个词。
- 用静态 validator / regression tests 锁住关键 wording，防止未来又回到 “operator in the middle” 或 “exit code morale signal”。
- 关闭四份 `_backlog/plans/`，把它们的思考转成 OpenSpec-backed contract。

**Non-Goals:**

- 不改变任何 CLI flag、exit-code 数值、stdout JSON shape、trace schema、status schema。
- 不统一所有 CLI 到 shared exit helper，不修所有 code-2 drift。
- 不新增 JS lifecycle walker、chat interceptor、daemon、环境变量配置或 dependency。
- 不把 guidance prose 当 runtime Source of Record；具体 behavior 仍由 specs + framework implementation + tests 接住。
- 不声称可以防止 same-turn chat halt；这里只降低 Agent 读 docs 后产生错误自我模型的概率，并让 drift 变成测试失败。

## Decisions

### D0: Main-spec unification lands through bridge deltas, not only new capabilities

The change uses two new capabilities as the discoverable cross-cutting contract, but it also adds small bridge requirements to the existing capabilities that already own the relevant main-spec facts:

- `cli-phase-transition` owns status transition, `enter-phase`, `advance-status`, and trace-event naming.
- `workflow-node-contract` owns lifecycle phase Markdown wording and gate-pass sequence.
- `gate-skeleton` owns gate CLI stdout/exit behavior and high-friction advice.
- `silent-wave-execution` owns autonomous continuation and the no-surfacing human boundary.
- `run-entry`, `workflow-directory-contract`, and `cmd-bundle-instantiation` own entry trigger, command-playbook audience, and bundle naming surfaces.
- `cli-inspect-output-conventions`, `logging-conventions`, and `runtime-reentry-debuggability` own non-gate CLI exception classes.
- `content-delivery-phase-content` owns Final terminal non-interactive delivery and post-final feedback routing.
- `research-styles`, `shared-node-content`, and `research-wave-gate-implementation` own edge wording where older specs used broad `phase transition` language for refill degradation, shared-node hidden phase instructions, or wave gate boundaries.

This is the OpenSpec landing mechanism for terminology consistency: archive will sync both the new canonical capabilities and the bridge deltas into main specs. Apply must not rely on guideline prose or framework docs alone to "make the terminology true".

**替代方案：** 只新增 `agent-command-surface` / `cli-exit-code-conventions`。拒绝，因为 accepted main specs would still contain scattered wording and exception semantics without an explicit delta path.

### D1: 拆成两个 capability

`agent-command-surface` 管 audience/HITL/terminology discoverability；`cli-exit-code-conventions` 管 exit-code convention。两者约束条件不同：前者是 Agent-facing docs 和 human-interaction boundary，后者是 CLI caller contract 和 structured stdout。合并会让 capability 变成主题标签而不是行为契约，违反 capability boundary test。

**替代方案：** 只建 `cli-exit-code-conventions`。拒绝，因为 “commands 是 Agent-facing” 不是 exit-code 问题；它需要独立 validator 和 wording sweep。

### D2: 文档是 demand-side wiring，不是 cosmetic docs

本 change 主要改 `DPT_FRAMEWORK/COMMANDS.md`、`RUN.md`、`README.md`、`cli/README.md`、`command_playbook/*`。这些是 Phase Agent 实际读取的 control-plane surface；对本项目来说，它们不是旁路说明，而是 Agent Flow 的 demand-side wiring。Apply 阶段必须像实现代码一样对这些文件加 validator，而不是只靠 review。

**替代方案：** 只在 OpenSpec spec 写 contract。拒绝，因为 Agent 不读 accepted spec 才执行 command；contract 必须进入 Agent-facing surface。

### D3: Exit code 只做 coarse control-flow，细节读 stdout JSON

顶层 contract SHALL 说清：exit-code section is a canonical interpretation and target convention for Agent callers, not proof that every current CLI already uses the same runtime helper. Exit code 用于 shell/runner 分支；gate 类的主要决策面是 stdout JSON `{ check, routing, inspect, advice }`，非 gate 类通常是 `{ status, reason, advice }` 或命令自身的 documented structured output。`advice[]` 承载修复/持续力/安心信息；exit code 不能编码鼓励、进度、士气或“继续意愿”。

当前实现存在例外：gate CLIs 三态、许多 utility CLIs 二态、`log-event.mjs` always-0、部分 code-2 语义/文档漂移。这个 change SHALL 显性登记这些例外，不在同一 change 内统一 runtime behavior。

**替代方案：** 直接把所有 CLI runtime exit handling 统一。拒绝，因为这会扩大为 behavior migration，并且会干扰本 change 的主要目标：显性化与防漂移。

### D4: Terminology 先进入 guidance canon，再进入 Agent-facing callouts

`phase transition`、`phase handoff`、`work completion`、`witnessing`、`autonomous continuation` 是执行模型/Chain 相关概念，不是某个 CLI 的私有术语。Apply 阶段应更新 `guidelines/agentic-execution-model.md` 或 `guidelines/README.md` glossary；如果 Tier-1 细节需要更窄承载，则同步 `guidelines/agentic-workflow-mechanism.md`。Agent-facing docs 只放短 callout，避免把 `COMMANDS.md` 变成术语论文。Accepted behavior alignment is carried by bridge deltas such as `CPT-005`, `WNC-011`, `GSK-009`, `SWE-001`, `SWE-004`, `RES-004`, `SHC-006`, and `RWG-010`, not by guidance alone.

**替代方案：** 只在 `DPT_FRAMEWORK/COMMANDS.md` 写 glossary。拒绝，因为 guidance 已声明 terminology canon 的 Source of Record，不能让 command index 自立术语正典。

### D5: Static validator 以 allowlist + phrase class 检查 contract drift

新增测试应检查：

- Scan surfaces: `DPT_FRAMEWORK/COMMANDS.md`, `DPT_FRAMEWORK/RUN.md`, `DPT_FRAMEWORK/README.md`, `DPT_FRAMEWORK/cli/README.md`, `DPT_FRAMEWORK/command_playbook/*.md`, plus lifecycle/shared workflow Markdown touched by this change.
- Positive markers: Agent-facing audience, HITL1/HITL2-only interactive in-run boundary, terminal non-interactive Final delivery, post-final HITL2 repair/rerun routing, one-time pre-pipeline trigger framing, exit-code table/callout, structured stdout as actionable detail, advice-not-exit-code wording, transition/handoff/completion/witnessing terms.
- Forbidden phrase classes: unqualified `Agent/operator`, mid-pipeline `用户提供` bundle naming, unqualified user confirmation/ask/continue wording inside `stop: no` lifecycle execution, progress report framing outside Final delivery, `advance-status` entering/loading/executing the next phase, and `enter-phase` / `load_complete` completing target work.
- Allowlist entries must be explicit data, not intuition: file or glob, phrase class, allowed context such as post-run diagnostics or out-of-band maintenance, and reason. Example: `operator inspection` may be allowed only in diagnostic/review context; command audience cannot be operator co-runner.

Validator 只检查 deterministic skeleton，不替代语义 review；但它要让历史上反复出现的 wording drift 变成 regression failure。

**替代方案：** 纯人工 review。拒绝，handoff retro 已证明 shared enforcement + static wiring validator 才能防止同类问题回潮。

### D6: Final delivery is not a third interaction checkpoint

HITL1 and HITL2 are the only interactive in-run checkpoints. Final is terminal non-interactive delivery after `final/` artifacts exist, not a place to ask questions, request confirmation, handle repair inside Final, or report progress. The existing content-delivery contract for post-final user feedback remains valid: feedback after final delivery re-enters through HITL2 repair/rerun rather than becoming a hidden Final loop. Specs and validators should phrase this as "HITL1/HITL2 interaction plus terminal non-interactive Final delivery" only when necessary to avoid treating Final as a forbidden terminal message.

**替代方案：** 把 Final 与 HITL1/HITL2 并列成第三个 human point。拒绝，因为这会混淆交互式决策点和非交互式终端交付。

### D7: Tasks are the apply governance surface

`tasks.md` is intentionally more detailed than a normal checklist. It is the apply manual that keeps future implementation inside this change's contract when unknowns appear. Apply should execute tasks in order by default, but if implementation discovers an uncovered accepted-spec drift, doc/code mismatch, or validator ambiguity, the first action is to route that discovery through the task discovery protocol: update the relevant delta spec and registry if it changes main-spec semantics, update tasks when sequencing or coverage changes, then continue target edits.

This keeps "unknown unknowns" from becoming ad hoc framework patches. The goal is not to predict every wording fix in advance; the goal is to give the future Agent a structured way to absorb surprises without bypassing OpenSpec.

**替代方案：** Leave discovery handling only as informal prose in chat or rely on implementer judgment. Rejected because this project has repeatedly seen cross-cutting contract issues return when tasks do not name the authority path, validation surface, and archive readiness rule.

## Risks / Trade-offs

- **Risk: 过度文档化导致 Agent 读不到重点。** → Mitigation: 顶层 docs 使用短 callout + 表格；详细 rationale 留在 OpenSpec/design/backlog closure。
- **Risk: validator 对中文自然语言误伤。** → Mitigation: 用小闭集 phrase class + allowlist；测试失败时要求更新 wording 或显式记录例外。
- **Risk: 与 `harden-phase-handoff-witnessing` accepted semantics 冲突。** → Mitigation: `harden-phase-handoff-witnessing` 已归档；本 change 只补 terminology/discoverability bridge deltas，不重复或重写其 hard handoff mechanics。
- **Risk: exit-code exception inventory 被误读为认可漂移永久存在。** → Mitigation: spec 明确 code reconciliation 是 future change；本 change 只让调用方和 Agent 不再猜。
- **Risk: guidance 更新被误读成 runtime behavior。** → Mitigation: guidance 只定义 terminology/reading route；accepted behavior 仍在 new specs + framework docs/tests。
- **Risk: Final/post-final feedback wording gets over-corrected.** → Mitigation: `CDP-004` preserves post-final feedback through HITL2 repair/rerun while forbidding Final-owned hidden loops or in-run confirmation checkpoints.

## Migration Plan

1. Propose 阶段写 proposal/design/spec/tasks，登记 new capabilities and bridge requirement IDs。
2. Apply 阶段先按 bridge deltas 更新 guidance terminology canon 和 Agent-facing docs，确保 wording follows CPT/WNC/GSK/SWE/RUE/WDC/CMI/IOC/LOC/RRD/CDP/RES/SHC/RWG requirements。
3. 增加 static docs validator / tests，再做 targeted CLI contract tests。
4. 更新 CHANGELOG / RUN banner 到 v0.5。
5. 运行 focused tests、full relevant test suite、OpenSpec governance checks 和 `openspec validate`。
6. 将四份 `_backlog/plans/` 移入 closed plans 并更新索引。
7. Archive 阶段把 new capability specs and bridge deltas 同步进 main specs；不得只归档新 capability 而遗留旧 specs 的术语漂移。

Rollback strategy：若 validator 误伤过多，可回滚 validator strictness 到只检查 positive markers；文档 contract 本身保持，因为它是本 change 的主要产物。

## Apply Readiness Gate

This change is apply-ready only when all of the following are true:

- `harden-phase-handoff-witnessing` is archived and accepted handoff semantics are the baseline, not an active competing delta.
- The proposal names the target version and public-interface non-goals.
- Every affected main-spec owner has either a new canonical capability or a bridge delta in this change.
- `openspec/governance/req-registry.yaml` contains every new/modified requirement ID used by active deltas.
- `tasks.md` gives an apply order, a discovery protocol for unknown gaps, target surfaces, validator/test expectations, version steps, backlog closure, and final verification.
- Open questions contain no unresolved product/contract decision that would change public interfaces.
- `openspec validate <change> --strict`, `check-project-reqs.mjs`, and `check-project-specs.mjs` pass immediately before apply begins.

Because this polish pass is change-dir-only, this gate is a conditional readiness statement. If validation fails solely because registry, accepted main specs, or other outside-the-change surfaces require updates, capture that as apply/archive preflight work; do not mutate those surfaces during polish.

If any reviewer finds an accepted-spec owner, target surface, or non-goal that is not covered by the current deltas/tasks, do not start target edits. Update the OpenSpec artifacts first, then rerun the readiness checks.

## Open Questions

- 无阻塞问题。`harden-phase-handoff-witnessing` 已归档；Apply 阶段应以 accepted `enter-phase` / source-gate `advance-status` semantics 为前提更新 command surface callouts。
