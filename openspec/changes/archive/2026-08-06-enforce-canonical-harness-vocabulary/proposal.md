## Why

The canonical Deep Research Harness source coordinate is already the sole
current implementation path, but seventeen current reader-facing occurrences
still use members of the retired naming family. Those synonyms make an Agent
or maintainer reconstruct whether a second framework concept or entry route
still exists instead of answering the bounded question directly: which
reusable surface owns the selected research entry and execution path, and
which current run bundle owns runtime truth?

The canonical terminology source is `CONTEXT.md`. The audited inventory is two
occurrences in `SETUP.md`, seven in the two accepted specifications, two JSDoc
occurrences in `DEEP_RESEARCH_HARNESS/engine/queue-manager-lifecycle.mjs`, and
six in selected experiment playbooks. This change implements the user's
current-system retirement decision. It deliberately does not rewrite OpenSpec
archives, Git history, protected runtime data, or external clones.

Semantic-precision review: a human reader or Agent needs one stable answer to
whether a selected entry or execution path belongs to the reusable Deep
Research Harness, whether work is a research run, and whether runtime truth
belongs to a current run bundle. The change preserves those distinctions and
gives the reader a normal stop point in the current source text; it introduces
no new runtime concept, state, or authority.

## What Changes

- Replace every current use of the retired framework/flow/entry/run naming
  family in the ten audited current sources with canonical Deep Research
  Harness, research-run, or run-bundle wording according to the concept being
  named.
- Modify the affected `run-entry` and `silent-wave-execution` requirements so
  their normative text uses the same canonical vocabulary, including
  current-run-bundle ownership of runtime truth, without changing
  shortcut-routing, silent-execution, or authority behavior.
- Add a focused deterministic integration regression that reads the ten
  audited current sources and proves their intended canonical statements remain
  in place without introducing a second term as a permanent test fixture.
- Record and run a bounded post-apply vocabulary scan over current tracked
  surfaces. Archived OpenSpec records, Git history, and protected runtime or
  historical data remain explicitly outside this change's claim.

This change does not alter `DEEP_RESEARCH_HARNESS/` behavior, runtime bundle
grammar, Engine authority, research routing semantics, or release version; no
Harness version bump is required.

The accepted structural `dpt_*` runtime grammar, role keys, and file protocol
identifiers are not human-readable aliases for the retired framework label and
remain outside this change. Renaming them is a separate compatibility and
runtime-contract migration.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `run-entry`: selected-entry and selected-flow wording SHALL name the Deep
  Research Harness consistently.
- `silent-wave-execution`: the silent-phase authority scenario SHALL name the
  Deep Research Harness consistently.

## Impact

- Affected current sources: `SETUP.md`, the two accepted specs above,
  `DEEP_RESEARCH_HARNESS/engine/queue-manager-lifecycle.mjs`, six selected
  experiment playbooks, and one focused test under `tests/integration/`.
- No new dependencies, CLI flags, schemas, runtime files, state transitions,
  receipts, or trace events.
- The Agent performs the authorized mechanical text/test update. The user has
  already made the terminology decision. The Engine only supplies the
  deterministic regression verdict; it gains no vocabulary or runtime
  authority.
- Net simplification: removes seventeen live synonym uses and avoids an alias
  resolver, compatibility path, vocabulary state, or secondary checker.
