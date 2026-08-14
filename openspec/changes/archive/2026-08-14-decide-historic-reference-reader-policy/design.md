## Context

See [proposal.md](proposal.md). Item 08 made current rich-reference writers use
only scalar UID, `all`, or exact UID-subset bindings. The shared
`resolveReferenceTopicBinding()` adapter still interprets `related_topic`
through current and previous layout ids/slugs, and that positive conclusion is
consumed by Gate/inspect, reference index synchronization, file observability,
provenance, and rerun paths.

The current production call graph always supplies the selected bundle root to
`checkReferenceFormatFiles()`, so those readers have Topic registry facts and
enter the shared adapter. Calls without a bundle root are confined to focused
format-unit tests; they are not a second production reader contract. Apply will
convert any legacy-positive current-success cases in that test-only branch and
must record a plan-review finding if a production no-layout caller is discovered.

This change removes only that historical reference-reader success path. It must
not alter reference bytes, introduce a migration route, inspect unauthorized run
bundles, or weaken `previous_layouts[]` for UID-bound records and non-reference
artifact families. The six delta specs own the observable behavior; this design
defines how the shared result reaches those surfaces without new authorities.

## Goals / Non-Goals

**Goals:**

- Make presence of the retired `related_topic` metadata key produce one stable
  `reference_topic_binding_legacy_unsupported` conclusion before any legacy
  id/slug/list interpretation, including empty and dual declarations.
- Preserve one shared adapter as the deterministic Source of Record for current
  reference binding and propagate its exact conclusion to every verdict
  consumer without per-consumer fallback parsing.
- Prevent a rejected reference from contributing topic attribution, Gate floors,
  index rows, provenance, observability footprints, or rerun coverage.
- Keep historical Markdown bytes and paths unchanged and route any needed new
  evidence through the existing current reference-materialization flow.

**Non-Goals:**

- No migration, mass rewrite, metadata-only work unit, compatibility adapter,
  alias table, version router, or new repair command.
- No change to the accepted scalar UID, `all`, or exact UID-subset forms and no
  change to current writer cardinality decisions from item 08.
- No change to canonical Topic identity, `previous_layouts[]` for other artifact
  families or UID-bound records, submitted backing, receipt authority, or
  ordinary layout recovery.
- No C5b experiment-history policy or C6 work-unit history change.

## Decisions

### Reject legacy key presence at the shared adapter boundary

`resolveReferenceTopicBinding()` will test key presence with `Map.has()` or
`Object.hasOwn()` before normalizing values. Any `related_topic` key returns:

```text
{ ok: false, reason_code: "reference_topic_binding_legacy_unsupported" }
```

This happens whether the legacy value is empty, valid, unknown, ambiguous,
comma-separated, `all`, or accompanied by a valid current UID form. The adapter
does not call the legacy id/slug resolver and does not compare legacy and current
signatures. Private legacy reference parsing that has no other owner can be
removed; structured topic binding and previous-layout resolution outside
Reference Markdown remain unchanged.

The bounded reader question is: "May this Reference Markdown metadata
participate in current Engine evidence consumption?" The distinctions that
change that answer are current UID form, retired-key presence, missing binding,
and malformed current binding. The adapter result is the normal reasoning stop;
consumers need not reconstruct identity from raw fields.

Alternative rejected: prefer a valid UID whenever both forms exist. That keeps
a hidden dual-form compatibility path and makes the retired key harmless in one
shape but blocking in another. Alternative rejected: let each consumer detect
the key. That recreates several precedence rules and permits drift. Alternative
rejected: parse the old value only to produce a richer diagnostic. Its id/slug
meaning is no longer needed for the current decision and would retain the reader
branch being retired.

### Propagate one verdict through existing consumer envelopes

Gate/inspect format checks, reference index synchronization, and file
observability will preserve the adapter reason code instead of wrapping it in a
consumer-specific legacy/unknown/conflict result. Provenance, countability, and
rerun conclusions continue to consume those existing evaluator results; they do
not add another raw-metadata reader.

For this reason code:

- Gate/inspect reports one binding root at `metadata.related_topic`, does not
  emit legacy lookup or dependent countability advice, and does not present a
  direct edit of the historical file as a sanctioned repair.
- Reference index synchronization blocks before persisting an index or README
  projection for the rejected reference and returns the adapter reason code.
- File observability emits one non-attributed blocking finding, creates no topic
  footprint or dangling legacy identity, and does not recommend a rewrite.
- Current UID binding failures retain their existing direct repair semantics;
  this change does not turn every malformed current reference into an
  unsupported-history result.

The existing consumer result shapes remain in place. No new state, schema,
command, checker family, or projection is introduced. The no-layout
presence-only format helper used by focused tests does not establish current
Topic membership; it must not retain a positive legacy fixture or become a new
production fallback during Apply.

### Preserve history by not entering a writer path

Rejection is read-only. The adapter and its consumers do not mutate, move, copy,
or normalize the reference. Index synchronization must reach the rejection
before any persistence boundary, and tests will compare pre/post bytes for the
reference and existing derived index where applicable.

If current execution still requires that evidence, the Agent uses the existing
authorized Phase/materialization path to create a current UID-bound reference.
The Engine reports the deterministic boundary but neither invents the new
binding nor rewrites historical evidence. There is no in-place migration or
same-file repair loop.

### Convert current-success fixtures, retain focused rejection fixtures

Tests and fixtures that model current successful execution will use UID forms.
Legacy-only fixtures remain only where they prove the stable rejection, byte
preservation, non-countability, or absence of fallback. Dual-form coverage proves
that a valid UID does not bypass the retired-key boundary. This separates current
success evidence from historical rejection evidence instead of letting legacy
fixtures self-authorize a compatibility contract.

### Constitutional responsibility review

Semantic precision is provided by one bounded eligibility conclusion at the
metadata adapter: current UID forms resolve, retired-key presence is unsupported,
and malformed current forms keep their existing distinct failures.

The shortest legal control loop is direct reference metadata plus current Topic
registry facts, one shared adapter result, and the existing Gate/index/
observability envelope. Net simplification removes legacy id/slug/list parsing,
dual-form signature comparison, consumer-specific fallback wording, and a
positive historical evidence path without adding state or recovery machinery.

The user owns the breaking historical-evidence policy and has selected strict
current-only rejection. During an explicitly authorized Apply, the Agent owns
the mechanical code, fixture, spec-sync, and verification work. The Engine owns
only the deterministic binding verdict and cannot infer a replacement UID or
grant mutation permission. No additional user decision is required unless Apply
finds a current writer or externally required current consumer that contradicts
the proposal evidence.

## Risks / Trade-offs

- [Existing runs may lose Gate/provenance countability] -> make that breaking
  consequence explicit, verify all named consumers, and retain human-readable
  bytes without pretending they remain current evidence.
- [A valid UID in a dual declaration could accidentally bypass rejection] ->
  check legacy key presence before parsing any form and add adapter plus
  cross-surface dual-form tests.
- [A consumer could hide the shared code behind a generic wrapper] -> assert the
  exact reason code at Gate/inspect, index, and observability boundaries.
- [Index synchronization could partially update derived files before blocking]
  -> reject during fact loading/render preparation and assert pre/post bytes at
  persistence boundaries.
- [Legacy-positive fixtures are numerous and can obscure current regressions]
  -> convert only current-success fixtures to UID forms, keep named negative
  cases, and run a targeted positive-legacy scan before closeout.
- [The retired key can be present with an empty value] -> detect presence rather
  than truthiness so empty, scalar, list-like, and dual declarations share the
  same stable result.
- [Scope could leak into layout or experiment history] -> retain focused
  previous-layout/current-UID regressions and exclude C5b/C6 readers from edits.

## Migration Plan

There is no runtime or artifact migration.

1. Change the shared adapter and its unit truth table, removing only private
   legacy Reference Markdown parsing that becomes unreachable.
2. Propagate the exact result through Gate/inspect, index, observability,
   provenance/countability, and rerun tests while keeping consumers thin.
3. Convert current-success fixtures and any current guidance that still presents
   legacy reader acceptance; retain focused rejection and byte-preservation
   cases.
4. Synchronize the six delta requirements into accepted specs and run the
   selected verification and governance checks.

Rollback before archive is an ordinary source-control revert of this focused
change. Because Apply performs no bundle rewrite or migration, rollback requires
no data restoration and must not reintroduce a dual writer path.
