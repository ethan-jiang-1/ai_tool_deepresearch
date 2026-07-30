## Context

The proposal identifies one shared root for BUG-146, BUG-162, BUG-172, and
BUG-178: consumers infer document role from a path or a broad return-map name,
then independently reinterpret submitted backing. This is not a missing
Markdown field. A correct rich reference, normal Wave1 artifact, or
Phase-owned navigation projection can already satisfy its producer contract
and still become a false blocker through an unrelated reader.

The relevant direct facts already exist:

- Seed Topic projection slots and their current submitted identities;
- rich-reference metadata plus five semantic sections;
- Wave1 artifact contracts and submitted output declarations;
- submitted source/cache/work-unit backing for Phase-owned references; and
- the reference index as consumer navigation.

No new runtime state, document registry, evidence ledger, controller, retry
path, or mutation authority is necessary.

## Goals / Non-Goals

**Goals:**

- Make the evaluator's reader question precise: what artifact family is this,
  and which declared grammar and authority contract may evaluate it?
- Remove false return-map blocking from rich references and ordinary Wave1
  artifacts while retaining strict Seed Topic projection validation.
- Give rich references one canonical writer presentation and one shared
  semantic reader, with legacy read compatibility.
- Make normal Wave checks and reentry use the same submitted-reference
  authority classification.
- Keep failure feedback root-first and connected to the same legal checkpoint.

**Non-Goals:**

- No topic-state/projection writer repair, count-floor policy change,
  work-unit-finality redesign, host capability work, or generic Agent
  controller.
- No weakening of submitted backing, cache trails, receipts, index integrity,
  or source provenance.
- No bulk rewrite of existing bundles, synthetic ledger rows, or synthetic
  return-map fields in artifact documents.

## Decisions

### 1. Artifact family is the bounded semantic layer

The reader is an Engine evaluator and the bounded question is: “Does this
artifact have the contract this evaluator owns?” The relevant distinctions
must remain visible at the call site:

| Family | Producer / role | Direct consumer | Authority it must not replace |
| --- | --- | --- | --- |
| Seed Topic projection entry | Phase Agent through the existing topic-state writer | Seed projection/return-map evaluator | submitted work-unit, source, cache, receipt |
| Rich reference | Wave0 delegated output or accepted Phase-owned consumer projection | shared reference format and reference-authority evaluators | submitted backing and index |
| Wave1 evidence / question artifact | submitted Wave1 delegated output | existing Wave1 artifact evaluator | Seed Topic projection |
| Phase-owned reference projection | Phase Agent materializing submitted backing | shared reference-authority classifier | delegated output ledger |
| Reference index | normal index synchronizer | index evaluator / navigation reader | evidence and topic identity authority |

This is not a new registry or persisted type. It is a direct evaluator routing
rule derived from already-declared producer contracts. A reader can stop at the
matrix: an artifact is not a return map merely because it is Markdown.

### 2. Return-map validation is Seed Topic-only

The existing Seed Topic projection evaluator remains the sole return-map
consumer. Wave0/Wave1/Wave2 inspect wrappers will call it for their target
Wave and derive return-map classification from that result only. The generic
artifact and reference return-map scans will be removed rather than made
permissive.

The existing reference-format, Wave1 artifact, and formal Wave evaluators
retain their own findings and rule IDs. This preserves true failures while
removing the false parser path.

**Alternative considered:** permit optional return-map sections in every
artifact. Rejected: it leaves an unrelated grammar on each producer's control
path and creates a second success format.

### 3. YAML frontmatter is the canonical rich-reference presentation

New rich references will use one opening YAML frontmatter mapping. The shared
reference metadata reader will parse that mapping and return the same metadata
semantic values used by source URL, binding, index, count, and backing
consumers. Existing bullet metadata remains read-compatible, but is not shown
as a competing writer contract and requires no migration.

Malformed/non-mapping frontmatter yields one metadata root; a valid mapping
with an absent required key yields the normal field-specific root. This is
strict about required data while tolerant of legacy presentation. The reader
will reuse the existing YAML-frontmatter parser rather than introduce a second
metadata grammar.

**Alternative considered:** keep bullet metadata canonical and only improve
the error text. Rejected: the standard YAML form is already familiar to the
Agent and current framework Markdown, and changing only prose leaves a
deterministic presentation rejection at the writer boundary.

### 4. Reentry reuses the existing reference-authority classifier

check-reentry will delegate each participating reference to the pure
classifyReferenceAuthority path already used by normal Wave reference coverage.
It may retain its reentry-specific output envelope, but cannot restore a
direct-ledger-only criterion. Valid delegated outputs and valid
Phase-owned projections are separate classifications under one backing
interpretation; an unbacked/delegated-bypass file remains a blocker.

**Alternative considered:** add a reentry-only exemption list. Rejected: it
would create a third interpretation and make future reference families depend
on another path-prefix rule.

### 5. Feedback and responsibility stay on the shortest loop

The loop is:

direct artifact/backing fact → family-specific evaluator → existing inspect,
gate, or reentry checkpoint → existing legal repair or an explicit
missing-contract boundary.

Removing two generic scans and the duplicate reentry scan is a net
simplification. No writer, retry, status, or user acknowledgement is added.
Engine determines grammar and backing facts; the Agent repairs ordinary content
through the already-authorized producer/Phase path and reruns the same
checkpoint. The user has no ordinary pipeline task here; only a new research
or metadata semantic decision would require one.

## Risks / Trade-offs

- **A broad removal could accidentally remove a useful direct artifact check**
  → retain current artifact evaluator rule IDs and add integration cases that
  break those contracts independently.
- **YAML parsing could make legacy rich references unreadable** → preserve the
  bullet reader as a read-compatibility branch with focused coverage.
- **Malformed frontmatter could fan out into missing-field noise** → make one
  parser-owned root and test the short-circuit.
- **Reentry could become too permissive** → test a valid Phase-owned
  projection and a genuinely unbacked reference through the production CLI.
- **The existing real bundle has unrelated historical failures** → use it only
  as a counterexample for the eliminated rule families; do not claim a whole
  research run passes unless its independent roots are clean.

## Migration Plan

1. Add the scoped evaluator and metadata-reader regressions before changing
   composition.
2. Remove only generic return-map calls from Wave inspect wrappers; preserve
   Seed Topic calls and declared artifact evaluators.
3. Change the shared reader/template/guidance to canonical YAML frontmatter
   while accepting existing bullet metadata.
4. Replace reentry's direct-declaration scan with the shared classifier.
5. Update CHANGELOG.md and DPT_FRAMEWORK/RUN.md for v0.61.
6. Existing bundles require no migration. Valid legacy bullet references and
   valid YAML-frontmatter references remain readable; no ledger or receipt is
   rewritten.

Rollback is code and guidance rollback only. No runtime-state migration,
receipt mutation, or authority reconstruction is involved.

## Open Questions

None. The accepted producer contracts and existing classifier already decide
the required distinction.
