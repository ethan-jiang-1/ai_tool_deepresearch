## Context

`guidelines/evolution-simple-reliable-control.md` 与 `guidelines/evolution-helper-oriented-agent.md` 已是 Charter 之下的两条长期 direction：前者审查 system/control shape，后者审查 action responsibility。它们都假定设计者已找到了正确的语义对象，但当前 suite 没有把“一个新概念是否真能让读者在更高层精确推理”作为独立、可反复加载的 design axis。

用户提供的研究材料是 `/Users/bowhead/ai_dev_harness_paper/study_08_structagent/followup_research/dijkstra-abstraction-guideline-insertion.md` 与 `dijkstra-abstraction-semantic-level.md`。其中的主张只作为指导来源；canonical quotation 以 EWD 340 一手转录为准。当前 repo 的 active `tests/integration/md/evolution-direction-governance.test.mjs` 仍明确锁定“两条” canonical directions，`openspec/config.yaml` 仍要求 paired review，因此 routing 与 regression 必须一起迁移。

## Goals / Non-Goals

**Goals:**

- 让 `evolution-semantic-precision.md` 成为可独立反复阅读的第三条 charter companion，而不是 Charter 中一段装饰性题词。
- 保留 Dijkstra 原话、出处和“有限推理覆盖大量情形”的历史语境，并将其转成 Agent 可执行的 semantic-level review。
- 使 Charter、Guidelines Index、OpenSpec config、既有 evolution documents 及 active guideline navigation 一致使用 semantic precision → simple control → helper responsibility 的顺序。
- 通过 focused Markdown integration test 保护 canonical 路径、primary-source/context marker、config 义务和完整 active navigation manifest。

**Non-Goals:**

- 不定义新的 schema、state field、CLI、Gate、receipt、trace、controller、retry path、workflow transition 或 runtime authority。
- 不将研究相关性、证据取舍或综合质量伪装成 Engine 可自动裁决的确定性事实。
- 不复制相邻工作区的研究稿，不重写 archived OpenSpec、closed backlog 或正在进行的 delegated-work artifacts。
- 不把“抽象”定义为最大化封装、普遍无损压缩或要求所有细节在高层可恢复。

## Decisions

### 1. Establish one canonical semantic-precision companion

Create `guidelines/evolution-semantic-precision.md` with `guideline_id: semantic-precision`, title `Evolution Direction: Semantic Precision Through Abstraction`, `authority: guidance`, and the same Charter-deference posture as the two existing companions. It owns only the semantic-precision question: whether a proposed concept establishes a named semantic object on which a reader can make a bounded decision more exactly.

The document begins with the exact EWD 340 wording and links the Dijkstra Archive primary source. Its immediate explanation preserves the original setting: abstraction allows a finite piece of reasoning to cover many cases; it is not mere omission or implementation hiding. The full research prose remains outside this repository.

The direction uses the existing charter-grade skeleton: Purpose; Historical Context; Standing And Precedence; Core Direction; Definitions; Non-Negotiable Disciplines; Gradual Convergence; `Semantic-Level Admission Test`; Boundary. The test requires a proposal/design to identify:

1. the named semantic object and bounded decision made more precise;
2. the distinctions deliberately retained because they affect truth, authority, legal action, or evidence scope, and those safely collapsed as irrelevant for that decision;
3. the reader-facing Interface, direct Source of Record, legal next action or honest owner/terminal/missing-contract result; and
4. the existing conceptual clutter, duplicate knowledge, or lower-layer reconstruction it eliminates or avoids.

This is an admission discipline, not a new validator or a mandatory data-model layer.

### 2. Keep the three axes orthogonal and ordered

The new direction answers *what semantic level is justified*. `evolution-simple-reliable-control.md` then answers *what minimum reliable control surrounds it*. `evolution-helper-oriented-agent.md` finally answers *who decides, executes, and deterministically judges within that legal shape*.

Charter, Index, existing companion precedence prose, and `openspec/config.yaml` will use that order. The new direction must defer to the Charter and accepted/executable/runtime truth; it cannot turn Markdown into machine authority, force JS to judge research semantics, or grant permission. Existing companions will only gain cross-routing/precedence language and sibling navigation; their owned rules will not be copied into the new file.

### 3. Perform a complete active-navigation migration, not a blanket prose rewrite

The apply target manifest is:

- Core entry and governance: `guidelines/project-charter.md`, `guidelines/README.md`, `openspec/config.yaml`.
- Companions: the new semantic-precision file plus `evolution-simple-reliable-control.md` and `evolution-helper-oriented-agent.md`.
- Active navigation surfaces that already name one or both current companions: `agentic-execution-model.md`, `agentic-queue-mechanism.md`, `agentic-subagent-mechanism.md`, `agentic-workflow-mechanism.md`, `framework-runtime-boundary.md`, `logging-conventions.md`, and `command-experiments.md`.
- Governance and regression: `openspec/governance/req-registry.yaml`, the guidance-constitution delta, `verification-plan.yaml`, and `tests/integration/md/evolution-direction-governance.test.mjs`.

Each listed active guideline gets the new canonical path in frontmatter `siblings` and its related-navigation area where present; `command-experiments.md` is normalized to expose the entire triad. This does not require replacing every mechanism-specific sentence that presently invokes simplicity. A mechanism still uses a focused direction when that is its immediate concern; the suite-level route ensures new design starts with all three.

Archived and closed files remain historical records. The dirty `make-delegated-work-contracts-constructible` plan/artifacts remain outside this change; their current two-direction wording is not evidence that the new direction was absent from future work.

### 4. Extend the existing guidance-constitution capability

Add `GCO-007` and `GCO-008` under the existing `guidance-constitution` capability rather than inventing a new capability. The requirements make the guidance direction and its routing reviewable without promoting prose into runtime behavior. The delta spec is the only requirements change during apply; main-spec synchronization belongs to the later sync/archive step.

### 5. Test the documentation contract at its real boundary

`tests/integration/md/evolution-direction-governance.test.mjs` remains the sole focused regression. It will assert all three canonical files, primary-source/context markers and the admission-test marker in the new document, config’s three explicit obligations, and the explicit active navigation manifest. It will continue to exclude archive and closed-record surfaces from migration assertions.

No unit, deterministic E2E, or agent-flow E2E test is selected: those cannot prove prose comprehension or future Agent behavior, and no runtime contract changes.

## Risks / Trade-offs

- [A famous quotation becomes decoration] → The new direction couples the quote to its original reasoning context and a required admission test, while the Charter only carries a short entry-point cue.
- [The third direction becomes a generic abstraction mandate] → Its Boundary rejects new controller/state/framework authority and requires a bounded decision plus net conceptual reduction.
- [Migration creates an inconsistent mix of paired and triad routes] → An explicit manifest plus a focused regression scans the core entrypoints and every active sibling/navigation surface.
- [Guidance expands into runtime semantics] → GCO-007/008 and the document’s precedence/boundary preserve accepted specs, executable contracts, and runtime truth as the only behavioral authorities.
- [Collision with active delegated-work worktree edits] → This change does not edit any of those files and has no `DPT_FRAMEWORK/` target.

## Migration Plan

1. Add the two GCO IDs, delta requirements, proposal/design/tasks, and verification plan; validate the planning artifacts.
2. Apply the approved guidance-only target manifest and focused test.
3. Run routing, OpenSpec, requirement-registry, and diff checks; mark implementation tasks complete.
4. During a later explicit sync/archive operation, merge the delta into `openspec/specs/guidance-constitution/spec.md` and run the final project-spec check. No version bump or runtime rollout is needed.

## Open Questions

None. The approved name, placement, routing breadth, source treatment, and guidance-only boundary are fixed by the user decision and proposal.
