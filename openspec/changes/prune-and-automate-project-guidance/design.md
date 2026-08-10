## Context

See `proposal.md` for the measured motivation. Change A completed the canonical-path migration;
this change operates only on current project guidance, root discovery interfaces, OpenSpec planning
context, and static documentation contracts. The controlling modified behavior is GCO-008 in
`specs/governance/guidance-constitution/spec.md`.

The design must preserve accepted Charter -> Context entry routes, Harness selected-entry behavior,
and configuration-delivered feedback-lifecycle guidance. It must also preserve the user constraint
that `.agents/skills/**` and `.claude/skills/**` are existing assets, not migration or test-delivery
targets.

## Goals / Non-Goals

**Goals:**

- Make the mandatory project entry materially smaller while preserving the authority distinctions
  required before task-specific work.
- Give each repeated meaning one full owner and make all other appearances short trigger pointers.
- Make `openspec/README.md` a demand-driven router and keep model/operation reads selective.
- Protect deterministic current-topology facts with focused integration tests while leaving semantic
  assessment to the Agent/human review.

**Non-Goals:**

- Reopen Change A's canonical path migration, change Harness runtime behavior, alter selected
  research-entry routing, or introduce an alternate compatibility root.
- Change accepted logging, runtime, schema, CLI, receipt, trace, or Gate behavior.
- Modify anything under `.agents/skills/**` or `.claude/skills/**`, or use either directory as a
  project-guidance delivery mechanism.
- Define a fixed prose length as a capability verdict or make a test judge conceptual quality.

## Decisions

### 1. Keep a three-part entry contract, with distinct stop points

The Charter remains the mandatory project-boundary read, but its admission review will retain only
facts every substantive task needs: project nature, authority split, evidence honesty, OpenSpec
lifecycle, and a trigger router. Root `CONTEXT.md` remains the mandatory vocabulary alignment
surface, but keeps compressed high-frequency distinctions and points complete vocabulary to its
canonical model. `openspec/README.md` becomes the next optional router: a reader arrives there only
when a task needs a role/authority choice beyond the mandatory entry.

This makes the reader-facing `control map` a precise semantic level. Its bounded question is
"given this task or uncertainty, what is the smallest authoritative surface to read next?" Its
required distinctions are constitution vs model vs operation vs accepted behavior vs runtime truth.
The normal stop is one selected surface or an explicit no-path/authority boundary; it is not a
full-project reading list. This is a real semantic improvement, not a new runtime state, command,
or Engine-owned view.

| Meaning | Full owner | Other surfaces may retain |
|---|---|---|
| Enduring project authority and admission law | `openspec/constitution/project-charter.md` | one-line route/pointer |
| Complete execution terminology | `openspec/guidance/models/agentic-execution-model.md` | compressed distinction/pointer |
| Root vocabulary orientation | `CONTEXT.md` | no second full glossary |
| Operation procedure and authority limit | the applicable `openspec/operations/*.md` plus accepted/executable authority | trigger/pointer only |
| Lifecycle-delivered operation guidance | `openspec/config.yaml` `operations` | `openspec instructions` response only |
| Current capability behavior | accepted `openspec/specs/` | no prose cache |
| Current runtime fact | selected run bundle | no guidance copy |

Alternative considered: move all entry prose into `openspec/README.md`. Rejected because root
adapters must remain independently discoverable and `README.md` would again become a mandatory
second Charter/glossary.

### 2. Review content by ownership before editing prose

Apply starts with a duplication map for the Charter, Context, control map, config, models,
operations, and relevant specs. Each candidate passage receives one disposition: retain at its
owner, compress to a trigger pointer, move to an identified owner, or delete because its fact is
cheaply inspectable from code/config/directory state. The Apply record must name the owner before
removing any reader-facing explanation.

Each retained model must answer one bounded reader question and expose a normal conclusion or
unknown. Each retained operation must state its trigger, ordered legal steps, completion condition,
and authority limit. A review can retain, narrow, rename, or delete a document, but a rename or
deletion is legal only when current links and the replacement owner are explicit. This keeps the
existing Chain/Queue/Work Unit names unless semantic review demonstrates a more precise reader
stop point; cosmetic terminology churn is not authorized.

Alternative considered: set a global word-count target and mechanically trim every document.
Rejected because it could delete an essential distinction or make a non-owning surface obscure.
Measurements remain review evidence, not a standalone completion predicate.

### 3. Keep configuration as operation delivery, not a duplicate guidance suite

`openspec/config.yaml` remains the source for operation guidance returned by `openspec instructions`,
including the feedback-lifecycle apply/archive directions. Its general planning context and rules
may be compressed when their full explanation has another canonical owner, but the change must not
erase the current operation delivery route or make operation skills carry project-owned path text.

Alternative considered: change existing skill files to point at the new operation surface. Rejected:
the stable entry sources already consume `openspec instructions`, and configuration is the correct
project-owned delivery boundary.

### 4. Add one bounded static topology contract

Keep the existing constitution and entry-route tests as their focused owners. Add or extend one
integration-level documentation contract under `tests/integration/md/` to verify only current,
deterministic facts: canonical role roots and files, role-specific frontmatter and deferred
authority coordinates, resolvable current internal Markdown links within the selected guidance
surfaces, absence of a duplicate/mirror guidance root, bounded live old-path references, and the
already accepted root/Harness route synchronization boundary.

The contract parses only repository-local Markdown links it owns, resolves file coordinates
relative to the declaring document, and reports the broken coordinate. It excludes external URLs,
historical archive artifacts, runtime bundles, and semantic prose judgment. Existing
`agent-context-routing-contract.test.mjs` remains the owner of entry ordering; the new/extended
topology test calls it only through the normal selected test command, not by duplicating its
assertions.

Alternative considered: add an Engine checker or a broad repository scanner. Rejected because a
focused `node:test` contract is sufficient for static project topology, avoids a new command and
derived control chain, and can keep exclusions explicit.

### 5. Preserve Agent judgment and responsibility boundaries

The Agent performs the duplication map, constitutional admission review, model/operation reader
analysis, and closeout semantic review. Node tests verify stated paths, links, frontmatter, and
route blocks; they cannot establish whether prose is useful or whether a design abstraction earns
its semantic level. The user has already supplied the scope boundary; ordinary reversible
documentation/test work remains Agent-executed during Apply. No new permission, lifecycle state,
or recovery controller is introduced.

This is the short legal control loop: direct current document/config fact -> focused static failure
when a deterministic coordinate drifts -> named owning file -> Agent repair -> same test rerun.
It replaces duplicate guidance and scattered topology assertions rather than adding a second
interpretation layer.

## Risks / Trade-offs

- [A shorter Charter loses a needed universal distinction] -> apply the constitutional admission
  review section-by-section, preserve the required core, and have closeout review compare the
  resulting entry against accepted routes.
- [Deduplication hides an important procedure] -> require an explicit canonical owner, link repair,
  and an operation-specific trigger/completion review before removal.
- [Static link checks overreach into historical/runtime surfaces] -> keep the selected roots and
  exclusion set in the focused integration contract; do not recursively scan archives or bundles.
- [A new topology test becomes another authority] -> assert only deterministic coordinates and
  state its repair target; accepted specs and canonical documents retain semantic authority.
- [Config trimming breaks lifecycle guidance delivery] -> retain configuration-delivered
  `operations.apply` / `operations.archive` guidance and rerun feedback-finalizer conformance.

## Migration Plan

1. Record current measurements and a duplication/ownership map before target edits.
2. Apply the Charter admission review, then narrow Context, control map, config, models, and
   operations according to the mapped owner decisions.
3. Repair links and route pointers while preserving all Change A canonical paths and root/Harness
   entry behavior.
4. Implement focused static topology coverage and update only the tests whose owned assertions
   change.
5. Run selected integration regressions, project governance checks, semantic closeout review, delta
   sync, and the governed archive finalizer. Rollback is the selected change diff; do not restore a
   duplicate guidance tree or alter stable skill sources as a workaround.

## Open Questions

None. The logging-operation and mechanism-name reviews use the explicit retain/narrow/rename/delete
decision rule above, so their outcome does not require a separate capability or a new scope decision.
