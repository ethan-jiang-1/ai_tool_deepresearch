## Context

The current Charter already supplies the project's correct durable architecture: Agent supplies semantic judgment, Markdown controls Agent Flow, Engine owns deterministic contracts, and bundle state is durable truth. Its Authority Map and its paired evolution directions are also useful and should remain recognizable to existing readers.

The systemic analysis identifies only four gaps above the level of individual Wave/Gate bugs:

1. A deterministic requirement can be authoritative without a normal caller having a legal producer/commit/repair boundary.
2. A public entry can expose low-level choreography instead of one bounded legal action.
3. `autonomous` or `stop: no` wording can accidentally sound like a promise that the host or model will keep running.
4. “Real execution” can be read too broadly unless the claimed fact and proof distance are stated.

These are clarification gaps, not evidence that the Charter's existing structure or its directory/routing material is broken. The diagnostic reports are design inputs only; they do not authorize a Wave-specific rule, runtime change, or broad guidance cleanup.

## Goals / Non-Goals

**Goals:**

- Add four implementation-neutral review laws for new or changed surfaces without changing the existing Charter's architecture or reading route.
- Make a missing legal path an honest result instead of an invitation to fabricate a writer, receipt, retry, or controller.
- Preserve Agent responsibility for ordinary legal work while separating that responsibility from host or model liveness.
- Bound completion and causal claims to the evidence they actually have.
- Make the intended target diff small enough to review section by section.

**Non-Goals:**

- No Charter rewrite, section deletion, relocation of directory maps, or index/README redesign.
- No changes to logging, experiments, workflow/queue/subagent guidance, Wave documents, tests, framework code, schemas, CLIs, Gates, lifecycle behavior, or versioning.
- No new public handoff command, dry-submit flow, closeout sequence, byte budget, evaluator, degradation policy, retry tree, watcher, host adapter, or anti-tamper mechanism.
- No claim that this guidance change proves real Agent behavior, host continuation, or a particular bug remediation.

## Decisions

### 1. Preserve the Charter's existing structure

The Charter is the baseline, not a problem to replace. Apply keeps every existing top-level section and guidance-companion routing link. It removes only the two `Related Guidance` entries that point to downstream OpenSpec/configuration surfaces. It changes only the following local surfaces:

| Existing surface | Additive or surgical change | Explicitly preserved |
|---|---|---|
| `Authority Map` / nearby conflict guidance | Add a short clarification that authority review also asks for lawful agency and proof scope | Current Source-of-Record table and precedence order |
| Existing `MUST` wording about silent autonomy | Qualify it as Agent action responsibility inside a legal live opportunity, not host/model liveness | HITL1 -> silent work -> HITL2 -> Final posture |
| Existing `MUST` wording about real evidence/trace | Add claim-scoped proof-distance wording | Anti-fabrication and real-execution requirement |
| `Guideline Change Checklist` | Add one compact constitutional-boundary/admission review | Existing checklist questions and paired evolution reviews |
| `Related Guidance` footer | Remove the two downstream OpenSpec/configuration links | Existing guidance-companion routes |

The new clarification is intentionally a short addition rather than a second Charter. It names four laws:

1. **Operational completeness:** a proposed or changed cross-boundary deterministic obligation used to block advancement or establish a deterministic closure condition makes reviewable its authoritative fact, owning boundary, any legal means to establish or change it, and the honest result when none is in scope. It does not require a witness, receipt, consumer, or repair mechanism unless an accepted contract independently requires one.
2. **Bounded public reentry:** a proposal or change that explicitly declares an Agent-facing boundary for entry, handoff, or recovery states its input/context boundary and enough authoritative facts for the bounded next legal action or an honest no-path result. It may be a documented protocol, not necessarily a new CLI or Engine transaction.
3. **Non-implication:** authority, capability, permission, responsibility, liveness, and evidence do not imply one another.
4. **Claim-to-proof proportionality:** a claim is limited to its object and proof boundary; altered evidence can remain diagnostic without closing a stronger claim.

The Charter will explicitly state that these are review laws, not automatic requirements to add writers, receipts, state, retries, or controllers.

### 2. Use the two existing companions for their narrow ambiguities

`evolution-simple-reliable-control.md` already owns the shortest legal loop and one-next-action discipline. Amend its recovery/feedback explanation so that `write_to` and same-check rerun apply only when an accepted legal repair exists. Otherwise it must show the earliest fact and the owner, terminal, or missing-contract boundary. Current-caller permission remains a separate host boundary. This prevents fake actionability without changing its control-complexity rules.

`evolution-helper-oriented-agent.md` already owns the user-decision/Agent-execution boundary. Amend its autonomy definition and non-interactive placement wording so responsibility applies only where a live turn, legal capability, permission, and direct facts exist. This preserves the duty to execute ordinary legal work and rejects both opposite errors: turning ordinary work back to the user, or promising host/model continuation.

### 3. Keep incident mechanics out of constitutional text

The constitutional-admission check asks whether a proposed durable invariant remains valid after removing the current BUG, Wave, CLI, file, and implementation names; constrains an invariant rather than a chosen mechanism; rejects a future equivalent failure; and admits a meaningful counterexample. Where multiple legal mechanisms could satisfy the invariant, it must not pre-approve one of them.

Dry-submit, Phase closeout, a status-sync command, a fresh-session byte threshold, a Wave evaluator, and degradation policy fail this admission test. Their owning future OpenSpec changes remain the only place to decide them.

### 4. Do not add a documentation test for this clarification

The existing guidance is prose for human/Agent judgment. A new regex-based Node test would only prove that chosen phrases exist, add another surface to maintain, and make the narrow clarification look more authoritative than it is. All four verification classes are therefore explicitly not applicable; review is the readable target diff plus OpenSpec/governance validation.

## Risks / Trade-offs

- [The new laws are read as implementation commands] -> State in each location that they require a review conclusion, not a writer, controller, retry, or runtime API.
- [Liveness qualification is read as permission to stop acting] -> State the positive condition: Agent responsibility remains whenever the live, legal, permitted opportunity exists.
- [Proof scope is read as erasing diagnostics] -> State that material outside the affected claim's provenance or continuity boundary remains useful for diagnosis but cannot automatically satisfy a stronger closure claim.
- [The change grows again during apply] -> The task list forbids edits outside the three named guidance files and requires an explicit no-deletion/no-relocation diff review before completion.

## Migration Plan

1. Freeze and validate the change plan, then re-read the three clean target files against this surface budget.
2. Apply only the four Charter clarifications/checklist additions and the two companion wording clarifications.
3. Review the final diff for preservation of all existing Charter headings and absence of unrelated guidance/framework/test changes.
4. Run OpenSpec and project governance checks. No runtime migration, version bump, release note, or test asset is needed.
5. Archive only after the accepted main spec is synced; future Wave/Gate changes cite these review laws but define their own concrete behavior. Untouched older mechanism wording remains design debt until a focused change reaches that surface.

## Open Questions

None. The change is deliberately bounded; a requested expansion to directory routing, evidence instrumentation, or mechanism flow requires a separate change.
