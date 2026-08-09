## Why

`req-registry.yaml` currently has only live and retired identity semantics. A
new capability therefore has no legal proposal-stage identity: its delta must
declare requirement IDs, while a live prefix is correctly required to resolve
to an existing main spec, which proposal/explore are not allowed to create.
The active `establish-semantic-fact-closure-governance` change exposes this as
`SEF-001` through `SEF-004` being unregistered. The failure is a real lifecycle
gap, not a reason to weaken `polish-openspec-change`, fake a live prefix, or
create an early main spec.

This change is prompted by the semantic-closure planning record at
`_backlog/plans/semantic-fact-closure-openspec-governance.md`. Its underlying
runtime examples are BUG-212, BUG-213, and BUG-214; this change does not alter
their Harness behavior. It establishes the missing governance state needed to
plan that independent semantic-closure change honestly.

## What Changes

- Add a strict, change-local `requirement-reservation.yaml` contract for a new
  capability's not-yet-live path, prefix, and requirement IDs.
- Extend `check-project-reqs.mjs` with an explicit lifecycle interpretation:
  default `plan` mode accepts an unregistered delta ID only when the same
  active change owns a valid reservation; scoped `archive` mode requires the
  selected change's reservations to have become registry-backed, main-spec
  declarations before finalization.
- Preserve `req-registry.yaml` as the source of truth for live capability
  identity. It will not contain a placeholder, a fake main-spec path, or a
  misleading `no spec directory` annotation for a pending capability.
- Make the governed archive finalizer invoke the requirement check in explicit
  selected-change archive mode. Valid reservations belonging to other active
  changes remain plan-stage facts and do not block an unrelated archive.
- Make the current `/opsx` Apply entry consume the config-named reservation
  guidance as a plan-check boundary before target edits.
- Reconcile the finalizer's supported-entry inventory with the eight current
  `.agents` and `.claude` Apply/Archive surfaces, and make each deliver the
  existing feedback-lifecycle route. This is a conformance repair required to
  close this change, not a semantic-closure gate or a new lifecycle behavior.
- After this change is applied, update the already-active semantic-closure
  change with its own reservation record and rerun plan validation. This
  bootstrap repair is deliberately not hidden by this proposal.

This change does not modify `DEEP_RESEARCH_HARNESS/`, its runtime contracts, or
its release version. It does not change OpenSpec's native proposal/apply/archive
phases, and it does not make a reservation an implementation permission.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `governance/requirement-traceability`: define the plan-stage reservation
  contract and require the project checker to distinguish valid reservation,
  live registration, collision, and archive transition.
- `governance/change-feedback-loop`: require the finalizer to verify the
  selected change's reservation-to-live transition before native archive and
  restore the existing feedback-lifecycle route across its current supported
  entry surfaces.

## Capability Discovery

| Candidate path | Evidence read | Decision | Reason |
| --- | --- | --- | --- |
| `governance/requirement-traceability` | Capability Catalog; main spec `RET-001` and `RET-006`; `check-project-reqs.mjs` | Modify | It owns registry identity, prefix path validity, and project requirement checks. The missing plan-stage identity belongs here. |
| `governance/change-feedback-loop` | Capability Catalog; main spec `CHF-003`; `finalize-change-archive.mjs` | Modify | It owns the mechanical finalizer sequence. Archive needs a selected-change requirement-transition check, not a second archive route. |
| `governance/semantic-fact-closure` | Active change delta and its staging note | Verify-only | It is the first consumer that exposes this gap, but its runtime fact-catalog behavior is unchanged by this governance prerequisite. |
| `governance/guidance-constitution` | Capability Catalog and main spec | Excluded | The issue is an executable lifecycle contract, not a new constitutional principle or guidance hierarchy. |

## Semantic Precision Review

The named concept is a **change-local requirement reservation**. Its reader is
an Agent or maintainer planning a new capability, and its bounded question is:
"Which currently non-live requirement identity does this active change
exclusively own, and what must become true before archive?" The record keeps
three distinctions explicit: pending reservation versus live registry entry,
the owning active change versus every other change, and plan validation versus
selected-change archive validation. The checker can therefore stop with one
precise answer: valid plan ownership, a collision/malformed record, or the
specific live fact missing before archive. It does not claim that the proposed
capability is semantically correct.

## Control and Responsibility Review

The direct sources of record are deliberately split by lifecycle: the active
change's reservation file owns only pending identity, while
`req-registry.yaml` and the canonical main spec own live identity. The shortest
legal loop is `proposal delta -> same-change reservation -> Apply/sync -> live
registry + main spec -> scoped archive check`. This replaces the impossible
pre-registration workaround without adding a retry tree, a shadow global
registry, or a lenient `polish` path.

The user has made the policy decision to preserve strict governance. The Agent
creates and later updates the authorized change artifacts; it does not invent
live registry facts. The Engine validates the record, detects collisions, and
returns the directly repairable governing file or the missing archive fact. A
passed reservation check does not grant Apply or archive permission; the
existing OpenSpec lifecycle and finalizer retain those decisions.

## Impact

- `openspec/governance/check-project-reqs.mjs` gains reservation parsing and
  plan/archive validation.
- `openspec/config.yaml` changes proposal/apply guidance so the new planning
  record is created through the governed `/opsx` entry point rather than being
  remembered as optional advice.
- The supported `/opsx` Apply entry consumes the named config guidance and
  stops at the plan checker. To resolve the observed cross-change archive
  deadlock, this change also reconciles the existing finalizer inventory to
  eight current readable entry surfaces and gives each the already-accepted
  feedback-lifecycle route; it does not add semantic-closure-specific checks.
- `openspec/governance/finalize-change-archive.mjs` passes explicit archive
  scope to that checker.
- Focused governance unit and integration tests cover malformed records,
  collision handling, plan ownership, archive transition, and finalizer
  invocation.
- Existing active changes without a reservation remain honestly invalid until
  their owner adds one after this prerequisite is applied.
