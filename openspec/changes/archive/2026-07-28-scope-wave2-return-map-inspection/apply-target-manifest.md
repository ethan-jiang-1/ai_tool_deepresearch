# Apply Target Manifest: Scope Wave2 Return-Map Inspection

## Admission Record

- Change: `scope-wave2-return-map-inspection`
- Required pre-edit check:
  `node openspec/governance/check-verification-routing.mjs --change scope-wave2-return-map-inspection --mode plan`
- Current proposal position: planning artifacts are complete; no framework code,
  test, or runtime bundle has been edited by this change.

This manifest is implementation ownership guidance, not runtime authority. The
accepted specs and direct bundle facts remain authoritative.

## Retained And Removed Control Surfaces

| Surface | Planned target | Direct Source of Record | Responsibility boundary |
| --- | --- | --- | --- |
| Wave2 Seed Topic return-map readiness | Existing `evaluateSeedTopicProjectionReadiness()` path in `return-map.mjs` | Canonical topic registry, finding-index fact, and plan-bound Seed Topic Wave2 family | Retained unchanged. It validates exact W2F identity and entry shape; it does not validate phase-owned artifacts. |
| Wave2 artifact structural evaluation | Existing `evaluateWave2Contract()` and its artifact helpers | `synthesis.md`, `cross-topic-ledger.md`, `finding-index.yaml`, and existing Wave2 gate rules | Retained unchanged unless a direct finding-index diagnostic demonstrably has no owner. It owns artifact structural/reference/index verdicts. |
| False artifact return-map branch | `inspectWaveArtifactReturnMaps(..., 'wave2')` | None: phase artifacts are not Seed Topic return-map owners | Removed. It currently parses synthesis and ledger using five unrelated fields and introduces no direct authority fact. |
| Wave2 inspect composition | `inspect-wave2-output.mjs` | Existing evaluator result objects | Continues to combine the three independent result families without a new controller, state, writer, or fallback. |

## Avoided Complexity

- No artifact-compatible return-map format or `## Return Map` compatibility rule.
- No new validator, CLI, state, queue demand, retry tree, writer, or lifecycle.
- No weakening of Seed Topic W2F/field validation and no conversion of artifact
  failures to advice.
- No duplicate finding-index lineage check when the existing artifact evaluator
  already owns its structured contract.

## Requirement Traceability

| Requirement | Planned implementation and proof ownership |
| --- | --- |
| `WTS-004` | Remove the artifact-to-return-map parser path while retaining narrative and ledger structural evaluation; prove a valid artifact pair needs no workaround. |
| `WTS-007` | Preserve JS feedback owner separation and public inspect behavior; prove Seed Topic and artifact failures retain their distinct roots. |

No new requirement ID is allocated. Existing `RRM-007` remains the unchanged
Seed Topic projection contract.
