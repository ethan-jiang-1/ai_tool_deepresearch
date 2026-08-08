## Why

P1 已使用户的自然语言 focus 能通过既有 HITL/rerun carrier 留存并驱动当前
rerun direction，但系统仍无法从直接事实区分“该 direction 已有提交证据支持”
与“本轮无法完成且限制已明确”。P2 需要在不把自然语言语义交给 Engine 的前提
下，给 Wave1 现有完成边界增加这个可追溯的、可诊断的事实层。

## What Changes

- 在每个已声明 current focus increment 的既有 Wave1 `depth-review.yaml` 中，
  增加可选、Phase-owned 的 focus-coverage process-evidence block。它记录最小的
  focus commitments、其 `covered` backing 或显式 limitation；未声明 focus 时不
  创建该 block，也不改变共同 baseline。
- 让 Wave1 Engine 从该 block、已提交的 Wave1 work-unit rows、canonical Topic
  binding 与当前 rerun direction 的直接结构事实中验证 coverage binding。Engine
  不解析 HITL 用户原话、不评价 commitment 的语义充分性，也不把 depth review
  变成 submitted ledger 的副本。
- 复用既有 Wave1 Gate 结果分区：结构无效、缺失 binding 或仍有既有合法修复时保
  持正常 failed Gate；结构有效的 `partial`/`blocked` 连同可见 limitation 只能走
  既有 degraded handoff，绝不成为 clean pass 或新 route；实现以一个
  definition-owned `focus_coverage_limit` rule 表示已验证的 coverage 缺口，使
  既有 fail-closed degradation predicate 保持不变；`covered` 在其他现有规则
  满足时保持 clean pass。
- 在 Wave1 Agent-facing phase guidance 中规定由已接受 focus/rerun direction
  派生最小 commitments、以既有 queue/work-unit/submit 进行补充工作、并将同一
  Gate feedback 作为唯一 repair entry；不引入自然语言 parser、独立 queue kind、
  自动 rerun 或第三个 HITL。
- 增加与该结构和 Gate 边界相称的 unit、integration、deterministic E2E 及真实
  Agent-flow evidence 计划。fixture 只能证明 Engine contract；真实 Agent 或工具
  不可用时必须保留 `NOT_RUN`，不能以手写 coverage 取代运行证据。

## Capabilities

### New Capabilities

- None.

### Modified Capabilities

- `research/wave1-intake`: 将 Phase-owned depth review 的允许 process-evidence
  扩展为可追溯 focus commitments、submitted backing 与 visible limitations，且
  保持 submitted rows 的 evidence authority。
- `research/research-wave-gate-implementation`: 让 Wave1 complete rule 与同一
  direct-fact evaluator 检查 focus coverage，并将 `covered`、`partial`、`blocked`
  映射到既有 clean/degraded/failed verdict partition。
- `research/research-wave-phase-content`: 在 Wave1 Markdown control surface 中
  规定 focus commitment 的最小作者流程、既有 supplementary work 路径与同一
  checkpoint repair 边界。

## Capability Discovery

| Candidate path | Evidence read | Decision | Reason |
| --- | --- | --- | --- |
| `research/wave1-intake` | `Wave1 gate checks deepening artifacts` requirement and depth-review ownership | Modify | 它已拥有 depth-review 的 Phase-owned facts 与 submitted-ledger non-duplication boundary。 |
| `research/research-wave-gate-implementation` | `Wave1 complete gate rule set`, Wave1 CLI rule evaluation, and verdict-partition requirements | Modify | 它拥有 Wave1 direct-fact Gate check、diagnostic and degraded-handoff semantics。 |
| `research/research-wave-phase-content` | `Wave1 phase body completeness with subagent boundary` requirement | Modify | 它拥有 Phase Agent authoring, queue/work-unit repair, and same-check rerun guidance。 |
| `research/research-wave-experiments` | Existing Wave experiment and real-evidence boundary requirements | Verify-only | P2 adds routed assets under existing verification rules; it does not change experiment capability behavior unless design finds an unmet contract. |
| `research/research-styles` | Shared baseline-style and floor contract | Verify-only | Focus coverage cannot change shared numeric floors or create per-Topic weights. |
| `workflow/rerun-incremental-node` | P1-synchronized current rerun-direction requirement | Verify-only | P1 already carries the current direction; P2 consumes it without modifying rerun authorization or history semantics. |
| `engine/gate-skeleton` | Existing structured hints and Wave Gate adapter contracts | Verify-only | The change uses the existing checker/finding/verdict path rather than a new generic controller. |
| `workflow/repair-loop` | Existing same-check deterministic loop contract | Verify-only | P2 returns existing legal repair or explicit no-path feedback; it adds no loop or retry authority. |
| `agent/hitl-ux` | P1-synchronized HITL focus guidance | Verify-only | The existing HITL decision remains the semantic input; P2 adds no interaction point. |
| `research/user-research-controls` | P1-synchronized literal controls snapshot contract | Verify-only | User wording remains narrative context, not Gate input or structured coverage authority. |

## Source Of Record And Control Shape

The submitted work-unit ledger, immutable work-unit bindings, canonical Topic
identity, current structured rerun direction, and the new depth-review
process-evidence block remain distinct direct facts. The block declares only
the bounded commitments and their references or limitations; submitted rows
remain the authority for evidence existence and provenance. Its absence means
no focus-coverage claim was declared, not an Engine inference about the user's
natural-language intent.

The shortest legal loop is: accepted current direction -> Phase Agent writes
the smallest commitment/limitation structure -> Wave1 evaluates direct
submitted bindings -> one root diagnostic -> existing supplementary work or
honest degraded/no-path boundary -> rerun the same Wave1 checkpoint. This
avoids a second ledger, natural-language parser, new Gate route, retry tree,
or focus-specific queue controller.

## Semantic Precision And Responsibilities

`traceable focus coverage` serves the reader of a current Wave1 result who
needs to answer one bounded question: for each declared focus commitment, is
there current submitted backing, an explicit limitation, or no trustworthy
answer yet? It preserves the distinctions that change that answer: `covered`
versus `partial` versus `blocked`, current submitted backing versus historical
context, and structurally invalid/missing binding versus a visible limitation.
The reader can stop at the structured result, or honestly see the invalid/
unresolved boundary without reconstructing source files or treating a status
as semantic-quality proof.

The user retains semantic usefulness decisions at HITL2. The Phase Agent
chooses and writes a minimal commitment interpretation from accepted current
context, performs existing legal mechanical repair, and records limitations.
The Engine validates only declared structure, authoritative bindings, and the
existing verdict partition. Neither `partial` nor `blocked` grants a lifecycle
override, a user decision, an automatic rerun, or a claim that the focus was
semantically satisfied.

## Impact

- Expected implementation surfaces: Wave1 depth-review contract/evaluator,
  Wave1 Gate definition/CLI feedback, Wave1 Markdown guidance, and routed
  tests/playbooks under their established locations.
- No dependencies, canonical Topic field, profile enum, public API, or new
  lifecycle route are planned.
- The change modifies reusable Harness behavior and therefore targets the
  next release banner and changelog version, `v0.80`, during apply.
- Original product decisions and P1 evidence are recorded in
  `_backlog/_done/_closed_plans/topic-research-emphasis/progressive/02-traceable-focus-coverage.md`
  and archived change `2026-08-08-align-topic-focus-and-rerun-guidance`.
