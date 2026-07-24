## Context

The active Gate definition schema already distinguishes definition-owned and checker-owned findings. Wave formal Gate and inspect already consume shared evaluator facts. Wave1 already source-masks dependent depth-review subrules into `masked_rule_ids` and does not project those names into inspect repair text; this change locks that root-first behavior rather than reconstructing its masked children. Degradation eligibility remains adapter-local rather than one parsed policy path. Production evidence establishes that authority roots must remain fail-closed; it does not establish a successful Wave2 degradation.

## Goals / Non-Goals

**Goals:**

- Have each Wave formal/inspect command invoke the same pure evaluator once, then retain its stable independent primary roots and source-level prerequisite mask context.
- Make only Wave0/Wave1/Wave2 formal adapters consume one definition-metadata eligibility projection, defaulting every parsed rule to ineligible.
- Preserve existing formal/inspect separation, stable rule IDs, submitted-backing authority, and current Wave0/Wave1 quality-only policy.
- Prove a positive Wave2 adapter path only through an inactive schema-valid fixture and prove current authority-root failures remain failed.

**Non-Goals:**

- No generic dependency graph, topological scheduler, controller, retry tree, state field, or persisted grouping result.
- No automatic downgrade, partial pass, hand-written Gate verdict, new active Wave2 eligible rule, or relaxation of queue/receipt/provenance/binding/structure/trace/lifecycle roots.
- No change to Agent semantic repair ownership, transition routing, work-unit submit, reference parser, or producer/closeout contracts.

## Decisions

### D1. Evaluator findings remain the single authority

The active schema-parsed definition and checker-owned findings remain the direct Source of Record. A local evaluator guard reports an absent/unparseable prerequisite once and records explicitly downstream rule IDs in `masked_rule_ids`; it does not manufacture one finding per skipped child, build a graph, or infer new relations. If an evaluator actually emits a dependent finding, that finding alone uses `masked_by_rule_id`; the shared projector omits it from primary hints. The shared result projector derives `failed_rule_ids`, `hints[]`, inspect detail, and advice from this structured result rather than from text.

Alternative considered: a generic dependency graph. Rejected because the existing direct prerequisite relationships are local, and a graph would add state, ordering semantics, and a second failure model without new authority.

### D2. Eligibility is definition metadata, false by default

The common Gate rule schema accepts and parses `degradation_eligible: boolean`, defaulting it to `false`; this preserves existing definitions but does not make non-Wave Gates consume or migrate the field. A narrow pure Wave helper receives the parsed definition and the structured formal `ruleEvaluation`. It considers only `finding.classification === 'blocking'` findings without `masked_by_rule_id`, looks up each finding's stable `rule_id` by exact equality in `definition.rules`, and allows a candidate only when both the finding and its matching rule are definition-owned `required_floor` roots and the parsed rule field is `true`. It never derives IDs from `finding.id`, strips topic suffixes, or uses `failed_rule_ids` as a second source.

The helper returns only the candidate decision and sorted eligible `rule_id`s. The formal wrappers retain their existing fatigue count, lifecycle preflight, normal-pass route lookup, durable attempt write, result construction, and diagnostics; they decide whether a candidate may become the already-existing degraded handoff. Thus a trace, routing, lifecycle, configuration, direct-output, queue, receipt, provenance, binding, required-structure, checker-owned, or unmatched root is ineligible even if some other failed floor is marked eligible. Existing Wave0/Wave1 soft-floor values are preserved; Wave2 production definitions remain entirely ineligible.

Alternative considered: per-adapter allowlists. Rejected because they duplicate policy and permit adapter drift such as BUG-113.

### D3. Formal Gate owns the handoff; inspect exposes the same facts

Each formal Gate and inspect command invokes the same pure Wave evaluator once for its core contract roots, so the resulting unmasked root identities and repair coordinates are equivalent. Their format-specific additions remain after that projection and may not reconstruct masking or eligibility from text. The formal wrapper alone evaluates lifecycle/durability/routing and emits any existing degraded handoff. Neither inspect nor hints can authorize a route.

### D4. Inactive fixture proves capability without changing policy

One test-only inactive Wave2 definition fixture may declare an eligible definition-owned `required_floor` rule. It is parsed through the production schema and supplied to the same pure eligibility helper used by the three formal Wave wrappers; it is not loaded by the production CLI inventory and does not require a test-only CLI injection seam. This demonstrates the shared helper's Wave2 capability while preserving the accepted empty production Wave2 eligible set.

### D5. Constitutional admission

| Question | Decision |
|---|---|
| Direct authority | Parsed active Gate definition, one formal evaluator result, and existing formal lifecycle result. |
| Legal loop | Finding -> explicit source-level parent/dependent mask or independent root -> exact rule-ID lookup -> existing exact repair or existing eligible formal handoff -> same checkpoint. |
| Net simplification | One pure eligibility helper and local guards replace expanded hint walls, local allowlists, and suffix-stripping; no graph/controller/state is added. |
| Human boundary | Only a structured user/external/missing-contract finding; ordinary legal repair remains Agent work. |
| Proof | Unit/integration/deterministic E2E prove deterministic behavior; inactive fixture proves adapter capability only. |

## Risks / Trade-offs

- [Risk] Root reduction hides independent failures. -> Mitigation: only explicitly downstream rule IDs enter mask context; independent finding identity remains projected and tested.
- [Risk] Eligibility metadata silently weakens authority. -> Mitigation: false by default, exact `rule_id` lookup, definition-owned `required_floor` restriction, and regression cases for queue/provenance/structure/lifecycle roots.
- [Risk] Inactive fixture leaks into production inventory. -> Mitigation: fixture lives only under tests and active definition/CLI inventory checks reject it as active policy.
- [Risk] Formal/inspect diverge. -> Mitigation: each invokes the same pure evaluator once and parity tests compare core roots; formal-only lifecycle remains explicit.

## Migration Plan

1. Validate the change's verification plan before implementation.
2. Add focused evaluator/schema/adapter tests before changing projection behavior.
3. Replace duplicated eligibility projection with the narrow pure exact-ID helper and preserve current production values.
4. Run deterministic Wave regressions, routing/governance checks, then update the `v0.47` release projection.

Rollback is a code/documentation revert: no bundle schema or durable runtime state migration is introduced.

## Open Questions

None. The active Wave2 eligibility set remains empty unless a future accepted change changes it.
