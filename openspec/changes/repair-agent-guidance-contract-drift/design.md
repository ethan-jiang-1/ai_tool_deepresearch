## Context

See `proposal.md` for motivation. The affected suites are static `integration`
Markdown contracts, not runtime executions. Their two failures have different
ownership errors:

| Surface | Current fact | Repair boundary |
| --- | --- | --- |
| `artifact-persistence-contract.test.mjs` | It reads `CONTEXT.md` and requires three bold Final terms despite `CONTEXT.md` routing those behavior terms to their accepted owner. | Remove the Context read and its glossary loop; retain command, release, and `RUN.md` assertions. |
| shared/Wave0/Wave1 delegated guidance | It already carries the current formula and concrete `<claim_count>` command placeholder, but omits the accepted conceptual batch-claim labels asserted by the static contract. | Add one concise mapping sentence to each existing top-up section; do not rewrite the formula or command. |

The direct Sources of Record are `research/final-delivery-backing` for
FDB-001/FDB-002 and `agent/agentic-queue` plus
`research/research-wave-phase-content` for AGQ-022/RWP-015. `CONTEXT.md`, the
three Markdown documents, and both tests are consumers of those accepted
contracts.

## Goals / Non-Goals

**Goals:**

- Restore the two focused static contracts as accurate evidence of existing
  Final-backing and bounded-batch guidance.
- Keep the current concrete bounded-claim formula and command understandable
  alongside the accepted conceptual vocabulary.
- Preserve the direct authority path, with no new control state or fallback.

**Non-Goals:**

- No `CONTEXT.md` expansion, Final lifecycle change, or new Final glossary.
- No Queue, profile, work-unit, actor-preflight, scheduler, CLI, Gate, or
  runtime-bundle edit.
- No test-regex weakening, extra test class, dependency, version bump, or
  `CHANGELOG.md`/`RUN.md` release update.

## Decisions

1. **Correct the static test's owner rather than restoring duplicate terms.**
   In `artifact-persistence-contract.test.mjs`, delete only the `CONTEXT.md`
   read and assertions for `Final key-finding declaration`, `Final Evidence
   Map`, and `Final backing`; retitle the affected subtest to describe the
   release-scope facts it still checks. The Final command and terminal-boundary
   assertions stay in their existing `phase-final.md` and persistence-playbook
   consumers. Restoring the terms to Context is rejected because commit
   `a1e8fa3d5` deliberately made Context a compact routing surface and FDB-001/
   FDB-002 already own the behavior.

2. **Add a conceptual-to-concrete mapping, not an alternate claim syntax.**
   In the existing normal-top-up paragraph of each of the shared, Wave0, and
   Wave1 documents, state that this is the bounded top-up batch-claim posture;
   identify conceptual `--count <claim-count>` as the computed `claim_count`;
   and name its independent-demand, accepted/default-cap, and remaining-free-
   delegated-in-flight-capacity bounds. The sentence must point those concepts
   at the present `effective_delegated_concurrency_cap` and
   `remaining_free_capacity` explanation. The concrete command remains
   `--count <claim_count>` and the formula stays byte-for-byte equivalent.
   Replacing the current placeholder or reintroducing the former conservative
   default is rejected because it would obscure the current profile-owned cap.

3. **Keep the existing strict bounded-batch static test.**
   Do not modify `parallel-delegated-reference-materialization.test.mjs`. Its
   fixed anchors protect the accepted distinction between batch claim, cap, and
   available capacity; the minimal guidance mapping makes all anchors truthful
   without adding Queue behavior. The test's existing timeout, progress, and
   reference-materialization assertions are left unchanged.

4. **Use only deterministic integration evidence.**
   The two changed/selected suites live under `tests/integration/md/`; their
   native verdict is the `node:test` process exit. No real Agent, Subject
   Agent, external call, temporary bundle, or runtime claim is needed. Run
   both focused files first and then `npm test` to catch cross-document drift.

### Constitutional Review

- **Semantic precision:** no named state, projection, command, view, or
  semantic layer is introduced. The only reader question is which existing
  source owns a behavior term; the answer stops at the accepted spec rather
  than duplicating it in Context.
- **Simple reliable control:** removing the false Context assertion and adding
  one local mapping sentence avoids a second glossary, policy source,
  scheduler, or validation path. The legal feedback loop remains edit the
  owned consumer, run its existing static test, then run the full suite.
- **Helper-oriented responsibility:** the Agent performs the documented
  Markdown/test edits and verification. The user makes no new product or risk
  decision. Existing Engine verdicts and runtime ownership are untouched.

## Risks / Trade-offs

- [Risk] A wording insertion could imply a second cap policy or obsolete
  default. -> Keep the sentence adjacent to the current formula, explicitly
  map terms to the current profile-derived values, and retain the actual
  command/fallback text unchanged.
- [Risk] Removing Context assertions could accidentally remove Final coverage.
  -> Preserve the separate Final command/terminal-boundary assertions and run
  the focused suite plus `npm test`.
- [Risk] A broad Markdown update could disturb unrelated timeout/progress
  guidance. -> Limit each edit to the normal top-up paragraph and leave the
  existing strict static suite unchanged.

## Migration Plan

Before target edits, run the change-local verification-routing and semantic-
closure plan checks. Apply the test-owner repair and the three wording edits as
separate small task groups, updating `tasks.md` after each verified task. Run
the two focused suites, then `npm test`, plus the governed asset/closeout checks
before archive. Rollback is a normal git revert; there is no runtime data,
schema, configuration, or bundle migration.
