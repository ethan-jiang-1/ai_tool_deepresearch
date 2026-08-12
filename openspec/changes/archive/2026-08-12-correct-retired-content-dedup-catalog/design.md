## Context

See [proposal.md](proposal.md) for motivation. The Capability Catalog is a
navigation projection: the relevant behavior conclusion is owned by
`openspec/specs/engine/gate-content-dedup/spec.md`, with retired requirement
identity retained in `openspec/governance/req-registry.yaml`. The current
catalog row conflicts with both owners by presenting the retired surface as an
active deterministic Gate capability.

`check-capability-taxonomy.mjs` requires exactly one valid seven-column catalog
row for every main spec. Therefore the repair must retain the row while changing
only its descriptive fields; deleting the row while the tombstone main spec
exists would make the catalog structurally invalid.

## Goals / Non-Goals

**Goals:**

- Let a reader looking for a current Gate stop at the catalog row with the
  correct conclusion: this capability is retired history, not an implementation
  path.
- Preserve one catalog row, its existing related-capability links, and the
  traceability records that explain the historical `GAC-*` identity.
- Verify the row still obeys catalog topology and does not make retired
  heuristic language current runtime guidance.

**Non-Goals:**

- Do not delete the tombstone main spec, deprecated registry entries, or a
  related active capability.
- Do not add a version router, migration, fallback, negative input behavior, or
  new rejection code.
- Do not change Harness code, Gate definitions, schemas, test logic, workflow
  guidance, release version, or bundle behavior.

## Decisions

1. **Correct the existing row instead of deleting it.**

   Replace the row's active-capability wording with concise retired-tombstone
   wording across its purpose, keywords, boundary, and ownership cells. Keep
   `engine/gate-content-dedup` as its path and preserve the two existing related
   capabilities. The taxonomy checker requires one row per main spec, while the
   main spec expressly remains a tombstone; a deletion would leave the catalog
   misleading in a structural rather than semantic way.

2. **Use the main spec's conclusion, without reproducing its retired heuristic
   inventory.**

   The row will state that it is a retired traceability tombstone and not a
   current Gate or production capability. It will direct readers to current
   authority through the preserved relations, but it will not enumerate old URL,
   homepage, Jaccard, or self-reference mechanics. This prevents the navigation
   projection from becoming another historical reference manual.

3. **Reuse existing proof rather than create a test solely for prose.**

   Run `check-capability-taxonomy.mjs` to protect the row inventory and
   structure. Run the existing retired-content-heuristic hygiene integration
   test to prove no active implementation or runtime guidance has been
   reintroduced. A one-row diff review verifies the remaining semantic claim.

### Constitutional Review

- **Semantic precision:** no new reader-facing concept is introduced. The row
  corrects the existing reader question, “is this a current capability?”, so
  the reader can stop at the explicit retired status rather than reconstruct
  history from conflicting documents.
- **Simple reliable control:** the direct main-spec conclusion is projected once
  in the catalog. The repair removes a false authority signal without adding
  a validator, state, fallback, or second control loop.
- **Helper-oriented responsibility:** the user already made the only semantic
  decision, to preserve tombstones but remove their active presentation. The
  Agent performs the bounded wording edit and checks; the Engine's existing
  catalog and hygiene verdicts remain the sole deterministic checks.

## Risks / Trade-offs

- [Risk] Deleting the row could break catalog topology while the tombstone main
  spec remains. -> Retain the exact path and seven cells; run the taxonomy
  checker before and after the edit.
- [Risk] Wording could imply that deprecated records are deleted or current
  behavior changed. -> Say “retired traceability tombstone” and explicitly say
  “not a current Gate or production capability”; leave the main spec and
  registry untouched.
- [Risk] Over-describing old heuristics in the catalog could renew them as
  apparent options. -> Keep the row concise and point to current related
  capabilities rather than list obsolete mechanisms.

## Migration Plan

Before the target edit, pass the change-local governance checks. Edit one table
row, then review the diff to confirm no other row, relation, or catalog table
shape changed. Run focused catalog/hygiene checks and the project governance
checks before archive. Rollback is a one-line documentation revert; there is no
runtime data, schema, version, or bundle migration.
