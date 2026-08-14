## Context

See [proposal.md](proposal.md). The live
`engine/gate-content-dedup` spec currently states that the capability is
retired, and all `GAC-001..009` IDs are already deprecated. This was a valid
intermediate tombstone while accepted-spec validation required each catalog row
to resolve to a main spec. The repository now has an accepted whole-capability
retirement route: a main spec and catalog row disappear while the registry
preserves a historical no-spec-directory prefix and immutable deprecated IDs.

`bundle/bundle-start-from-here` and `workflow/fork-repair-converge` are the
direct precedents. Neither precedent preserves a current compatibility route.

## Goals / Non-Goals

**Goals:**

- Remove the one proven pure-retired live spec/catalog entry.
- Preserve exact GAC identity and audit history in the registry/archive.
- Verify active current quality contracts and runtime surfaces are protected.

**Non-Goals:**

- Changing any deterministic quality check, Gate, reference/source rule,
  work-unit, ledger, cache, provenance, routing, documentation, or test
  behavior.
- Repairing C8's stale Markdown assertions or current-profile fixtures.
- Adding a replacement capability, redirect, compatibility adapter, migration,
  fallback, version discriminator, state, schema, or new Engine check.

## Decisions

### Retire the complete live capability; retain only registry/archive history

Apply deletes the live spec directory and catalog row, then changes the GAC
mapping to the recognized retired form:

```yaml
GAC: gate-content-dedup # all entries deprecated; no spec directory

# gate-content-dedup — all entries deprecated; no spec directory
GAC-001: gate-content-dedup — ... [DEPRECATED]
```

The prefix no longer resolves to `engine/gate-content-dedup`; this is what
makes the reader's answer unambiguous. The GAC IDs remain allocated in their
historical group and may never be reused. The active delta carries the
retirement rationale; the archive then retains the full former spec. The
`GAC` mapping remains in the alphabetic `prefixes:` block, while the complete
`# gate-content-dedup — all entries deprecated; no spec directory` group moves
out of the live Engine section to the retired tail, alphabetically before
`# lifecycle-walker`. This is the exact historical placement required by the
accepted requirement-traceability contract.

Alternative rejected: retain the live tombstone. It creates a second
current-looking owner even though there is no runtime behavior. Alternative
rejected: delete registry history. That would violate immutable requirement
identity and erase traceability. Alternative rejected: replace it with an
alias/link to quality neighbors. A redirect would create a new, non-authoritative
router and make the retired name appear operational.

### Protect active owners without modifying them

No active quality owner is a target edit. The verification scope instead proves
that `engine/gate-state-machine`, `research/evidence-extraction`, work-unit,
ledger, cache, provenance, source/reference, and phase-handoff contracts remain
in their current locations. `agent/agent-testing` remains verify-only too: its
current negative metric rule says retired heuristics cannot become pass/fail
evidence, but it is not a replacement capability. The existing
heuristic-hygiene test proves the corresponding implementation/runtime-guidance
absence. The retirement does not transfer a requirement or behavior to a new
owner.

This is the direct Source of Record / shortest legal loop: registry and archive
answer historical identity, live specs answer only current behavior. Net
complexity falls by one capability directory and one catalog row, without a new
control branch.

### Responsibility boundaries remain unchanged

The user supplied the current-only policy. The Agent applies the governed
spec/catalog/registry change and records verification. The Engine receives no
new input, verdict, state, permission, or recovery responsibility. No new
reader-facing concept is introduced: the existing distinction between accepted
current behavior and retained registry/archive history is sufficient. The
normal reasoning stop is therefore already defined by the current topology.

## Risks / Trade-offs

- [Registry migration accidentally removes/reuses GAC identity] → retain all
  nine ID/value entries byte-for-byte, add only the required no-spec-directory
  prefix comment, and move their group to the exact retired-tail position; run
  plan and archive requirement governance.
- [Catalog removal obscures active quality authority] → verify named current
  owners and confirm no other catalog row points at the retired capability.
- [A dormant runtime reference is silently removed] → current-surface scans and
  the existing heuristic-hygiene integration test prove no positive
  content-dedup surface exists; target-edit scope excludes runtime files.
- [C8 failures are hidden in a convenient final cleanup] → do not touch C8
  docs/tests/fixtures; leave their separately identified failures as the next
  decision item.

## Migration Plan

No runtime or data migration exists.

1. Apply the three metadata edits atomically: delete the live spec, remove its
   catalog row, and mark/move the GAC registry history to no-spec-directory.
2. Run focused absence/protection scans plus existing integration hygiene,
   strict OpenSpec, taxonomy, requirement, discovery, verification-routing,
   semantic-closure, and project-spec checks.
3. Before archive, compare the removal delta with the absent live capability
   and retained registry history. Rollback before archive is a normal source
   control revert; no bundle, receipt, or runtime state needs restoration.
