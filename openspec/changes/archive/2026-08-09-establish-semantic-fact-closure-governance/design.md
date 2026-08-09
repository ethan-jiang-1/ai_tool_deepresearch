## Context

See `proposal.md` for the incident motivation. The repository already has a
useful project-governance precedent: `verification-plan.yaml` is a change-local,
non-OpenSpec-native artifact checked in `plan` and `assets` modes, with the
archive finalizer enforcing the latter. `change-feedback-loop` already owns the
supported lifecycle entry route and root-first finalization order.

This design creates an analogous, narrower governance contract for semantic
fact drift. It does not change the Deep Research Harness runtime, existing
schema semantics, or any BUG-212/213/214 consumer.

## Goals / Non-Goals

**Goals:**

- Give a change author and reviewer one bounded place to say which
  deterministic fact families are affected and how their authority/consumer
  chain closes.
- Make omission of the record, malformed references, unknown families, and
  missing declared assets block apply or archive through existing OpenSpec
  entry points.
- Make checker feedback directly repairable by an Agent without turning the
  checker into a semantic code-review engine.
- Reuse the existing verification-plan and feedback-finalizer shape instead of
  inventing another lifecycle phase, state machine, or controller.

**Non-Goals:**

- Infer all semantic consumers from arbitrary JavaScript, lint every raw field,
  or claim that a structurally valid record proves semantic completeness.
- Add a runtime Gate, a runtime status/receipt, a generic schema registry,
  durable runtime state, CI integration, automatic repair, or Agent scheduling.
- Retrofit all current fact families or resolve BUG-212/213/214 in this change.

## Decisions

### 1. Use a catalog plus a change-local declaration, with separate sources of record

`openspec/governance/semantic-fact-families.yaml` is the source of record for
the stable Deep Research Harness runtime-family vocabulary. It will use a strict
`semantic-fact-families/v1` Zod schema with unique dotted family IDs and a
non-empty bounded question for each family. It starts with the exact thirteen
ID/question pairs in SEF-001. It is not a runtime schema and does not name
current code coordinates.

```yaml
schema_version: semantic-fact-families/v1
families:
  - id: work-unit.source-claim-provenance
    bounded_question: Does a source claim have legal provenance?
```

Each catalog entry contains exactly `id` and `bounded_question`. The catalog
therefore says what stable distinction a family governs, while a change-local
record supplies the resolver, authority-establishing surfaces, consumers, and verification coordinates
that are true for one particular change.

For this capability, a fact family is a Deep Research Harness runtime
conclusion. A project-level OpenSpec governance checker or finalizer may make a
deterministic lifecycle-eligibility verdict, but that verdict is not a cataloged
runtime family: its own accepted governance capability remains the authority.
This keeps the governance-only bootstrap truthfully `not_applicable` without
creating self-recursive catalog entries. It does not exempt a change that also
touches a Harness runtime resolver or verdict consumer; that change remains
`affected` for every runtime family it changes.

`work-unit.assignment-output-obligation` is intentionally separate from
attempt identity and role-specific direct-output fulfillment. Its resolver
derives the required declaration/output obligation from the bound assignment;
the Wave0/Wave1 direct-output families evaluate whether a required output's
contents fulfill that already-derived obligation. This preserves the outcome-
changing distinction between a valid supplementary assignment that requires no
current output and a required output whose content is invalid.

`openspec/changes/<change>/semantic-closure.yaml` is the source of record for
one change's declaration. Its strict `semantic-closure/v1` Zod schema is:

```yaml
schema_version: semantic-closure/v1
change: example-change
status: affected
catalog_additions:
  - id: work-unit.example-authority
    bounded_question: Which submitted example may establish this verdict?
affected:
  - family: work-unit.source-claim-provenance
    fact: Whether an authorized prior submitted output may back a current source_ref.
    authority:
      resolver: DEEP_RESEARCH_HARNESS/engine/example-resolver.mjs#resolveExample
    established_by:
      - DEEP_RESEARCH_HARNESS/cli/operate-work-unit.mjs
    consumers:
      - DEEP_RESEARCH_HARNESS/engine/example-submit.mjs#validateExample
      - DEEP_RESEARCH_HARNESS/engine/example-depth-review.mjs#validateExample
    overlap:
      - coordinate: DEEP_RESEARCH_HARNESS/engine/example-legacy-reader.mjs#readExample
        relation: authoritative
        detail: The resolver replaces duplicated raw-row authorization checks.
    verification:
      truth_table: tests/engine/example-resolver.test.mjs
      cross_surface: tests/integration/cli/example-authority.test.mjs
```

The exclusive `not_applicable` branch contains only a non-empty `reason` beyond
the common schema/change/status fields. An `affected` record instead contains a
non-empty `affected` sequence and an explicit `catalog_additions` sequence
(empty when no new family is introduced), with no `reason` or unclassified
`other`. A new family must appear in `catalog_additions`, then be present in the
catalog by assets mode. Each addition must name a family used by exactly one
affected entry in that same record. In `plan` mode it must be absent from the
current catalog; in `assets` mode it must be present with the same ID and
bounded question. An existing family is referenced directly rather than
re-added.
`overlap` is a non-empty list. A real overlap has a safe `coordinate`, one of
`authoritative`, `derived`, or `retired`, and a non-empty `detail`; `none` is a
single no-coordinate entry with a non-empty explanation and cannot coexist with
a real overlap. Coordinates are normalized POSIX repository-relative paths with
an optional human-facing fragment. The checker validates only the file path
portion of a fragment, not code-token semantics.

The record's two verification coordinates must be distinct assets declared by
selected claims in `verification-plan.yaml`: a focused truth-table proof and a
real cross-surface proof. This makes a planned shared resolver observable in
both its local conclusion and the consumers that use it without creating a new
test taxonomy.

The semantic checker will import `parseVerificationRoutingPlan` from
`openspec/governance/verification-routing-contract.mjs`; it will derive the
selected asset set from that canonical parsed result rather than introduce a
second `verification-plan.yaml` schema or route interpretation. Verification
routing remains the authority for route validity and asset ownership boundaries;
semantic closure only asks whether its two declared coordinates are among those
selected assets.

This pair has an explicit creation route. After this capability is accepted,
project proposal instructions will direct the author to read
`semantic-fact-families.yaml`, create `semantic-closure.yaml` in the new change
root, and choose one of the two strict branches before treating the planning
set as complete. The instructions will name the catalog as the only family
vocabulary and include compact starters for `not_applicable` and `affected`.
That guidance makes the right artifact discoverable; it neither decides the
branch nor proves its semantic truth. The supported apply entry's plan check is
the deterministic backstop for a missing or structurally invalid record.

Alternative considered: extend `verification-plan.yaml` with semantic fields.
Rejected because proof routing and fact-authority closure answer different
questions and have different readers. Alternative considered: a global runtime
resolver registry. Rejected because it would turn a change-governance catalog
into a second runtime authority.

### 2. The checker validates declared structure and references, not semantics

`openspec/governance/semantic-fact-closure-contract.mjs` will export the Zod
schemas and pure parsing helpers. `check-semantic-closure.mjs` will own the CLI
and perform one ordered, root-first scan:

1. resolve the selected change and read its closure record;
2. validate change identity, exclusive branch, family uniqueness, and lexical
   coordinate safety;
3. parse the current catalog in either status branch. In `plan` mode, validate
   affected-family membership or one same-change addition that is absent from
   the catalog; in `assets` mode, require every affected family to resolve in
   the catalog and every declared addition to be present with its exact bounded
   question;
4. parse the existing verification plan through the canonical verification-routing
   contract, confirm that its `change` equals the selected change, and confirm
   each declared verification coordinate is a selected claim asset;
5. in `assets` mode only, require the catalog and every declared coordinate to
   be a regular file whose realpath remains within the repository root.

Every failure prints only the nearest repairable root with `family` when known,
`missing_fact`, `owner`, `write_to`, and the same `--mode` rerun command. It
does not run tests, write files, execute an Agent, parse implementation bodies,
or assert that a raw reader has been correctly replaced. The latter remains an
Agent plan/closeout-review judgment; any finding becomes an ordinary pending
task. A lexical repository-relative coordinate that resolves through a symlink
outside the repository is an assets-mode structural failure, not a valid owned
asset.

Alternative considered: a generic raw-reader/field linter. Rejected because it
cannot determine whether a use establishes a verdict without high false
positive risk, and would add a second interpretation engine. Alternative
considered: checker-written remediation. Rejected because it would grant a
governance checker semantic mutation authority.

### 3. Reuse existing apply and archive entry points

The project configuration will instruct proposal authors to create the closure
record from the global catalog before planning is treated as complete. Once this
capability is accepted, every supported apply entry surface will run
verification-routing plan mode followed by semantic-closure plan mode before
any target edit, regardless of whether a task list contains a feedback marker.
A feedback-lifecycle change does so after its existing plan review. The entry
returns checker feedback to the Agent and stops on failure; it has no
missing-command fallback.

`SUPPORTED_ENTRY_SURFACES` in `finalize-change-archive.mjs` is the one
project-owned inventory of those entry surfaces. The current migration has
retired the deleted `.codex` skill/prompt paths. Its replacement inventory is
the four apply entries under `.agents/skills/` and `.claude/{skills,commands}/`
and the matching four archive entries. Apply first updates that map, then
updates exactly the paths it declares; the integration test reads the map rather
than preserving a second hard-coded list. This keeps a missing or retired entry
from silently becoming an unreviewed lifecycle bypass.

The bootstrap is instead a one-time task order for this change under the
pre-existing apply route: after the already runnable verification-routing plan
check passes, it may create only the catalog, parser, checker, and focused tests
needed to make semantic plan mode available. It then immediately dogfoods that
plan mode before changing the registry, configuration, lifecycle entries, or
finalizer. This avoids encoding a historical installation transition as a
permanent exception in the future entry surfaces.

When an affected record introduces a catalog addition, its approved task list
places the write to `semantic-fact-families.yaml` before the first target edit
that relies on that family. Plan mode may validate the change-local declaration
before that target exists, but it is not permission to change a runtime
consumer while the global vocabulary still lacks the family.

The governed finalizer will run semantic-closure assets mode after the existing
verification-routing assets check and before native archive. It will use a new
`semantic_closure_failed` root code and a `semantic_closure` passed-check entry
in its strict result schema, preserving the finalizer's current first-failure
behavior and rerun coordinate. The finalizer still does not review semantic
completeness or synchronize delta specs.

The two catalog-addition predicates are deliberately time-scoped. A successful
plan check proves that a change did not relabel an already cataloged family as a
new one; a successful assets check proves that the approved addition was
actually written before closeout. Assets mode does not re-run the plan-only
absence predicate against the post-Apply catalog, because that would reject the
very task it is supposed to verify. The supported apply entry supplies the
required pre-edit plan check; the checker does not invent a history snapshot.

There remains one supported archive success route. A selected change without
the existing feedback marker pair cannot be archived as an unmarked exception:
the supported archive entry will stop before finalization, direct the Agent to
add the two required feedback review-marker tasks and resume apply, then use the same governed
finalizer after their reviews complete. This keeps semantic completeness with
the existing plan/closeout review boundary and avoids a second native archive
path that could skip semantic-closure assets validation.

Existing active changes that resume through a newly updated supported entry
must add their own `semantic-closure.yaml` before target edits or archive, even
when their task list predates feedback markers. Before archive, they must also
adopt the normal review-marker pair. This is a planning-artifact migration only;
it does not force a runtime retrofit.

`guidelines/change-feedback-loop.md` will deliver the review question that the
structural checker deliberately cannot answer. For an `affected` record, both
plan and closeout review will inspect whether the bounded fact, resolver,
establishing surfaces, verdict consumers, and overlap relation match the planned
or actual change; for `not_applicable`, they will test the reason against the
touched surfaces. A finding becomes an ordinary repair task under the existing
marker protocol. The guideline prompts Agent judgment only: it is not another
schema, a check result, or archive authority.

### 3a. Keep requirement-traceability staging honest

The current `check-project-reqs.mjs` intentionally scans active delta specs, so
it reports this new capability's `SEF-*` IDs until task 2.1 registers them and
task 3.6 syncs the resulting main spec. The accepted traceability contract makes
that checker an archive hard gate, not a pre-target-edit Apply gate. This change
must neither suppress that output nor disguise a live pending prefix as `no spec
directory`; task 3.7 is the first point at which a green requirement-governance
result is claimed. A future desire for proposal-time green status would require
a separate, accepted requirement-traceability design for change-local prefix
reservations, because the project phase gate forbids editing the global registry
during proposal or explore.

### 4. Preserve a single semantic conclusion without creating runtime machinery

For an `affected` family, `authority.resolver` names the Engine interface whose
conclusion every verdict consumer whose conclusion can be affected by the
change must use. `established_by` retains the legal authority-establishing boundary,
while `consumers` is the reviewable list of relevant authorization, rejection,
pass/fail, or blocking surfaces. `overlap`
forces the plan to state whether a legacy field/projection is authoritative,
derived, retired, or `none`, and gives each real overlap a coordinate that
assets mode can verify without inferring its semantic meaning.

This is a useful semantic level for a maintainer: they can answer whether a
change has one authoritative conclusion for an outcome-changing fact without
reconstructing every raw declaration, schema, ledger, Gate, and inspect path.
It preserves the distinctions that change that answer: structural shape versus
multi-record meaning, raw history versus verdict authority, and a valid record
versus a semantically complete consumer inventory. It can also honestly stop at
"review required" rather than claim unknown source semantics have passed.

The direct control loop is `record -> checker feedback -> Agent repair -> same
checker`. Compared with a new runtime Gate, linter, retry tree, or controller,
it adds one direct check at two existing lifecycle points and avoids creating
new runtime state or repair machinery. A user decides only an unresolved
semantic boundary or a genuinely new family; the Agent performs authorized
mechanical record/code/test repair; the Node checker judges only deterministic
declaration and asset facts.

## Risks / Trade-offs

- [A valid record can still omit a real consumer] -> Plan and closeout review
  explicitly own semantic completeness; their finding becomes a pending task.
- [Catalog grows into a vague checklist] -> Family definitions stay bounded by
  outcome-changing authority, disallow `other`, require a same-change
  declaration, and write the addition to the global catalog before the first
  target edit that relies on it.
- [Bootstrap sequencing is mistaken for a permanent bypass] -> It is limited to
  this change's catalog/parser/checker/focused proof assets and must pass plan
  mode before other targets; updated entry surfaces have no exception.
- [Existing active work lacks a record] -> Resume it through the normal planning
  artifact update before target edits or archive; do not silently exempt it.
- [A coordinate exists but points at the wrong code] -> Assets mode deliberately
  reports only existence; plan/closeout review and selected tests remain the
  semantic proof boundary.

## Migration Plan

1. Add the catalog, strict contract parser, checker, and focused proof assets.
2. Add this change's `semantic-closure.yaml` with `not_applicable`, then run its
   own plan check and repair it until it passes.
3. Register `SEF` requirements, add the `openspec/specs/README.md` capability
   catalog row, reconcile the finalizer-owned `.agents`/`.claude` entry
   inventory, and update configuration, those entry surfaces, and the archive
   finalizer.
4. Add unit and integration proof for malformed records, plan/assets separation,
   new-family registration, root-first diagnostics, supported-entry wiring, and
   finalizer ordering.
5. Run selected tests and all project/OpenSpec checks. Archive only through the
   existing governed finalizer.

Rollback before archive is an ordinary revert of the governance assets and
entry guidance. There is no runtime data migration or runtime rollback path.
