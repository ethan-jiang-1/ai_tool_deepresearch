---
title: Capability Taxonomy and Coding-Agent Discovery Rebaseline
status: research-backed plan
created: 2026-08-06
updated: 2026-08-06
decision: proceed through a dedicated OpenSpec governance change
---

# Capability Taxonomy and Coding-Agent Discovery Rebaseline

## Decision

**Do this.** The repository has reached the point where 84 flat capability
names are no longer a reliable discovery surface for a Coding Agent. The
right change is not a cosmetic directory cleanup. It is a controlled
rebaseline that makes reuse of the correct existing behavior contract the
default path before an Agent creates a new capability.

The completed shape is:

```text
capability path identity  -> OpenSpec runtime address and archive target
main spec                 -> behavior source of truth
thin catalog              -> navigation and candidate selection
config rules              -> require the Coding Agent to use that navigation
taxonomy checker          -> prevent a return to flat or unapproved paths
```

The directory migration is necessary, but it is only the first layer. The
catalog and proposal-time discovery protocol are what directly solve the
actual problem: helping an Agent find and reuse the appropriate capability.

## Goal

Move all accepted main specs from:

```text
openspec/specs/<leaf>/spec.md
```

to the project convention:

```text
openspec/specs/<domain>/<existing-leaf>/spec.md
openspec/changes/<change>/specs/<domain>/<existing-leaf>/spec.md
```

The full path, for example `agent/agent-command-surface`, becomes the
capability's stable OpenSpec identity. A domain is a navigation namespace; it
is not a parent spec, a behavior aggregate, an inheritance mechanism, or an
automatic dependency graph.

The goals are:

1. Let a Coding Agent narrow an unfamiliar task to a small, reviewable set of
   existing behavior contracts.
2. Make modifying an existing capability the normal outcome when its contract
   already covers the requested behavior.
3. Make a genuinely new capability an explicit, evidence-backed decision.
4. Keep the full path consistent across proposal, delta, main spec, registry,
   catalog, validation, and archive.
5. Preserve every existing requirement ID and requirement body during the
   structural move.

## Non-Goals

- Do not change accepted Harness behavior, requirement semantics, or
  requirement IDs merely because a spec moves.
- Do not shorten leaf names in this migration. `agent/command-surface` may be
  prettier than `agent/agent-command-surface`, but it creates a second,
  unnecessary identity rewrite.
- Do not create `spec.md` files for domains just to provide an overview. A
  domain `spec.md` is an independent capability to OpenSpec.
- Do not copy all 84 specs or a large catalog into `config.yaml` context.
- Do not expect an ordinary `archive` operation or `RENAMED Requirements` to
  rename a capability path.

## Facts Established by Research

### OpenSpec support is already present

The installed CLI is `openspec 1.7.0`. That version fully supports nested main
specs and nested deltas in normal `list`, `show`, `validate`, parse,
apply/archive flows. No OpenSpec upgrade is required for this work.

`discoverSpecFiles()` recursively derives an ID from every directory segment
below `specs/`; it produces `segments.join('/')`, not the leaf directory name.
`findSpecUpdates()` writes a delta to `mainSpecsDir/<id>/spec.md`. Therefore
the two locations below are different IDs, not aliases:

```text
agent/agent-command-surface
workflow/agent-command-surface
```

The operational consequence is non-negotiable:

```text
main:  openspec/specs/agent/agent-command-surface/spec.md
delta: openspec/changes/<change>/specs/agent/agent-command-surface/spec.md
                                                |
                                                v
archive target: openspec/specs/agent/agent-command-surface/spec.md
```

An active delta left at `specs/agent-command-surface/spec.md` continues to
target the old flat capability and can recreate it after migration.

`RENAMED Requirements` renames a requirement header within one spec ID. It
does not rename, split, merge, alias, or retire a capability path.

### Native discovery still has an Agent-use gap

`openspec list --specs --json` returns an inventory of `{ id,
requirementCount }`; it does not return Purpose, keywords, boundaries, or a
semantic ranking. `openspec show <id>` requires an already-known exact ID.
Nested folders improve scanability but do not automatically select the right
specification for an Agent.

The bundled `spec-driven` schema still teaches flat examples such as
`specs/<capability>/spec.md`. The runtime supports nested paths, but the
default authoring guidance will not infer this project's convention. Project
rules must make the convention explicit.

### Current repository baseline

At research time:

- `openspec list --specs --json` reported exactly **84** main specs.
- `openspec validate --specs --strict` passed all 84 specs.
- `node openspec/governance/check-project-specs.mjs` passed.
- `node openspec/governance/check-project-reqs.mjs` passed with 630 registered
  IDs, 53 retired IDs, and no orphan IDs.
- `openspec list --json` reported no active changes. This is the right
  migration window, but the check must be repeated immediately before apply.
- `openspec/config.yaml` currently has 13,304 bytes of injected context and
  has flat-path wording in its `specs` rules.
- There is no main-spec catalog today.
- Four accepted main specs still have a placeholder Purpose and cannot seed a
  useful catalog row verbatim: `artifact-persistence-recovery`,
  `experiment-agent-autorun`, `plan-hostfile-sections`, and
  `user-research-controls`.

## Design Principles

### Use domains for the first retrieval question

The right top-level namespace answers: "Where should a Coding Agent look
first for this kind of change?" It must not mirror arbitrary source folders or
turn implementation layers into behavior contracts.

The selected domains are:

| Domain | First retrieval question | Count |
|---|---|---:|
| `agent` | Is this about Agent execution, delegation, command entry, queue, or provider launch? | 14 |
| `engine` | Is this about deterministic validation, schema, trace, CLI, or general Gate machinery? | 15 |
| `bundle` | Is this about durable run-bundle lifecycle, files, cache, or entry creation? | 9 |
| `research` | Is this research lifecycle, topic/evidence, phase content, or delivery behavior? | 22 |
| `verification` | Is this experiment execution, test fixtures, proof routing, or test infrastructure? | 8 |
| `workflow` | Is this Markdown phase/node routing, shared node content, rerun, or repair flow? | 11 |
| `governance` | Is this project policy, requirement traceability, versioning, feedback lifecycle, or HITL policy? | 5 |

The desired 5-20 range is a review heuristic, not a runtime rule. `research`
has 22 because it remains a coherent first retrieval domain; splitting it only
to meet a count would make Agent discovery worse. The catalog provides the
second filtering step.

### Preserve leaf names now

Every migration is mechanically:

```text
<old-leaf> -> <domain>/<old-leaf>
```

This preserves familiar names, requirement prefixes, and the reviewable
old-to-new correspondence. Future changes may improve a misleading leaf name,
but that must be a separately justified capability-identity rebaseline.

### Main specs remain truth; the catalog is only navigation

`openspec/specs/README.md` will be a thin catalog, not another source of
requirements. Each row contains only:

| field | purpose |
|---|---|
| `path` | Exact full capability ID used by OpenSpec. |
| `Purpose` | One concise navigation summary aligned with the main spec. |
| `keywords` | Terms that help an Agent form candidates. |
| `boundary / neighbors` | What it does not own and likely adjacent paths. |

The catalog must never duplicate requirement blocks, scenarios, delta history,
or implementation plans. If it conflicts with a main `spec.md`, the main spec
wins and the catalog is repaired in the same review.

`README.md` is deliberately safe at the `openspec/specs/` root: OpenSpec only
discovers files named `spec.md` below a capability directory. Do not put a
catalog or arbitrary note below an active change's `specs/` directory; that can
conflict with `skip_specs: true`.

## Coding-Agent Discovery Protocol

This protocol is the primary behavioral improvement. It applies before a
proposal declares a New or Modified capability.

```text
1. Read the short project convention in openspec/config.yaml.
2. Read openspec/specs/README.md and run openspec list --specs --json.
3. Use task terms and code facts to form a small candidate set of full paths.
4. Search those main specs by Purpose and requirement title.
5. Use openspec show <full-path> --type spec --json --requirements.
6. Read a complete requirement/scenario block only when it may be changed.
7. Record why each retained candidate is Modify, Verify-only, or Excluded.
8. Declare New only after recording why no existing candidate owns the behavior.
```

The proposal must include a small discovery table:

| candidate full path | evidence read | decision | reason |
|---|---|---|---|
| `agent/agentic-queue` | Purpose plus AGQ requirement titles | Modify | Existing queue admission behavior owns the change. |
| `engine/schema-core` | Purpose plus SCO requirement titles | Verify-only | Schema compatibility may be affected but no contract changes. |
| `agent/new-capability` | Catalog and neighboring specs searched | New | No existing behavior contract covers the observable obligation. |

The table is not a second machine authority. It gives a reviewer enough
evidence to challenge an unnecessary new capability before it becomes an
accepted main spec.

## Final Taxonomy Mapping

This mapping is the intended content of the future change-local
`taxonomy-map.yaml`. The plan is readable design material; the change-local
YAML is the authoritative execution input for the batch `git mv` command.

### `agent` - Agent execution, delegation, queue, and host entry (14)

| Existing leaf | Prefix | New full path |
|---|---|---|
| `agent-command-surface` | ACS | `agent/agent-command-surface` |
| `agent-context-routing` | ACR | `agent/agent-context-routing` |
| `agent-output-declaration` | AGO | `agent/agent-output-declaration` |
| `agent-testing` | AGT | `agent/agent-testing` |
| `agentic-queue` | AGQ | `agent/agentic-queue` |
| `cmd-subagent-environment` | CSE | `agent/cmd-subagent-environment` |
| `delegated-work-units` | DEW | `agent/delegated-work-units` |
| `local-deepseek-claude-launcher` | LDC | `agent/local-deepseek-claude-launcher` |
| `queue-input-validation` | QIV | `agent/queue-input-validation` |
| `subagent-directory-contract` | SDC | `agent/subagent-directory-contract` |
| `subagent-dispatch` | SUD | `agent/subagent-dispatch` |
| `subagent-node-contract` | SNC | `agent/subagent-node-contract` |
| `subagent-runtime-logging` | SRL | `agent/subagent-runtime-logging` |
| `work-unit-provenance-gate` | WPG | `agent/work-unit-provenance-gate` |

`local-deepseek-claude-launcher` remains a pre-trigger host tool by behavior;
it belongs under `agent` because an Agent/provider-launch concern is its
strongest discovery route. `queue-input-validation` moves here because its
primary reader question is queue admission, not the JavaScript layer that
implements validation.

### `engine` - Deterministic engine, CLI, schema, trace, and shared Gates (15)

| Existing leaf | Prefix | New full path |
|---|---|---|
| `check-inspect-feedback` | CHI | `engine/check-inspect-feedback` |
| `cli-exit-code-conventions` | CLE | `engine/cli-exit-code-conventions` |
| `cli-inspect-output-conventions` | IOC | `engine/cli-inspect-output-conventions` |
| `cli-phase-transition` | CPT | `engine/cli-phase-transition` |
| `framework-engine` | FRE | `engine/framework-engine` |
| `gate-content-dedup` | GAC | `engine/gate-content-dedup` |
| `gate-fork-router` | GAF | `engine/gate-fork-router` |
| `gate-skeleton` | GSK | `engine/gate-skeleton` |
| `gate-state-machine` | GAS | `engine/gate-state-machine` |
| `logger` | LOG | `engine/logger` |
| `logging-conventions` | LOC | `engine/logging-conventions` |
| `runtime-reentry-debuggability` | RRD | `engine/runtime-reentry-debuggability` |
| `schema-core` | SCO | `engine/schema-core` |
| `trace-writer` | TRW | `engine/trace-writer` |
| `transition-table` | TRT | `engine/transition-table` |

The old four-item `gate` bucket is intentionally folded into `engine`.
General Gate machinery is deterministic infrastructure; phase-specific gate
behavior stays in `research` beside its phase content.

### `bundle` - Run-bundle lifecycle and filesystem contracts (9)

| Existing leaf | Prefix | New full path |
|---|---|---|
| `artifact-persistence-recovery` | ARP | `bundle/artifact-persistence-recovery` |
| `bundle-data-isolation` | BUI | `bundle/bundle-data-isolation` |
| `bundle-map` | BUM | `bundle/bundle-map` |
| `bundle-start-from-here` | BUS | `bundle/bundle-start-from-here` |
| `cache-raw-web-content` | CRC | `bundle/cache-raw-web-content` |
| `cmd-bundle-instantiation` | CMI | `bundle/cmd-bundle-instantiation` |
| `file-observability` | FIO | `bundle/file-observability` |
| `reference-flat-format` | REF | `bundle/reference-flat-format` |
| `run-entry` | RUE | `bundle/run-entry` |

### `research` - Research lifecycle, content, evidence, and delivery (22)

| Existing leaf | Prefix | New full path |
|---|---|---|
| `canonical-topic-state` | CTS | `research/canonical-topic-state` |
| `content-delivery-experiments` | CDE | `research/content-delivery-experiments` |
| `content-delivery-gate-implementation` | CDG | `research/content-delivery-gate-implementation` |
| `content-delivery-phase-content` | CDP | `research/content-delivery-phase-content` |
| `evidence-extraction` | EEX | `research/evidence-extraction` |
| `final-delivery-backing` | FDB | `research/final-delivery-backing` |
| `plan-hostfile-sections` | PHS | `research/plan-hostfile-sections` |
| `post-final-recovery` | POF | `research/post-final-recovery` |
| `pre-research-experiments` | PRE | `research/pre-research-experiments` |
| `pre-research-gate-implementation` | PRG | `research/pre-research-gate-implementation` |
| `pre-research-phase-content` | PRP | `research/pre-research-phase-content` |
| `research-access-adapter` | REA | `research/research-access-adapter` |
| `research-return-map` | RRM | `research/research-return-map` |
| `research-styles` | RES | `research/research-styles` |
| `research-wave-experiments` | RWE | `research/research-wave-experiments` |
| `research-wave-gate-implementation` | RWG | `research/research-wave-gate-implementation` |
| `research-wave-phase-content` | RWP | `research/research-wave-phase-content` |
| `seed-topic-materialization` | STM | `research/seed-topic-materialization` |
| `user-research-controls` | URC | `research/user-research-controls` |
| `wave0-artifacts-directory` | WAD | `research/wave0-artifacts-directory` |
| `wave1-intake` | WAI | `research/wave1-intake` |
| `wave2-synthesis` | WTS | `research/wave2-synthesis` |

### `verification` - Experiments, test infrastructure, and proof routing (8)

| Existing leaf | Prefix | New full path |
|---|---|---|
| `experiment-agent-autorun` | EXA | `verification/experiment-agent-autorun` |
| `experiment-observability` | EXO | `verification/experiment-observability` |
| `experiment-ref-integrity` | EXR | `verification/experiment-ref-integrity` |
| `experiment-run-strategy` | ERS | `verification/experiment-run-strategy` |
| `experiment-shared-infra` | EXS | `verification/experiment-shared-infra` |
| `integration-tests` | INT | `verification/integration-tests` |
| `test-fixtures` | TEF | `verification/test-fixtures` |
| `verification-routing` | VER | `verification/verification-routing` |

### `workflow` - Markdown workflow structure, phase routing, and repair (11)

| Existing leaf | Prefix | New full path |
|---|---|---|
| `conditional-nodes` | COS | `workflow/conditional-nodes` |
| `dynamic-node-loading` | DYS | `workflow/dynamic-node-loading` |
| `fork-repair-converge` | FOR | `workflow/fork-repair-converge` |
| `playbook-runner` | PLR | `workflow/playbook-runner` |
| `repair-loop` | REL | `workflow/repair-loop` |
| `rerun-incremental-node` | REI | `workflow/rerun-incremental-node` |
| `rerun-topic-integration` | RTI | `workflow/rerun-topic-integration` |
| `shared-node-content` | SHC | `workflow/shared-node-content` |
| `silent-wave-execution` | SWE | `workflow/silent-wave-execution` |
| `workflow-directory-contract` | WDC | `workflow/workflow-directory-contract` |
| `workflow-node-contract` | WNC | `workflow/workflow-node-contract` |

### `governance` - Project lifecycle, policy, and accepted conventions (5)

| Existing leaf | Prefix | New full path |
|---|---|---|
| `change-feedback-loop` | CHF | `governance/change-feedback-loop` |
| `guidance-constitution` | GCO | `governance/guidance-constitution` |
| `hitl-ux` | HIU | `governance/hitl-ux` |
| `requirement-traceability` | RET | `governance/requirement-traceability` |
| `version-management` | VEM | `governance/version-management` |

The mapping totals **14 + 15 + 9 + 22 + 8 + 11 + 5 = 84**. It corrects the
old plan's inconsistent category counts.

## `config.yaml` Contract Changes

`openspec/config.yaml` is valuable because it injects context and
artifact-specific rules into future agent instructions. It is not a runtime
validator, and its `context` is already a 13 KB recurring prompt. The catalog
and full specifications must stay outside it.

Merge the following intent into the existing context and rules; do not replace
the project's current broader operating constraints.

```yaml
context: |
  Capability IDs use the project convention <domain>/<capability>.
  The full path is stable identity: main specs and change deltas use the same
  path. Main specs are behavior truth; openspec/specs/README.md is navigation
  only.

rules:
  proposal:
    - Before declaring a New or Modified capability, read the catalog or run
      `openspec list --specs --json`, then inspect relevant existing main specs.
    - Record full-path candidates, what was read, and why each is Modify,
      Verify-only, Excluded, or genuinely New. Prefer an existing contract.
  specs:
    - Every main or delta spec path is exactly
      `<domain>/<capability>/spec.md`; each segment uses kebab-case.
    - A delta uses the exact full capability path declared in the proposal and
      matching the main spec. Do not create a near-duplicate without catalog
      and candidate-spec evidence.
```

The existing flat examples in `rules.specs` must be replaced, including both:

```text
openspec/specs/<capability>/spec.md
openspec/changes/<name>/specs/<capability>/spec.md
```

The proposal rule is intentionally more specific than the default OpenSpec
instruction. It operationalizes "research existing specs first" into a
reviewable reuse-first decision.

Do not fork the built-in `spec-driven` schema in this migration. Precise
project rules plus a deterministic checker are the smaller control loop. A
project-local schema is a future option only if agents repeatedly ignore these
rules despite the checker feedback.

## Registry and Catalog Changes

### `openspec/governance/req-registry.yaml`

Requirement IDs and their prefixes remain stable. Update the registry's
self-documenting ownership coordinates for live capabilities:

- `prefixes:` values become full paths, for example
  `ACS: agent/agent-command-surface`.
- Each live capability group heading becomes its full path, for example
  `# agent/agent-command-surface`.
- The registry's explanatory comments and the matching `config.yaml` rule use
  "capability path", not a bare `capability-name` directory.
- Retired prefixes that intentionally have no spec directory retain their
  historical label and explicit retired/no-directory explanation; do not invent
  a new path for them.
- Do not bulk-rewrite ordinary requirement prose merely to repeat the path.
  Keep that diff narrow unless a line asserts an old physical path.

### `openspec/specs/README.md`

Create the catalog in the same change. It must have one row for every live
main spec and no stale flat paths. Use domain headings and the exact full
paths from the mapping above. Before authoring a row, repair the four `TBD`
Purposes listed in the baseline so the catalog never has to invent an
untraceable description.

Purpose repair is a targeted main-spec hygiene task: it must describe the
existing requirement body without changing its behavior. Review it explicitly
instead of treating it as incidental wording cleanup.

## Deterministic Guardrails

Configuration directs the Agent; it cannot enforce this taxonomy. Extend the
project governance surface with one focused `check-capability-taxonomy.mjs`
and matching `node:test` coverage under `tests/integration/governance/`.

It must check only these direct facts:

1. Every live main spec is exactly
   `openspec/specs/<approved-domain>/<kebab-case-leaf>/spec.md`.
2. Every non-archived delta spec is exactly
   `openspec/changes/<change>/specs/<approved-domain>/<kebab-case-leaf>/spec.md`.
3. No active main or delta path is flat, deeper than two segments, or in an
   unapproved domain.
4. Every live main spec has exactly one catalog row, and every catalog row
   resolves to a live main spec.
5. Each live `prefixes:` target resolves to the same full main-spec path.

This checker deliberately does **not** judge whether a domain is semantically
ideal, whether a catalog keyword is good, or whether an Agent's proposal
reasoning is sound. Those are human/Agent judgments. It gives an immediate,
honest failure when the durable path contract or navigation inventory drifts.

Add it to the existing closeout verification rules alongside:

```text
node openspec/governance/check-project-reqs.mjs
node openspec/governance/check-project-specs.mjs
node openspec/governance/check-capability-taxonomy.mjs
```

## Real Impact Surface

The earlier assertion that only `config.yaml` contains direct path knowledge is
incorrect. Treat every occurrence according to its role:

| Surface | Required handling |
|---|---|
| `openspec/specs/` | Move every one of the 84 directories via the approved mapping. Preserve leaf content and requirement IDs. |
| `openspec/config.yaml` | Update flat-path wording, registry convention wording, and add the discovery protocol. |
| `openspec/governance/req-registry.yaml` | Update live prefix targets and group headings to complete paths. |
| `openspec/governance/check-project-specs.mjs` | Update flat-layout comments; keep recursive structural validation. |
| New taxonomy checker and tests | Add the only deterministic enforcement for this project's two-segment convention and catalog completeness. |
| `guidelines/change-feedback-loop.md` | Update its canonical accepted-spec link to the new governance path. |
| `tests/integration/md/canonical-harness-vocabulary-contract.test.mjs` | Update its seven concrete accepted-spec paths. |
| `tests/integration/md/agent-experiment-autorun-terminology.test.mjs` | Replace leaf-only path construction and its flat expected path with the full-path mapping. |
| Governance test fixtures | Retain deliberately flat fixture paths where they test generic recursive behavior; add nested taxonomy cases rather than globally rewriting fixtures. |
| `openspec/changes/archive/` | Do not rewrite historical changes. They describe the old identity truthfully. |
| `DEEP_RESEARCH_HARNESS/` | No path migration is currently required by the focused reference scan; keep it out of scope unless a concrete reference is discovered during apply. |

`git status` cannot be used to assert that *all* changes are renames: this
change intentionally modifies configuration, registry, guidance, catalog,
checker, and tests. Instead verify that the 84 main spec contents are mapped
one-to-one and that no content rewrite was hidden inside a move.

## Migration Plan

This must be implemented as a dedicated OpenSpec governance change, not as a
direct worktree operation. It changes the project control-plane contract used
by every future proposal and delta, even though it changes no Harness runtime
behavior.

The change should set `.openspec.yaml` to `skip_specs: true`: it has no new or
modified behavioral requirement delta of its own. That marker does not move
main specs automatically; the controlled rebaseline remains explicit apply
work in the approved task list.

### 1. Propose and freeze the identity boundary

1. Create a dedicated change, for example
   `rebaseline-capability-taxonomy`.
2. Record the full mapping above as
   `openspec/changes/<change>/taxonomy-map.yaml`, not as a script input in
   `_backlog/`. This makes it part of the review and apply audit surface.
3. Re-run `openspec list --json`. If any active change now touches an old or
   target path, either archive/cancel it before the move or explicitly rebase
   its delta to the exact new full path in the same review.
4. Capture a before snapshot of the 84 paths, their requirement counts, and
   their requirement-ID headers. The migration preserves these facts.

### 2. Establish the navigation contract before moving files

1. Finalize the domain map and approved-domain list in the checker.
2. Repair the four `TBD` Purpose sections against their existing requirement
   bodies, with no requirement semantic change.
3. Build `openspec/specs/README.md` from the reviewed mapping and Purpose
   summaries. Add keywords/boundaries only as navigation metadata.
4. Update `config.yaml`, the registry, guidance, literal references, and
   affected tests to the new full-path convention.

### 3. Move main specs and active deltas

1. Use the approved map to run one `git mv` per main-spec directory, for
   example:

   ```bash
   git mv openspec/specs/agent-command-surface \
     openspec/specs/agent/agent-command-surface
   ```

2. If an active change exists, move/rewrite its delta to the exact matching
   nested location before that change can archive.
3. Do not leave a flat compatibility copy, symlink, alias spec, or empty
   placeholder behind. A compatibility copy is a second capability ID, not an
   alias.

### 4. Validate the rebaseline

Run all of these against the final worktree:

```bash
openspec list --specs --json
openspec show agent/agent-command-surface --type spec --json --requirements
openspec validate --specs --strict
node openspec/governance/check-project-specs.mjs
node openspec/governance/check-project-reqs.mjs
node openspec/governance/check-capability-taxonomy.mjs
node --test tests/integration/governance/check-capability-taxonomy.test.mjs
node --test tests/integration/md/canonical-harness-vocabulary-contract.test.mjs
node --test tests/integration/md/agent-experiment-autorun-terminology.test.mjs
```

For every active change remaining after the migration, also run:

```bash
openspec validate <change-name> --type change --strict
```

The before/after evidence must show:

- exactly 84 live full-path capability IDs;
- one mapped successor for every old leaf and no flat main-spec IDs;
- unchanged requirement count and `> req:` header set per moved spec, except
  the explicitly reviewed Purpose hygiene edits;
- one catalog row and one live registry owner per main spec;
- no active delta capable of recreating an old flat path.

## Risks and Controls

| Risk | Control |
|---|---|
| A flat active delta recreates an old capability after archive. | Freeze/rebase active changes before the move; checker rejects a flat active delta. |
| An Agent follows the upstream flat template. | Explicit `proposal` and `specs` rules plus a path checker. |
| The catalog becomes a second stale specification. | Keep it thin, make main spec authoritative, and check path completeness only. |
| A new domain becomes a casual bucket. | Checker permits only the approved seven; adding a domain requires a deliberate governance change. |
| Mechanical moves hide accidental spec edits. | Preserve a mapping/before snapshot and review main-spec diffs independently of config/test changes. |
| Large `config.context` dilutes attention. | Put only stable path/discovery rules in context; leave catalog and spec content on demand. |
| `TBD` Purpose rows make discovery unreliable. | Repair the four placeholders before catalog publication. |
| Historical records become false. | Leave archived changes untouched. |

## Sources

The complete primary-source research record is retained in
[two-level-specs-categorization.primary-sources.md](two-level-specs-categorization.primary-sources.md).
The decisive upstream sources are:

- [Recursive capability discovery](https://github.com/Fission-AI/OpenSpec/blob/v1.7.0/src/utils/spec-discovery.ts#L11-L62)
- [Delta-to-main same-path mapping](https://github.com/Fission-AI/OpenSpec/blob/v1.7.0/src/core/specs-apply.ts#L48-L77)
- [Nested delta parsing](https://github.com/Fission-AI/OpenSpec/blob/v1.7.0/src/core/parsers/change-parser.ts#L57-L75)
- [List output shape](https://github.com/Fission-AI/OpenSpec/blob/v1.7.0/src/core/list.ts#L167-L218)
- [Exact-ID show resolution](https://github.com/Fission-AI/OpenSpec/blob/v1.7.0/src/commands/spec.ts#L81-L123)
- [Requirement-only `RENAMED` grammar](https://github.com/Fission-AI/OpenSpec/blob/v1.7.0/src/core/parsers/change-parser.ts#L151-L193)
- [Default flat authoring guidance](https://github.com/Fission-AI/OpenSpec/blob/v1.7.0/schemas/spec-driven/schema.yaml#L15-L22)
- [Official domain organization guidance](https://github.com/Fission-AI/OpenSpec/blob/v1.7.0/docs/existing-projects.md#L103-L119)
- [Current project configuration](../../openspec/config.yaml)
- [Current requirement registry](../../openspec/governance/req-registry.yaml)
