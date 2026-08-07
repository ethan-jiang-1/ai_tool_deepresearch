# Gap Hypotheses and Prompt / Control-Surface Feedback

> Falsifiable hypotheses for the overall
> [`gate-schema-capability-audit.md`](../gate-schema-capability-audit.md). Direct supporting facts live
> in [`evidence-base.md`](evidence-base.md); the shared measurement procedure lives in
> [`observation-protocol.md`](observation-protocol.md).

## H1: Decision-Point Projection Improves Constructibility

> Compared with long static phase prose, a contract projection generated from current attempt
> authority and placed beside the decision point will improve first-attempt constructibility and
> reduce Engine-source archaeology and whole-batch rewrites.

Record at least:

- first-attempt acceptance rate;
- Engine-source reads used to infer the contract;
- distance from producer action to first deterministic rejection;
- first authoring surface actually read by the Agent;
- number of normative-looking copies of the same obligation;
- artifact count rewritten around a rejection, not retry count alone.

H1 is weakened when a complete generated projection is demonstrably read first but the same class of
error remains stable. The next check is evaluator explainability or model execution limits, not more
prose. Improvement indicates an adoption/conformance gap rather than a need for a new general schema
mechanism.

### Prompt-engineering implication

The missing capability is not more constraint text. It is a **current-contract decision-point
projection**:

- place the action core before reference material;
- name the producer owner, legal writable surface, and done condition;
- derive contract facts from current authority rather than hand-copying another normative contract;
- expose a dry-run/dry-submit backed by the same evaluator before formal submit;
- return exact `write_to` and same-check `rerun` coordinates on rejection.

## H2: One Authority and One Evaluator Reduce Verdict Drift

> When accepted authority for one obligation is internally consistent, rejection occurs at the earliest
> owning admission, and every checkpoint reuses one pure evaluator, late-Gate rejection,
> cross-checkpoint disagreement, and orphan artifacts will decline.

For each sampled obligation, record:

| Layer | Required fact |
|---|---|
| Authority | One schema/state/receipt/ledger owner, identity, attempt scope, and any conflicting clauses |
| Producer projection | When and where derived facts are delivered; competing normative copies |
| Declared metadata | Definition/CLI declaration and stale/dead fields |
| Actual evaluator | Dispatch target, evaluator scope, and prerequisites |
| Consumers | Admission, claim, inspect, Gate, stale repair, and projections using the result |
| Persistence | Authority-only storage versus reconstructible projection |
| Proof | Identical facts produce the same verdict and smallest root everywhere |

Core signals are independent evaluator count, mutually exclusive accepted clauses, cross-checkpoint
disagreement, late-rejection distance, stale/dead fields, writer/parser round-trip failure, and orphan
artifacts. If one evaluator already exists but verdicts differ, inspect attempt identity, snapshot time,
authority binding, and prerequisites before adding another checker.

## H3: Root-First Legal Feedback Makes Recovery Converge

> Prerequisite-aware root selection plus one legal action or honest no-path per root will reduce repair
> turns, manual authority edits, and recursive descendants while improving same-check convergence.

Record at least:

- root compression ratio: raw findings / independent actionable roots;
- roots with truthful owner, exact `write_to`, and reachable `rerun`;
- repair turns from primary root to same-check pass or honest terminal;
- recommended operations rejected by their own preconditions;
- maximum repair-descendant depth and repeated-fail terminal rate;
- manual authority edits, unsafe bypasses, and cross-file hash surgery;
- no-path cases represented honestly instead of converted into generic repair.

If root-first feedback is delivered but a real Agent still follows secondary prose, investigate H4.
If the recommended action itself is illegal, it remains an Engine contract defect.

## H4: Adherence Risk Concentrates at Authority Changes

> Prompt adherence failures will concentrate at degraded, recovery, and handoff decision points where
> authority changes, more than on ordinary happy-path prose. Instruction proximity, normative-copy
> count, and the Agent's actual next action will explain failure better than substring presence.

Static text tests prove delivery, not behavior:

- [BUG-187](../../_done/_fixed_bugs/BUG-187-hitl1-capability-probe-opaque-to-user.md) can prove
  wording/order while real host completion remains `NOT_RUN`;
- [BUG-192](../../_done/_fixed_bugs/BUG-192-degraded-gate-triggers-de-facto-hitl.md) stopped before
  launch and cannot establish compliance;
- [BUG-198](../../_done/_fixed_bugs/BUG-198-phase-agent-direct-search-no-subagent.md) had no callable
  search surface or observed behavior and cannot establish direct-search compliance.

Real observation must retain transcript, tool calls, first return, first-read surface, next action, and
the convergence trace.

## Control-Surface Target Shape

Current [Wave1 phase guidance](../../../DEEP_RESEARCH_HARNESS/workflows/nodes/phases/phase-wave1.md)
already shows parts of the target shape: entry prerequisites, concrete task-card payload, dry-submit
beside submit, and structured Gate hints consumed first. The next question is whether these surfaces
actually control real decisions, not whether the same paragraphs can be copied elsewhere.

| Decision point | Action core to deliver | Avoid | Required proof |
|---|---|---|---|
| post-claim authoring | attempt-derived completion contract, owner, paths, done condition | 10+ constraints dispersed across phase/shared docs | static delivery + first-return transcript |
| submit/Gate failure | selected `hints[]` root, one `write_to`, same-check `rerun` | inferring payload path from error prose or source | deterministic violation mapping + real next action |
| degraded/recovery/handoff | current legal lifecycle owner/operation or honest boundary | generic retry/repair/escalate across authorities | retained tool calls + terminal trace |
| synthesis/Final | selected key findings, uncertainty, submitted-backing map | asking Engine to decide truth | backing regression + Agent/HITL semantic review |
