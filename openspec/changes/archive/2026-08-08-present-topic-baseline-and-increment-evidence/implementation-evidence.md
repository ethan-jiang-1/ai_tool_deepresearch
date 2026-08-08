# Implementation Evidence: present-topic-baseline-and-increment-evidence

Date: 2026-08-08

## Evidence Boundary

- Change requirements: REF-003, REF-004, and RWP-002.
- The selected node:test assets establish deterministic renderer, persistence, CLI, Markdown-contract, and rerun-chain behavior only.
- This change projects accepted direct facts into reader navigation. It does not create research evidence, judge the semantic usefulness of a focus brief, or prove Subject-Agent behavior.
- agent_flow_e2e is intentionally not applicable: no Subject Agent was launched, no external research was performed, and no native Agent-flow completion is claimed.

## Implemented Contract

- sync-reference-index now renders the existing eight-column reference inventory and a Reference Evidence Map in reference/README.md from the same direct bundle facts.
- Reference relationship labels are limited to shared, Topic-specific, cross-Topic, and unknown. Current focus rows are Topic-level only and distinguish covered, partial, blocked, not declared, historical context, and unknown without attributing an increment to an individual reference.
- The index and README each use the existing independent compare-and-swap boundary. A later README conflict reports the committed index and blocked README target; recovery reruns the same command without atomic rollback or prose merge.
- Wave1 guidance refreshes the same derived projection only after a legal current focus_coverage update, then reruns the existing Wave1 inspect.

## Selected Deterministic Evidence

| Command | Result | Claim boundary |
| --- | --- | --- |
| node --test tests/engine/helpers/reference-evidence-map.test.mjs tests/engine/helpers/reference-index-sync.test.mjs tests/integration/cli/reference-evidence-map.test.mjs tests/integration/md/wave1-reference-evidence-map-guidance.test.mjs tests/e2e/reference-evidence-map-rerun.test.mjs | PASS: 11 tests | Stable direct-fact rendering, paired CAS outcomes, CLI persistence, Wave1 guidance, and a temporary rerun-shaped chain. |
| node openspec/governance/check-verification-routing.mjs --change present-topic-baseline-and-increment-evidence --mode plan | PASS | The selected test classes and explicit not-applicable Agent-flow boundary were valid before target edits. |
| node openspec/governance/check-verification-routing.mjs --change present-topic-baseline-and-increment-evidence --mode assets | PASS: 5 routed claims | Every selected asset exists at its declared path and class. |
| openspec validate present-topic-baseline-and-increment-evidence --strict | PASS | Active planning artifacts remain internally valid. |
| node openspec/governance/check-project-reqs.mjs and node openspec/governance/check-project-specs.mjs | PASS | Requirement IDs and main-spec structure remain consistent after synchronization. |
| git diff --check | PASS | No whitespace errors in the scoped change. |

## Main-spec Sync

- bundle/reference-flat-format now carries the paired navigation projection, direct-coordinate, unknown, current-focus, and non-atomic persistence requirements of REF-003 and REF-004.
- research/research-wave-phase-content now carries the RWP-002 Wave1 instruction to synchronize after a legal current focus declaration update.
- The synchronized requirements were reread and compared with both delta specs. Main specs retain ordinary Requirements sections and no delta operation headers.

## Residual Reader Risk

- The map is intentionally a projection. Readers must follow its direct coordinates for submitted-backing authority, canonical Topic identity, current profile round, and valid focus coverage.
- Fixture-backed tests do not establish real research quality, content usefulness, or Agent decision quality. Those questions remain with the normal Agent and HITL2 workflow rather than this projection change.

## Closeout Review

- Scope: the renderer and paired persistence implementation, template and Wave1 guidance, the five selected deterministic assets, v0.81 release notes, the active delta requirements, and their synchronized main-spec requirements.
- No actionable finding remains. Relationship labels use only path and canonical Topic facts; current-focus labels use profile/depth-review/direct submitted facts or return unknown; and no map row attributes a Topic-level increment to a reference file.
- The compare-and-swap review confirmed independent target persistence rather than an invented transaction: a committed index can remain visible while a later README target blocks, with the same synchronizer as the only repair direction.
- The review retains the evidence boundary above. Deterministic fixtures and Markdown assertions are not presented as Subject-Agent research or Agent-flow proof.
