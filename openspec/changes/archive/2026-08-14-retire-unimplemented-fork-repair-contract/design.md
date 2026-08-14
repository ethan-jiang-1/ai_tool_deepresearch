## Context

See [proposal.md](proposal.md). The accepted
`workflow/fork-repair-converge` capability is the only current owner claiming
shared fork-repair convergence, yet no current implementation or caller exists.
`FOR-001` is still a live registry entry and the capability catalog still
navigates readers to the false contract. The adjacent accepted
`workflow/repair-loop`, `engine/gate-fork-router`, and
`workflow/conditional-nodes` capabilities describe the currently accepted
deterministic behavior and must remain intact.

## Goals / Non-Goals

**Goals:**

- Retire the complete false capability, its live requirement identity, and its
  catalog navigation through the project’s governed requirement-retirement path.
- Leave the accepted repair-loop and Gate contracts in place without adding a
  replacement controller, state, or retry path.
- Establish by a scoped scan that no named `convergeRepair()` or
  `sharedRepairStep` implementation/caller is removed, and that the adjacent
  accepted repair contracts are not modified.

**Non-Goals:**

- Implementing multi-fail convergence, `convergeRepair()`, or `sharedRepairStep`.
- Changing Gate branch classification, repair-loop semantics, Markdown Agent
  workflow, run-bundle data, recovery, rerun, or external dependencies.
- Creating a compatibility adapter, migration, tombstone capability, or a
  second repair authority.

## Decisions

### Retire the capability instead of retaining a current tombstone

Apply removes the `workflow/fork-repair-converge` main spec and its catalog row,
then uses the registry form already recognized for whole-capability retirement:

```yaml
FOR: fork-repair-converge        # all entries deprecated; no spec directory
FOR-001: fork-repair-converge — Multi-fail shared repair checkpoint convergence [DEPRECATED]
```

`FOR-001` stays allocated and may not be reused. The `no spec directory` comment
makes the retired `FOR` prefix exempt from live main-spec resolution; the
`[DEPRECATED]` suffix makes the retained identity retired rather than orphaned.
The archive retains the full historical contract; the live spec tree must not
continue to make it discoverable as current behavior.

The bounded reader question is: “Does the current system provide a shared
fork-repair convergence API?” The answer after this change is precisely “no”.
That is a normal reasoning stop: readers needing deterministic repair use the
accepted repair-loop and Gate-router contracts, without reconstructing a
fictional API from historical spec text.

Alternative rejected: leave a live tombstone. It keeps the false capability in
current discovery and blurs historical traceability with a supported behavior.
Alternative rejected: implement the promise. The user selected retirement, and
implementation would introduce a new control shape beyond this cleanup scope.

### Preserve adjacent current owners exactly

Only catalog relations that name the retired capability are removed: the
capability's own row and the `Related entries` links in the
`engine/gate-fork-router`, `workflow/conditional-nodes`, and
`workflow/repair-loop` rows. The requirements of `workflow/repair-loop`,
`engine/gate-fork-router`, and `workflow/conditional-nodes` are verify-only;
no runtime source is a target-edit surface for this change.
They remain the direct current facts for repair loopback, branch classification,
and transform behavior.

This is the shortest legal control shape: remove the extra non-existent
authority rather than add a redirect, compatibility reader, or replacement
check. Net complexity decreases by one capability, one live requirement, and
the associated misleading catalog links.

### Keep responsibility boundaries unchanged

The user selected the policy decision to abandon the unimplemented promise. The
Agent performs the authorized registry/spec/catalog cleanup and verification.
The Engine gains no verdict, state, controller, or repair permission; it
continues to evaluate only the existing current deterministic contracts.

## Risks / Trade-offs

- [An unknown direct internal import may fail] -> a scoped scan finds no
  `convergeRepair()` / `sharedRepairStep` implementation or caller in Harness,
  tests, or experiments. An unscanned external consumer is intentionally not a
  compatibility target for an API that the repository does not provide.
- [A catalog cleanup could obscure real repair behavior] -> retain every
  adjacent capability row and verify their accepted specs remain unchanged.
- [Requirement history could be deleted instead of retired] -> use the governed
  registry retirement route and archive the delta/spec artifacts.
- [A broad cleanup could alter current Gate behavior] -> select only
  specification, catalog, and registry surfaces; reject any task that adds a
  runtime edit without returning to proposal/design review.

## Migration Plan

There is no runtime migration because the claimed API was never present.

1. Remove the live false capability, catalog row, and live registry identity
   through the approved tasks.
2. Re-run requirement and project-spec governance together with package
   validation and a scoped absence/protection scan. The scan distinguishes the
   deliberately retained retired registry history from prohibited live main-spec
   and catalog navigation.
3. Before archive, compare the retirement delta with the applied main-spec and
   registry state.

Rollback before archive is an ordinary source-control revert. No run bundle,
data, receipt, or runtime state requires restoration.
