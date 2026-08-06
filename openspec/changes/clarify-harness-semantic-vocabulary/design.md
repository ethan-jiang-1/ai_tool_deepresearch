## Context

See [proposal.md](proposal.md) for motivation. The earlier source-coordinate
rename and alias-retirement changes established `DEEP_RESEARCH_HARNESS/` as
the one reusable source tree. `CONTEXT.md` now provides the canonical domain
terms, but high-signal Agent-facing prose and the accepted contracts that
describe it still contain generic system nouns or human-readable `DPT` labels.

Those occurrences are not one homogeneous rename set. A natural-language
phrase can name the reusable Harness, a research lifecycle, a selected run
bundle, or an actual protocol literal. The change-local
[semantic vocabulary ledger](semantic-vocabulary-ledger.md) records that
distinction before any target edit. The accepted spec for each capability
remains authoritative for behavior; the ledger is only the reviewable basis
for this bounded terminology change.

## Goals / Non-Goals

**Goals:**

- Let a Coding Agent answer the bounded question "what is this instruction
  about?" directly: the reusable Deep Research Harness, its source directory,
  a research run, or the selected current run bundle root.
- Converge the first direct reader path: Harness entry files, the selected
  command playbooks, workflow README, and their matching accepted requirement
  text.
- Retain the distinctions that affect authority: Harness assets are reusable
  and read-only during execution; a current run bundle owns mutable runtime
  truth; a research run is a lifecycle, not either of those filesystem
  objects.

**Non-Goals:**

- Renaming serialized fields, JavaScript identifiers, file names, capability
  directories, requirement prefixes, bundle/role grammar, generated markers,
  or external copies of the repository.
- Changing research routing, Gate semantics, lifecycle state, user-interaction
  boundaries, run-bundle contents, CLI behavior, or the Harness release.
- Creating a generic terminology scanner, a permanent forbidden-token test, a
  second glossary, a compatibility resolver, or a new runtime control layer.
- Treating every occurrence under `openspec/specs/` or
  `DEEP_RESEARCH_HARNESS/` as part of this first pass merely because it has a
  matching spelling.

## Decisions

### Use a semantic ledger before target edits

The first task in apply validates each `rewrite` row against its current
source. Its required answer is the object being named, not whether a regex
matched. The row supplies the source, semantic referent, canonical rendering,
and disposition. A row with changed or unclear context remains untouched and
becomes an ordinary pending task.

This gives the direct reader a normal reasoning stop point: it can identify
the object from the rendered term without reconstructing the rename history.
It preserves the distinctions that change behavior while adding no new
domain-level state or authority.

Alternatives considered:

- Global find-and-replace: rejected because it would conflate prose with
  protocol names and can turn `framework_root` into an unplanned migration.
- A new permanent vocabulary registry: rejected because `CONTEXT.md` already
  owns the canonical domain terms, and a second registry would introduce
  drift.

### Keep the first pass reader-path bounded

The apply order is entry guidance first, then command/playbook guidance, then
the accepted requirements that describe those surfaces. Only ledger rows
HMD-001 through HMD-014 and SPC-001 through SPC-009 are candidates for this
change. Any other current occurrence is recorded as deferred or proposed in a
later change rather than folded into this implementation opportunistically.

The pair `AGENTS.md` / `CLAUDE.md` remains synchronized. The ordinary
`framework` word is rendered as `Deep Research Harness` on first or
potentially ambiguous reference and `Harness` only where the surrounding
context makes the referent unambiguous. A lifecycle description instead uses
`research run`; a durable state ownership description uses `run bundle` or
`current run bundle root`.

Alternatives considered:

- One repository-wide cleanup: rejected because it prevents local semantic
  review and joins unrelated stable-protocol migrations to a prose change.
- Leaving accepted specs untouched: rejected because the docs they govern and
  their requirement text would teach competing models to different readers.

### Preserve protocol names as protocol names

The literals in PRC-001 through PRC-005 remain unchanged. When prose needs to
explain `framework_root`, it may say that the field identifies the Harness
root, but the field itself stays unchanged. This is not an acceptance of the
old human concept; it is a compatibility boundary with current writers,
readers, existing bundles, and test fixtures.

`framework-engine` and requirement-registry coordinates also remain deferred.
They need a dedicated breaking design that owns delta specification migration,
registry changes, archival compatibility, code consumers, and old-bundle
behavior.

Alternatives considered:

- Rename protocol literals together with prose: rejected because it enlarges
  the change from reader clarity into a cross-boundary data migration.
- Conceal preserved literals from the ledger: rejected because that would
  make the residual vocabulary look accidental rather than deliberately
  bounded.

### Verify positive reader contracts, not arbitrary absence

The integration regression will read the finite high-signal source set and
assert the positive statements that identify the Harness and selected run
bundle correctly. It will also protect the `AGENTS.md` / `CLAUDE.md`
synchronization needed for their shared entry boundary. A scoped source scan
is closeout evidence to locate unexpected candidates; it is not a semantic
checker or a claim that all historical/protocol tokens are errors.

The shortest legal loop is: source -> ledger judgment -> smallest prose/spec
edit -> positive static contract -> human semantic closeout. This replaces
reader-side synonym reconstruction and avoids a scanner gate, token policy
state, fallback resolver, or control loop.

### Preserve responsibility boundaries

The user decides the canonical domain terms and the exclusion of protocol
migration. During apply, the Agent performs the authorized, reversible review
and edits. The Engine owns only the deterministic result of the focused static
contract; it does not decide term meaning, grant an edit, route a research
run, or make runtime truth. No user-directed wording choice creates a new
permission, lifecycle transition, or runtime capability.

## Risks / Trade-offs

- [A phrase appears generic but actually names a protocol] -> The row remains
  unchanged unless its writer/reader contract is independently inspected;
  unclear rows become follow-up work.
- [One English shorthand may be ambiguous outside its local sentence] -> Use
  the full `Deep Research Harness` form at the next unambiguous reader anchor
  and retain `Harness` only within that bounded context.
- [The paired behavior files drift] -> Update them together and assert their
  shared semantic statement in the focused integration contract.
- [Residual protocol labels can still look like terminology drift] -> Publish
  them in the ledger as deliberately preserved and require a separate
  breaking proposal before change.
- [A broad scan produces more candidates than this change owns] -> Treat it as
  backlog evidence, not authority to expand the task list.

## Migration Plan

1. Validate the verification plan and review every ledger row against the
   current source. Record a changed/unclear row as an ordinary pending task;
   do not edit it by analogy.
2. Apply accepted rewrite rows in reader order: synchronized entry files,
   Harness README/RUN/workflow README, selected command playbooks, then the
   matching main specs through their approved delta requirements.
3. Add or update the focused positive integration contract. Run it together
   with the scoped vocabulary evidence scan and governance checks; record only
   deterministic source-contract evidence, not real-Agent behavior.
4. Sync delta specs, compare them to the accepted main requirements, complete
   semantic closeout, and archive through the governed finalizer.

Rollback is a normal Git revert of this documentation/spec-only change. No
runtime state, bundle content, compatibility path, or release artifact is
migrated, so rollback needs no runtime repair.
