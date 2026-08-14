## Context

See [proposal.md](proposal.md). The current repository retains an eight-state
abstract FSM at `schema/contracts/gate.mjs`, its five schema-barrel exports, and
two tests that only describe that FSM. A scoped source scan finds no current
Harness runtime, test, or documented consumer that needs it. The module itself
states that current routing belongs to `workflows/transitions.chain.json` and
`resolveNodeTransitionDetailed()`.

Three accepted capability surfaces still conflict with that fact: `SCO-003`
and `TRT-011` require the obsolete API to remain, the retained `TRT-012`
wording still names the module as a current comparison target, and the
workflow-directory contract calls it the current Gate transition-table contract.
The requirement registry still presents the two retired IDs as live.

## Goals / Non-Goals

**Goals:**

- Leave one direct, current transition source of record: the existing chain
  plus its existing detailed router.
- Remove the stale module, its exact barrel surface, stale-only tests, and all
  current documentation/model/spec/registry claims that describe it as live.
- Preserve requirement identity as retired history and prove that the existing
  current router still resolves the real chain after the removal.

**Non-Goals:**

- Changing transition semantics, Gate verdicts, Gate definitions, CLI behavior,
  run-bundle state, phase order, or Agent Flow.
- Providing a compatibility API, adapter, alias, migration reader, version
  fallback, or second transition owner.
- Introducing any state machine, schema, dependency, Engine check, or recovery
  path.

## Decisions

### Remove the stale API instead of maintaining a compatibility tombstone

Apply deletes the module, five re-exports, and tests that exclusively specify
the deleted API. The two retired requirements are moved to `[DEPRECATED]`
registry history and must not be reused.

The bounded reader question is: "Does the current Harness provide the abstract
Gate FSM or any of its five exports?" The answer becomes "no." A reader asking
how transitions route then has one normal reasoning stop: the current chain and
detailed router already named in the accepted transition-table contract.

Keeping the file with a banner, preserving aliases, or making a forwarding
adapter would retain an incorrect current API and invite it to compete with the
real owner. These alternatives are rejected. The known consequence is that an
unscanned direct internal import fails; the user has approved that breaking
internal removal, and no current caller was found.

### Preserve the existing current router as a protected surface

The source of record remains
`DEEP_RESEARCH_HARNESS/workflows/transitions.chain.json`, queried through
`DEEP_RESEARCH_HARNESS/engine/ask-next.mjs` via
`resolveNodeTransitionDetailed()`. These files, Gate-definition JSON, Gate
helpers/CLIs, bundle structures, and Agent-facing phase flow are verify-only.
The existing `tests/engine/ask-next.test.mjs` real-chain cases provide the
focused deterministic proof that this removal does not disturb current routing.

The alternative of translating the old state/event table into the chain is
rejected: it would create a new state translation layer and preserve the
obsolete vocabulary rather than remove it.

### Retire all current projections together

The implementation removes the source/barrel/test surfaces, corrects the
README and shared-schema/model projections, syncs the three approved deltas,
and marks `SCO-003` and `TRT-011` as deprecated. The retained `TRT-012`
requirement continues to specify its manifest-to-chain validation behavior but
no longer names the deleted module. The changes are one coherent truth
correction: code removal without the projection cleanup would leave a false
current promise, while text-only cleanup would leave an accidental internal API.

Historical archives remain historical evidence and are not rewritten. Current
documentation must instead point to the one real source of record.

### Constitutional review

This is a semantic-precision reduction, not a new abstraction: it removes the
misleading answer surface and leaves the precise current transition question
with its existing owner. It is simple reliable control because no new check,
state, fallback, retry, or controller is introduced; one false transition owner
and its compatibility branch disappear. The user made the retirement-policy
decision, the Agent performs the authorized mechanical cleanup and evidence
collection, and the Engine's existing router/verdict authority is unchanged.

## Risks / Trade-offs

- [An unknown direct import could break] -> run an apply-time scoped absence
  scan across current source/tests/docs and package validation; retain no
  compatibility surface because the user-approved internal API is not a
  supported migration target.
- [Documentation or accepted specs could still point to the deleted module] ->
  enumerate and scan the named current projections, then sync/recompare all
  three delta specs and retire both registry IDs.
- [The cleanup could accidentally alter current route behavior] -> protect the
  chain/router and run its real-chain unit regression, workflow-package
  validation, and a diff-based protected-surface review.
- [Retired requirement IDs could become orphaned or reused] -> use the governed
  `[DEPRECATED]` registry form and run requirement governance before archive.

## Migration Plan

No bundle data or runtime migration is needed. This is an internal API removal.

1. Delete only the stale module, exact barrel exports, and stale-only tests;
   update the named current projections and registry entries in the approved
   task order.
2. Sync the three delta specs into accepted specs. Verify current-chain routing
   and the absence of the retired API/documentation before archive.
3. Before governed archive, recompare the applied main specs and registry with
   the deltas, complete the closeout review, and run the required validators.

Rollback before archive is a source-control revert of this bounded change. It
does not restore or mutate any run bundle, receipt, trace, or current runtime
state.
