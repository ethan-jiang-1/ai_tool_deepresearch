## Context

See [proposal.md](proposal.md) for the motivation. The current checker derives
requirement presence from the live registry, main specs, and every active delta.
It correctly rejects a live prefix whose canonical main spec does not exist.
The OpenSpec phase gate correctly prevents proposal/explore from creating that
main spec. What is absent is a source of record for the intervening identity
claim, so an active delta for a new capability cannot receive a green
project-requirement result without pretending that a pending capability is
live.

The implementation must preserve this ownership split:

| Fact | Source of record | Reader / deterministic consumer |
| --- | --- | --- |
| Pending path, prefix, and IDs for one active new capability | That change's `requirement-reservation.yaml` | `check-project-reqs.mjs` in either mode |
| Live prefix-to-path mapping and live requirement-ID registration | `openspec/governance/req-registry.yaml` | `check-project-reqs.mjs` |
| Canonical live declaration | `openspec/specs/<domain>/<capability>/spec.md` | `check-project-reqs.mjs` and existing main-spec checks |
| Selected archive eligibility | `finalize-change-archive.mjs` after the scoped checker result | governed finalizer only |

No record owns Harness runtime truth, semantic fact-family completeness, or a
user decision. The selected OpenSpec change remains the owner of its planning
artifact until native archive moves it to history.

## Goals / Non-Goals

**Goals:**

- Make a new capability's planned requirement identity explicit, strict, and
  exclusive before the main spec can legally exist.
- Keep the live registry strict and self-documenting instead of encoding a
  pending identity as a broken live mapping or a false retired entry.
- Give proposal and Apply entry guidance an active, checkable route so an
  Agent does not have to remember this practice from conversation context.
- Make archive validation selected-change scoped while retaining global
  uniqueness and allowing other active changes to remain internally coherent.
- Give an Agent one direct repair coordinate for a malformed reservation,
  collision, mismatched delta declaration, or incomplete live transition.

**Non-Goals:**

- Change `polish-openspec-change`, OpenSpec native phases, or the Harness
  runtime.
- Create a second global requirement registry, an automatic registry writer,
  or a permission to edit a main spec during proposal/explore.
- Treat a valid reservation as semantic approval, Apply permission, or archive
  permission.
- Backfill the active semantic-closure change during this prerequisite's
  proposal. That change is updated only after this change is applied.
- Generalize the record to allocate new IDs for an already-live capability;
  that capability already has a legal live-prefix/registry path and remains on
  the existing traceability lifecycle.

## Decisions

### 1. Use one strict change-local reservation record

Apply will add `openspec/governance/requirement-reservation-contract.mjs`. It
will use Zod schemas for the exact top-level and reservation-entry forms, then
use `.superRefine()` for same-record uniqueness and prefix-to-ID consistency.
`check-project-reqs.mjs` remains the only CLI and performs YAML file reading;
the contract module remains a pure parser/evaluator that can be unit tested
without a repository fixture.

The record supports a `reservations` sequence rather than a one-off top-level
path/prefix pair. A single change can therefore introduce more than one new
capability without inventing a second filename or an unbounded ad hoc map.
Each entry still has exactly one `capability_path`, one `prefix`, and its own
non-empty requirement-ID set.

The rejected alternative is putting pending values into `req-registry.yaml`.
That would either violate its live-path invariant or require a special
placeholder grammar, making a durable global source ambiguous. A second global
pending registry is also rejected: its lifecycle ownership would be less clear
than the active change that declares the delta.

### 2. Derive two complete lifecycle forms from direct facts

The record does not persist `status`. The contract module will evaluate every
valid reservation from the registry, canonical main spec, and delta-header
inventory using one explicit transition table:

| Derived form | Prefix/path fact | ID/main-spec fact | Plan mode | Archive mode for selected change |
| --- | --- | --- | --- | --- |
| `pending` | Prefix absent from live registry; canonical main spec absent | All reserved IDs unregistered; each declared exactly once in the matching delta header | Accept | Block with the missing live transition |
| `transitioned` | Prefix maps exactly to reserved path; canonical main spec exists | All IDs are non-retired, registered, and declared by that main spec | Accept | Accept |
| invalid / mixed | Any partial, mismatched, duplicate, malformed, or cross-change collision fact | Any unowned or inconsistent declaration | Block at the nearest direct fact | Block at the nearest direct fact |

The implementation represents this table as an explicit frozen map/object of
predicates and message builders, rather than an implicit chain of boolean
conditions in CLI prose. In archive mode, every reservation of `--change` must
evaluate as `transitioned`; every other active reservation may be either
complete form. This avoids a parallel change becoming an accidental archive
blocker while still rejecting a partial live sync.

The checker records a reservation claim before evaluating it so that one
malformed record produces its direct structural error instead of an additional
cascade of generic unregistered-ID symptoms. A malformed or colliding record
never authorizes an ID.

### 3. Keep global uniqueness and delta ownership in one evaluator

`check-project-reqs.mjs` will retain its existing main-spec duplicate,
unregistered, orphan, retired-reuse, and live-prefix checks. It will extend its
active-delta inventory with change name, path relative to that change's
`specs/` directory, occurrence type, and header declaration status. The shared
evaluator will then:

1. Discover only `openspec/changes/<safe-active-change>/requirement-reservation.yaml`.
2. Strict-parse every present record and require its `change` value to equal
   its directory name.
3. Detect duplicate reserved IDs, prefixes, and capability paths across active
   new-capability reservations before treating any reservation as valid.
4. Require every reserved ID to have exactly one declaration in its canonical
   delta path, and every unregistered delta occurrence to belong to its own
   active change's pending reservation.
5. Evaluate each reservation through the explicit lifecycle table and combine
   accepted pending IDs with the pre-existing registry-backed identity set.

This is one truth path: the finalizer invokes the same checker rather than
re-implementing reservation logic. Its errors remain read-only, root-first
CLI feedback with an owning file/coordinate and the exact rerun command.

### 4. Add explicit CLI scope without breaking current plan callers

The checker command becomes:

```text
node openspec/governance/check-project-reqs.mjs [project-root] [--mode plan|archive] [--change <active-change>]
```

No-mode invocation remains `plan`, preserving existing direct callers and
current task-list wording. `plan` accepts no selected-change shortcut.
`archive` requires one safe active `--change` and rejects unsafe or missing
scope. The finalizer will invoke:

```text
node openspec/governance/check-project-reqs.mjs <planning-root> --mode archive --change <selected-change>
```

It retains the existing `requirement_governance` finalizer check/root rather
than adding an archive route or a competing lifecycle verdict. Unit tests will
assert the exact arguments and the existing first-failure ordering.

### 5. Put the practice at the proposal and Apply entry points

Apply will replace the contradictory proposal rule in `openspec/config.yaml`.
For a new capability, generated proposal instructions will require the Agent to
inspect the live registry and active reservations for conflicts, create the
same-change reservation beside its delta, and run plan-mode checking. They will
explicitly prohibit registering a new live prefix or new-capability IDs until
Apply has created the canonical main spec and performed the live sync.

Apply guidance will direct the selected change through the same plan-mode
checker before its first target edit. The current project-supported
`/opsx:apply` source-command entry consumes the named
`requirement-reservation/apply` guidance and stops at that checker on failure;
it is the active route for this reservation boundary. The user-directed
cross-change repair also replaces deleted `.codex` inventory entries with the
eight current `.agents` and `.claude` entry surfaces and adds the existing
feedback-lifecycle delivery contract where it is missing. This is a direct
conformance repair: it neither adds semantic-closure plan/asset checks nor
turns guidance into a lifecycle verdict. Archive guidance continues to use the
governed finalizer, which supplies the archive scope. The configuration remains
the policy hook; the record remains an implementation artifact rather than a
suggestion in `CONTEXT.md` or a modification to the Polish skill.

### 6. Preserve responsibility boundaries

The user has already chosen the new governance policy. During a live Agent
turn, the Agent may create a valid reservation, repair a rejected record, and
rerun the same checker when the accepted lifecycle permits it. The Engine only
parses direct sources and returns its deterministic result. Neither an Agent's
plan nor user agreement can fabricate a registry entry, main-spec declaration,
or archive result. This gives the helper posture one legal next action without
introducing a generic repair controller or an extra lifecycle state.

## Risks / Trade-offs

- **[Bootstrap: existing `SEF-*` IDs are still unregistered before Apply]** ->
  Preserve the current checker failure as honest evidence. After this
  prerequisite is applied, update the semantic-closure change with its valid
  reservation and rerun plan mode; do not suppress, delete, or falsely
  register its headers now.
- **[Parallel changes reserve colliding identity]** -> Parse every active
  record in one evaluator and test collisions by ID, prefix, and capability
  path before an unregistered ID is accepted.
- **[A partial sync hides behind an active delta]** -> Treat mixed pending/live
  facts as invalid and require selected archive reservations to be fully
  transitioned, including canonical main-spec header declarations.
- **[More validation becomes harder than the fact it protects]** -> Keep one
  small record, one parser/evaluator, two derived forms, and existing checker
  output. No watcher, mutation command, fallback registry, or retry loop is
  introduced.
- **[Guidance is ignored]** -> Place the rule in generated OpenSpec proposal
  and Apply instruction paths and cover that exposure in integration tests;
  guidance still does not itself manufacture a pass verdict.

## Migration Plan

1. Add the parser/evaluator, checker modes, config guidance, finalizer call,
   and focused tests under this change's Apply phase.
2. Run the plan-mode checker on a fixture containing a pending new capability,
   then archive-mode checker coverage for selected and other active changes.
3. Once this change is accepted and applied, use the normal OpenSpec update
   route on `establish-semantic-fact-closure-governance` to add its `SEF`
   reservation record; rerun its plan check before further target edits.
4. During that change's Apply/sync, add its live registry prefix/IDs and
   canonical main spec; its finalizer will then require the transitioned form
   before archive.

Rollback is ordinary source rollback before a dependent change relies on a
reservation. The record has no runtime mutation and the live registry remains
unchanged until the established Apply/sync route, so it cannot leave a false
live capability behind.
