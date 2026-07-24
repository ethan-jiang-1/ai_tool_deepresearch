## Context

The active Gate definition schema already distinguishes definition-owned and checker-owned findings. Wave formal Gate and inspect already consume shared evaluator facts, but primary hints can still expose a parent failure alongside many dependent symptoms, and degradation eligibility remains adapter-local rather than one parsed policy path. Production evidence establishes that authority roots must remain fail-closed; it does not establish a successful Wave2 degradation.

## Goals / Non-Goals

**Goals:**

- Project one evaluator result into stable independent primary roots, with local prerequisite masking and durable dependent detail.
- Make Wave0/Wave1/Wave2 consume one definition-metadata eligibility projection, defaulting every rule to ineligible.
- Preserve existing formal/inspect separation, stable rule IDs, submitted-backing authority, and current Wave0/Wave1 quality-only policy.
- Prove a positive Wave2 adapter path only through an inactive schema-valid fixture and prove current authority-root failures remain failed.

**Non-Goals:**

- No generic dependency graph, topological scheduler, controller, retry tree, state field, or persisted grouping result.
- No automatic downgrade, partial pass, hand-written Gate verdict, new active Wave2 eligible rule, or relaxation of queue/receipt/provenance/binding/structure/trace/lifecycle roots.
- No change to Agent semantic repair ownership, transition routing, work-unit submit, reference parser, or producer/closeout contracts.

## Decisions

### D1. Evaluator findings remain the single authority

The active schema-parsed definition and checker-owned findings remain the direct Source of Record. A local evaluator guard reports an absent/unparseable prerequisite once and records dependent findings as masked detail; it does not build a graph or infer new relations. The shared result projector derives `failed_rule_ids`, `hints[]`, inspect detail, and advice from this structured result rather than from text.

Alternative considered: a generic dependency graph. Rejected because the existing direct prerequisite relationships are local, and a graph would add state, ordering semantics, and a second failure model without new authority.

### D2. Eligibility is definition metadata, false by default

Each evaluated rule carries an explicit parsed eligibility boolean/metadata value. The shared Wave adapter calculates a degraded-handoff candidate only after ordinary evaluator roots pass all non-eligible authority conditions and existing fatigue/lifecycle prerequisites. Missing, malformed, or absent metadata means ineligible. Existing Wave0/Wave1 soft-floor values are preserved; Wave2 production definitions remain entirely ineligible.

Alternative considered: per-adapter allowlists. Rejected because they duplicate policy and permit adapter drift such as BUG-113.

### D3. Formal Gate owns the handoff; inspect exposes the same facts

Inspect remains pure and reports the same root identity and repair coordinates. The formal wrapper alone evaluates lifecycle/durability/routing and emits any existing degraded handoff. Neither inspect nor hints can authorize a route.

### D4. Inactive fixture proves capability without changing policy

One test-only inactive Wave2 definition fixture may declare an eligible quality rule. It is parsed through the production schema and adapter and is never active inventory, routing, or production policy. This demonstrates common-adapter support while preserving the accepted empty production Wave2 eligible set.

### D5. Constitutional admission

| Question | Decision |
|---|---|
| Direct authority | Parsed active Gate definition plus existing evaluator findings and formal lifecycle result. |
| Legal loop | Finding -> local root/mask projection -> existing exact repair or existing eligible formal handoff -> same checkpoint. |
| Net simplification | One metadata path and local guards replace expanded hint walls and adapter-local allowlists; no graph/controller/state is added. |
| Human boundary | Only a structured user/external/missing-contract finding; ordinary legal repair remains Agent work. |
| Proof | Unit/integration/deterministic E2E prove deterministic behavior; inactive fixture proves adapter capability only. |

## Risks / Trade-offs

- [Risk] Root reduction hides independent failures. -> Mitigation: only explicitly downstream findings are masked; independent finding identity remains projected and tested.
- [Risk] Eligibility metadata silently weakens authority. -> Mitigation: false by default, schema parsing, and regression cases for queue/provenance/structure/lifecycle roots.
- [Risk] Inactive fixture leaks into production inventory. -> Mitigation: fixture lives only under tests and active definition/CLI inventory checks reject it as active policy.
- [Risk] Formal/inspect diverge. -> Mitigation: same pure evaluator result and parity tests; formal-only lifecycle remains explicit.

## Migration Plan

1. Validate the change's verification plan before implementation.
2. Add focused evaluator/schema/adapter tests before changing projection behavior.
3. Replace duplicated eligibility projection with the shared parsed path and preserve current production values.
4. Run deterministic Wave regressions, routing/governance checks, then update the `v0.47` release projection.

Rollback is a code/documentation revert: no bundle schema or durable runtime state migration is introduced.

## Open Questions

None. The active Wave2 eligibility set remains empty unless a future accepted change changes it.
