# P0: Product Closure Before OpenSpec

> Status: complete / P1 archived; P2 proposal may now be created
> Target: no code, schema, Gate, or OpenSpec change artifacts

## Purpose

Close only the two unresolved semantics that would otherwise leak into every
implementation slice. P0 is intentionally a decision stage, not a disguised
implementation sprint.

## Inputs Already Settled

- All Topics keep the common delivery baseline; emphasis is incremental.
- The user uses natural language; the Agent supplies a brief, correctable
  interpretation.
- HITL1/HITL2 and legal rerun direction are the first persistence carriers.
- A future check may establish traceable focus coverage, not semantic truth.
- Historical work remains history; a new focus must be backed by new
  incremental work or a visible limitation.

See [parent decisions](../README.md) and its evidence folder for the source
observations behind these inputs.

## Decision A: Reader Evidence Model

Question: what compact view lets a reader answer both of these without
inspecting filesystem prefixes or reconstructing a run by hand?

1. Which evidence is shared foundation, Topic-specific work, or cross-Topic
   synthesis?
2. Which accepted work belongs to the common baseline and which is a
   focus-driven increment from a later rerun?

Required constraints:

- The view is a projection over submitted evidence, not a new ledger or
  authority source.
- It must retain provenance coordinates and distinguish "no additional work"
  from "additional work could not be completed."
- It must not use file count, byte count, or a `00-`/Topic filename prefix as
  an effort or quality score.
- It must make sense to a report reader without exposing queue, Wave, or
  formula internals.

Checklist:

- [x] Write reader-facing examples from the supplied completed bundle that
  demonstrate the current ambiguity.
- [x] Compare a compact Evidence Map extension, Topic evidence timeline, and
  Topic card projection against the constraints above.
- [x] Select one reader question and one projection owner; record why the
  rejected options either duplicate authority or hide necessary distinctions.
- [x] Add the selected model to the parent decision register.

### Decision A Record: Two-Axis Evidence Map

Confirmed by the user on 2026-08-08.

**Reader and bounded question.** A report reader who opens the existing
reference navigation needs to answer: for one Topic, what accepted evidence
relationship is visible, and has a later focus created a current increment?
The reader can stop at a concise map and follow a link only when they need the
underlying proof.

**Selected projection owner.** Extend `reference/README.md`, the existing
human-navigation surface, with a compact evidence map. Keep the strict
eight-column `reference/_INDEX.md` table as its existing machine-readable
inventory, and retain submitted evidence, canonical Topic state, and rerun
artifacts as their current Sources of Record.

**Required reader distinctions.** The map shows evidence relationship
(shared foundation, Topic-specific, or cross-Topic) separately from work era
(common baseline, current focus increment, or historical context). It shows
no-focus/no-rerun explicitly. It does not use file/byte/line counts as effort
or quality scores. When the direct record cannot establish the relationship of
historical material, it says `scope unclassified` rather than guessing from a
`00-shared-*` path.

**Observed examples.**

1. The completed bundle's `00-shared-agentscope-*` rows report
   `wave0_foundation` and `related_topic: all`, even where filenames are
   AgentScope-specific. A map must not elevate that path-derived label into a
   semantic all-Topic claim.
2. DeerFlow has 13 direct Wave0 source records but a single
   `00-shared-deerflow-repo.md` navigation target. The map must link to direct
   source/provenance coordinates rather than make a one-file view look like
   one unit of research.
3. This bundle has `rerun_count: 0`; every Topic therefore needs an explicit
   `no focus increment requested` presentation instead of a blank that could
   be mistaken for missing or completed incremental work.

**Options considered.**

| Option | Decision | Reason |
| --- | --- | --- |
| Compact Evidence Map in `reference/README.md` | Selected | Reuses the human-navigation surface, keeps the two reader distinctions visible, and links to existing authority without adding a ledger. |
| Topic evidence timeline | Rejected | It foregrounds chronology and rerun mechanics that a report reader does not need to answer the relationship question. |
| Per-Topic evidence cards | Rejected | It would duplicate shared/cross-Topic material and risks turning summaries into a competing per-Topic authority. |

## Decision B: `partial` and `blocked` Coverage Semantics

Question: what may the Engine honestly do when a focus commitment has a
visible limitation or remains incomplete inside an existing Wave completion
boundary?

Required constraints:

- No new lifecycle branch, third HITL, hidden retry controller, or automatic
  semantic escalation.
- `covered` requires backing from accepted submitted evidence.
- `partial` and `blocked` cannot silently become `covered` or erase the
  limitation.
- The result must leave one clear legal next action or an explicit terminal /
  missing-contract boundary.

Checklist:

- [x] Enumerate the minimum direct facts for each proposed outcome.
- [x] Decide whether `partial` is a blocking focus-coverage result, a legal
  pass-with-visible-limitation, or a condition that must remain at the current
  existing repair loop; state the reason.
- [x] Decide the equivalent treatment for `blocked` without inventing a new
  route.
- [x] Identify the existing Wave boundary and direct owner that would consume
  the result.
- [x] Add the chosen outcome/routing semantics to the parent decision register.

### Decision B Record: Existing Wave Result Shape

Confirmed by the user on 2026-08-08.

The P2 Gate extension must use the existing Wave result shape, not a new
lifecycle branch:

| Coverage outcome | Minimum direct facts | Existing Wave result | Reader-facing meaning |
| --- | --- | --- | --- |
| `covered` | Every declared commitment has valid submitted evidence backing. | Clean pass, provided all other existing rules pass. | The declared focus has traceable incremental coverage. |
| `partial` | Some focus increment is backed; every remaining commitment has an explicit durable limitation; no current-Wave repair is still legal. | Degraded handoff, never clean pass. | Useful incremental coverage exists, with visible limits. |
| `blocked` | No honest declarable focus increment exists; the blocker/limitation is explicit and durable; no current-Wave repair is still legal. | Degraded handoff, never clean pass. | The focus could not be completed, without pretending it was ignored or covered. |
| Invalid or repairable coverage | A required binding/limitation is missing or invalid, or a legal current-Wave repair remains. | Normal failed Gate result with existing repair or missing-contract feedback. | The coverage result is not yet trustworthy enough to hand off. |

The Phase Agent writes commitments and limitations through the P2-approved
process-evidence surface. The Engine checks only that direct structure and its
bindings are valid. It does not choose research work, judge semantic
usefulness, or route a new lifecycle branch. Existing Gate pass/degradation
and repair/missing-contract mechanics remain the consuming boundaries; HITL2
remains the user/Agent decision point for a later rerun.

## P0 Exit Review

- [x] The reader-evidence model has one named reader, one bounded question,
  explicit retained distinctions, and a normal stop point.
- [x] Each focus-coverage outcome has a direct fact set, an honest owner, and
  a legal routing/repair meaning.
- [x] Both decisions say explicitly what they do not change.
- [x] The parent plan and this file contain no implementation commitment that
  needs a proposal to be valid.

P0 closed on 2026-08-08. P1 may now create one focused proposal. Do not use a
later proposal to reopen these decisions silently; return here only if real
evidence contradicts an assumption or exposes a missing reader question.
