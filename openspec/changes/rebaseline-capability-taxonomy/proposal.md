## Why

OpenSpec currently stores 84 live capability contracts in a flat namespace.
That is sufficient for exact-path CLI operations, but it does not give a Coding
Agent a reliable way to discover and reuse the right existing capability before
creating a near-duplicate. OpenSpec v1.7.0 supports nested capability paths,
but its default spec-driven instructions still illustrate flat paths and do not
infer this repository's taxonomy or discovery rule.

This change makes `domain/capability` the canonical capability identity and
adds a thin, checked catalog so reuse is the normal first move. It is needed
now because the current catalog-free flat baseline leaves the migration and
future change proposals vulnerable to ambiguous lookup and accidental new
capabilities.

## What Changes

- Rebaseline every live main-spec and active-delta coordinate from a flat leaf
  name to exactly one `domain/capability` path, preserving each existing leaf
  name and requirement ID.
- Create `openspec/specs/README.md` as a non-authoritative Capability Catalog:
  one concise row per live main spec with purpose, keywords, neighbors, typed
  related entries, and explicit Agent/Markdown and Engine/Node control
  boundaries.
- Put the Coding-Agent discovery protocol in `openspec/config.yaml`: read the
  catalog, inspect candidate main specs, record the result in proposal.md, and
  create a new capability only when no existing contract applies.
- Add thin governance checks for the two-level taxonomy/catalog and for the
  required `## Capability Discovery` record in new proposals; wire them into
  the existing archive finalizer.
- Extend requirement-registry prefix resolution so live prefix owners point to
  complete canonical paths rather than ambiguous leaf names.
- Reuse and extend the existing governance contracts for requirement
  traceability and feedback-lifecycle finalization; retain Harness runtime
  contracts and existing requirement IDs. **BREAKING**: direct references to
  old flat capability coordinates must use their new canonical paths after the
  migration.

### Semantic Precision and Control Shape

The Capability Catalog is a reader-facing navigation projection for one bounded
question: "Which existing behavior contract should I inspect before proposing
work?" It preserves the distinction between a behavior capability, an
execution surface, an operation skill, and a workflow entry; when the catalog
cannot distinguish a candidate, the normal stop is `unknown` followed by
inspection of the cited main specs, not a fabricated answer.

The direct Source of Record remains the corresponding main spec. The shortest
legal loop is `catalog -> candidate main spec -> discovery record -> reuse or
new proposal`; the catalog never evaluates behavior or authorizes a change.
This replaces repeated broad directory scans and ad hoc name matching with one
small static projection and two focused structural checks. It does not add a
runtime state, controller, retry path, or semantic validator.

Agent/Markdown owns candidate selection, semantic comparison, and the proposal
record. Engine/Node owns only deterministic path, catalog-shape, relation, and
record-structure verdicts. A user supplies new semantics or risk decisions;
the Agent performs authorized mechanical migration and applies deterministic
feedback without treating human direction as a substitute for a missing
contract.

## Capability Discovery

| Candidate path | Evidence read | Decision | Reason |
| --- | --- | --- | --- |
| `governance/requirement-traceability` | Current `requirement-traceability` main spec, `req-registry.yaml`, `check-project-reqs.mjs`, and the taxonomy decision record | Modify | It already owns registry path identity and capability-boundary discipline. It needs the full-path convention, catalog-led reuse record, and associated hard checks rather than a near-duplicate capability. |
| `governance/change-feedback-loop` | Current `change-feedback-loop` main spec and `finalize-change-archive.mjs` | Modify | Its governed-finalization requirement explicitly names the archive check set. The finalizer must add taxonomy and discovery-record gates under this existing contract. |
| `verification/verification-routing` | Current `verification-routing` main spec, `check-verification-routing.mjs`, and change-plan convention in `config.yaml` | Verify-only | The required change-owned verification plan remains the existing verification contract; no test-class or proof authority changes. |
| `engine/framework-engine` | Current `framework-engine` main spec and project Charter ownership boundary | Excluded | New checker code has an Engine execution surface, but the primary subject is OpenSpec governance rather than framework behavior. |
| `workflow/workflow-directory-contract` | Current `workflow-directory-contract` main spec and project Charter | Excluded | The move affects OpenSpec capability coordinates, not Harness workflow-directory behavior. |

The direct audit above changes the initial `skip_specs` hypothesis. This change
does not alter Harness runtime behavior, but it does alter accepted project
governance behavior: `requirement-traceability` currently defines the registry
path contract and hard governance checks, while `change-feedback-loop` defines
the finalizer's check set. The change therefore creates deltas for those two
existing capabilities. It introduces no new capability and no new capability
prefix.

## Capabilities

### New Capabilities

None. The catalog, checker scripts, and mapping are carried by existing
governance behavior contracts rather than a duplicate taxonomy capability.

### Modified Capabilities

- `governance/requirement-traceability`: modify RET-001, RET-002, RET-003,
  and RET-006 for full-path ownership, catalog-led reuse-first discovery, and
  archive checks. No new requirement ID is introduced.
- `governance/change-feedback-loop`: modify CHF-003 so governed archive
  finalization runs taxonomy and discovery-record checks before verification
  routing and native archive.

## Impact

- Main specs and any active change deltas under `openspec/specs/` and
  `openspec/changes/` will move to the approved domains `agent`, `engine`,
  `bundle`, `research`, `workflow`, `verification`, and `governance`.
- `openspec/config.yaml`, `openspec/governance/req-registry.yaml`, the existing
  requirement checker, archive finalizer, and new focused governance checker
  scripts/tests will change during apply.
- Nested delta specs will be created for the two modified governance
  capabilities. Catalog-led discovery extends RET-003 in place, so no new
  requirement ID is registered during apply.
- `openspec/specs/README.md` becomes the Agent-facing catalog; main specs remain
  the direct behavior authority.
- `verification-plan.yaml` will cover only static governance/configuration and
  deterministic checker claims. No `DEEP_RESEARCH_HARNESS/` behavior, public
  CLI, dependency, runtime schema, lifecycle state, or version bump is in
  scope.

Source request and alignment record:
`_backlog/plans/two-level-specs-categorization.md` and
`_backlog/plans/two-level-specs-categorization.primary-sources.md`.
