## Context

See [proposal.md](proposal.md). The current shared adapter accepts scalar
`related_topic_uid` or legacy `related_topic`. New rich-reference guidance
still exposes the legacy writer form, while current Wave2 materialization can
need an exact selected Topic subset. The existing frontmatter reader currently
stringifies YAML arrays, so accepting an array only after that conversion would
lose structural cardinality and permit presentation-dependent parsing.

## Goals / Non-Goals

**Goals:**

- Give every new rich reference one lossless, self-contained UID binding for
  exactly one Topic, all Topics, or an exact selected subset.
- Reuse the existing canonical layout resolver as the sole deterministic
  membership/identity verifier for format, Gate, inspect, observability, and
  index consumers.
- Remove the legacy writer choice from current templates and Phase guidance
  while preserving all current historical-reader behavior until C5a-2.

**Non-Goals:**

- No historical reference conversion, mass rewrite, migration CLI, or version
  adapter.
- No change to `previous_layouts[]`, canonical Topic identity, submitted
  backing, evidence authority, Wave2 finding semantics, or queue/work-unit
  ownership.
- No required `W2F-*` metadata join, no new reference state, and no Engine
  selection of a semantic Topic subset.
- No C5a-2 decision about whether old `related_topic` remains a current
  Engine reader input.

## Decisions

### Three declared cardinalities

The binding adapter will recognize these forms:

| Scope | Metadata | Deterministic conclusion |
|---|---|---|
| One Topic | `related_topic_uid: <uid>` | exactly that registered UID |
| All Topics | `related_topic_uid: all` | existing all sentinel |
| Exact subset | `related_topic_uids: [<uid>, ...]` | exactly the listed registered UID set |

The two UID field forms are mutually exclusive. The array is non-empty,
duplicate-free, and contains only exact registered current UIDs. A malformed
array, unknown UID, duplicate, scalar/array combination, or disagreement with
an additionally supplied legacy field yields one adapter-owned binding result;
the Engine never silently deduplicates, turns a subset into `all`, or guesses
scope from a filename/index/finding.

Alternative rejected: use `all` for every cross reference. It changes the
observable scope of selected-subset evidence. Alternative rejected: store a
`W2F-*` join and derive scope at read time. It creates a Wave2-specific second
join/missing-finding failure path where the reference can instead state its
own direct canonical scope.

### Preserve structured metadata at the binding boundary

`readReferenceMetadata()` will preserve a YAML list value for
`related_topic_uids` as a structured array. Existing non-binding metadata
continues to use its present string projection. The shared adapter consumes
the scalar and list values directly; it does not parse a flattened display
string. The legacy bullet presentation cannot create the list form and remains
read-compatible only.

This is the smallest data-model change: one existing metadata reader supplies
the structured fact to the one existing resolver. It avoids a second parser,
raw-YAML scan, or a separate Wave2 metadata evaluator.

### Writer-only current cutover, historical reader retained

Wave0 guidance writes the existing all sentinel; Wave1 materialization writes
its submitted-backed scalar UID; Wave2 materialization writes the exact set
selected from already-authoritative finding/materialization facts. Shared
templates and optional examples present only these forms.

The legacy `related_topic` branch remains in the resolver for existing files.
No new writer emits it, no existing reference is rewritten, and valid legacy
reads keep their present output until C5a-2 changes that policy. A new writer
has no dual-form fallback.

### Derived index labels remain navigation-only

`sync-reference-index` uses the resolved binding result to produce a stable
navigation label: scalar/current UID continues to use its current navigation
representation, `all` remains `all`, and a valid subset renders the resolved
current Topic labels in deterministic UID order. The column remains named
`related_topic` as an established derived navigation projection; it is neither
the metadata writer contract nor a second identity authority.

### Responsibility and constitutional review

Semantic precision: the adapter answers one bounded reader question, "what
canonical Topic set does this reference declare?" It preserves distinctions
between one, all, and exact subset, with invalid as the normal stop.

Simple reliable control: direct metadata plus canonical registry layout passes
through one adapter to existing readers. This replaces a legacy writer choice
and closes the Wave2 advisory gap without adding a checker family, state,
recovery loop, or metadata join.

Helper-oriented responsibility: the user chose the cardinality contract; the
Agent selects the meaningful scope from accepted Phase facts and writes a legal
form; the Engine only verifies deterministic shape/membership and reports an
existing-checkpoint failure. Neither current finding prose nor human direction
can grant a malformed binding acceptance.

## Risks / Trade-offs

- [Array parser affects generic metadata callers] -> preserve structure only
  for the new binding key, retain existing string projections elsewhere, and
  test metadata parsing alongside all current consumers.
- [Selected subset could become an all-Topic footprint] -> use exact resolver
  output in observability/index tests with an unrelated third Topic.
- [Writer guidance could change before consumers accept the form] -> apply
  resolver/readers before template/Phase output and verify Wave0/Wave1/Wave2
  characterization in one change.
- [Historic evidence could lose countability] -> retain legacy reader branch,
  bytes, and legacy regression cases; C5a-2 is the only policy owner for its
  later removal or rejection.
- [Index label could be mistaken for authority] -> keep the existing derived
  column and explicitly test that metadata/resolver controls identity.

## Migration Plan

No runtime migration occurs. Apply first makes the common adapter and its
consumers accept/diagnose the UID array, then changes current writer guidance
and examples, then synchronizes accepted specs. Rollback before archive is the
ordinary source-control revert of this focused change; it does not rewrite
bundle files or add a dual writer path.
