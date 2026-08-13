## Context

See [proposal.md](proposal.md) for the selected policy. The current writer
already creates `BUNDLE_ENTRY.md` and `BUNDLE_MAP.md`, but current readers
still reconstruct four historical root shapes across inspection, reentry,
instantiation, file observation, and Agent routing. The result is not a
versioned protocol: it is a collection of per-surface fallbacks that disagree
on whether an old directory is inspectable, continueable, or merely deprecated.

This change has a deterministic admission fact and several projections of it.
The direct Source of Record is only the explicitly selected bundle root's two
same-root file-existence facts. It is deliberately separate from research
state, historical Markdown readability, status/trace authority, and any
migration decision.

## Goals / Non-Goals

**Goals:**

- Establish one pure current-entry predicate whose bounded question is: "may
  this explicitly selected directory enter a current Harness operation?"
- Make `inspect-bundle.mjs` the public rejection owner, and ensure reentry,
  instantiation, file observation, and continuation guidance consume the same
  conclusion rather than reconstruct legacy precedence.
- Retire the remaining accepted/current guidance, fixture, test, and catalog
  surfaces that present a legacy-only root as an operational success path.
- Preserve explicit distinctions: a complete pair, a missing pair member, and
  a complete pair with harmless historical debris.

**Non-Goals:**

- No migration, auto-upgrade, writer rewrite, version router, compatibility
  adapter, legacy marker, or human-only Harness inspection command.
- No interpretation, mutation, or deletion of historical bundle Markdown.
- No change to lifecycle transitions, Gate authority for research artifacts,
  submitted-ledger authority, queue semantics, or reentry target vocabulary.
- No broad historical-token cleanup outside the listed operational surfaces.

## Decisions

### One direct predicate, not a new state or protocol

Add a pure ESM helper at
`DEEP_RESEARCH_HARNESS/engine/helpers/current-entry-contract.mjs`. It accepts a
bundle root and returns the deterministic conclusion from only:

```text
BUNDLE_ENTRY.md exists AND BUNDLE_MAP.md exists
```

Its stable failed conclusion is `unsupported_current_entry_contract`, with
which current member(s) are absent. It does not parse either Markdown file,
choose a phase, inspect run state, advise migration, or distinguish legacy
names as viable substitutes. The predicate keeps the reader's necessary
distinctions while offering a normal reasoning stop: callers do not rebuild a
legacy precedence matrix.

Alternative considered: a manifest/version discriminator or a legacy
conversion command. Rejected because no current writer emits a version family
that needs routing, and each would introduce a durable protocol and control
path solely to retain retired inputs.

### Inspector owns public rejection; other surfaces reuse it

`inspect-bundle.mjs` preflights before all four public modes, emits the scoped
identifier, exits `1`, and returns before reading historical log/timeline/
summary/structural content. Its current pair success remains followed by its
existing structural checks.

`check-reentry.mjs` runs the same predicate after it has enough valid
invocation context to retain its JSON envelope and before runtime diagnosis.
It returns one normal blocker and code `1`; a known, supplied old shape is not
an invalid caller request (`2`) or an unavailable Engine capability
(`missing_contract`). File observability consumes the predicate as a blocking
root conclusion. The instantiation Gate uses it alongside a declared current
pair rule, with the definition retaining explicit missing-file repair facts.

Alternative considered: let each consumer format its own fallback/rejection.
Rejected because that creates divergent outcomes and makes every caller retain
the historical matrix. Alternative considered: make `check-reentry` the owner.
Rejected because it requires a target and would leave the public inspector
modes as bypasses.

### Existing-bundle routing stops before command selection

Root and Harness routing documents continue to select the continuation
playbook only for an explicitly supplied reachable existing candidate. The
playbook verifies the pair before reading `BUNDLE_ENTRY.md`, `BUNDLE_MAP.md`,
or `COMMANDS.md`. A failed candidate stops there; it cannot fall through to
`RUN.md`, fresh creation, another selected bundle, or a special human mode.

This preserves the routing distinction between no supplied candidate (normal
new-research entry) and a supplied, non-current candidate (explicit stop).
It does not turn an Agent/human conversation into a mutation or reentry
permission.

### Whole-capability retirement stays manual and auditable

All `BUS-*` identities are already retired. Apply will synchronize ordinary
delta specs to accepted main specs, then manually delete
`openspec/specs/bundle/bundle-start-from-here/` and its capability-catalog row.
It will retain the historical IDs as `[DEPRECATED]` and mark the `BUS` prefix
as `no spec directory`. The active REMOVED delta intentionally declares no
retired IDs, so requirement governance does not misread it as reuse.

This follows the established whole-capability retirement path rather than
letting a generic removed-requirement application leave an invalid empty spec
directory. The archive transition must use the supported governed finalizer
with its applicable spec-sync option after the manually synchronized state is
verified.

### Verification follows the ownership boundaries

The pure predicate receives a focused unit test. Integration tests own the
public inspector modes, reentry envelope, instantiation Gate, file
observability, canonical-source-linked fixture path, and Markdown routing contract. The existing
temporary fresh-bundle E2E becomes the deterministic workflow-scale proof that
the current writer still creates a pair admitted by the public inspector. No
real-Agent run is needed: this change makes no semantic Agent judgment or
external research claim.

## Risks / Trade-offs

- [Historical directories lose Harness inspection/reentry output] -> This is
  the selected breaking policy. The public failure names the current-entry
  boundary and leaves direct human file reading untouched.
- [One mode bypasses the preflight and leaks old output] -> Assert default,
  `--summary`, `--timeline`, and `--log` rejection behavior in integration
  tests.
- [Reentry falsely treats an old directory as caller error] -> Assert its
  existing JSON envelope, exactly one current-entry blocker, and exit `1`.
- [Gate helper and definition drift] -> Keep an explicit pair rule in the
  definition and reuse the predicate in the checker; test missing each member.
- [Retiring BUS leaves governance/capability discovery inconsistent] -> Use the
  established manual whole-capability procedure, registry prefix disposition,
  catalog removal, strict spec/requirement checks, and finalizer.
- [Current docs still teach a legacy success path] -> Run a scoped hygiene
  scan whose remaining legacy mentions must be rejection/debris statements or
  test-negative assertions, not positive routing.

## Migration Plan

1. Before target edits, complete plan review and the selected change's
   plan-mode OpenSpec/governance checks.
2. Add the semantic-fact family catalog entry, then the shared predicate and
   public inspector preflight; update all deterministic consumers and focused
   tests in the same Apply slice.
3. Rewrite current routing/guidance and its static contracts to require the
   pair; remove legacy-positive assertions and prove the fixture source link
   resolves to the canonical inspector.
4. Sync all delta specs into accepted main specs. Manually retire the all-BUS
   capability directory/catalog row and preserve its registry history.
5. Run focused tests, deterministic E2E, package validation, strict/spec/
   requirement/capability/verification/semantic governance checks, then review
   the actual diff before the governed archive transition.

The runtime change is source-controlled. Reverting means restoring the prior
code/spec/test/guidance revision together; it does not mean modifying or
migrating historical bundles. A partial rollback that restores any one legacy
success path would violate the single-predicate contract and is not valid.
