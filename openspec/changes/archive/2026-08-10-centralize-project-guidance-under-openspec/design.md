## Context

当前 `guidelines/` 的 13 份 current Markdown 同时承载 Charter、机制模型与 lifecycle operation
guidance；24 份 current/live consumer 将其路径当作入口、知识指针或受支持 operation coordinate。
这些职责的 authority 不同：宪法不定义 runtime behavior，模型不裁决 state，operation guidance 不授予
Apply/Archive permission。平铺目录与 Charter-only peer regression 不能表达这些区别。

本 change 只迁移 project-control topology。它不改变 Harness runtime、research entry selection、schema、
Gate、receipt、trace 或 Engine verdict。先前 hierarchy regression 已由 `c93189aca` 对齐现有 contract；
本设计以当前通过的回归和实际 consumer inventory 为基线。

## Goals / Non-Goals

**Goals:**

- 为 constitution、guidance model、operation guidance 建立各自单一 canonical path 和 reader question。
- 保持所有 root/Harness entry 的 Charter -> root Context 顺序与 Harness selected-entry semantics。
- 让 accepted specs、project-owned OpenSpec operation guidance 和 focused regressions 与新路径在同一
  Apply 收敛。
- 让目录结构表达 authority，而不新增 runtime authority、permission 或 deterministic semantic verdict。
- 保持 archive/history 原样，并用有界 current/live 扫描证明无旧 supported route。

**Non-Goals:**

- 缩短 Charter、重写 glossary、重命名机制模型或删除 logging operation doc。
- 将 Markdown guidance 的语义判断转为 checker，或让 `openspec/README.md` 成为第二份 config/glossary。
- 为未知外部 consumer 预设 mirror、symlink 或长期 redirect。
- 改写既有 `.agents/` 或 `.claude/` skill/command source 来承载项目 guidance 路径；它们继续通过
  `openspec instructions` 消费 project-owned configuration。
- 改变任何 Harness runtime behavior、version、CLI 参数、研究执行或 archive 的 native transition。

## Decisions

### Role topology and reader stop points

```text
openspec/
  README.md                         control map: which authority to read
  constitution/                     enduring project-boundary question
    project-charter.md
    evolution/{abstraction-semantic-precision,simple-reliable-control,helper-oriented-agent}.md
  guidance/models/                  system-understanding question
    framework-runtime-boundary.md
    agentic-{execution-model,workflow-mechanism,queue-mechanism,subagent-mechanism}.md
  operations/                       current procedure and completion-boundary question
    {change-feedback-loop,command-experiments,logging-conventions}.md
```

`constitution/` answers which implementation-neutral project boundaries survive a change; its normal stop
point is a design-review law or a pointer to the owning downstream authority. `guidance/models/` answers how
to reason about Agent, Markdown, Engine, Framework, and runtime distinctions without making those concepts
runtime truth. `operations/` answers which current procedure an Agent must follow and where its authority
ends; it neither grants permission nor turns a procedure into a verdict.

The three names introduce an explicit reader-facing role level. The distinctions that must remain visible are
constitutional review versus conceptual explanation versus executable lifecycle guidance. A reader can stop
after choosing the matching role, or report that no role owns the question; the directory name alone never
answers an accepted behavior or runtime-state question.

### Canonical documents and authority links

Every current guidance document has exactly one current canonical path in the topology above. `openspec/README.md`
is the control map and records role/trigger/authority limits; it does not duplicate every model or capability.
Change A preserves the existing index content except for necessary path and role repairs. Change B owns the
separate decision to shrink it into a terse router.

Constitution documents retain the Charter-root triad: Charter has no `defers_to`; each evolution companion
defers only to Charter and exposes the ordered triad. Model documents remain guidance and may reference the
Charter as their project boundary, but their navigation is not evidence that they are constitutional peers.
Operation documents may declare each real external authority required by their procedure. In particular,
feedback guidance keeps Charter, `governance/change-feedback-loop`, and the governed finalizer as distinct
authorities. Focused contracts, not a global flat-suite scan, own these role-specific assertions.

### Root adapters, configuration delivery, and no compatibility root

Root `AGENTS.md`, `CLAUDE.md`, `README.md`, and `CONTEXT.md` remain discovery interfaces because tools and
humans discover them without first locating `openspec/`. They route to
`openspec/constitution/project-charter.md`, then root `CONTEXT.md`; Context links to the new control map and
execution-model canon but remains a non-authoritative glossary. Harness entry documents use the corresponding
parent-relative Charter path and retain all existing run-bundle selection restrictions after the shared pre-read.

Root/Harness adapters, current project guidance, and `openspec/config.yaml` are project-owned consumers and
change in the same Apply. The existing `.agents/` and `.claude/` Apply/Archive skills and command sources are
stable entry implementations: they obtain `operationGuidance` with `openspec instructions apply|archive`, but
do not become the project-specific path-delivery mechanism. `openspec/config.yaml` owns the current guidance
text, including its canonical `openspec/operations/change-feedback-loop.md` coordinate; the resolved
instruction response is the observable delivery boundary.

The old root is removed only after project-owned consumers and internal links resolve. A current external
consumer discovered during Apply is a blocker until an explicit, bounded compatibility decision is approved;
guessing one into existence violates the one-canonical-path goal. A preserved static string in an existing
upstream entry source is neither a project guidance document nor a supported project fallback route: current
delivery is determined by the configuration returned for the selected operation.

### Migration unit, recovery, and compatibility check

The recovery unit is the complete Change A diff. The implementation may transiently move files while working,
but it must not claim a valid partial topology or close a task until the final state has exactly one current
path per document and every selected project-owned consumer uses it. Recovery means repair within the selected
change and rerun focused checks, not copying documents back to create a second source. It does not include
rewriting a stable skill or command asset when `openspec/config.yaml` can deliver the current operation path.

The current OpenSpec planning resolver identifies this repository from `openspec/` and active changes from
`openspec/changes/`; the three new document roles are sibling documentation surfaces rather than OpenSpec
artifacts. The migration therefore does not depend on custom artifact-graph behavior or introduce a CLI
compatibility branch.

### Deterministic checks and semantic closure

Focused integration tests own deterministic topology facts: canonical paths, role-aware hierarchy, entry order,
configuration-delivered operation guidance, project-owned current/live old-path absence, and preservation of
selected research-entry routing. They verify the returned `operationGuidance`, not a project-path edit to each
stable entry source.
The context-routing regression owns the shared project-context pre-read; the existing
`tests/integration/md/dpt-research-entry-routing-contract.test.mjs` remains selected so that this migration does
not duplicate or silently change explicit-existing-bundle versus new-research selection. Markdown semantic quality
remains an Agent/human review concern. The semantic-fact catalog covers runtime fact families only, so this change uses
`semantic-closure.yaml` with `status: not_applicable`; plan and closeout review must re-evaluate that reason
against the actual diff rather than infer semantic completeness from a structural checker PASS.

## Source Of Record

| Question | Owner after Change A | Explicit non-owner |
| --- | --- | --- |
| Enduring project review law | `openspec/constitution/` | root adapters and operation docs |
| System terminology/model | `openspec/guidance/models/` | root `CONTEXT.md` |
| Apply/archive procedure | `openspec/operations/` plus its accepted contract | Charter and entry adapters |
| Accepted capability behavior | `openspec/specs/` | any guidance directory |
| Deterministic lifecycle/closure verdict | executable governance and finalizer | operation guidance |
| Current research-run fact | selected current run bundle | this migration |

## Risks / Trade-offs

- File moves can conceal changed semantics. Change A separates path/role repair from Change B prose pruning,
  and review compares the selected diff against the delta requirements.
- A broad `rg` scan can mistake archive/history for live debt. The scan has explicit roots and exclusions; it
  does not rewrite excluded material to manufacture a clean result.
- Root discovery could become circular. Root adapters carry the direct Charter pointer, so `openspec/README.md`
  is never the bootstrap prerequisite for finding the Charter.
- A role-aware test may overreach into semantic judgment. Tests assert only stable paths, links, frontmatter,
  route order, and authority coordinates; review retains the semantic classification decision.
