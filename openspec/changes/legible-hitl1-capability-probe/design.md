## Context

See `proposal.md` for the incident motivation. The current bounded probe is
already an accepted Agent-flow action: `phase-hitl1.md` owns its execution and
the profile/Gate own its direct observation and pass/fail boundary.
`brief/hitl1.md` has `authority: exact-text`, while
`research-access-adapter.md` names the selected host as owner of native search,
fetch, policy, and shell rendering. The implementation therefore needs a
single, durable communication seam without claiming control over host UI.

| Conclusion | Authoritative source | Consequence for this change |
| --- | --- | --- |
| The bounded search/fetch sequence, `research_access` observation, and HITL1 Gate already exist | accepted `PRP-002` and `phase-hitl1.md` | Modify the existing requirement and Phase; add neither state nor Gate. |
| User-facing HITL1 text has one exact-text owner | accepted `HIU-002` and `brief/hitl1.md` frontmatter | Put the three exact Chinese messages in the brief and have the Phase render them. |
| An access observation and a Gate verdict answer different questions | `PRP-002` observation rules and Gate command | Render the direct probe result before the Gate; reserve silent-execution exit for Gate pass. |
| Native host rows and policy/transport output are outside framework presentation authority | `research-access-adapter.md` | Add framework text only; make no suppression or rendering claim. |

## Goals / Non-Goals

**Goals:**

- Make one stable, Chinese pre-probe explanation, fixed neutral query, and
  concise direct-result path visible in the Agent-facing Markdown flow.
- Preserve the semantic distinction between an already-recorded HITL1 decision,
  a direct `research_access` observation, and selected-host-native output.
- Keep current native-first/fallback bounds, profile writer, Gate, status flow,
  and silent-execution responsibility unchanged.
- Prove the Markdown contract deterministically while stating the boundary of
  that proof.

**Non-Goals:**

- Suppressing or changing host-native tool-call/error rendering.
- Adding a state, diagnostic owner, host adapter behavior, provider selection,
  retry mechanism, user decision, or real-Agent proof claim.
- Moving `research_access` out of its accepted profile owner.

## Decisions

### One exact-text brief owns the user-visible copy

Add a small capability-check communication section to `brief/hitl1.md` with
the exact pre-probe, available, and unavailable wording. `phase-hitl1.md` will
refer to that section and enforce its placement: display the notice before the
one search, use the literal query, record the existing observation, render its
corresponding direct result, then run the same Gate. Only the existing Gate
pass selects the existing silent-execution exit.

This creates a useful reader-facing semantic layer: a user can answer the
bounded question "is this tool action research or another decision?" without
reading profile schema, Gate code, or host implementation. It deliberately
preserves the distinctions that change that answer: user decision,
`research_access` observation, and host-native rendering. It introduces no
new named runtime object.

Keeping the text only inside `phase-hitl1.md` was rejected because the brief is
the existing exact-text user-facing owner. Copying it into Gate feedback or the
host adapter was rejected because those surfaces do not own this conversation
flow and would produce drift or a false host promise.

### Record the existing terms where maintainers first look for them

`CONTEXT.md` will gain concise Interaction Model entries for **HITL1 decision**,
**research-access observation**, and **selected-host-native rendering**. These
are existing concepts already owned by the profile/Gate/host boundary; the
glossary records their different reader questions so later incident reports do
not collapse a user choice, a probe result, and host display behavior into one
"HITL outcome." It will contain no schema, command, implementation, or new
authority rule.

### Use a literal neutral query without changing evidence rules

The Phase will use `site:wikipedia.org "Internet protocol suite"` for the one
existing search. It is visibly unrelated to the user's research and stable
across sessions, but remains only an invocation input. The existing returned
candidate, eligibility, native fetch, same-URL fallback, and real-page-content
rules continue unmodified.

An invented fixed URL or a deterministic fixture was rejected because the
accepted probe requires a real returned search URL and real fetched content.
Recording the query or candidate history was rejected because it would create
new runtime history and confuse the probe with research evidence.

### Result timing follows existing authority

The `available` or `unavailable` message is emitted immediately after its
existing `research_access` observation and before the current HITL1 Gate. The
observation is its direct source of truth; the message is not a Gate verdict.
An available message therefore says only that research access is confirmed and
the remaining HITL1 check will run. The existing silent-execution exit is
emitted only after the Gate passes. An unavailable message preserves the
recorded choice and keeps the Agent at the current Gate's smallest external
boundary. No new Gate or status decides either result.

The shortest legal loop remains:

```text
recorded decision -> exact pre-probe notice -> one bounded probe
  -> research_access observation -> exact direct result
  -> same HITL1 Gate -> Gate-pass silent exit | existing repair boundary
```

This is a net simplification: it replaces arbitrary-looking per-turn queries
and implicit UX interpretation with one visible contract, while avoiding a
second renderer, state, checker, retry loop, or host integration controller.

### Responsibility remains in the existing layers

The user owns only a new research semantic decision or a genuinely
non-delegable external action. The Agent renders the prescribed text, executes
the already-authorized bounded probe, consumes Gate feedback, and reruns the
same legal path. The Engine continues to validate profile facts and decide the
existing Gate. Native host output remains a host fact; neither user approval
nor agent wording grants a permission bypass.

### Static contract verification has an explicit proof boundary

Extend `tests/integration/md/phase-hitl1-research-access.test.mjs` to read the
Phase and brief Markdown and assert the fixed query, exact notices/results,
notice-before-search and result-before-Gate anchors, Gate-pass-only silent
exit, retained no-new-decision language, and honest host boundary. The
change-root verification plan selects only that deterministic integration
claim. `agent_flow_e2e` is intentionally not applicable: a current real HITL1
observation requires separate authorization and native evidence.

## Risks / Trade-offs

- [A host may still visibly render raw tool/error lines] -> The brief explicitly
  bounds its promise to framework text; a separately authorized retained run is
  required to evaluate the selected host's actual presentation.
- [The fixed query may produce different provider results over time] -> It is a
  stable invocation input, not a fixed URL or availability guarantee; the
  existing real-search and fail-closed observation rules remain authoritative.
- [An Agent may fail to follow Markdown at runtime] -> Static tests prove the
  contract surface only; the plan retains real-Agent observation as an honest
  separate evidence track.
- [Future incident discussion may conflate decision, observation, and host UI]
  -> The glossary gives maintainers one short canonical distinction without
  creating a second behavioral authority.

## Migration Plan

No bundle migration is required because the profile schema, persisted fields,
and Gate contract do not change. Apply will update the two Markdown surfaces,
their integration test, and the existing `PRP-002`/`HIU-002` requirements, then
publish the proposal-declared `v0.72` release note and RUN banner. A rollback
reverts the Markdown/test release change; existing bundles retain their
accepted `research_access` observations and need no data transformation.

## Open Questions

None that changes the implementation or task breakdown. The selected host's
actual rendering remains a deliberately separate E1/E2 observation boundary,
not an unresolved design choice for this change.
