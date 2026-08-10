# Apply Evidence: Project Guidance Simplification

## Scope And Boundary

This record covers Change B Apply decisions for GCO-008. It is review evidence,
not a behavior contract or a replacement for accepted specs. The user supplied
the Apply entry on 2026-08-10. `.agents/skills/**` and `.claude/skills/**` are
explicitly excluded from this change and remain unmodified.

## Before Measurement

Measurements were captured before any target guidance edit. They are review
signals, not a quality or completion threshold.

| Surface | Lines | Words | Apply decision |
|---|---:|---:|---|
| `openspec/constitution/project-charter.md` | 379 | 3,165 | narrow to the universal entry core |
| `CONTEXT.md` | 487 | 3,029 | retain a compact orientation, point full vocabulary to its canon |
| `openspec/README.md` | 165 | 2,160 | replace the sequential index and duplicate glossary with a trigger router |
| `openspec/config.yaml` | 335 | 2,233 | compress only repeated prompt context; retain rules and operation delivery |
| `AGENTS.md` / `CLAUDE.md` | 72 / 72 | 722 / 723 | retain paired entry adapters |
| `DEEP_RESEARCH_HARNESS/AGENTS.md` / `CLAUDE.md` | 36 / 36 | 212 / 213 | retain paired selected-entry adapters |
| `agentic-execution-model.md` | 236 | 1,898 | retain as the complete execution terminology canon |
| `agentic-queue-mechanism.md` | 322 | 3,586 | retain as the Queue reasoning model |
| `agentic-subagent-mechanism.md` | 248 | 1,676 | retain as the delegated-work model |
| `agentic-workflow-mechanism.md` | 230 | 1,926 | retain as the Chain/workflow model |
| `framework-runtime-boundary.md` | 358 | 2,027 | retain as the framework/run boundary model |
| `change-feedback-loop.md` | 112 | 867 | retain as the feedback-lifecycle operation procedure |
| `command-experiments.md` | 163 | 1,362 | retain as the experiment operation procedure |
| `logging-conventions.md` | 126 | 666 | retain as the observability operation procedure |

## Ownership Map

| Meaning | Full owner | Non-owning surfaces after Apply |
|---|---|---|
| Universal project purpose, Agent/Markdown/Engine boundary, evidence honesty, and change lifecycle | `openspec/constitution/project-charter.md` | one-line orientation only |
| Design review order | the three constitutional companions | Charter, control map, and config give the ordered trigger only |
| Complete Chain/Queue/Work Unit and delegated-work vocabulary | `openspec/guidance/models/agentic-execution-model.md` and the focused mechanism model | `CONTEXT.md` keeps only distinctions needed to select the owner |
| Reusable framework versus mutable run state | `openspec/guidance/models/framework-runtime-boundary.md` | Charter and Context retain the irreducible ownership boundary |
| Project vocabulary orientation | `CONTEXT.md` | no second glossary |
| Next authoritative reading surface | `openspec/README.md` | root and Harness adapters retain their fixed entry route |
| Project-specific lifecycle instruction delivery | `openspec/config.yaml` `operations.apply` / `operations.archive` | `openspec instructions` output only |
| Detailed feedback-lifecycle procedure | `openspec/operations/change-feedback-loop.md` plus accepted behavior and finalizer | config gives delivery guidance, not a second procedure |
| Current accepted behavior | `openspec/specs/` | routers point to the relevant accepted spec |
| Current runtime fact | the selected current run bundle | no guidance cache |

## Charter Admission Review

| Existing Charter material | Decision | Canonical owner after Apply |
|---|---|---|
| Project nature and four-way authority split | retain, compressed | Charter |
| New-thing semantic question | retain as ordered trigger | semantic-precision companion |
| Long MUST/MUST NOT catalog | compress to universal invariants | Charter; local constraints remain in accepted contracts or adapters |
| Authority map and conflict posture | retain, compact | Charter |
| Quick router and directory decision table | move to trigger routing | `openspec/README.md` |
| Framework/run directory detail | compress to ownership boundary | framework-runtime-boundary model |
| Repeated operating model and Check/Inspect/Advice explanation | compress to ownership split | Charter plus execution model / executable contracts |
| Error, guardrail, and development-flow detail | retain only evidence honesty and lifecycle rule | Charter; detailed procedure stays with operation/config/accepted spec |
| Tooling, test placement, and path inventory | remove from Charter | root adapters, config, accepted routing spec, and inspectable repository state |
| Guidance-change checklist | remove as a second review mechanism | Charter triad and change lifecycle |

No removed Charter meaning is left without a current owner. The Charter remains
constitutional and carries no `defers_to` dependency.

## Models And Operations Review

| Document | Decision | Bounded reader question and normal stop | Authority limit |
|---|---|---|---|
| `agentic-execution-model.md` | retain | How do Chain, Queue, Work Unit, Agent, and Engine compose? Stop at the selected focused model or accepted contract. | terminology, not runtime truth |
| `agentic-workflow-mechanism.md` | retain | How does phase-to-phase Chain/handoff work? Stop at the applicable executable or accepted workflow contract. | no behavior override |
| `agentic-queue-mechanism.md` | retain | How does phase-local demand differ from delegated work? Stop at Queue contract/implementation. | no research judgment |
| `agentic-subagent-mechanism.md` | retain | What bounds delegated work and Submit provenance? Stop at the Work Unit contract. | no workflow authority |
| `framework-runtime-boundary.md` | retain | Which facts belong to reusable framework assets versus a selected run? Stop at the selected bundle or framework contract. | no current-run verdict |
| `change-feedback-loop.md` | retain | When does a feedback-lifecycle change require review and finalization? Stop after the legal procedure and authoritative checks. | accepted spec and finalizer remain authority |
| `command-experiments.md` | retain | How is a command experiment launched and proven? Stop at its selected experiment/spec/host contract. | no runtime verdict override |
| `logging-conventions.md` | retain | How are status, trace, and logs distinguished during operation? Stop at the relevant logging/executable contract. | logs are not verdicts |

The documents already expose distinct reader boundaries and authority limits.
No name has a demonstrated semantic defect, and deleting or renaming one would
create link and reader churn without reducing an owned duplicate. The Apply
change therefore retains them and makes them demand-driven through the control
map rather than shortening them mechanically.

## Triad And Responsibility Review

The reader question for this change is: "Which current surface owns the next
guidance decision, without making every reader reconstruct the entire project?"

- **Semantic precision:** role roots, the control map, Context, models, operations,
  accepted specs, and runtime truth remain distinct. The normal stop is one
  selected owner or an explicit no-path boundary.
- **Simple reliable control:** a direct router plus one focused topology test
  replaces the sequential index, repeated glossary, and scattered topology
  assertions. The net simplification is fewer duplicated statements and one
  named repair surface for deterministic path drift.
- **Helper-oriented responsibility:** the user already selected scope; the Agent
  performs review and reversible documentation/test repair; Node asserts only
  static topology facts. Neither the router nor a test grants permission,
  judges prose value, or creates runtime authority.

## Apply Preflight

The planning record already passed requirement traceability, verification
routing, and semantic closure in plan mode. Immediately before the first target
edit, Apply reran them in this order:

1. `node openspec/governance/check-project-reqs.mjs --mode plan` -- PASS: 644
   registered IDs, 53 retired, 0 orphan, and 746 main-spec/active-delta occurrences.
2. `node openspec/governance/check-verification-routing.mjs --change prune-and-automate-project-guidance --mode plan`
   -- PASS: 7 claims.
3. `node openspec/governance/check-semantic-closure.mjs --change prune-and-automate-project-guidance --mode plan`
   -- PASS.

## Review Finding Disposition

This review found no new ordinary repair beyond the approved tasks: 3.1--3.5
own the document changes, and 4.1--4.3 own deterministic coverage and its
verification. No finding proposes a skill-directory edit, a runtime behavior
change, a new Engine controller, or a semantic-quality assertion.

## Applied Simplification And Focused Verification

- Charter: 379 lines / 3,165 words became 100 lines / 621 words. It now carries
  only the constitutional core, authority boundary, lifecycle, and ordered triad.
- Context: 487 lines / 3,029 words became 74 lines / 629 words. It keeps compact
  high-frequency distinctions and links full owners instead of duplicating them.
- Control map: 165 lines / 2,160 words became 52 lines / 535 words. It now routes
  by reader trigger and explicitly rejects a sequential reading list.
- Config: 335 lines / 2,233 words became 217 lines / 1,473 words. Repeated prompt
  context was replaced by owner pointers; `operations.apply` and
  `operations.archive` remain configuration-delivered and parse successfully.
- Models and operation documents remain unchanged, by the recorded retain
  decisions. Root and Harness adapters remain unchanged and synchronized.

Focused command:

```text
node --test tests/integration/md/project-guidance-topology-contract.test.mjs \
  tests/integration/md/evolution-direction-governance.test.mjs \
  tests/integration/md/agent-context-routing-contract.test.mjs \
  tests/integration/md/dpt-research-entry-routing-contract.test.mjs \
  tests/integration/governance/change-feedback-finalizer.test.mjs \
  tests/integration/md/verification-routing-knowledge-surfaces.test.mjs \
  tests/integration/md/agent-experiment-autorun-terminology.test.mjs
```

Result: PASS, 39 tests across 7 suites. The topology contract checks only
current coordinates, frontmatter, selected links, paired entry blocks, mirrors,
and bounded live old-path references. It does not assess prose value, abstraction
quality, or research sufficiency.

## Route Preservation And Residual Risk

The unchanged root adapters remain 72 lines each and the unchanged Harness
adapters remain 36 lines each. Their paired Charter -> Context pre-read blocks
and research-entry behavior passed the selected contracts. `git diff --check`
passes, and the change has no diff under `.agents/skills/**` or
`.claude/skills/**`.

The residual risk is intentionally bounded: a focused topology test cannot
decide whether a reader finds a model useful, and it does not recursively judge
historical archives or runtime bundles. Those remain Agent/human review and
selected-run responsibilities. The retained detailed models and operations are
the deliberate full owners for their bounded questions, so their length is not
an unowned entry burden.

## Governance Verification

The following commands passed after the Apply implementation:

```text
openspec validate prune-and-automate-project-guidance --strict
node openspec/governance/check-capability-discovery.mjs --change prune-and-automate-project-guidance
node openspec/governance/check-capability-taxonomy.mjs
node openspec/governance/check-project-reqs.mjs --mode plan
node openspec/governance/check-verification-routing.mjs --change prune-and-automate-project-guidance --mode assets
node openspec/governance/check-semantic-closure.mjs --change prune-and-automate-project-guidance --mode assets
node openspec/governance/check-project-specs.mjs
```

Results: strict validation PASS; discovery PASS; taxonomy PASS for 85 nested
main specs; requirement traceability PASS with 644 registered IDs, 53 retired,
0 orphan, and 746 occurrences; seven verification assets PASS; semantic closure
assets PASS; and main-spec structure PASS with 0 violations.

## Delta Sync And Actual-Diff Review

The sole selected delta,
`specs/governance/guidance-constitution/spec.md`, was merged through the
Agent-owned sync route into
`openspec/specs/governance/guidance-constitution/spec.md`. The main GCO-008
requirement now retains the existing triad/topology contract and adds the
demand-driven-control-map and bounded-topology-coverage paragraphs plus their
two scenarios. A direct comparison of the delta requirement block and the
main-spec requirement block is identical. `openspec validate --specs`, strict
change validation, `check-project-reqs --mode plan`,
`check-project-specs`, verification-routing assets mode, semantic-closure
assets mode, and the seven selected integration suites all passed after sync.

The semantic-closure record remains honestly `not_applicable`. The actual
change scope contains current guidance prose and configuration compression, one
main-spec clarification, selected change artifacts, the P6 tracker update, and
static Markdown-topology tests. It introduces no catalogued deterministic
runtime fact family, resolver, producer, verdict consumer, or runtime
verification authority. The topology test reports only repository-local path,
frontmatter, link, mirror, and adapter coordinates; it does not establish a
runtime fact or semantic conclusion. The semantic-fact-family catalog has no
guidance/topology/documentation/configuration family that this scope changes.

The actual-diff review found the ownership map and implementation coherent:

- the Charter, Context, and control map now route to their recorded canonical
  owners without changing runtime or accepted capability behavior;
- `openspec/config.yaml` retains `operations.apply` and `operations.archive`
  byte-equivalent after YAML parsing against `HEAD`;
- root and Harness entry adapters, `.agents/skills/**`, and `.claude/skills/**`
  have no diff; and
- `git diff --check` passes, while focused static coverage owns the new
  deterministic topology assertions.

The review found one governance repair: task 5.7 made native finalizer success
its checkbox completion condition, but the finalizer intentionally rejects any
pending ordinary task before it runs. Completed task 5.7a changed it to the
repository's established immediately-before-finalizer convention and preserves
the required restore-on-failure result. The previously pending delta sync was
already owned by task 5.5 and is complete.

## Archive Preflight And Fresh Closeout Review

After the 5.7a repair, archive-scoped requirement traceability passed with 644
registered IDs, 53 retired IDs, zero orphan IDs, and 746 main-spec/active-delta
occurrences. Main-spec structure passed for all 85 main specs with zero
violations, and strict selected-change validation and `git diff --check` also
passed.

The fresh closeout review re-read the selected change artifacts, the synced
GCO-008 requirement, the actual scoped diff, the semantic-closure rationale,
and the selected verification results. It found no remaining discrepancy between
the proposed ownership model, the applied guidance/configuration/test changes,
and the accepted main-spec contract. No ordinary repair task remains. The sole
remaining action is the governed archive transition under task 5.7.
