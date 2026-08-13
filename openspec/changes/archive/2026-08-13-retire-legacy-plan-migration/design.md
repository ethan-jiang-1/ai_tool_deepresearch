## Context

See [proposal.md](proposal.md). `rb_plan.md` is current runtime authority only
when it passes `CanonicalPlanSchema`; `PlanSchema` currently admits a second
legacy mutable family, while canonical topic-state turns it into current UID
identity through `migrate_legacy`. That positive path is surfaced by generic
schema readers, topic-state inspect/apply, Seed Topics, phase-rerun, queue
admission, and post-final recovery.

The change does not introduce a second rejection classifier. A plain
schema-invalid plan already has established consumer-specific failure envelopes;
topic-state inspect is the one direct diagnostic projector for its own
inspection result.

## Goals / Non-Goals

**Goals:**

- Make canonical `topic_registry_version: "2"` the sole current mutable plan
  contract.
- Remove every positive legacy-plan inspection, migration, adoption, seed, and
  rerun instruction.
- Preserve all current canonical identity, `previous_layouts[]`, rerun,
  seed-binding, provenance, receipt, workspace recovery, and post-final
  behaviors.

**Non-Goals:**

- Migrating, rewriting, converting, or deleting historical plans, seeds,
  references, artifacts, ledgers, receipts, or final output.
- Changing current historical reference binding (C5a), work-unit historical
  formats (C6), or the current `previous_layouts[]` lineage contract.
- Adding a migration CLI, version router, compatibility adapter, unsupported
  legacy taxonomy, or new human decision/Gate.

## Decisions

### One schema Source of Record

`CanonicalPlanSchema` becomes the whole `PlanSchema` contract. A mutable plan
without the canonical marker or required UID-bound entries is an unsupported
current shape and fails at that direct schema boundary. General readers such as
Setup and `validate-bundle` continue using their established schema failure
envelopes; they do not recognize legacy fields merely to name a special result.

Alternative rejected: retain `LegacyPlanSchema` only for inspect. That would
leave a positive reader and a second plan family, while consumers would still
need to decide whether the old form can advance.

### Topic-state is the one no-write inspection projection

`inspectCanonicalTopicState` will parse only the canonical shape. A failed plan
returns its existing invalid/no-write inspection boundary, not `mode: legacy`,
`legacy_migration_required`, or a command. `apply` removes its migration input
schema and has no conversion branch. An invalid input or plan creates no
workspace and writes no files.

Alternative rejected: retain an explicit "manual migration required" result.
That is another current Engine migration projection and gives the historical
plan a misleading operational path.

### Retain current lineage, not legacy compatibility

`previous_layouts[]` stays in canonical topic entries and all existing pure
layout resolution, current UID binding, safe removal, evidence/provenance, and
rerun recovery remain untouched. It represents superseded coordinates of a
current canonical identity, not the old mutable plan shape. Historical files
remain bytes on disk and human-readable without being made executable input.

### Remove Agent-facing and C5/queue promises together

Phase-rerun, Seed Topics, queue admission, reentry, and post-final recovery
will no longer advise or permit legacy migration. Their normal canonical
operations remain unchanged. This prevents an Engine rejection being
contradicted by Agent-facing guidance or a downstream recovery route.

### Constitutional review

Semantic precision: readers answer one bounded question, "is this selected plan
a current mutable plan?" A legacy-specific state adds no different legal next
action, so schema-invalid is the normal reasoning stop.

Simple reliable control: one canonical schema and its existing consumer
boundaries replace the union, inspect mode, migration input, and downstream
advice. There is no new check or recovery loop.

Helper-oriented responsibility: the user selected the loss of historical
re-entry. The Agent performs existing authorized canonical work and may inspect
historic Markdown as a human artifact; the Engine validates the current schema
and returns existing deterministic failures. Neither user wording nor Agent
intent grants conversion authority.

## Risks / Trade-offs

- **Historical in-progress bundle can no longer resume through current Engine**
  -> intentional A-policy result; explicit rejection tests cover schema,
  inspect, rerun, Seed Topics, queue, and post-final paths.
- **Scope could accidentally remove current layout lineage** -> retain direct
  `previous_layouts[]`, rerun, provenance, and recovery regressions; scan code
  and specs separately for migration tokens versus current lineage consumers.
- **Delta sync could remove unrelated large topic-state/C5 constraints** -> each
  modified requirement is a full current-block projection; compare delta/main
  blocks during closeout before archive.
- **An old positive guidance path could survive** -> scan Harness guidance,
  definition files, specs, fixtures, and tests; leave only explicit rejection
  assertions or archive history.

## Migration Plan

No runtime migration exists. Apply removes the compatibility readers and
writer path in one change, converts old positive fixtures to either canonical
success fixtures or explicit rejection cases, synchronizes accepted specs, and
archives after governed validation. Rollback is the normal source-control
revert of this focused change before archive; it is not a bundle conversion or
a second current runtime path.
